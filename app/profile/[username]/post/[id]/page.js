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

  // Tracks the request "generation" for the current username/id so that
  // stale responses (e.g. from React Strict Mode's double-invoked effects
  // in dev, or a fast username/id change) never get applied — this is what
  // was causing page-1 posts to be appended twice and triggering duplicate
  // React keys.
  const requestIdRef = useRef(0);

  // Merges new posts in, de-duping by id as a safety net in case the same
  // post ever comes back in more than one page.
  function mergePosts(prev, incoming) {
    const base = prev || [];
    const seen = new Set(base.map((p) => p.id));
    const deduped = incoming.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
    return [...base, ...deduped];
  }

  const loadMore = useCallback(
    (pageNum, requestId) => {
      setLoadingMore(true);
      fetch(`/api/users/${username}/posts?page=${pageNum}&exclude=${id}`)
        .then((res) => res.json())
        .then((data) => {
          if (requestId !== requestIdRef.current) return; // stale response, ignore
          if (data.error) return;
          setPosts((prev) => mergePosts(prev, data.posts));
          setHasMore(Boolean(data.hasMore));
        })
        .catch(() => { })
        .finally(() => {
          if (requestId === requestIdRef.current) setLoadingMore(false);
        });
    },
    [username, id]
  );

  // The clicked post loads on its own first (one document — instant),
  // rather than pulling this user's entire post history just to find it.
  // The rest of their posts then load a page at a time as you scroll.
  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setPosts(null);
    setError("");
    setPage(1);
    setHasMore(false);

    fetch(`/api/posts/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (requestId !== requestIdRef.current) return; // stale response, ignore
        if (data.error) {
          setError(data.error);
          return;
        }
        setPosts([data.post]);
        loadMore(1, requestId);
      })
      .catch(() => {
        if (requestId === requestIdRef.current) setError("Could not load this post.");
      });
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
          loadMore(next, requestIdRef.current);
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