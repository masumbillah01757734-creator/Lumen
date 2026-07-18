import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getCurrentUser, hasAccess, startImpersonation, getImpersonatorId } from "@/lib/auth";

export async function POST(req) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !hasAccess(currentUser, ["moderator", "admin"])) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  const alreadyImpersonating = await getImpersonatorId();
  if (alreadyImpersonating) {
    return NextResponse.json(
      { error: "Return to your admin account before logging in as someone else." },
      { status: 400 }
    );
  }

  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "Missing user." }, { status: 400 });
    }
    if (userId === currentUser._id.toString()) {
      return NextResponse.json({ error: "You're already signed in as yourself." }, { status: 400 });
    }

    await connectDB();
    const target = await User.findById(userId).lean();
    if (!target) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (currentUser.role === "moderator" && target.role !== "user") {
      return NextResponse.json(
        { error: "Moderators can only log in as regular users." },
        { status: 403 }
      );
    }

    await startImpersonation(currentUser._id.toString(), target._id.toString());
    return NextResponse.json({ ok: true, username: target.username });
  } catch {
    return NextResponse.json({ error: "Could not log in as this user." }, { status: 500 });
  }
}
