import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser, hasAccess } from "@/lib/auth";
import Post from "@/models/Post";
import { deleteMediaFile } from "@/lib/upload";

// DELETE /api/admin/content/[id]
// Lets a moderator/admin remove any post or reel directly, regardless of
// who owns it — for takedowns, rule violations, etc.
export async function DELETE(req, { params }) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !hasAccess(currentUser, ["moderator", "admin"])) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();

  const post = await Post.findById(id);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  for (const item of post.mediaItems || []) {
    await deleteMediaFile(item);
  }

  await Post.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
