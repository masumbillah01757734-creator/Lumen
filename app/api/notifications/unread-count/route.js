import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ unreadCount: 0 });
  }

  await connectDB();
  const unreadCount = await Notification.countDocuments({ recipient: user._id, read: false });
  return NextResponse.json({ unreadCount });
}
