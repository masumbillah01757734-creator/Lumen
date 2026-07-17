import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req, { params }) {
  const viewer = await getCurrentUser();
  if (!viewer) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { username } = await params;
  await connectDB();
  const target = await User.findOne({ username: username.toLowerCase() });
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (target._id.toString() === viewer._id.toString()) {
    return NextResponse.json({ error: "You can't follow yourself." }, { status: 400 });
  }

  const viewerId = viewer._id.toString();
  const alreadyFollowing = target.followers.some((f) => f.toString() === viewerId);

  if (alreadyFollowing) {
    target.followers = target.followers.filter((f) => f.toString() !== viewerId);
    await target.save();
    await User.findByIdAndUpdate(viewer._id, { $pull: { following: target._id } });
  } else {
    target.followers.push(viewer._id);
    await target.save();
    await User.findByIdAndUpdate(viewer._id, { $addToSet: { following: target._id } });
  }

  return NextResponse.json({
    following: !alreadyFollowing,
    followerCount: target.followers.length,
  });
}
