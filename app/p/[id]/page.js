import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Post from "@/models/Post";
import { getCurrentUser } from "@/lib/auth";
import { getSiteUrl } from "@/lib/site";
import { serializePost } from "@/app/api/posts/route";
import PostCard from "@/components/PostCard";

async function loadPost(id) {
  try {
    await connectDB();
    const post = await Post.findById(id)
      .populate("author", "username displayName avatar")
      .populate("comments.author", "username displayName avatar")
      .lean();
    return post;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const post = await loadPost(id);
  if (!post) {
    return { title: "Post not found — Lumen" };
  }

  const siteUrl = await getSiteUrl();
  const url = `${siteUrl}/p/${id}`;
  const authorHandle = post.author?.username ? `@${post.author.username}` : "someone";
  const captionText = (post.caption || "").trim();
  const tags = (post.hashtags || []).slice(0, 10);

  // Per-post title/description built from that post's own caption and tags,
  // so every shared link gets its own preview instead of a generic one.
  const titleBase = captionText
    ? captionText.slice(0, 70)
    : tags.length
      ? `${tags.map((t) => `#${t}`).join(" ")}`
      : `A ${post.mediaType} by ${authorHandle}`;
  const title = `${titleBase} — Lumen`;
  const description = captionText
    ? captionText.slice(0, 200)
    : `See this ${post.mediaType} shared by ${authorHandle} on Lumen.${tags.length ? ` ${tags.map((t) => `#${t}`).join(" ")}` : ""}`;

  const image = post.thumbnail || (post.mediaType === "image" ? post.mediaUrl : "");

  return {
    title,
    description,
    keywords: tags,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Lumen",
      type: post.mediaType === "video" ? "video.other" : "article",
      images: image ? [{ url: image, width: 1200, height: 1200, alt: title }] : undefined,
      ...(post.mediaType === "video" ? { videos: [{ url: post.mediaUrl }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PostPermalinkPage({ params }) {
  const { id } = await params;
  const post = await loadPost(id);
  if (!post) notFound();

  const viewer = await getCurrentUser();
  const serialized = serializePost(post, viewer?._id || null);

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <PostCard post={serialized} />
    </div>
  );
}
