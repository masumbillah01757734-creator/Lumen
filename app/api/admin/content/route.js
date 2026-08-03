import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser, hasAccess } from "@/lib/auth";
import Post from "@/models/Post";
import User from "@/models/User";

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/admin/content?sort=new|top&type=all|image|video&q=&limit=30
// Powers the moderator/admin "Content" tab — lets staff quickly see the
// newest uploads (to catch anything that needs review fast), the
// highest-viewed reels/posts (to see what's trending), and search by
// username or caption.
export async function GET(req) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !hasAccess(currentUser, ["moderator", "admin"])) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const sort = searchParams.get("sort") === "top" ? "top" : "new";
  const type = searchParams.get("type") || "all"; // all | image | video
  const q = (searchParams.get("q") || "").trim().slice(0, 100);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "30", 10) || 30, 1), 100);

  await connectDB();

  const query = {};
  if (type === "image" || type === "video") {
    query.mediaType = type;
  }

  if (q) {
    const safe = escapeRegex(q);
    const matchingUsers = await User.find({ username: new RegExp(safe, "i") }).select("_id");
    const authorIds = matchingUsers.map((u) => u._id);
    query.$or = [{ caption: new RegExp(safe, "i") }, ...(authorIds.length ? [{ author: { $in: authorIds } }] : [])];
  }

  let posts;

  if (sort === "top") {
    // Sort by view count across the WHOLE collection, not just recent
    // uploads — view count isn't a plain indexed field (it's an array
    // length plus an anonymous counter), so we compute it in an
    // aggregation pipeline and sort on that, rather than only looking at
    // the newest N posts and re-sorting those in JS (which was missing
    // older-but-popular posts entirely).
    posts = await Post.aggregate([
      { $match: query },
      {
        $addFields: {
          viewCount: {
            $add: [{ $size: { $ifNull: ["$views", []] } }, { $ifNull: ["$anonymousViews", 0] }],
          },
        },
      },
      { $sort: { viewCount: -1, createdAt: -1 } },
      { $limit: limit },
      {
        $project: {
          author: 1,
          mediaType: 1,
          thumbnail: 1,
          mediaUrl: 1,
          caption: 1,
          likes: 1,
          views: 1,
          anonymousViews: 1,
          comments: 1,
          saves: 1,
          shares: 1,
          createdAt: 1,
        },
      },
    ]);
    await Post.populate(posts, { path: "author", select: "username displayName avatar" });
  } else {
    posts = await Post.find(query)
      .select("author mediaType thumbnail mediaUrl caption likes views anonymousViews comments saves shares createdAt")
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("author", "username displayName avatar")
      .lean();
  }

  const items = posts.map((p) => ({
    id: p._id.toString(),
    mediaType: p.mediaType,
    thumbnailUrl: p.thumbnail || (p.mediaType === "image" ? p.mediaUrl : "") || "",
    mediaUrl: p.mediaUrl || "",
    caption: p.caption || "",
    createdAt: p.createdAt,
    author: p.author
      ? {
          username: p.author.username,
          displayName: p.author.displayName || "",
          avatar: p.author.avatar || "",
        }
      : null,
    likeCount: p.likes?.length || 0,
    viewCount: (p.views?.length || 0) + (p.anonymousViews || 0),
    commentCount: p.comments?.length || 0,
    saveCount: p.saves?.length || 0,
    shareCount: p.shares || 0,
  }));

  return NextResponse.json({ items, sort, type, q });
}
