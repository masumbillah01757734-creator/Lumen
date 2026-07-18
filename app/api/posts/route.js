import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Post from "@/models/Post";
import { getCurrentUser } from "@/lib/auth";
import { saveMediaFiles, MAX_IMAGE_COUNT } from "@/lib/upload";
import { generateExif } from "@/lib/exif";
import { rankPosts } from "@/lib/ranking";

export async function GET(req) {
  // Guests can browse the feed and reels read-only (like Instagram); actions
  // such as liking, commenting, or following still require signing in and are
  // enforced by their own routes.
  const user = await getCurrentUser();

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const type = searchParams.get("type");
  const limit = 12;

  await connectDB();

  const query = type === "video" || type === "image" ? { mediaType: type } : {};
  const allPosts = await Post.find(query)
    .populate("author", "username displayName avatar")
    .populate("comments.author", "username displayName avatar")
    .lean();

  const ranked = rankPosts(allPosts);
  const start = (page - 1) * limit;
  const pageItems = ranked.slice(start, start + limit);
  const serialized = pageItems.map((p) => serializePost(p, user?._id || null));

  return NextResponse.json({
    posts: serialized,
    page,
    hasMore: start + limit < ranked.length,
    viewerSignedIn: Boolean(user),
  });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let mediaItems, caption, hashtags, location, thumbnailUrl;

    if (contentType.includes("application/json")) {
      // Videos are uploaded directly to R2 from the browser via a presigned
      // URL (see /api/uploads/video-presign) to stay under Vercel's 4.5MB
      // function body limit. This branch just records the resulting media.
      const body = await req.json();
      caption = (body.caption || "").toString().slice(0, 2200);
      hashtags = (body.hashtags || "")
        .toString()
        .split(/,|\s+/)
        .map((tag) => tag.replace(/^#/, "").trim())
        .filter(Boolean);
      location = (body.location || "").toString().slice(0, 120);
      thumbnailUrl = (body.thumbnailUrl || "").toString().slice(0, 500);

      const items = Array.isArray(body.mediaItems) ? body.mediaItems : [];
      if (items.length === 0) {
        throw new Error("Choose at least one photo or video.");
      }
      if (items.length > 1) {
        throw new Error("Only one video can be uploaded per post.");
      }
      mediaItems = items.map((item) => {
        if (!item?.url || !item?.key || item.mediaType !== "video") {
          throw new Error("Invalid media item.");
        }
        return { url: item.url, mediaType: "video", key: item.key };
      });
    } else {
      const form = await req.formData();
      const files = form.getAll("media").filter((file) => file && typeof file !== "string" && file.size > 0);
      caption = (form.get("caption") || "").toString().slice(0, 2200);
      hashtags = (form.get("hashtags") || "")
        .toString()
        .split(/,|\s+/)
        .map((tag) => tag.replace(/^#/, "").trim())
        .filter(Boolean);
      location = (form.get("location") || "").toString().slice(0, 120);

      if (files.length === 0) {
        throw new Error("Choose at least one photo or video.");
      }

      const isVideo = files.some((file) => file.type.startsWith("video"));
      const isImage = files.some((file) => file.type.startsWith("image"));

      if (isVideo && isImage) {
        throw new Error("Images and videos cannot be mixed in the same post.");
      }
      if (isVideo && files.length > 1) {
        throw new Error("Only one video can be uploaded per post.");
      }
      if (isImage && files.length > MAX_IMAGE_COUNT) {
        throw new Error(`You can upload up to ${MAX_IMAGE_COUNT} images in one post.`);
      }

      mediaItems = await saveMediaFiles(files);
    }

    const primaryMedia = mediaItems[0];

    await connectDB();
    const post = await Post.create({
      author: user._id,
      mediaUrl: primaryMedia.url,
      mediaType: primaryMedia.mediaType,
      mediaItems: mediaItems.map((item) => ({
        url: item.url,
        mediaType: item.mediaType,
        key: item.key,
      })),
      caption,
      hashtags,
      location,
      thumbnail: thumbnailUrl || "",
      exif: generateExif(),
    });

    const populated = await Post.findById(post._id)
      .populate("author", "username displayName avatar")
      .lean();

    return NextResponse.json({ post: serializePost(populated, user._id) }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Could not create post." },
      { status: 400 }
    );
  }
}

export function serializePost(p, currentUserId) {
  // currentUserId is null for guests browsing without an account.
  const uid = currentUserId ? currentUserId.toString() : null;
  const mediaItems = Array.isArray(p.mediaItems) && p.mediaItems.length
    ? p.mediaItems
    : p.mediaUrl
      ? [{ url: p.mediaUrl, mediaType: p.mediaType }]
      : [];
  const primary = mediaItems[0];
  const thumbnailUrl = p.thumbnail || (primary?.mediaType === "image" ? primary?.url : "") || "";

  return {
    id: p._id.toString(),
    mediaUrl: primary?.url || p.mediaUrl,
    mediaType: primary?.mediaType || p.mediaType,
    mediaItems,
    thumbnailUrl,
    caption: p.caption,
    hashtags: p.hashtags || [],
    location: p.location || "",
    exif: p.exif,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    author: p.author
      ? {
          id: p.author._id.toString(),
          username: p.author.username,
          displayName: p.author.displayName,
          avatar: p.author.avatar,
        }
      : null,
    likeCount: p.likes?.length || 0,
    likedByMe: uid ? !!p.likes?.some((id) => id.toString() === uid) : false,
    viewCount: (p.views?.length || 0) + (p.anonymousViews || 0),
    saveCount: p.saves?.length || 0,
    shareCount: p.shares || 0,
    profileVisitCount: p.profileVisits || 0,
    watchTimeMs: p.watchTimeMs || 0,
    comments: (p.comments || []).map((c) => ({
      id: c._id.toString(),
      text: c.text,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      edited: c.createdAt?.getTime?.() !== c.updatedAt?.getTime?.(),
      likeCount: c.likes?.length || 0,
      likedByMe: uid ? !!c.likes?.some((id) => id.toString() === uid) : false,
      author: c.author
        ? {
            id: c.author._id.toString(),
            username: c.author.username,
            displayName: c.author.displayName,
            avatar: c.author.avatar,
          }
        : null,
    })),
  };
}
