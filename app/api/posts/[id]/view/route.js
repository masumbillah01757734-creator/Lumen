import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Post from "@/models/Post";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req, { params }) {
  const user = await getCurrentUser();

  const { id } = await params;
  await connectDB();
  const post = await Post.findById(id);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  if (!user) {
    post.anonymousViews = (post.anonymousViews || 0) + 1;
    await post.save();
    return NextResponse.json({ viewCount: post.views.length + post.anonymousViews });
  }

  const alreadyViewed = post.views?.some((viewer) => viewer.toString() === user._id.toString());
  if (!alreadyViewed) {
    post.views.push(user._id);
    await post.save();
  }

  return NextResponse.json({ viewCount: post.views.length + (post.anonymousViews || 0) });
}
