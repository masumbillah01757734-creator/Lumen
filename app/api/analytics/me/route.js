import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Post from "@/models/Post";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  await connectDB();
  const posts = await Post.find({ author: user._id })
    .select("mediaType thumbnail mediaUrl caption likes views anonymousViews comments saves shares profileVisits createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const summary = posts.reduce(
    (acc, p) => {
      const likeCount = p.likes?.length || 0;
      const viewCount = (p.views?.length || 0) + (p.anonymousViews || 0);
      const commentCount = p.comments?.length || 0;
      acc.totalLikes += likeCount;
      acc.totalViews += viewCount;
      acc.totalComments += commentCount;
      acc.totalSaves += p.saves?.length || 0;
      acc.totalShares += p.shares || 0;
      acc.totalProfileVisits += p.profileVisits || 0;
      return acc;
    },
    { totalLikes: 0, totalViews: 0, totalComments: 0, totalSaves: 0, totalShares: 0, totalProfileVisits: 0 }
  );

  const postStats = posts.map((p) => {
    const likeCount = p.likes?.length || 0;
    const viewCount = (p.views?.length || 0) + (p.anonymousViews || 0);
    const commentCount = p.comments?.length || 0;
    const saveCount = p.saves?.length || 0;
    return {
      id: p._id.toString(),
      mediaType: p.mediaType,
      thumbnailUrl: p.thumbnail || (p.mediaType === "image" ? p.mediaUrl : "") || "",
      caption: p.caption || "",
      createdAt: p.createdAt,
      likeCount,
      viewCount,
      commentCount,
      saveCount,
      shareCount: p.shares || 0,
      engagement: likeCount + commentCount + saveCount + (p.shares || 0),
    };
  });

  const topPosts = [...postStats].sort((a, b) => b.engagement - a.engagement).slice(0, 5);

  return NextResponse.json({
    postCount: posts.length,
    followerCount: user.followers?.length || 0,
    followingCount: user.following?.length || 0,
    summary,
    topPosts,
    posts: postStats,
  });
}
