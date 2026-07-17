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
  const { text } = await req.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: "Comment can't be empty." }, { status: 400 });
  }

  await connectDB();
  const post = await Post.findById(id);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  post.comments.push({ author: user._id, text: text.trim().slice(0, 500) });
  await post.save();

  const newComment = post.comments[post.comments.length - 1];

  return NextResponse.json({
    comment: {
      id: newComment._id.toString(),
      text: newComment.text,
      createdAt: newComment.createdAt,
      author: {
        id: user._id.toString(),
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
      },
    },
  });
}
