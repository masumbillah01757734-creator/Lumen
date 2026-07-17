"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Send, MoreHorizontal, Trash2, Pencil, Eye, X, Check } from "lucide-react";
import { useCurrentUser } from "@/components/UserContext";
import { notifyError, notifySuccess, confirmToast } from "@/lib/toast";

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function PostCard({ post, onDeleted }) {
  const currentUser = useCurrentUser();
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [viewCount, setViewCount] = useState(post.viewCount || 0);
  const [comments, setComments] = useState(post.comments || []);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText] = useState("");

  const isMyPost = currentUser && post.author?.id === currentUser.id;

  useEffect(() => {
    fetch(`/api/posts/${post.id}/view`, { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.viewCount !== undefined) setViewCount(data.viewCount);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleLike() {
    setLiked((v) => !v);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setLiked(data.liked);
        setLikeCount(data.likeCount);
      }
    } catch {
      setLiked((v) => !v);
      notifyError("Couldn't update your like.");
    }
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: commentText }),
      });
      const data = await res.json();
      if (res.ok) {
        setComments((c) => [...c, { ...data.comment, likeCount: 0, likedByMe: false }]);
        setCommentText("");
      } else {
        notifyError(data.error);
      }
    } catch {
      notifyError("Couldn't post your comment.");
    } finally {
      setPosting(false);
    }
  }

  async function toggleCommentLike(comment) {
    setComments((cs) =>
      cs.map((c) =>
        c.id === comment.id
          ? { ...c, likedByMe: !c.likedByMe, likeCount: c.likedByMe ? c.likeCount - 1 : c.likeCount + 1 }
          : c
      )
    );
    try {
      const res = await fetch(`/api/posts/${post.id}/comment/${comment.id}/like`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setComments((cs) =>
          cs.map((c) => (c.id === comment.id ? { ...c, likedByMe: data.liked, likeCount: data.likeCount } : c))
        );
      }
    } catch {
      // leave optimistic state
    }
  }

  function startEditComment(comment) {
    setEditingCommentId(comment.id);
    setEditText(comment.text);
  }

  async function saveEditComment(comment) {
    if (!editText.trim()) return;
    try {
      const res = await fetch(`/api/posts/${post.id}/comment/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editText }),
      });
      const data = await res.json();
      if (res.ok) {
        setComments((cs) =>
          cs.map((c) => (c.id === comment.id ? { ...c, text: data.comment.text, edited: true } : c))
        );
        setEditingCommentId(null);
      } else {
        notifyError(data.error);
      }
    } catch {
      notifyError("Couldn't save your edit.");
    }
  }

  async function deleteComment(comment) {
    setComments((cs) => cs.filter((c) => c.id !== comment.id));
    try {
      await fetch(`/api/posts/${post.id}/comment/${comment.id}`, { method: "DELETE" });
    } catch {
      // best effort
    }
  }

  async function deletePost() {
    confirmToast("Delete this post? This can't be undone.", async () => {
      setDeleting(true);
      try {
        const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
        if (res.ok) {
          notifySuccess("Post deleted.");
          onDeleted?.(post.id);
        } else {
          setDeleting(false);
          notifyError("Could not delete that post.");
        }
      } catch {
        setDeleting(false);
        notifyError("Could not delete that post.");
      }
    });
  }

  return (
    <article
      className="rounded-2xl border overflow-hidden mb-6"
      style={{ background: "var(--surface)", borderColor: "var(--border)", opacity: deleting ? 0.5 : 1 }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <Link href={`/profile/${post.author?.username}`} className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center font-display text-sm shrink-0"
            style={{ background: "var(--surface-2)", color: "var(--gold)" }}
          >
            {post.author?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.author.avatar} alt={post.author.username} className="w-full h-full object-cover" />
            ) : (
              post.author?.displayName?.[0]?.toUpperCase() || "?"
            )}
          </div>
          <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
            {post.author?.username}
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] tracking-wide hidden sm:inline" style={{ color: "var(--muted)" }}>
            {post.exif?.aperture} · ISO {post.exif?.iso} · {post.exif?.shutter}
          </span>
          {isMyPost && (
            <div className="relative">
              <button onClick={() => setMenuOpen((v) => !v)} style={{ color: "var(--muted)" }}>
                <MoreHorizontal size={20} />
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-7 z-10 rounded-lg border overflow-hidden text-sm"
                  style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
                >
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      deletePost();
                    }}
                    className="flex items-center gap-2 px-3 py-2 whitespace-nowrap hover:bg-black/20"
                    style={{ color: "var(--accent)" }}
                  >
                    <Trash2 size={14} /> Delete post
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ background: "#0b0a08" }}>
        {post.mediaType === "video" ? (
          <video src={post.mediaUrl} controls className="w-full max-h-[600px] object-contain" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.mediaUrl} alt={post.caption || "Post media"} className="w-full max-h-[600px] object-contain" />
        )}
      </div>

      <div className="px-4 py-3 flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <button onClick={toggleLike} className="flex items-center gap-1.5 group">
            <Heart
              size={22}
              strokeWidth={1.75}
              fill={liked ? "var(--accent)" : "none"}
              style={{ color: liked ? "var(--accent)" : "var(--text)" }}
              className="transition-transform group-active:scale-90"
            />
            <span className="text-sm" style={{ color: "var(--muted)" }}>
              {likeCount}
            </span>
          </button>
          <button onClick={() => setShowComments((v) => !v)} className="flex items-center gap-1.5">
            <MessageCircle size={22} strokeWidth={1.75} style={{ color: "var(--text)" }} />
            <span className="text-sm" style={{ color: "var(--muted)" }}>
              {comments.length}
            </span>
          </button>
          <span className="flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
            <Eye size={20} strokeWidth={1.75} />
            <span className="text-sm">{viewCount}</span>
          </span>
          <span className="ml-auto font-mono text-[11px]" style={{ color: "var(--muted)" }}>
            {timeAgo(post.createdAt)}
          </span>
        </div>

        {post.caption && (
          <p className="text-sm" style={{ color: "var(--text)" }}>
            <span className="font-medium">{post.author?.username}</span> {post.caption}
          </p>
        )}

        {showComments && (
          <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
            {comments.length === 0 && (
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                No comments yet — say something.
              </p>
            )}
            {comments.map((c) => {
              const isCommentAuthor = currentUser && c.author?.id === currentUser.id;
              const canDelete = isCommentAuthor || isMyPost;
              const isEditing = editingCommentId === c.id;
              return (
                <div key={c.id} className="text-sm" style={{ color: "var(--text)" }}>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="flex-1 px-2.5 py-1 rounded-full text-sm outline-none border"
                        style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
                        autoFocus
                      />
                      <button onClick={() => saveEditComment(c)} style={{ color: "var(--gold)" }}>
                        <Check size={16} />
                      </button>
                      <button onClick={() => setEditingCommentId(null)} style={{ color: "var(--muted)" }}>
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <p className="flex-1">
                        <span className="font-medium">{c.author?.username}</span>{" "}
                        <span style={{ color: "var(--muted)" }}>{c.text}</span>
                        {c.edited && (
                          <span className="font-mono text-[10px] ml-1" style={{ color: "var(--muted)" }}>
                            (edited)
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => toggleCommentLike(c)} className="flex items-center gap-1">
                          <Heart
                            size={13}
                            fill={c.likedByMe ? "var(--accent)" : "none"}
                            style={{ color: c.likedByMe ? "var(--accent)" : "var(--muted)" }}
                          />
                          {c.likeCount > 0 && (
                            <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                              {c.likeCount}
                            </span>
                          )}
                        </button>
                        {isCommentAuthor && (
                          <button onClick={() => startEditComment(c)} style={{ color: "var(--muted)" }}>
                            <Pencil size={13} />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => deleteComment(c)} style={{ color: "var(--muted)" }}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <form onSubmit={submitComment} className="flex items-center gap-2 mt-1">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment…"
                className="flex-1 px-3 py-1.5 rounded-full text-sm outline-none border"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
              />
              <button
                type="submit"
                disabled={posting || !commentText.trim()}
                style={{ color: "var(--accent)" }}
                className="disabled:opacity-40"
              >
                <Send size={18} strokeWidth={1.75} />
              </button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}
