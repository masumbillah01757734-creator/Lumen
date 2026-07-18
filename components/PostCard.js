"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Heart, MessageCircle, Send, MoreHorizontal, Trash2, Pencil, Eye, X, Check, Plus, Share2 } from "lucide-react";
import { useCurrentUser } from "@/components/UserContext";
import { notifyError, notifySuccess, confirmToast } from "@/lib/toast";
import SimpleVideo from "@/components/SimpleVideo";

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function MediaCarousel({ items, caption }) {
  const [index, setIndex] = useState(0);
  const scrollRef = useRef(null);

  function scrollToIndex(i) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setIndex(i);
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
    setIndex(Math.min(Math.max(i, 0), items.length - 1));
  }

  if (items.length <= 1) {
    const item = items[0];
    if (!item) return null;
    return item.mediaType === "video" ? (
      <SimpleVideo src={item.url} className="w-full max-h-150 object-contain" />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.url} alt={caption || "Post media"} className="w-full max-h-150 object-contain" />
    );
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {items.map((item, i) => (
          <div
            key={`${item.url}-${i}`}
            className="w-full shrink-0 snap-center aspect-square flex items-center justify-center bg-black"
          >
            {item.mediaType === "video" ? (
              <SimpleVideo src={item.url} className="w-full h-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.url} alt={caption || "Post media"} className="w-full h-full object-cover" />
            )}
          </div>
        ))}
      </div>

      <span
        className="absolute top-2.5 right-2.5 rounded-full px-2 py-0.5 text-[11px] font-mono pointer-events-none"
        style={{ background: "rgba(0,0,0,0.55)", color: "white" }}
      >
        {index + 1}/{items.length}
      </span>

      <div className="absolute bottom-2.5 left-0 right-0 flex items-center justify-center gap-1.5">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollToIndex(i)}
            aria-label={`Go to media ${i + 1}`}
            className="rounded-full transition-all"
            style={{
              width: i === index ? 6 : 5,
              height: i === index ? 6 : 5,
              background: i === index ? "white" : "rgba(255,255,255,0.5)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function PostCard({ post, onDeleted }) {
  const currentUser = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
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
  const [displayPost, setDisplayPost] = useState(post);
  const [editingPost, setEditingPost] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(post.caption || "");
  const [locationDraft, setLocationDraft] = useState(post.location || "");
  const [hashtagsDraft, setHashtagsDraft] = useState((post.hashtags || []).join(" "));
  const [pendingMedia, setPendingMedia] = useState([]);
  const [pendingMediaPreviews, setPendingMediaPreviews] = useState([]);
  const [savingPost, setSavingPost] = useState(false);
  const [currentMediaItems, setCurrentMediaItems] = useState(() =>
    post.mediaItems?.length ? post.mediaItems : [{ url: post.mediaUrl, mediaType: post.mediaType }]
  );
  const fileInputRef = useRef(null);

  const isMyPost = currentUser && displayPost.author?.id === currentUser.id;

  // Instagram-style rule: guests can look, but any interaction sends them to
  // sign in first.
  function requireAuth() {
    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent(pathname || "/")}`);
      return false;
    }
    return true;
  }

  async function sharePost() {
    const url = `${window.location.origin}/p/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: displayPost.caption || "Check this out on Lumen", url });
      } else {
        await navigator.clipboard.writeText(url);
        notifySuccess("Link copied to clipboard.");
      }
    } catch {
      // user closed the native share sheet — nothing to do
    }
    fetch(`/api/posts/${post.id}/share`, { method: "POST" }).catch(() => { });
  }

  useEffect(() => {
    fetch(`/api/posts/${post.id}/view`, { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.viewCount !== undefined) setViewCount(data.viewCount);
      })
      .catch(() => { });
  }, [post.id]);

  useEffect(() => {
    return () => pendingMediaPreviews.forEach((item) => URL.revokeObjectURL(item.url));
  }, [pendingMediaPreviews]);

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

  function handlePendingFiles(nextFiles) {
    if (!nextFiles?.length) return;
    const files = Array.from(nextFiles);
    const existingMedia = (displayPost.mediaItems || []).length;
    const hasVideo = files.some((file) => file.type.startsWith("video"));
    const existingHasVideo = (displayPost.mediaItems || []).some((item) => item.mediaType === "video");

    if (hasVideo && existingHasVideo) {
      notifyError("This post already has a video. Replace it instead of adding another video.");
      return;
    }
    if (hasVideo && files.length > 1) {
      notifyError("A post can only contain one video.");
      return;
    }
    if (hasVideo && existingMedia > 0 && !existingHasVideo) {
      notifyError("This post already has images. Remove them or replace the whole media set.");
      return;
    }

    const previews = files.map((file) => ({ url: URL.createObjectURL(file), name: file.name, type: file.type }));
    setPendingMedia((current) => [...current, ...files]);
    setPendingMediaPreviews((current) => [...current, ...previews]);
  }

  function removePendingMedia(index) {
    setPendingMedia((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setPendingMediaPreviews((current) => {
      const item = current[index];
      if (item?.url) URL.revokeObjectURL(item.url);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  function removeCurrentMedia(index) {
    setCurrentMediaItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function savePostEdit() {
    if (!captionDraft.trim() && !hashtagsDraft.trim() && !locationDraft.trim() && !pendingMedia.length && currentMediaItems.length === 0) return;
    setSavingPost(true);
    try {
      const form = new FormData();
      form.append("caption", captionDraft);
      form.append("hashtags", hashtagsDraft);
      form.append("location", locationDraft);
      form.append("keepMedia", JSON.stringify(currentMediaItems));
      pendingMedia.forEach((file) => form.append("media", file));

      const res = await fetch(`/api/posts/${displayPost.id}`, { method: "PATCH", body: form });
      const data = await res.json();
      if (!res.ok) {
        notifyError(data.error || "Could not update your post.");
        return;
      }

      notifySuccess("Post updated.");
      setDisplayPost(data.post);
      setEditingPost(false);
      setPendingMedia([]);
      setPendingMediaPreviews([]);
    } catch {
      notifyError("Could not update your post.");
    } finally {
      setSavingPost(false);
    }
  }

  return (
    <article
      className="rounded-2xl border overflow-hidden mb-6"
      style={{ background: "var(--surface)", borderColor: "var(--border)", opacity: deleting ? 0.5 : 1 }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <Link href={`/profile/${displayPost.author?.username}`} className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center font-display text-sm shrink-0"
            style={{ background: "var(--surface-2)", color: "var(--gold)" }}
          >
            {displayPost.author?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={displayPost.author.avatar} alt={displayPost.author.username} className="w-full h-full object-cover" />
            ) : (
              displayPost.author?.displayName?.[0]?.toUpperCase() || "?"
            )}
          </div>
          <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
            {displayPost.author?.username}
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] tracking-wide hidden sm:inline" style={{ color: "var(--muted)" }}>
            {displayPost.exif?.aperture} · ISO {displayPost.exif?.iso} · {displayPost.exif?.shutter}
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
                      setEditingPost(true);
                    }}
                    className="flex items-center gap-2 px-3 py-2 whitespace-nowrap hover:bg-black/20"
                    style={{ color: "var(--text)" }}
                  >
                    <Pencil size={14} /> Edit post
                  </button>
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
        {displayPost.mediaType === "video" ? (
          <SimpleVideo src={displayPost.mediaUrl} className="w-full max-h-150 object-contain" />
        ) : (
          <MediaCarousel items={currentMediaItems} caption={displayPost.caption} />
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
          <button onClick={sharePost} className="flex items-center gap-1.5">
            <Share2 size={20} strokeWidth={1.75} style={{ color: "var(--text)" }} />
          </button>
          <span className="flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
            <Eye size={20} strokeWidth={1.75} />
            <span className="text-sm">{viewCount}</span>
          </span>
          <span className="ml-auto font-mono text-[11px]" style={{ color: "var(--muted)" }}>
            {timeAgo(displayPost.createdAt)}
          </span>
        </div>

        {displayPost.caption && (
          <p className="text-sm" style={{ color: "var(--text)" }}>
            <span className="font-medium">{displayPost.author?.username}</span> {displayPost.caption}
          </p>
        )}
        {displayPost.hashtags?.length > 0 && (
          <p className="text-sm" style={{ color: "var(--accent)" }}>
            {displayPost.hashtags.map((tag) => `#${tag}`).join(" ")}
          </p>
        )}
        {displayPost.location && <p className="text-xs font-mono" style={{ color: "var(--muted)" }}>{displayPost.location}</p>}

        {editingPost && (
          <div className="rounded-xl border p-3 flex flex-col gap-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Edit post</p>
              <button onClick={() => setEditingPost(false)} style={{ color: "var(--muted)" }}>
                <X size={16} />
              </button>
            </div>
            <input
              value={locationDraft}
              onChange={(e) => setLocationDraft(e.target.value)}
              placeholder="Location"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
            />
            <input
              value={hashtagsDraft}
              onChange={(e) => setHashtagsDraft(e.target.value)}
              placeholder="Hashtags"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
            />
            <textarea
              value={captionDraft}
              onChange={(e) => setCaptionDraft(e.target.value)}
              placeholder="Caption"
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none border resize-none"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
            />
            <div className="flex flex-wrap gap-2">
              {currentMediaItems.map((item, index) => (
                <div key={`${item.url}-${index}`} className="relative w-20 h-20 rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                  {item.mediaType === "video" ? <video src={item.url} className="w-full h-full object-cover" /> : <img src={item.url} alt="Existing media" className="w-full h-full object-cover" />}
                  <button type="button" onClick={() => removeCurrentMedia(index)} className="absolute top-1 right-1 rounded-full p-1" style={{ background: "rgba(0,0,0,0.65)" }}>
                    <X size={12} color="white" />
                  </button>
                </div>
              ))}
              {pendingMediaPreviews.map((item, index) => (
                <div key={`${item.name}-${index}`} className="relative w-20 h-20 rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                  {item.type.startsWith("video") ? <video src={item.url} className="w-full h-full object-cover" /> : <img src={item.url} alt={item.name} className="w-full h-full object-cover" />}
                  <button type="button" onClick={() => removePendingMedia(index)} className="absolute top-1 right-1 rounded-full p-1" style={{ background: "rgba(0,0,0,0.65)" }}>
                    <X size={12} color="white" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm"
              style={{ background: "var(--surface-2)", color: "var(--text)" }}
            >
              <Plus size={14} /> Add replacement media
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={(event) => handlePendingFiles(event.target.files)}
            />
            <button
              type="button"
              onClick={savePostEdit}
              disabled={savingPost}
              className="rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60"
              style={{ background: "var(--accent)", color: "#14120f" }}
            >
              {savingPost ? "Saving…" : "Save changes"}
            </button>
          </div>
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