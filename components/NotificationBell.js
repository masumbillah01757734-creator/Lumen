"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Bell, Heart, MessageCircle } from "lucide-react";
import { MediaImage } from "@/components/Media";

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function NotificationRow({ n }) {
  const name = n.sender.displayName || n.sender.username;
  return (
    <Link
      href={`/p/${n.post.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-black/20 transition-colors"
    >
      <div
        className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center font-display text-sm shrink-0"
        style={{ background: "var(--surface)", color: "var(--gold)", border: "1px solid var(--border)" }}
      >
        {n.sender.avatar ? (
          <MediaImage src={n.sender.avatar} alt="" className="w-full h-full object-cover" wrapperClassName="w-full h-full" />
        ) : (
          name?.[0]?.toUpperCase() || "?"
        )}
      </div>

      <div className="flex-1 min-w-0 text-sm" style={{ color: "var(--text)" }}>
        <span className="font-semibold">{name}</span>{" "}
        {n.type === "like" ? (
          <span style={{ color: "var(--muted)" }}>liked your post</span>
        ) : (
          <span style={{ color: "var(--muted)" }}>
            commented: <span style={{ color: "var(--text)" }}>&ldquo;{n.commentText}&rdquo;</span>
          </span>
        )}
        <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{timeAgo(n.createdAt)}</div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!n.read && <span className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />}
        {n.type === "like" ? (
          <Heart size={16} style={{ color: "var(--accent)" }} fill="var(--accent)" />
        ) : (
          <MessageCircle size={16} style={{ color: "var(--muted)" }} />
        )}
        {n.post.thumbnailUrl && (
          <div className="w-9 h-9 rounded-md overflow-hidden shrink-0" style={{ background: "var(--surface-2)" }}>
            <MediaImage src={n.post.thumbnailUrl} alt="" className="w-full h-full object-cover" wrapperClassName="w-full h-full" />
          </div>
        )}
      </div>
    </Link>
  );
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const loadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      const data = await res.json();
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Ignore transient polling failures.
    }
  }, []);

  useEffect(() => {
    loadCount();
    const interval = setInterval(loadCount, 30000);
    return () => clearInterval(interval);
  }, [loadCount]);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      try {
        const res = await fetch("/api/notifications?limit=30");
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(0);
        if (data.notifications?.length) {
          fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
        }
      } catch {
        // Leave the list empty on failure; the badge count still refreshes on next poll.
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggleOpen}
        aria-label="Notifications"
        className="relative p-2 rounded-full transition-colors hover:bg-[var(--surface-2)]"
        style={{ color: "var(--text)" }}
      >
        <Bell size={20} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ background: "var(--accent)", color: "#14120f" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 z-30 w-80 max-w-[90vw] rounded-xl border overflow-hidden shadow-xl"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="px-4 py-3 border-b font-semibold text-sm" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
            Notifications
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <p className="text-sm px-4 py-6 text-center" style={{ color: "var(--muted)" }}>Loading…</p>
            )}
            {!loading && notifications.length === 0 && (
              <p className="text-sm px-4 py-6 text-center" style={{ color: "var(--muted)" }}>
                No notifications yet.
              </p>
            )}
            {!loading && notifications.map((n) => <NotificationRow key={n.id} n={n} />)}
          </div>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block text-center text-sm py-2.5 border-t hover:bg-black/20 transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--gold)" }}
          >
            See all
          </Link>
        </div>
      )}
    </div>
  );
}
