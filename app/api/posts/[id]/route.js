import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { connectDB } from "@/lib/db";
import Post from "@/models/Post";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(req, { params }) {
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
  if (post.author.toString() !== user._id.toString()) {
    return NextResponse.json({ error: "You can only delete your own posts." }, { status: 403 });
  }

  try {
    await unlink(path.join(process.cwd(), "public", post.mediaUrl));
  } catch {
    // media file already missing — fine, continue.
  }

  await Post.findByIdAndDelete(id);

  return NextResponse.json({ ok: true });
}
