import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser, hasAccess } from "@/lib/auth";
import User from "@/models/User";
import Post from "@/models/Post";
import { deleteMediaFile } from "@/lib/upload";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || !hasAccess(currentUser, ["moderator", "admin"])) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  await connectDB();
  const users = await User.find({})
    .select("username email role banned avatar displayName createdAt followers")
    .sort({ createdAt: -1 })
    .lean();

  const safeUsers = users.map((user) => ({
    id: user._id.toString(),
    username: user.username,
    displayName: user.displayName || "",
    email: user.email,
    avatar: user.avatar || "",
    role: user.role || "user",
    banned: Boolean(user.banned),
    followersCount: user.followers?.length || 0,
  }));

  return NextResponse.json({ users: safeUsers, canManageRoles: currentUser.role === "admin" });
}

export async function PATCH(req) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !hasAccess(currentUser, ["moderator", "admin"])) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  try {
    const { userId, role, banned } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "Missing user." }, { status: 400 });
    }

    await connectDB();
    const target = await User.findById(userId);
    if (!target) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (role !== undefined) {
      if (currentUser.role !== "admin") {
        return NextResponse.json({ error: "Only admins can change roles." }, { status: 403 });
      }
      if (!["user", "moderator", "admin"].includes(role)) {
        return NextResponse.json({ error: "Invalid role update request." }, { status: 400 });
      }
      target.role = role;
    }

    if (banned !== undefined) {
      if (target._id.toString() === currentUser._id.toString()) {
        return NextResponse.json({ error: "You can't ban your own account." }, { status: 400 });
      }
      if (currentUser.role === "moderator" && target.role !== "user") {
        return NextResponse.json(
          { error: "Moderators can only manage regular users." },
          { status: 403 }
        );
      }
      target.banned = Boolean(banned);
    }

    await target.save();
    return NextResponse.json({ ok: true, role: target.role, banned: target.banned });
  } catch {
    return NextResponse.json({ error: "Could not update this user." }, { status: 500 });
  }
}

export async function DELETE(req) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !hasAccess(currentUser, ["moderator", "admin"])) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "Missing user." }, { status: 400 });
    }
    if (userId === currentUser._id.toString()) {
      return NextResponse.json({ error: "You can't delete your own account here." }, { status: 400 });
    }

    await connectDB();
    const target = await User.findById(userId);
    if (!target) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    if (currentUser.role === "moderator" && target.role !== "user") {
      return NextResponse.json(
        { error: "Moderators can only manage regular users." },
        { status: 403 }
      );
    }

    const posts = await Post.find({ author: target._id });
    for (const post of posts) {
      for (const item of post.mediaItems || []) {
        await deleteMediaFile(item).catch(() => {});
      }
    }
    await Post.deleteMany({ author: target._id });
    await User.updateMany({}, { $pull: { followers: target._id, following: target._id } });
    await User.findByIdAndDelete(target._id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not delete this user." }, { status: 500 });
  }
}
