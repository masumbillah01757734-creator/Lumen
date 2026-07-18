"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Heart, MessageCircle, Volume2, VolumeX, Send, Trash2, Pencil, X, Check, Share2 } from "lucide-react";
import { useCurrentUser } from "@/components/UserContext";
import { notifyError, notifySuccess, confirmToast } from "@/lib/toast";
import { hasViewedLocally, markViewedLocally } from "@/lib/viewedPosts";

export default function ReelCard({ post, onDeleted, muted, onMuteChange }) {
  const currentUser = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hasViewed = useRef(false);

  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [comments, setComments] = useState(post.comments || []);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText] = useState("");

  const isMyPost = currentUser && post.author?.id === currentUser.id;

  function requireAuth() {
    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent(pathname || "/reels")}`);
      return false;
    }
    return true;
  }

  async function sharePost() {
    const url = `${window.location.origin}/p/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.caption || "Check this out on Lumen", url });
      } else {
        await navigator.clipboard.writeText(url);
        notifySuccess("Link copied to clipboard.");
      }
    } catch {
      // user closed the native share sheet
    }
    fetch(`/api/posts/${post.id}/share`, { method: "POST" }).catch(() => { });
  }

  useEffect(() => {
    const video = videoRef.current;
    const el = containerRef.current;
    if (!video || !el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          video.play().catch(() => {});
          if (!hasViewed.current && !hasViewedLocally(post.id)) {
            hasViewed.current = true;
            markViewedLocally(post.id);
            fetch(`/api/posts/${post.id}/view`, { method: "POST" }).catch(() => {});
          }
        } else {
          video.pause();
        }
      },
      { threshold: [0, 0.6, 1] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [post.id]);

  async function toggleLike() {
    if (!requireAuth()) return;
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
    if (!requireAuth()) return;
    if (!commentText.trim()) return;
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
    }
  }

  async function toggleCommentLike(comment) {
    if (!requireAuth()) return;
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
      // keep optimistic state
    }
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
        setComments((cs) => cs.map((c) => (c.id === comment.id ? { ...c, text: data.comment.text, edited: true } : c)));
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

  return (
    <div
      ref={containerRef}
      className="snap-start shrink-0 w-full h-full relative flex items-center justify-center"
      style={{ background: "#000" }}
    >
      <video
        ref={videoRef}
        src={post.mediaUrl}
        loop
        muted={muted}
        playsInline
        onClick={() => onMuteChange(!muted)}
        className="w-full h-full object-contain cursor-pointer"
      />

      <button
        onClick={() => onMuteChange(!muted)}
        className="absolute top-4 right-4 p-2 rounded-full"
        style={{ background: "rgba(0,0,0,0.45)" }}
      >
        {muted ? <VolumeX size={18} color="white" /> : <Volume2 size={18} color="white" />}
      </button>

      {/* Right action column */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5">
        <button onClick={toggleLike} className="flex flex-col items-center gap-1">
          <Heart
            size={30}
            strokeWidth={1.75}
            fill={liked ? "var(--accent)" : "rgba(255,255,255,0.15)"}
            style={{ color: liked ? "var(--accent)" : "white" }}
          />
          <span className="text-xs font-medium text-white drop-shadow">{likeCount}</span>
        </button>
        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
          <MessageCircle size={28} strokeWidth={1.75} color="white" />
          <span className="text-xs font-medium text-white drop-shadow">{comments.length}</span>
        </button>
        <button onClick={sharePost} className="flex flex-col items-center gap-1">
          <Share2 size={26} strokeWidth={1.75} color="white" />
        </button>
        {isMyPost && (
          <button
            onClick={() =>
              confirmToast("Delete this reel?", async () => {
                const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
                if (res.ok) onDeleted?.(post.id);
              })
            }
            className="flex flex-col items-center gap-1"
          >
            <Trash2 size={24} strokeWidth={1.75} color="white" />
          </button>
        )}
      </div>

      {/* Bottom author + caption overlay */}
      <div
        className="absolute left-0 right-16 bottom-0 p-4 pb-6"
        style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.75))" }}
      >
        <Link href={`/profile/${post.author?.username}`} className="flex items-center gap-2 mb-1.5">
          <div
            className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center font-display text-sm shrink-0"
            style={{ background: "var(--surface-2)", color: "var(--gold)" }}
          >
            {post.author?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.author.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              post.author?.displayName?.[0]?.toUpperCase() || "?"
            )}
          </div>
          <span className="text-sm font-semibold text-white">{post.author?.username}</span>
        </Link>
        {post.caption && <p className="text-sm text-white/90">{post.caption}</p>}
      </div>

      {/* Comments drawer */}
      {showComments && (
        <div
          className="absolute inset-0 flex flex-col justify-end"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowComments(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="rounded-t-2xl p-4 max-h-[70%] flex flex-col gap-3 overflow-y-auto"
            style={{ background: "var(--surface)" }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg" style={{ color: "var(--text)" }}>
                Comments
              </h3>
              <button onClick={() => setShowComments(false)} style={{ color: "var(--muted)" }}>
                <X size={20} />
              </button>
            </div>

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
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Link href={`/profile/${c.author?.username}`} className="shrink-0">
                          <div
                            className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center font-display text-[11px]"
                            style={{ background: "var(--surface-2)", color: "var(--gold)" }}
                          >
                            {c.author?.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={c.author.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              c.author?.displayName?.[0]?.toUpperCase() || c.author?.username?.[0]?.toUpperCase() || "?"
                            )}
                          </div>
                        </Link>
                        <p className="flex-1 min-w-0">
                          <Link href={`/profile/${c.author?.username}`} className="font-medium">
                            {c.author?.username}
                          </Link>{" "}
                          <span style={{ color: "var(--muted)" }}>{c.text}</span>
                          {c.edited && (
                            <span className="font-mono text-[10px] ml-1" style={{ color: "var(--muted)" }}>
                              (edited)
                            </span>
                          )}
                        </p>
                      </div>
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
                          <button
                            onClick={() => {
                              setEditingCommentId(c.id);
                              setEditText(c.text);
                            }}
                            style={{ color: "var(--muted)" }}
                          >
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

            <form onSubmit={submitComment} className="flex items-center gap-2 mt-1 sticky bottom-0">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment…"
                className="flex-1 px-3 py-1.5 rounded-full text-sm outline-none border"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
              />
              <button type="submit" disabled={!commentText.trim()} style={{ color: "var(--accent)" }} className="disabled:opacity-40">
                <Send size={18} strokeWidth={1.75} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}