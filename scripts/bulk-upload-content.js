/**
 * Bulk content uploader for LeakReels.
 *
 * "content" নামের folder-এ video আর image — দুই ধরনের file-ই রাখা যাবে,
 * প্রতিটা আলাদা আলাদা post হিসেবে একটা নির্দিষ্ট user-এর account-এ upload হয়ে যাবে।
 *
 * ব্যবহার:
 *   1) নিচের CONFIG অংশ পূরণ করুন (site URL, username/password, folder path)।
 *   2) প্রজেক্টের ভেতর থেকে রান করুন:  node scripts/bulk-upload-content.js
 *      (Node.js v18 বা তার বেশি ভার্সন লাগবে — built-in fetch দরকার)
 *
 * এটা ঠিক app-এর upload page যা করে সেটাই করে: presigned URL নেয়,
 * file সরাসরি storage-এ পাঠায় (video হলে একটা frame বের করে থাম্বনেইল
 * হিসেবেও আপলোড করে), তারপর post তৈরি করে — শুধু browser ছাড়াই, command line থেকে।
 *
 * থাম্বনেইলের জন্য (শুধু video-এর ক্ষেত্রে) system-এ `ffmpeg` ইনস্টল থাকতে হবে
 * (যেমন: `sudo apt install ffmpeg` অথবা `brew install ffmpeg`)। ffmpeg না থাকলে
 * বা কোনো কারণে ব্যর্থ হলে script থেমে যাবে না — সেক্ষেত্রে শুধু ওই post-টা
 * থাম্বনেইল ছাড়াই তৈরি হবে।
 *
 * ⚠️  IMAGE UPLOAD ASSUMPTION: image-এর জন্য video-এর মতোই presigned-URL
 * flow ধরে নেওয়া হয়েছে, এন্ডপয়েন্ট: POST /api/uploads/image-presign
 * (body: { fileName, contentType, size } → response: { uploadUrl, publicUrl, key }),
 * ঠিক video-presign-এর মতোই। আপনার app-এ image upload-এর route আলাদা হলে
 * নিচের `presignImage` function-টা সেই route/response shape অনুযায়ী বদলে নিন।
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");

// ─────────────────────────────── CONFIG ───────────────────────────────
const CONFIG = {
  // যে site-এ app চলছে (local dev হলে http://localhost:3000,
  // deploy করা থাকলে সেই domain, যেমন https://your-app.vercel.app)
  BASE_URL: "http://localhost:3000",

  // যে user-এর account-এ upload হবে তার username/email আর password
  IDENTIFIER: "rupali",
  PASSWORD: "king@billah",

  // যে folder-এ video ও image file গুলো আছে (এই script-এর সাপেক্ষে path, বা full path দিন)
  CONTENT_FOLDER: path.join(__dirname, "..", "content"),

  // প্রতিটা post-এ caption/hashtags/location — চাইলে ফাঁকা রাখতে পারেন
  CAPTION: "",
  HASHTAGS: "",
  LOCATION: "",

  // true করলে filename (extension বাদে) caption হিসেবে বসবে, উপরের CAPTION-এর বদলে
  USE_FILENAME_AS_CAPTION: false,

  // দুইটা upload-এর মাঝে কত মিলিসেকেন্ড wait করবে (server-কে চাপ না দেওয়ার জন্য)
  DELAY_MS: 1500,

  // ভিডিওর কততম সেকেন্ডের frame থাম্বনেইল হিসেবে নেওয়া হবে
  THUMBNAIL_SEEK_SECONDS: 0.5,
};
// ────────────────────────────────────────────────────────────────────

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const ALL_EXTENSIONS = [...VIDEO_EXTENSIONS, ...IMAGE_EXTENSIONS];

const CONTENT_TYPE_BY_EXT = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const MAX_BYTES_BY_TYPE = {
  video: 50 * 1024 * 1024, // app-এর নিজের 50MB video limit
  image: 15 * 1024 * 1024, // image-এর জন্য একটু কম ধরে নেওয়া হয়েছে, দরকারে বদলান
};

function mediaTypeForExt(ext) {
  if (VIDEO_EXTENSIONS.includes(ext)) return "video";
  if (IMAGE_EXTENSIONS.includes(ext)) return "image";
  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// login response-এর Set-Cookie header থেকে session cookie বের করে নেওয়া হয়,
// পরের প্রতিটা request-এ সেই cookie পাঠানো লাগবে (নাহলে "Sign in required" আসবে)।
function extractCookies(res) {
  const raw =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie")].filter(Boolean);
  return raw.map((c) => c.split(";")[0]).join("; ");
}

async function login() {
  const res = await fetch(`${CONFIG.BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: CONFIG.IDENTIFIER,
      password: CONFIG.PASSWORD,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Login failed (status ${res.status})`);
  }
  const cookie = extractCookies(res);
  if (!cookie) {
    throw new Error("Login succeeded but no session cookie was returned.");
  }
  console.log(`Logged in as ${data.user?.username || CONFIG.IDENTIFIER}`);
  return cookie;
}

async function presignVideo(cookie, fileName, contentType, size) {
  const res = await fetch(`${CONFIG.BASE_URL}/api/uploads/video-presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ fileName, contentType, size }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Video presign failed (status ${res.status})`);
  }
  return data; // { uploadUrl, publicUrl, key }
}

// ⚠️ ধরে নেওয়া হয়েছে video-presign-এর মতোই একটা /api/uploads/image-presign
// route আছে, একই request/response shape নিয়ে। না থাকলে এখানে বদলে দিন।
async function presignImage(cookie, fileName, contentType, size) {
  const res = await fetch(`${CONFIG.BASE_URL}/api/uploads/image-presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ fileName, contentType, size }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Image presign failed (status ${res.status})`);
  }
  return data; // { uploadUrl, publicUrl, key }
}

async function uploadToStorage(uploadUrl, buffer, contentType) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: buffer,
  });
  if (!res.ok) {
    throw new Error(`Upload to storage failed (status ${res.status})`);
  }
}

// app-এর upload page ব্রাউজারে <video>+<canvas> দিয়ে ভিডিওর একটা frame ক্যাপচার
// করে থাম্বনেইল বানায় — কিন্তু এই script Node.js-এ (browser ছাড়া) চলে, তাই সেই
// DOM API এখানে নেই। এর বদলে system-এ ইনস্টল করা `ffmpeg` দিয়ে একই কাজ করা হচ্ছে:
// ভিডিও থেকে একটা frame বের করে JPEG হিসেবে সেভ করা হয়। (image file-এর জন্য এটা লাগে না।)
function extractThumbnailWithFfmpeg(videoPath) {
  return new Promise((resolve) => {
    const outPath = path.join(
      os.tmpdir(),
      `leakreels-thumb-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
    );
    execFile(
      "ffmpeg",
      [
        "-y",
        "-ss", String(CONFIG.THUMBNAIL_SEEK_SECONDS),
        "-i", videoPath,
        "-frames:v", "1",
        "-q:v", "3",
        outPath,
      ],
      (err) => {
        if (err || !fs.existsSync(outPath)) {
          resolve(null); // ffmpeg না থাকলে বা ব্যর্থ হলে best-effort — thumbnail ছাড়াই এগিয়ে যাবে
          return;
        }
        resolve(outPath);
      }
    );
  });
}

async function uploadThumbnail(cookie, thumbPath) {
  const buffer = fs.readFileSync(thumbPath);
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: "image/jpeg" }), "thumbnail.jpg");

  const res = await fetch(`${CONFIG.BASE_URL}/api/uploads/thumbnail`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  fs.unlink(thumbPath, () => {}); // temp file পরিষ্কার করে দেওয়া
  if (!res.ok) {
    throw new Error(data.error || `Thumbnail upload failed (status ${res.status})`);
  }
  return data.url || "";
}

async function createPost(cookie, { url, key, mediaType, caption, hashtags, location, thumbnailUrl }) {
  const res = await fetch(`${CONFIG.BASE_URL}/api/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      caption,
      hashtags,
      location,
      thumbnailUrl: thumbnailUrl || "", // video হলে ffmpeg দিয়ে বানানো frame, image হলে খালি (app নিজেই ছবিটা thumbnail হিসেবে দেখায় ধরে নেওয়া হয়েছে)
      mediaItems: [{ url, key, mediaType }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Post creation failed (status ${res.status})`);
  }
  return data.post;
}

async function main() {
  if (!fs.existsSync(CONFIG.CONTENT_FOLDER)) {
    throw new Error(`Content folder পাওয়া যায়নি: ${CONFIG.CONTENT_FOLDER}`);
  }

  const files = fs
    .readdirSync(CONFIG.CONTENT_FOLDER)
    .filter((name) => ALL_EXTENSIONS.includes(path.extname(name).toLowerCase()))
    .sort();

  if (files.length === 0) {
    console.log("এই folder-এ কোনো video (.mp4/.webm/.mov) বা image (.jpg/.jpeg/.png/.webp/.gif) file পাওয়া যায়নি।");
    return;
  }

  const videoCount = files.filter((f) => VIDEO_EXTENSIONS.includes(path.extname(f).toLowerCase())).length;
  const imageCount = files.length - videoCount;
  console.log(`${files.length}টা file পাওয়া গেছে (${videoCount}টা video, ${imageCount}টা image)। Upload শুরু হচ্ছে...\n`);

  const cookie = await login();

  let uploaded = 0;
  let failed = 0;

  for (const fileName of files) {
    const filePath = path.join(CONFIG.CONTENT_FOLDER, fileName);
    const ext = path.extname(fileName).toLowerCase();
    const mediaType = mediaTypeForExt(ext);
    const contentType = CONTENT_TYPE_BY_EXT[ext];
    const stat = fs.statSync(filePath);
    const maxBytes = MAX_BYTES_BY_TYPE[mediaType];

    process.stdout.write(`→ [${mediaType}] ${fileName} (${(stat.size / (1024 * 1024)).toFixed(1)} MB) ... `);

    if (stat.size > maxBytes) {
      console.log(`SKIP (${(maxBytes / (1024 * 1024)).toFixed(0)}MB limit-এর চেয়ে বড়)`);
      failed++;
      continue;
    }

    try {
      const buffer = fs.readFileSync(filePath);
      const presign =
        mediaType === "video"
          ? await presignVideo(cookie, fileName, contentType, stat.size)
          : await presignImage(cookie, fileName, contentType, stat.size);
      await uploadToStorage(presign.uploadUrl, buffer, contentType);

      let thumbnailUrl = "";
      if (mediaType === "video") {
        const thumbPath = await extractThumbnailWithFfmpeg(filePath);
        if (thumbPath) {
          try {
            thumbnailUrl = await uploadThumbnail(cookie, thumbPath);
          } catch (thumbErr) {
            console.log(`\n   (থাম্বনেইল আপলোড ব্যর্থ, thumbnail ছাড়াই post হবে: ${thumbErr.message})`);
          }
        }
      }

      const caption = CONFIG.USE_FILENAME_AS_CAPTION
        ? path.basename(fileName, ext)
        : CONFIG.CAPTION;

      await createPost(cookie, {
        url: presign.publicUrl,
        key: presign.key,
        mediaType,
        caption,
        hashtags: CONFIG.HASHTAGS,
        location: CONFIG.LOCATION,
        thumbnailUrl,
      });

      console.log(thumbnailUrl ? "OK, post ও থাম্বনেইল তৈরি হয়েছে ✔" : "OK, post তৈরি হয়েছে ✔");
      uploaded++;
    } catch (err) {
      console.log(`FAILED — ${err.message}`);
      failed++;
    }

    await sleep(CONFIG.DELAY_MS);
  }

  console.log(`\nশেষ। ${uploaded}টা upload হয়েছে, ${failed}টা ব্যর্থ হয়েছে।`);
}

main().catch((err) => {
  console.error("\nScript বন্ধ হয়ে গেছে:", err.message);
  process.exit(1);
});
