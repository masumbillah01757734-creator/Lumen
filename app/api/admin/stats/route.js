import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser, hasAccess } from "@/lib/auth";
import User from "@/models/User";
import Post from "@/models/Post";

// GET /api/admin/stats
// Site-wide numbers for the admin/moderator dashboard: totals plus
// "today" counts so staff can see activity at a glance.
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || !hasAccess(currentUser, ["moderator", "admin"])) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  await connectDB();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    bannedUsers,
    signupsToday,
    totalPosts,
    totalReels,
    postsToday,
    reelsToday,
    viewAgg,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ banned: true }),
    User.countDocuments({ createdAt: { $gte: startOfToday } }),
    Post.countDocuments({ mediaType: "image" }),
    Post.countDocuments({ mediaType: "video" }),
    Post.countDocuments({ mediaType: "image", createdAt: { $gte: startOfToday } }),
    Post.countDocuments({ mediaType: "video", createdAt: { $gte: startOfToday } }),
    Post.aggregate([
      {
        $group: {
          _id: null,
          totalViews: {
            $sum: { $add: [{ $size: { $ifNull: ["$views", []] } }, { $ifNull: ["$anonymousViews", 0] }] },
          },
        },
      },
    ]),
  ]);

  return NextResponse.json({
    users: { total: totalUsers, banned: bannedUsers, signupsToday },
    posts: { total: totalPosts, todayCount: postsToday },
    reels: { total: totalReels, todayCount: reelsToday },
    views: { total: viewAgg[0]?.totalViews || 0 },
  });
}
