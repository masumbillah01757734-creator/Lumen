import { connectDB } from "@/lib/db";
import Post from "@/models/Post";
import { rankPosts, rankReels } from "@/lib/ranking";
import { serializePost } from "@/lib/serializePost";

const PAGE_LIMIT = 12;

/**
 * Shared feed-paging logic, used by both /api/posts (client-side pagination
 * for page 2+) and the server-rendered homepage (page 1, so real content is
 * present in the initial HTML instead of behind a client-side fetch).
 *
 * Keeping this in one place means the two call sites can never drift apart
 * in ranking/pagination behavior.
 */
export async function getFeedPage({
  page = 1,
  type,
  mode,
  seed,
  seenFreshIds = [],
  skippedIds = [],
  interestTags = [],
  interestAuthors = [],
  watchedRecently = new Map(),
  userId = null,
} = {}) {
  await connectDB();

  const query = type === "video" || type === "image" ? { mediaType: type } : {};

  const lightPosts = await Post.find(query)
    .select(
      "createdAt author hashtags likes comments views anonymousViews saves saveCount shares shareCount profileVisits profileVisitCount watchTimeMs"
    )
    .lean();

  const ranked =
    mode === "reels"
      ? rankReels(lightPosts, { seed, watchedRecently })
      : rankPosts(lightPosts, { seed, seenFreshIds, skippedIds, interestTags, interestAuthors });

  const start = (page - 1) * PAGE_LIMIT;
  const pageSlice = ranked.slice(start, start + PAGE_LIMIT);
  const freshById = new Map(pageSlice.map((p) => [p._id.toString(), Boolean(p.__isFresh)]));
  const pageIds = pageSlice.map((p) => p._id);

  const fullPosts = await Post.find({ _id: { $in: pageIds } })
    .populate("author", "username displayName avatar")
    .populate("comments.author", "username displayName avatar")
    .lean();
  const fullById = new Map(fullPosts.map((p) => [p._id.toString(), p]));

  const pageItems = pageIds
    .map((id) => fullById.get(id.toString()))
    .filter(Boolean)
    .map((p) => Object.assign(p, { __isFresh: freshById.get(p._id.toString()) }));

  const serialized = pageItems.map((p) => serializePost(p, userId));

  return {
    posts: serialized,
    page,
    hasMore: start + PAGE_LIMIT < ranked.length,
    totalCount: ranked.length,
  };
}
