import crypto from "crypto";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_BYTES = 50 * 1024 * 1024; // 50MB
export const MAX_IMAGE_COUNT = 10;

let r2Client;
export function getR2Client() {
  if (r2Client) return r2Client;

  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT } = process.env;
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error(
      "R2 credentials are not set. Add R2_* variables to .env.local (see .env.local.example)."
    );
  }

  r2Client = new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
  return r2Client;
}

function getMediaType(file) {
  if (!file || typeof file === "string") return null;
  if (IMAGE_TYPES.includes(file.type)) return "image";
  if (VIDEO_TYPES.includes(file.type)) return "video";
  return null;
}

function getFileExtension(file, mediaType) {
  const fallback = mediaType === "image" ? "jpg" : "mp4";
  return file.name?.split(".").pop()?.toLowerCase() || fallback;
}

async function optimizeImageBuffer(buffer) {
  const image = sharp(buffer).resize({ width: 1600, withoutEnlargement: true });
  const metadata = await image.metadata();

  if (metadata.format === "gif") {
    return {
      buffer: await sharp(buffer).resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 82, progressive: true }).toBuffer(),
      contentType: "image/jpeg",
      ext: "jpg",
    };
  }

  return {
    buffer: await image.webp({ quality: 82 }).toBuffer(),
    contentType: "image/webp",
    ext: "webp",
  };
}

export async function saveMediaFile(file) {
  if (!file || typeof file === "string") {
    throw new Error("No file provided.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("File is too large. Max size is 50MB.");
  }

  const mediaType = getMediaType(file);
  if (!mediaType) {
    throw new Error("Only jpg, png, webp, gif, mp4, webm, or mov files are allowed.");
  }

  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    throw new Error(
      "R2_BUCKET_NAME is not set. Add it to .env.local (see .env.local.example)."
    );
  }

  const ext = getFileExtension(file, mediaType);
  const key = `uploads/${crypto.randomUUID()}.${ext}`;
  const originalBuffer = Buffer.from(await file.arrayBuffer());
  let body = originalBuffer;
  let contentType = file.type;

  if (mediaType === "image") {
    const optimized = await optimizeImageBuffer(originalBuffer);
    body = optimized.buffer;
    contentType = optimized.contentType;
  }

  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!publicBase) {
    throw new Error(
      "R2_PUBLIC_URL is not set. Add it to .env.local — the public base URL for your R2 bucket (custom domain or r2.dev URL)."
    );
  }

  return {
    url: `${publicBase}/${key}`,
    mediaType,
    key,
  };
}

// Vercel Functions hard-cap request bodies at 4.5MB, so videos can't be routed
// through a Next.js API route the way images are. Instead, the browser asks
// this helper for a short-lived presigned PUT URL and uploads the video
// bytes straight to R2, never touching our serverless function.
export async function createPresignedVideoUpload(fileName, contentType, size) {
  if (!VIDEO_TYPES.includes(contentType)) {
    throw new Error("Only mp4, webm, or mov files are allowed.");
  }
  if (typeof size === "number" && size > MAX_BYTES) {
    throw new Error("File is too large. Max size is 50MB.");
  }

  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    throw new Error(
      "R2_BUCKET_NAME is not set. Add it to .env.local (see .env.local.example)."
    );
  }

  const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!publicBase) {
    throw new Error(
      "R2_PUBLIC_URL is not set. Add it to .env.local — the public base URL for your R2 bucket (custom domain or r2.dev URL)."
    );
  }

  const ext = fileName?.split(".").pop()?.toLowerCase() || "mp4";
  const key = `uploads/${crypto.randomUUID()}.${ext}`;

  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });

  return {
    uploadUrl,
    publicUrl: `${publicBase}/${key}`,
    key,
    mediaType: "video",
  };
}

export async function saveMediaFiles(files) {
  if (!Array.isArray(files)) {
    return [await saveMediaFile(files)];
  }
  return Promise.all(files.map((file) => saveMediaFile(file)));
}

export async function deleteMediaFile(media) {
  if (!media) return;

  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) return;

  const client = getR2Client();
  const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

  let key = typeof media === "string" ? media : media.key;
  if (!key && typeof media === "string") {
    if (publicBase && media.startsWith(publicBase)) {
      key = media.slice(publicBase.length).replace(/^\/+/, "");
    } else {
      try {
        const parsed = new URL(media);
        key = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
      } catch {
        key = null;
      }
    }
  }

  if (!key) return;

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}
