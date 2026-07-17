import { put } from "@vercel/blob";
import crypto from "crypto";

// .mov/quicktime is deliberately excluded: most browsers can't play it
// inline in a <video> tag and just offer it as a download instead.
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm"];

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_BYTES = 150 * 1024 * 1024; // 150MB

export async function saveMediaFile(file) {
  if (!file || typeof file === "string") {
    throw new Error("No file provided.");
  }

  const isImage = IMAGE_TYPES.includes(file.type);
  const isVideo = VIDEO_TYPES.includes(file.type);
  if (!isImage && !isVideo) {
    throw new Error(
      "Only jpg, png, webp, gif, mp4, or webm files are allowed. (.mov isn't supported — most browsers can't play it inline; export as .mp4 instead.)"
    );
  }

  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    const label = isVideo ? "150MB" : "10MB";
    throw new Error(`File is too large. Max size for ${isVideo ? "videos" : "images"} is ${label}.`);
  }

  const ext = isImage
    ? file.name?.split(".").pop()?.toLowerCase() || "jpg"
    : file.type === "video/webm"
      ? "webm"
      : "mp4";
  const filename = `${crypto.randomUUID()}.${ext}`;

  // Vercel's serverless functions have a read-only, ephemeral filesystem —
  // writing to /public/uploads at runtime doesn't persist in production.
  // Vercel Blob stores the file externally and gives back a permanent,
  // publicly servable URL (correct content-type + range-request support,
  // so <video> tags play inline instead of falling back to a download).
  const blob = await put(`uploads/${filename}`, file, {
    access: "public",
    contentType: file.type,
  });

  return {
    url: blob.url,
    mediaType: isImage ? "image" : "video",
  };
}
