import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Post from "@/models/Post";
import { getCurrentUser } from "@/lib/auth";

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().slice(0, 80);
  const limit = Math.min(parseInt(searchParams.get("limit") || "8", 10) || 8, 30);

  if (!q) {
    return NextResponse.json({ query: "", users: [], posts: [] });
  }

  const viewer = await getCurrentUser();
  await connectDB();

  const safe = escapeRegex(q.replace(/^#/, ""));
  const regex = new RegExp(safe, "i");

  const [users, posts] = await Promise.all([
    User.find({ $or: [{ username: regex }, { displayName: regex }] })
      .select("username displayName avatar bio")
      .limit(limit)
      .lean(),
    Post.find({ $or: [{ caption: regex }, { hashtags: regex }, { location: regex }] })
      .populate("author", "username displayName avatar")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
  ]);

  return NextResponse.json({
    query: q,
    users: users.map((u) => ({
      id: u._id.toString(),
      username: u.username,
      displayName: u.displayName,
      avatar: u.avatar,
      bio: u.bio,
    })),
    posts: posts.map((p) => ({
      id: p._id.toString(),
      mediaUrl: p.mediaUrl,
      mediaType: p.mediaType,
      thumbnailUrl: p.thumbnail || (p.mediaType === "image" ? p.mediaUrl : ""),
      caption: p.caption,
      hashtags: p.hashtags || [],
      likeCount: p.likes?.length || 0,
      commentCount: p.comments?.length || 0,
      createdAt: p.createdAt,
      author: p.author
        ? { id: p.author._id.toString(), username: p.author.username, displayName: p.author.displayName, avatar: p.author.avatar }
        : null,
    })),
    viewerSignedIn: Boolean(viewer),
  });
}
