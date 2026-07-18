import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Post from "@/models/Post";
import { getCurrentUser } from "@/lib/auth";
import { serializePost } from "@/app/api/posts/route";

export async function GET(req, { params }) {
  const { username } = await params;
  const viewer = await getCurrentUser();

  await connectDB();
  const profile = await User.findOne({ username: username.toLowerCase() }).select("_id username").lean();
  if (!profile) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const posts = await Post.find({ author: profile._id })
    .sort({ createdAt: -1 })
    .populate("author", "username displayName avatar")
    .populate("comments.author", "username displayName avatar")
    .lean();

  return NextResponse.json({
    posts: posts.map((p) => serializePost(p, viewer?._id || null)),
  });
}
