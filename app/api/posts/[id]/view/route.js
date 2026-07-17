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

  const alreadyViewed = post.views?.some((viewer) => viewer.toString() === user._id.toString());
  if (!alreadyViewed) {
    post.views.push(user._id);
    await post.save();
  }

  return NextResponse.json({ viewCount: post.views.length });
}
