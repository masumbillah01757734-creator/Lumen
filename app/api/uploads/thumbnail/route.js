import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { saveMediaFile } from "@/lib/upload";

// Used by the upload page: after a video finishes uploading, the browser
// captures a frame from it (canvas) and sends that single image here so it
// can be stored as the post's thumbnail — used for the reel's link-share
// preview (og:image) since social apps need an image, not a video, to show
// a card thumbnail.
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      throw new Error("No thumbnail image provided.");
    }
    const saved = await saveMediaFile(file);
    return NextResponse.json({ url: saved.url });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Could not save the thumbnail." },
      { status: 400 }
    );
  }
}
