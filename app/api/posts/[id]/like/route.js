import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Post from "@/models/Post";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();
  const post = await Post.findById(id);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const uid = user._id.toString();
  const already = post.likes.some((l) => l.toString() === uid);
  if (already) {
    post.likes = post.likes.filter((l) => l.toString() !== uid);
  } else {
    post.likes.push(user._id);
  }
  await post.save();

  return NextResponse.json({ liked: !already, likeCount: post.likes.length });
}
