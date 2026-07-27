import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Post from "@/models/Post";
import Notification from "@/models/Notification";
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

  const nowLiked = !already;
  const isOwnPost = post.author.toString() === uid;

  if (!isOwnPost) {
    if (nowLiked) {
      // Avoid stacking duplicate "X liked your post" entries if someone
      // unlikes and relikes repeatedly — just bump the existing one.
      await Notification.findOneAndUpdate(
        { recipient: post.author, sender: user._id, post: post._id, type: "like" },
        { $set: { read: false } },
        { upsert: true, setDefaultsOnInsert: true }
      );
    } else {
      await Notification.deleteOne({
        recipient: post.author,
        sender: user._id,
        post: post._id,
        type: "like",
      });
    }
  }

  return NextResponse.json({ liked: nowLiked, likeCount: post.likes.length });
}
