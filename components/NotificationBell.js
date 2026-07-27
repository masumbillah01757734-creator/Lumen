"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Bell, Heart, MessageCircle } from "lucide-react";
import { MediaImage } from "@/components/Media";

const POLL_MS = 20000;

function timeAgo(dateStr) {
  const diff = Math.max(0, Date.now() - new Date(dateStr).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

function notifText(n) {
  const name = n.sender?.displayName || n.sender?.username || "Someone";
  if (n.type === "like_post") return `${name} liked your post`;
  if (n.type === "like_comment") return `${name} liked your comment`;
  if (n.type === "comment_post") return `${name} commented: “${n.commentText.slice(0, 60)}”`;
  return `${name} interacted with your post`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=1");
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // silent — the bell just won't update until the next poll
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchCount]);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function openDropdown() {
    const next = !open;
    setOpen(next);
    if (next) {
      try {
        const res = await fetch("/api/notifications?limit=15");
        if (res.ok) {
          const data = await res.json();
          setItems(data.notifications || []);
          setLoaded(true);
        }
      } catch {
        // keep whatever was previously loaded
      }
      if (unreadCount > 0) {
        setUnreadCount(0);
        fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ all: true }),
        }).catch(() => {});
      }
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={openDropdown}
        className="relative p-2 rounded-full transition-colors hover:bg-[var(--surface-2)]"
        style={{ color: "var(--text)" }}
        aria-label="Notifications"
      >
        <Bell size={20} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span
            className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-[3px] rounded-full flex items-center justify-center text-[10px] font-bold leading-none"
            style={{ background: "var(--accent)", color: "#14120f" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 z-30 w-80 max-w-[90vw] max-h-[70vh] overflow-y-auto rounded-xl border shadow-xl"
          style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>
              Notifications
            </span>
          </div>

          {!loaded ? (
            <p className="text-sm p-4" style={{ color: "var(--muted)" }}>
              Loading…
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm p-4" style={{ color: "var(--muted)" }}>
              No notifications yet.
            </p>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.post ? `/p/${n.post.id}` : "#"}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-black/20 transition-colors"
                    style={{ background: n.read ? "transparent" : "rgba(255,90,54,0.08)" }}
                  >
                    <div
                      className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center font-display text-sm shrink-0"
                      style={{ background: "var(--surface)", color: "var(--gold)", border: "1px solid var(--border)" }}
                    >
                      {n.sender?.avatar ? (
                        <MediaImage src={n.sender.avatar} alt="" className="w-full h-full object-cover" wrapperClassName="w-full h-full" />
                      ) : (
                        n.sender?.displayName?.[0]?.toUpperCase() || n.sender?.username?.[0]?.toUpperCase() || "?"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug truncate" style={{ color: "var(--text)" }}>
                        {notifText(n)}
                      </p>
                      <span className="text-xs" style={{ color: "var(--muted)" }}>
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    {n.type === "like_post" || n.type === "like_comment" ? (
                      <Heart size={16} style={{ color: "var(--accent)" }} fill="var(--accent)" className="shrink-0" />
                    ) : (
                      <MessageCircle size={16} style={{ color: "var(--gold)" }} className="shrink-0" />
                    )}
                    {n.post?.thumbnailUrl && (
                      <div className="w-9 h-9 rounded overflow-hidden shrink-0" style={{ background: "var(--surface)" }}>
                        <MediaImage src={n.post.thumbnailUrl} alt="" className="w-full h-full object-cover" wrapperClassName="w-full h-full" />
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
