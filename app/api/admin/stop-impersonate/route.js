import { NextResponse } from "next/server";
import { stopImpersonation } from "@/lib/auth";

export async function POST() {
  const adminId = await stopImpersonation();
  if (!adminId) {
    return NextResponse.json({ error: "You're not currently signed in as someone else." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
