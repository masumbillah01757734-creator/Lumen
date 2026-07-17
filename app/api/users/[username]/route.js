import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Post from "@/models/Post";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req, { params }) {
  const { username } = await params;
  const viewer = await getCurrentUser();

  await connectDB();
  const profile = await User.findOne({ username: username.toLowerCase() }).lean();
  if (!profile) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const posts = await Post.find({ author: profile._id })
    .sort({ createdAt: -1 })
    .select("mediaUrl mediaType likes comments createdAt")
    .lean();

  return NextResponse.json({
    profile: {
      id: profile._id.toString(),
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio,
      avatar: profile.avatar,
      followerCount: profile.followers?.length || 0,
      followingCount: profile.following?.length || 0,
      postCount: posts.length,
      isMe: viewer ? viewer._id.toString() === profile._id.toString() : false,
      isFollowing: viewer
        ? profile.followers?.some((f) => f.toString() === viewer._id.toString())
        : false,
    },
    posts: posts.map((p) => ({
      id: p._id.toString(),
      mediaUrl: p.mediaUrl,
      mediaType: p.mediaType,
      likeCount: p.likes?.length || 0,
      commentCount: p.comments?.length || 0,
      createdAt: p.createdAt,
    })),
  });
}
