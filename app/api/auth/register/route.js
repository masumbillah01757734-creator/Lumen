import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req) {
  try {
    const { username, email, password, displayName, role } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email, and password are all required." },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }
    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_.]{3,24}$/.test(cleanUsername)) {
      return NextResponse.json(
        {
          error:
            "Username must be 3-24 characters: lowercase letters, numbers, dot, underscore.",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await User.findOne({
      $or: [{ username: cleanUsername }, { email: email.toLowerCase().trim() }],
    });
    if (existing) {
      return NextResponse.json(
        { error: "That username or email is already taken." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const existingAdminCount = await User.countDocuments({ role: "admin" });
    const normalizedRole = role === "moderator" || role === "admin" ? role : "user";
    const user = await User.create({
      username: cleanUsername,
      email: email.toLowerCase().trim(),
      passwordHash,
      displayName: displayName?.trim() || cleanUsername,
      role: existingAdminCount === 0 && normalizedRole === "admin" ? "admin" : normalizedRole,
    });

    await setSessionCookie(user._id.toString());

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Something went wrong creating your account." },
      { status: 500 }
    );
  }
}
