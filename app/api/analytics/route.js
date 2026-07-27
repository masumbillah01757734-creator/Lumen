import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Post from "@/models/Post";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  await connectDB();

  const [posts, me] = await Promise.all([
    Post.find({ author: user._id })
      .select("mediaType thumbnail mediaUrl likes views anonymousViews comments saves shares createdAt")
      .sort({ createdAt: -1 })
      .lean(),
    User.findById(user._id).select("followers following").lean(),
  ]);

  const withCounts = posts.map((p) => ({
    id: p._id.toString(),
    mediaType: p.mediaType,
    thumbnailUrl: p.thumbnail || (p.mediaType === "image" ? p.mediaUrl : "") || "",
    likeCount: p.likes?.length || 0,
    viewCount: (p.views?.length || 0) + (p.anonymousViews || 0),
    commentCount: p.comments?.length || 0,
    saveCount: p.saves?.length || 0,
    shareCount: p.shares || 0,
    createdAt: p.createdAt,
  }));

  const totals = withCounts.reduce(
    (acc, p) => {
      acc.totalLikes += p.likeCount;
      acc.totalViews += p.viewCount;
      acc.totalComments += p.commentCount;
      acc.totalSaves += p.saveCount;
      acc.totalShares += p.shareCount;
      return acc;
    },
    { totalLikes: 0, totalViews: 0, totalComments: 0, totalSaves: 0, totalShares: 0 }
  );

  const topPosts = [...withCounts]
    .sort((a, b) => b.likeCount + b.viewCount - (a.likeCount + a.viewCount))
    .slice(0, 6);

  const photoCount = withCounts.filter((p) => p.mediaType === "image").length;
  const videoCount = withCounts.filter((p) => p.mediaType === "video").length;

  return NextResponse.json({
    totals: {
      ...totals,
      postCount: withCounts.length,
      photoCount,
      videoCount,
      followerCount: me?.followers?.length || 0,
      followingCount: me?.following?.length || 0,
    },
    topPosts,
    recentPosts: withCounts.slice(0, 8),
  });
}
