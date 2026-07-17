import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req) {
  try {
    const { identifier, password } = await req.json();
    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Enter your username/email and password." },
        { status: 400 }
      );
    }

    await connectDB();
    const clean = identifier.trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ username: clean }, { email: clean }],
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account matches those details." },
        { status: 401 }
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Incorrect password." },
        { status: 401 }
      );
    }

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
      { error: "Something went wrong logging you in." },
      { status: 500 }
    );
  }
}
