import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 30, 100);

  await connectDB();
  const notifications = await Notification.find({ recipient: user._id })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate("sender", "username displayName avatar")
    .populate("post", "thumbnail mediaUrl mediaType")
    .lean();

  const unreadCount = await Notification.countDocuments({ recipient: user._id, read: false });

  return NextResponse.json({
    unreadCount,
    notifications: notifications
      .filter((n) => n.sender && n.post)
      .map((n) => ({
        id: n._id.toString(),
        type: n.type,
        read: n.read,
        commentText: n.commentText || "",
        createdAt: n.updatedAt || n.createdAt,
        sender: {
          id: n.sender._id.toString(),
          username: n.sender.username,
          displayName: n.sender.displayName,
          avatar: n.sender.avatar,
        },
        post: {
          id: n.post._id.toString(),
          thumbnailUrl: n.post.thumbnail || (n.post.mediaType === "image" ? n.post.mediaUrl : "") || "",
        },
      })),
  });
}

// Mark every notification as read.
export async function PATCH() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  await connectDB();
  await Notification.updateMany({ recipient: user._id, read: false }, { $set: { read: true } });

  return NextResponse.json({ ok: true });
}
