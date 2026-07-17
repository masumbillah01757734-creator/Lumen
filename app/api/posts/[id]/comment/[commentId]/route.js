import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Post from "@/models/Post";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id, commentId } = await params;
  const { text } = await req.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: "Comment can't be empty." }, { status: 400 });
  }

  await connectDB();
  const post = await Post.findById(id);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  const comment = post.comments.id(commentId);
  if (!comment) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }
  if (comment.author.toString() !== user._id.toString()) {
    return NextResponse.json(
      { error: "You can only edit your own comments." },
      { status: 403 }
    );
  }

  comment.text = text.trim().slice(0, 500);
  await post.save();

  return NextResponse.json({
    comment: {
      id: comment._id.toString(),
      text: comment.text,
      updatedAt: comment.updatedAt,
    },
  });
}

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id, commentId } = await params;
  await connectDB();
  const post = await Post.findById(id);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  const comment = post.comments.id(commentId);
  if (!comment) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  const uid = user._id.toString();
  const isCommentAuthor = comment.author.toString() === uid;
  const isPostOwner = post.author.toString() === uid;
  if (!isCommentAuthor && !isPostOwner) {
    return NextResponse.json(
      { error: "You can only delete your own comments, or comments on your own post." },
      { status: 403 }
    );
  }

  comment.deleteOne();
  await post.save();

  return NextResponse.json({ ok: true });
}
