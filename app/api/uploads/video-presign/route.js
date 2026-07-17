import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPresignedVideoUpload } from "@/lib/upload";

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const fileName = (body.fileName || "").toString();
    const contentType = (body.contentType || "").toString();
    const size = typeof body.size === "number" ? body.size : undefined;

    const target = await createPresignedVideoUpload(fileName, contentType, size);
    return NextResponse.json(target);
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Could not prepare upload." },
      { status: 400 }
    );
  }
}
