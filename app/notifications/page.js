"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Bell } from "lucide-react";
import { MediaImage } from "@/components/Media";

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/notifications?limit=100")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setNotifications(data.notifications || []);
          if (data.notifications?.length) {
            fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
          }
        }
      })
      .catch(() => setError("Could not load notifications."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Bell size={22} style={{ color: "var(--accent)" }} />
        <h1 className="font-display text-2xl" style={{ color: "var(--text)" }}>Notifications</h1>
      </div>

      {loading && <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>}
      {error && <p className="text-sm" style={{ color: "var(--accent)" }}>{error}</p>}

      {!loading && !error && notifications.length === 0 && (
        <p className="text-sm text-center mt-16" style={{ color: "var(--muted)" }}>
          No notifications yet. Likes and comments on your posts will show up here.
        </p>
      )}

      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        {notifications.map((n) => {
          const name = n.sender.displayName || n.sender.username;
          return (
            <Link
              key={n.id}
              href={`/p/${n.post.id}`}
              className="flex items-center gap-3 px-4 py-3 border-b last:border-0 hover:bg-black/20 transition-colors"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center font-display shrink-0"
                style={{ background: "var(--surface-2)", color: "var(--gold)", border: "1px solid var(--border)" }}
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
                {n.type === "like" ? (
                  <Heart size={16} style={{ color: "var(--accent)" }} fill="var(--accent)" />
                ) : (
                  <MessageCircle size={16} style={{ color: "var(--muted)" }} />
                )}
                {n.post.thumbnailUrl && (
                  <div className="w-10 h-10 rounded-md overflow-hidden shrink-0" style={{ background: "var(--surface-2)" }}>
                    <MediaImage src={n.post.thumbnailUrl} alt="" className="w-full h-full object-cover" wrapperClassName="w-full h-full" />
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
