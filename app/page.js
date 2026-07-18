"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Loader2 } from "lucide-react";
import PostCard from "@/components/PostCard";
import { getInterestProfile } from "@/lib/interest";
import { getSessionSeed, getSeenFreshIds, markSeenFresh, getSkippedIds, markSkipped, clearSkipped } from "@/lib/feedSession";

function buildFeedQuery(page) {
  const { tags, authors } = getInterestProfile();
  const params = new URLSearchParams({ page: String(page) });
  params.set("seed", getSessionSeed());
  const seenFresh = getSeenFreshIds();
  if (seenFresh.length) params.set("seenFresh", seenFresh.join(","));
  const skipped = getSkippedIds();
  if (skipped.length) params.set("skipped", skipped.join(","));
  if (tags.length) params.set("interestTags", tags.join(","));
  if (authors.length) params.set("interestAuthors", authors.join(","));
  return params.toString();
}

// One IntersectionObserver watches every post card in the feed. A post that
// scrolls fully past the top of the viewport without having been engaged
// with (liked/commented) gets remembered as "skipped" so the ranking
// algorithm nudges it down next time instead of showing it in the same spot.
function useSkipTracking(engagedRef) {
  const observerRef = useRef(null);
  const seenRef = useRef(new Set());
  const flushedRef = useRef(false);

  const observe = useCallback((el, id) => {
    if (!el || !observerRef.current) return;
    el.dataset.postId = id;
    observerRef.current.observe(el);
  }, []);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.dataset.postId;
          if (!id) return;
          if (entry.isIntersecting) {
            seenRef.current.add(id);
          } else if (seenRef.current.has(id) && entry.boundingClientRect.top < 0) {
            // Scrolled up and past — this post had its chance and wasn't engaged with.
            if (!engagedRef.current.has(id)) {
              markSkipped([id]);
            }
          }
        });
      },
      { threshold: 0 }
    );

    function flush() {
      if (flushedRef.current) return;
      flushedRef.current = true;
      const remaining = Array.from(seenRef.current).filter((id) => !engagedRef.current.has(id));
      if (remaining.length) markSkipped(remaining);
    }
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("beforeunload", flush);

    return () => {
      observerRef.current?.disconnect();
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, [engagedRef]);

  return observe;
}

export default function FeedPage() {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const engagedRef = useRef(new Set());
  const sentinelRef = useRef(null);
  const observePost = useSkipTracking(engagedRef);

  const loadPage = useCallback((pageNum, append) => {
    if (append) setLoadingMore(true);
    fetch(`/api/posts?${buildFeedQuery(pageNum)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        const freshIds = data.posts.filter((p) => p.isFresh).map((p) => p.id);
        if (freshIds.length) markSeenFresh(freshIds);
        setPosts((prev) => (append ? [...(prev || []), ...data.posts] : data.posts));
        setHasMore(Boolean(data.hasMore));
      })
      .catch(() => setError("Could not load the feed."))
      .finally(() => setLoadingMore(false));
  }, []);

  useEffect(() => {
    loadPage(1, false);
  }, [loadPage]);

  useEffect(() => {
    if (!hasMore || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const next = page + 1;
          setPage(next);
          loadPage(next, true);
        }
      },
      { rootMargin: "600px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadingMore, page, loadPage]);

  function handleDeleted(id) {
    setPosts((ps) => ps.filter((p) => p.id !== id));
  }

  function handleEngaged(id) {
    engagedRef.current.add(id);
    clearSkipped(id);
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      {error && (
        <p className="font-mono text-sm mb-4" style={{ color: "var(--accent)" }}>
          {error}
        </p>
      )}

      {posts === null && !error && (
        <p className="text-center text-sm mt-16" style={{ color: "var(--muted)" }}>
          Loading the feed…
        </p>
      )}

      {posts?.length === 0 && (
        <div className="text-center mt-20 flex flex-col items-center gap-3">
          <p className="font-display text-2xl" style={{ color: "var(--text)" }}>
            No frames yet.
          </p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Be the first to share a photo or video.
          </p>
          <Link
            href="/upload"
            className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold"
            style={{ background: "var(--accent)", color: "#14120f" }}
          >
            <Plus size={16} /> Upload
          </Link>
        </div>
      )}

      {posts?.map((post) => (
        <div key={post.id} ref={(el) => observePost(el, post.id)}>
          <PostCard post={post} onDeleted={handleDeleted} onEngaged={() => handleEngaged(post.id)} />
        </div>
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
