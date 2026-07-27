import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import { getCurrentUser } from "@/lib/auth";
// Imported so their schemas are registered with mongoose before we
// .populate() references to them below.
import "@/models/Post";
import "@/models/User";

function serialize(n) {
  return {
    id: n._id.toString(),
    type: n.type,
    read: n.read,
    createdAt: n.createdAt,
    commentText: n.commentText || "",
    sender: n.sender
      ? {
          id: n.sender._id.toString(),
          username: n.sender.username,
          displayName: n.sender.displayName,
          avatar: n.sender.avatar,
        }
      : null,
    post: n.post
      ? {
          id: n.post._id.toString(),
          thumbnailUrl: n.post.thumbnail || (n.post.mediaType === "image" ? n.post.mediaUrl : "") || "",
          mediaType: n.post.mediaType,
          author: n.post.author ? { username: n.post.author.username } : null,
        }
      : null,
  };
}

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

  await connectDB();

  const [total, unreadCount, items] = await Promise.all([
    Notification.countDocuments({ recipient: user._id }),
    Notification.countDocuments({ recipient: user._id, read: false }),
    Notification.find({ recipient: user._id })
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("sender", "username displayName avatar")
      .populate({ path: "post", select: "thumbnail mediaUrl mediaType author", populate: { path: "author", select: "username" } })
      .lean(),
  ]);

  return NextResponse.json({
    notifications: items.map(serialize),
    unreadCount,
    page,
    hasMore: page * limit < total,
  });
}

// Mark notifications as read. Body: { id: "<notifId>" } for a single one,
// or {} / { all: true } to mark everything as read (e.g. on opening the bell).
export async function PATCH(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  await connectDB();

  if (body.id) {
    await Notification.updateOne(
      { _id: body.id, recipient: user._id },
      { $set: { read: true } }
    );
  } else {
    await Notification.updateMany(
      { recipient: user._id, read: false },
      { $set: { read: true } }
    );
  }

  return NextResponse.json({ ok: true });
}
