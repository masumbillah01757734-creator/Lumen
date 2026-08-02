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
    // Paired with notFound() below (404 status) — belt-and-braces so a
    // crawler that somehow still sees this metadata knows not to index it.
    return {
      title: "Post not found — LeakReels",
      robots: { index: false, follow: false },
    };
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
  const title = `${titleBase} — LeakReels`;
  const description = captionText
    ? captionText.slice(0, 200)
    : `See this ${post.mediaType} shared by ${authorHandle} on LeakReels.${tags.length ? ` ${tags.map((t) => `#${t}`).join(" ")}` : ""}`;

  const image = post.thumbnail || (post.mediaType === "image" ? post.mediaUrl : "");
  // If a post somehow has no usable image (old post with no thumbnail yet,
  // media still processing, etc.), fall back to the LeakReels logo so a shared
  // link always renders a card instead of a blank/empty preview.
  const fallbackImage = `${siteUrl}/og-default.png`;
  const ogImage = image || fallbackImage;

  return {
    title,
    description,
    keywords: tags,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "LeakReels",
      type: post.mediaType === "video" ? "video.other" : "article",
      images: [{ url: ogImage, width: image ? 1200 : 1200, height: image ? 1200 : 630, alt: title }],
      ...(post.mediaType === "video" ? { videos: [{ url: post.mediaUrl }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

// Structured data for a single post. Videos get VideoObject (eligible for
// Google's video rich results); photo posts get SocialMediaPosting, which
// is the schema.org type Google recommends for user-generated social posts.
function buildPostJsonLd(post, url, siteUrl) {
  const authorName = post.author?.displayName || post.author?.username || "LeakReels user";
  const image = post.thumbnail || (post.mediaType === "image" ? post.mediaUrl : `${siteUrl}/og-default.png`);
  const interactionStatistic = [
    {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/LikeAction",
      userInteractionCount: post.likes?.length || 0,
    },
    {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/CommentAction",
      userInteractionCount: post.comments?.length || 0,
    },
  ];

  if (post.mediaType === "video") {
    return {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: (post.caption || `A video by ${authorName}`).slice(0, 110),
      description: (post.caption || `A video shared by ${authorName} on LeakReels.`).slice(0, 300),
      thumbnailUrl: [image],
      uploadDate: post.createdAt,
      contentUrl: post.mediaUrl,
      url,
      author: { "@type": "Person", name: authorName },
      interactionStatistic,
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "SocialMediaPosting",
    headline: (post.caption || `A photo by ${authorName}`).slice(0, 110),
    image: [image],
    datePublished: post.createdAt,
    dateModified: post.updatedAt || post.createdAt,
    url,
    author: { "@type": "Person", name: authorName },
    interactionStatistic,
  };
}

export default async function PostPermalinkPage({ params }) {
  const { id } = await params;
  const post = await loadPost(id);
  if (!post) notFound();

  const viewer = await getCurrentUser();
  const serialized = serializePost(post, viewer?._id || null);

  const siteUrl = await getSiteUrl();
  const jsonLd = buildPostJsonLd(post, `${siteUrl}/p/${id}`, siteUrl);

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <PostCard post={serialized} />
    </div>
  );
}
