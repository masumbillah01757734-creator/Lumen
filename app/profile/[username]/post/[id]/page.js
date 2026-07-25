"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import PostCard from "@/components/PostCard";

export default function ProfilePostViewerPage() {
  const { username, id } = useParams();
  const router = useRouter();
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);

  const loadMore = useCallback(
    (pageNum) => {
      setLoadingMore(true);
      fetch(`/api/users/${username}/posts?page=${pageNum}&exclude=${id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.error) return;
          setPosts((prev) => [...(prev || []), ...data.posts]);
          setHasMore(Boolean(data.hasMore));
        })
        .catch(() => { })
        .finally(() => setLoadingMore(false));
    },
    [username, id]
  );

  // The clicked post loads on its own first (one document — instant),
  // rather than pulling this user's entire post history just to find it.
  // The rest of their posts then load a page at a time as you scroll.
  useEffect(() => {
    setPosts(null);
    setError("");
    setPage(1);
    setHasMore(false);

    fetch(`/api/posts/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setPosts([data.post]);
        loadMore(1);
      })
      .catch(() => setError("Could not load this post."));
  }, [username, id, loadMore]);

  useEffect(() => {
    if (!hasMore || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const next = page + 1;
          setPage(next);
          loadMore(next);
        }
      },
      { rootMargin: "600px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadingMore, page, loadMore]);

  function handleDeleted(postId) {
    setPosts((ps) => ps.filter((p) => p.id !== postId));
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <button
        onClick={() => router.push(`/profile/${username}`)}
        className="flex items-center gap-1.5 text-sm mb-4"
        style={{ color: "var(--muted)" }}
      >
        <ArrowLeft size={16} /> Back to profile
      </button>

      {error && (
        <p className="font-mono text-sm mb-4" style={{ color: "var(--accent)" }}>
          {error}
        </p>
      )}

      {posts === null && !error && (
        <p className="text-center text-sm mt-16" style={{ color: "var(--muted)" }}>
          Loading posts…
        </p>
      )}

      {posts?.map((post) => (
        <PostCard key={post.id} post={post} onDeleted={handleDeleted} />
      ))}

      <div ref={sentinelRef} />
      {loadingMore && (
        <div className="flex justify-center py-6">
          <Loader2 size={20} className="animate-spin" style={{ color: "var(--muted)" }} />
        </div>
      )}
    </div>
  );
}