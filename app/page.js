import FeedClient from "@/components/FeedClient";
import { getFeedPage } from "@/lib/getFeedPage";
import { getCurrentUser } from "@/lib/auth";

// Server-rendered so the first batch of posts is present in the initial
// HTML (crawlers, link previews, and first paint all see real content
// instead of a "Loading the feed…" placeholder). Page 2+ is still fetched
// client-side for infinite scroll — see components/FeedClient.js.
export const dynamic = "force-dynamic";

function randomSeed() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default async function FeedPage() {
  const user = await getCurrentUser();
  const seed = randomSeed();

  const { posts, hasMore } = await getFeedPage({
    page: 1,
    seed,
    userId: user?._id || null,
  });

  return <FeedClient initialPosts={posts} initialHasMore={hasMore} seed={seed} />;
}
