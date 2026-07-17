import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser, hasAccess } from "@/lib/auth";
import User from "@/models/User";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || !hasAccess(currentUser, ["moderator", "admin"])) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  await connectDB();
  const users = await User.find({})
    .select("username email role passwordHash createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const safeUsers = users.map((user) => ({
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role || "user",
    passwordHash: user.passwordHash || "",
    passwordHint: user.passwordHash ? "stored securely" : "none",
  }));

  return NextResponse.json({ users: safeUsers, canManageRoles: currentUser.role === "admin" });
}

export async function PATCH(req) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Only admins can change roles." }, { status: 403 });
  }

  try {
    const { userId, role } = await req.json();
    if (!userId || !["user", "moderator", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role update request." }, { status: 400 });
    }

    await connectDB();
    const target = await User.findById(userId);
    if (!target) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    target.role = role;
    await target.save();

    return NextResponse.json({ ok: true, role });
  } catch {
    return NextResponse.json({ error: "Could not update role." }, { status: 500 });
  }
}
