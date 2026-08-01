import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Post from "@/models/Post";
import { getCurrentUser } from "@/lib/auth";
import { serializePost } from "@/app/api/posts/route";

export async function GET(req, { params }) {
  const { username } = await params;
  const viewer = await getCurrentUser();
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") || "6", 10)));
  const excludeId = searchParams.get("exclude") || null;

  await connectDB();
  const profile = await User.findOne({ username: username.toLowerCase() }).select("_id username").lean();
  if (!profile) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const query = { author: profile._id };
  if (excludeId) query._id = { $ne: excludeId };

  const total = await Post.countDocuments(query);
  const posts = await Post.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("author", "username displayName avatar")
    .populate("comments.author", "username displayName avatar")
    .lean();

  return NextResponse.json({
    posts: posts.map((p) => serializePost(p, viewer?._id || null)),
    page,
    hasMore: page * limit < total,
  });
}