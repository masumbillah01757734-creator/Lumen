import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Post from "@/models/Post";
import { getCurrentUser } from "@/lib/auth";
import { saveMediaFile } from "@/lib/upload";
import { generateExif } from "@/lib/exif";
import { rankPosts } from "@/lib/ranking";

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const type = searchParams.get("type"); // "video" | "image" | null (all)
  const limit = 10;

  await connectDB();

  const query = type === "video" || type === "image" ? { mediaType: type } : {};

  // NOTE: for a large post collection this should move to an aggregation
  // pipeline with indexes; fetching everything works fine at this scale.
  const allPosts = await Post.find(query)
    .populate("author", "username displayName avatar")
    .populate("comments.author", "username displayName avatar")
    .lean();

  const ranked = rankPosts(allPosts);
  const start = (page - 1) * limit;
  const pageItems = ranked.slice(start, start + limit);

  const serialized = pageItems.map((p) => serializePost(p, user._id));

  return NextResponse.json({
    posts: serialized,
    page,
    hasMore: start + limit < ranked.length,
  });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("media");
    const caption = (form.get("caption") || "").toString().slice(0, 2200);

    const { url, mediaType } = await saveMediaFile(file);

    await connectDB();
    const post = await Post.create({
      author: user._id,
      mediaUrl: url,
      mediaType,
      caption,
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
  const uid = currentUserId.toString();
  return {
    id: p._id.toString(),
    mediaUrl: p.mediaUrl,
    mediaType: p.mediaType,
    caption: p.caption,
    exif: p.exif,
    createdAt: p.createdAt,
    author: p.author
      ? {
          id: p.author._id.toString(),
          username: p.author.username,
          displayName: p.author.displayName,
          avatar: p.author.avatar,
        }
      : null,
    likeCount: p.likes?.length || 0,
    likedByMe: !!p.likes?.some((id) => id.toString() === uid),
    viewCount: p.views?.length || 0,
    comments: (p.comments || []).map((c) => ({
      id: c._id.toString(),
      text: c.text,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      edited: c.createdAt?.getTime?.() !== c.updatedAt?.getTime?.(),
      likeCount: c.likes?.length || 0,
      likedByMe: !!c.likes?.some((id) => id.toString() === uid),
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
