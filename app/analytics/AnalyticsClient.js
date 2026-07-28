"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  Eye,
  MessageCircle,
  Bookmark,
  Share2,
  Users,
  Image as ImageIcon,
  Film,
  ArrowLeft,
  BarChart3,
} from "lucide-react";
import { useCurrentUser } from "@/components/UserContext";
import { MediaImage } from "@/components/Media";

function StatCard({ icon: Icon, label, value }) {
  return (
    <div
      className="rounded-2xl border p-4 flex items-center gap-3"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "var(--surface-2)", color: "var(--accent)" }}
      >
        <Icon size={18} strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <div className="font-display text-xl leading-none" style={{ color: "var(--text)" }}>
          {value.toLocaleString()}
        </div>
        <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
          {label}
        </div>
      </div>
    </div>
  );
}

function TopPostRow({ post, rank }) {
  return (
    <Link
      href={`/p/${post.id}`}
      className="flex items-center gap-3 py-2.5 px-1 -mx-1 rounded-lg transition-colors hover:bg-black/20"
    >
      <span className="w-5 text-center font-mono text-xs shrink-0" style={{ color: "var(--muted)" }}>
        {rank}
      </span>
      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0" style={{ background: "var(--surface-2)" }}>
        <MediaImage src={post.thumbnailUrl} alt="" className="w-full h-full object-cover" wrapperClassName="w-full h-full" />
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-4 text-sm" style={{ color: "var(--muted)" }}>
        <span className="flex items-center gap-1">
          <Heart size={14} /> {post.likeCount}
        </span>
        <span className="flex items-center gap-1">
          <Eye size={14} /> {post.viewCount}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle size={14} /> {post.commentCount}
        </span>
      </div>
    </Link>
  );
}

const SORT_OPTIONS = [
  { value: "top", label: "Top (likes + views)" },
  { value: "likes", label: "Most liked" },
  { value: "views", label: "Most viewed" },
  { value: "comments", label: "Most commented" },
  { value: "saves", label: "Most saved" },
  { value: "shares", label: "Most shared" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
];

function sortPosts(posts, sortBy) {
  const list = [...posts];
  switch (sortBy) {
    case "likes":
      return list.sort((a, b) => b.likeCount - a.likeCount);
    case "views":
      return list.sort((a, b) => b.viewCount - a.viewCount);
    case "comments":
      return list.sort((a, b) => b.commentCount - a.commentCount);
    case "saves":
      return list.sort((a, b) => b.saveCount - a.saveCount);
    case "shares":
      return list.sort((a, b) => b.shareCount - a.shareCount);
    case "newest":
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    case "oldest":
      return list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    case "top":
    default:
      return list.sort((a, b) => b.likeCount + b.viewCount - (a.likeCount + a.viewCount));
  }
}

export default function AnalyticsClient() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("top");

  useEffect(() => {
    if (currentUser === null) {
      router.replace("/login?next=/analytics");
      return;
    }
    if (!currentUser) return; // still resolving

    fetch("/api/analytics")
      .then((res) => res.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Could not load your analytics."));
  }, [currentUser, router]);

  if (error) {
    return (
      <p className="text-center mt-16 font-mono text-sm" style={{ color: "var(--accent)" }}>
        {error}
      </p>
    );
  }

  if (!data) {
    return (
      <p className="text-center mt-16 text-sm" style={{ color: "var(--muted)" }}>
        Loading your analytics…
      </p>
    );
  }

  const { totals, posts } = data;
  const sortedPosts = sortPosts(posts || [], sortBy);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/profile/${currentUser.username}`}
          className="p-2 rounded-full transition-colors hover:bg-[var(--surface-2)]"
          style={{ color: "var(--text)" }}
          aria-label="Back to profile"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-2">
          <BarChart3 size={20} style={{ color: "var(--accent)" }} />
          <h1 className="font-display text-2xl" style={{ color: "var(--text)" }}>
            Your analytics
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={Heart} label="Total likes" value={totals.totalLikes} />
        <StatCard icon={Eye} label="Total views" value={totals.totalViews} />
        <StatCard icon={MessageCircle} label="Total comments" value={totals.totalComments} />
        <StatCard icon={Bookmark} label="Total saves" value={totals.totalSaves} />
        <StatCard icon={Share2} label="Total shares" value={totals.totalShares} />
        <StatCard icon={Users} label="Followers" value={totals.followerCount} />
      </div>

      <div className="flex gap-3 mt-4 text-sm" style={{ color: "var(--muted)" }}>
        <span className="flex items-center gap-1.5">
          <ImageIcon size={14} /> {totals.photoCount} photos
        </span>
        <span className="flex items-center gap-1.5">
          <Film size={14} /> {totals.videoCount} videos
        </span>
        <span>{totals.postCount} posts total</span>
      </div>

      <div
        className="rounded-2xl border p-4 sm:p-5 mt-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <h2 className="font-semibold" style={{ color: "var(--text)" }}>
            Your posts
          </h2>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-full border outline-none"
            style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {sortedPosts.length === 0 ? (
          <p className="text-sm py-4" style={{ color: "var(--muted)" }}>
            Post something to start seeing your stats here.
          </p>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {sortedPosts.map((post, i) => (
              <TopPostRow key={post.id} post={post} rank={i + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
