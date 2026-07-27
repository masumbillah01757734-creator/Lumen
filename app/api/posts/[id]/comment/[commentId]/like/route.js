import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Post from "@/models/Post";
import { getCurrentUser } from "@/lib/auth";
import { createNotification, removeLikeNotification } from "@/lib/notify";

export async function POST(req, { params }) {
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
  const already = comment.likes.some((l) => l.toString() === uid);
  if (already) {
    comment.likes = comment.likes.filter((l) => l.toString() !== uid);
  } else {
    comment.likes.push(user._id);
  }
  await post.save();

  if (already) {
    await removeLikeNotification({
      recipientId: comment.author,
      senderId: user._id,
      type: "like_comment",
      postId: post._id,
      commentId: comment._id.toString(),
    });
  } else {
    await createNotification({
      recipientId: comment.author,
      senderId: user._id,
      type: "like_comment",
      postId: post._id,
      commentId: comment._id.toString(),
      commentText: comment.text,
    });
  }

  return NextResponse.json({ liked: !already, likeCount: comment.likes.length });
}
