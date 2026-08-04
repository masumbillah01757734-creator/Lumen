"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Loader2 } from "lucide-react";
import PostCard from "@/components/PostCard";
import AdBanner from "@/components/ads/AdBanner";
import NativeBanner from "@/components/ads/NativeBanner";
import { AD_BANNERS, NATIVE_BANNER } from "@/lib/ads";
import { getInterestProfile } from "@/lib/interest";
import { getSeenFreshIds, markSeenFresh, getSkippedIds, markSkipped, clearSkipped } from "@/lib/feedSession";

// Page 1 is already rendered server-side (see app/page.js) so the feed has
// real content in the initial HTML for crawlers/first paint. This component
// only ever fetches page 2 onward, reusing the same `seed` the server used
// for page 1 so the ranking pass stays consistent across the whole session
// instead of re-shuffling between pages.
function buildFeedQuery(page, seed) {
  const { tags, authors } = getInterestProfile();
  const params = new URLSearchParams({ page: String(page), seed });
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

export default function FeedClient({ initialPosts, initialHasMore, seed }) {
  const [posts, setPosts] = useState(initialPosts);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const engagedRef = useRef(new Set());
  const sentinelRef = useRef(null);
  const observePost = useSkipTracking(engagedRef);

  useEffect(() => {
    // The initial server-rendered batch may already contain "fresh" posts —
    // mark them seen the same way the old client-only fetch used to, so
    // they don't re-claim their freshness boost on the very next page load.
    const freshIds = initialPosts.filter((p) => p.isFresh).map((p) => p.id);
    if (freshIds.length) markSeenFresh(freshIds);
    // Only run once, on mount — initialPosts is a stable prop from the server.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPage = useCallback(
    (pageNum) => {
      setLoadingMore(true);
      fetch(`/api/posts?${buildFeedQuery(pageNum, seed)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            setError(data.error);
            return;
          }
          const freshIds = data.posts.filter((p) => p.isFresh).map((p) => p.id);
          if (freshIds.length) markSeenFresh(freshIds);
          setPosts((prev) => [...prev, ...data.posts]);
          setHasMore(Boolean(data.hasMore));
        })
        .catch(() => setError("Could not load the feed."))
        .finally(() => setLoadingMore(false));
    },
    [seed]
  );

  useEffect(() => {
    if (!hasMore || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const next = page + 1;
          setPage(next);
          loadPage(next);
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

      {posts.length === 0 && (
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

      {posts.map((post, i) => (
        <div key={post.id}>
          <div ref={(el) => observePost(el, post.id)}>
            <PostCard post={post} onDeleted={handleDeleted} onEngaged={() => handleEngaged(post.id)} />
          </div>

          {/* Every 5th post: native banner. Every 5th offset by 2: 300x250 rectangle. */}
          {(i + 1) % 5 === 0 && (
            <NativeBanner
              containerId={NATIVE_BANNER.containerId}
              src={NATIVE_BANNER.src}
              className="my-4"
            />
          )}
          {i > 0 && (i + 1) % 5 === 2 && (
            <div className="flex justify-center my-4">
              <AdBanner
                adKey={AD_BANNERS.medium_rectangle_300x250.key}
                width={AD_BANNERS.medium_rectangle_300x250.width}
                height={AD_BANNERS.medium_rectangle_300x250.height}
              />
            </div>
          )}
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
