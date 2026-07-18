import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Post from "@/models/Post";

// Anyone can share a post link (no sign-in required), so this just counts it.
export async function POST(req, { params }) {
  const { id } = await params;
  await connectDB();
  const post = await Post.findByIdAndUpdate(id, { $inc: { shares: 1 } }, { new: true }).select("shares");
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  return NextResponse.json({ shareCount: post.shares });
}
