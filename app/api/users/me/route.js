import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Post from "@/models/Post";
import { getCurrentUser, clearSessionCookie } from "@/lib/auth";
import { saveMediaFile } from "@/lib/upload";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      username: user.username,
      displayName: user.displayName,
      bio: user.bio || "",
      avatar: user.avatar || "",
      email: user.email,
    },
  });
}

export async function PATCH(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const displayName = form.get("displayName")?.toString().trim();
    const bio = form.get("bio")?.toString().slice(0, 160) ?? undefined;
    const usernameRaw = form.get("username")?.toString().trim().toLowerCase();
    const avatarFile = form.get("avatar");

    await connectDB();
    const doc = await User.findById(user._id);

    if (usernameRaw && usernameRaw !== doc.username) {
      if (!/^[a-z0-9_.]{3,24}$/.test(usernameRaw)) {
        return NextResponse.json(
          { error: "Username must be 3-24 characters: lowercase letters, numbers, dot, underscore." },
          { status: 400 }
        );
      }
      const clash = await User.findOne({ username: usernameRaw });
      if (clash) {
        return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
      }
      doc.username = usernameRaw;
    }

    if (displayName) doc.displayName = displayName.slice(0, 50);
    if (bio !== undefined) doc.bio = bio;

    if (avatarFile && typeof avatarFile !== "string" && avatarFile.size > 0) {
      const { url, mediaType } = await saveMediaFile(avatarFile);
      if (mediaType !== "image") {
        return NextResponse.json({ error: "Profile photo must be an image." }, { status: 400 });
      }
      doc.avatar = url;
    }

    await doc.save();

    return NextResponse.json({
      user: {
        username: doc.username,
        displayName: doc.displayName,
        bio: doc.bio,
        avatar: doc.avatar,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Could not update your profile." },
      { status: 400 }
    );
  }
}

export async function DELETE(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { password } = await req.json();
  if (!password) {
    return NextResponse.json({ error: "Enter your password to confirm." }, { status: 400 });
  }

  await connectDB();
  const doc = await User.findById(user._id);
  const ok = await bcrypt.compare(password, doc.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  // Remove this user's own posts, including their media files on disk.
  const ownPosts = await Post.find({ author: doc._id }).select("mediaUrl");
  for (const p of ownPosts) {
    try {
      await unlink(path.join(process.cwd(), "public", p.mediaUrl));
    } catch {
      // already gone — fine
    }
  }
  await Post.deleteMany({ author: doc._id });

  // Strip this user out of everyone else's posts: likes, views, comments,
  // and comment-likes.
  await Post.updateMany(
    {},
    { $pull: { likes: doc._id, views: doc._id, comments: { author: doc._id } } }
  );
  await Post.updateMany({}, { $pull: { "comments.$[].likes": doc._id } });

  // Remove this user from other users' followers/following lists.
  await User.updateMany({}, { $pull: { followers: doc._id, following: doc._id } });

  await User.findByIdAndDelete(doc._id);
  await clearSessionCookie();

  return NextResponse.json({ ok: true });
}
