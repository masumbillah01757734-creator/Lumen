/**
 * Bulk video uploader for Lumen.
 *
 * "video" নামের folder-এ যতগুলো video file থাকবে, প্রতিটা video আলাদা আলাদা
 * post হিসেবে একটা নির্দিষ্ট user-এর account-এ upload হয়ে যাবে।
 *
 * ব্যবহার:
 *   1) নিচের CONFIG অংশ পূরণ করুন (site URL, username/password, folder path)।
 *   2) প্রজেক্টের ভেতর থেকে রান করুন:  node scripts/bulk-upload-videos.js
 *      (Node.js v18 বা তার বেশি ভার্সন লাগবে — built-in fetch দরকার)
 *
 * এটা ঠিক app-এর upload page যা করে সেটাই করে: presigned URL নেয়,
 * video সরাসরি storage-এ পাঠায়, ভিডিও থেকে একটা frame বের করে থাম্বনেইল
 * হিসেবে আপলোড করে, তারপর post তৈরি করে — শুধু browser ছাড়াই, command line থেকে।
 *
 * থাম্বনেইলের জন্য system-এ `ffmpeg` ইনস্টল থাকতে হবে (যেমন: `sudo apt install
 * ffmpeg` অথবা `brew install ffmpeg`)। ffmpeg না থাকলে বা কোনো কারণে ব্যর্থ
 * হলে script থেমে যাবে না — সেক্ষেত্রে শুধু ওই post-টা থাম্বনেইল ছাড়াই তৈরি হবে।
 *
 * ৪০০+ video-র জন্য যোগ করা হয়েছে:
 *   - প্রতিটা post-এ caption CAPTIONS list থেকে random বাছাই হয়
 *   - প্রতিটা post-এ HASHTAG_POOL থেকে random কয়েকটা hashtag বাছাই হয়
 *   - progress log (.upload-progress.json) রাখা হয়, তাই মাঝপথে script বন্ধ
 *     হয়ে গেলে বা আবার চালালে আগে যেগুলো upload হয়ে গেছে সেগুলো স্কিপ হয়ে যাবে
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
  IDENTIFIER: "hinata",
  PASSWORD: "king@billah",

  // যে folder-এ video file গুলো আছে (এই script-এর সাপেক্ষে path, বা full path দিন)
  VIDEO_FOLDER: path.join(__dirname, "..", "video"),

  // প্রতিটা post-এর caption এখান থেকে random বাছাই হবে (USE_FILENAME_AS_CAPTION
  // true থাকলে এটা ইগনোর হবে)। চাইলে একটা মাত্র caption রেখে দিলে সেটাই সবসময় বসবে।
  CAPTIONS: [
    "✨",
    "Vibes only 🔥",
    "Just posting this 🎥",
    "Watch till the end 👀",
    "Mood 🌙",
    "Can't stop watching this 😂",
    "New drop 🚀",
  ],

  // hashtag pool — প্রতিটা post-এ এখান থেকে random কয়েকটা (নিচের
  // HASHTAGS_PER_POST অনুযায়ী) বাছাই করে বসানো হবে
  HASHTAG_POOL: [
    "#viral", "#trending", "#fyp", "#foryou", "#explore", "#reels",
    "#video", "#funny", "#love", "#instagood", "#follow", "#like",
    "#share", "#new", "#daily", "#mood", "#vibes", "#content",
  ],

  // প্রতি post-এ কতগুলো hashtag বসবে (random pool থেকে এই সংখ্যক বাছাই হবে)
  HASHTAGS_PER_POST: 5,

  LOCATION: "",

  // true করলে filename (extension বাদে) caption হিসেবে বসবে, CAPTIONS list-এর বদলে
  USE_FILENAME_AS_CAPTION: false,

  // দুইটা upload-এর মাঝে কত মিলিসেকেন্ড wait করবে (server-কে চাপ না দেওয়ার জন্য)
  DELAY_MS: 1500,

  // ভিডিওর কততম সেকেন্ডের frame থাম্বনেইল হিসেবে নেওয়া হবে
  THUMBNAIL_SEEK_SECONDS: 0.5,

  // progress log ফাইল — এখানে কোন কোন file upload হয়ে গেছে তার রেকর্ড থাকে,
  // ফলে script আবার চালালে ওগুলো স্কিপ হয়ে যাবে (৪০০+ video-র জন্য দরকারি,
  // মাঝপথে নেট/error-এ থেমে গেলেও শুরু থেকে upload করতে হবে না)
  PROGRESS_FILE: path.join(__dirname, ".upload-progress.json"),
};
// ────────────────────────────────────────────────────────────────────

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"];
const CONTENT_TYPE_BY_EXT = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};
const MAX_BYTES = 50 * 1024 * 1024; // app-এর নিজের 50MB limit

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickRandom(arr, count = 1) {
  const pool = [...arr];
  const picked = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

function loadProgress() {
  try {
    const raw = fs.readFileSync(CONFIG.PROGRESS_FILE, "utf8");
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveProgress(doneSet) {
  fs.writeFileSync(
    CONFIG.PROGRESS_FILE,
    JSON.stringify([...doneSet], null, 2)
  );
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
    throw new Error(data.error || `Presign failed (status ${res.status})`);
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
    throw new Error(`Video upload to storage failed (status ${res.status})`);
  }
}

// app-এর upload page ব্রাউজারে <video>+<canvas> দিয়ে ভিডিওর একটা frame ক্যাপচার
// করে থাম্বনেইল বানায় — কিন্তু এই script Node.js-এ (browser ছাড়া) চলে, তাই সেই
// DOM API এখানে নেই। এর বদলে system-এ ইনস্টল করা `ffmpeg` দিয়ে একই কাজ করা হচ্ছে:
// ভিডিও থেকে একটা frame বের করে JPEG হিসেবে সেভ করা হয়।
function extractThumbnailWithFfmpeg(videoPath) {
  return new Promise((resolve) => {
    const outPath = path.join(
      os.tmpdir(),
      `lumen-thumb-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
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

async function createPost(cookie, { url, key, caption, hashtags, location, thumbnailUrl }) {
  const res = await fetch(`${CONFIG.BASE_URL}/api/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      caption,
      hashtags,
      location,
      thumbnailUrl: thumbnailUrl || "", // ffmpeg দিয়ে বানানো frame, না পেলে খালি (app-ও এটা best-effort হিসেবে treat করে)
      mediaItems: [{ url, key, mediaType: "video" }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Post creation failed (status ${res.status})`);
  }
  return data.post;
}

async function main() {
  if (!fs.existsSync(CONFIG.VIDEO_FOLDER)) {
    throw new Error(`Video folder পাওয়া যায়নি: ${CONFIG.VIDEO_FOLDER}`);
  }

  const files = fs
    .readdirSync(CONFIG.VIDEO_FOLDER)
    .filter((name) => VIDEO_EXTENSIONS.includes(path.extname(name).toLowerCase()))
    .sort();

  if (files.length === 0) {
    console.log("এই folder-এ কোনো video file (.mp4/.webm/.mov) পাওয়া যায়নি।");
    return;
  }

  const done = loadProgress();
  const pending = files.filter((f) => !done.has(f));

  console.log(
    `মোট ${files.length}টা video পাওয়া গেছে। আগে থেকে upload হয়ে গেছে ${done.size}টা, বাকি আছে ${pending.length}টা।\n`
  );

  if (pending.length === 0) {
    console.log("সব video ইতিমধ্যে upload হয়ে গেছে (progress log অনুযায়ী)।");
    return;
  }

  const cookie = await login();

  let uploaded = 0;
  let failed = 0;

  for (const fileName of pending) {
    const filePath = path.join(CONFIG.VIDEO_FOLDER, fileName);
    const ext = path.extname(fileName).toLowerCase();
    const contentType = CONTENT_TYPE_BY_EXT[ext];
    const stat = fs.statSync(filePath);

    process.stdout.write(`→ ${fileName} (${(stat.size / (1024 * 1024)).toFixed(1)} MB) ... `);

    if (stat.size > MAX_BYTES) {
      console.log("SKIP (50MB limit-এর চেয়ে বড়)");
      failed++;
      continue;
    }

    try {
      const buffer = fs.readFileSync(filePath);
      const presign = await presignVideo(cookie, fileName, contentType, stat.size);
      await uploadToStorage(presign.uploadUrl, buffer, contentType);

      let thumbnailUrl = "";
      const thumbPath = await extractThumbnailWithFfmpeg(filePath);
      if (thumbPath) {
        try {
          thumbnailUrl = await uploadThumbnail(cookie, thumbPath);
        } catch (thumbErr) {
          console.log(`\n   (থাম্বনেইল আপলোড ব্যর্থ, thumbnail ছাড়াই post হবে: ${thumbErr.message})`);
        }
      }

      const caption = CONFIG.USE_FILENAME_AS_CAPTION
        ? path.basename(fileName, ext)
        : pickRandom(CONFIG.CAPTIONS, 1)[0] || "";

      const hashtags = pickRandom(CONFIG.HASHTAG_POOL, CONFIG.HASHTAGS_PER_POST).join(" ");

      await createPost(cookie, {
        url: presign.publicUrl,
        key: presign.key,
        caption,
        hashtags,
        location: CONFIG.LOCATION,
        thumbnailUrl,
      });

      console.log(thumbnailUrl ? "OK, post ও থাম্বনেইল তৈরি হয়েছে ✔" : "OK, post তৈরি হয়েছে (থাম্বনেইল ছাড়া) ✔");
      uploaded++;
      done.add(fileName);
      saveProgress(done);
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