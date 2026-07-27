"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Heart,
  Eye,
  MessageCircle,
  Bookmark,
  Share2,
  Images,
  Users,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { useCurrentUser } from "@/components/UserContext";
import { MediaImage } from "@/components/Media";

function StatCard({ icon: Icon, label, value }) {
  return (
    <div
      className="rounded-2xl border p-4 flex items-center gap-3"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "var(--surface-2)", color: "var(--accent)" }}
      >
        <Icon size={18} strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <div className="font-display text-xl leading-tight" style={{ color: "var(--text)" }}>
          {value.toLocaleString()}
        </div>
        <div className="text-xs" style={{ color: "var(--muted)" }}>{label}</div>
      </div>
    </div>
  );
}

function TopPostBar({ post, maxEngagement }) {
  const pct = maxEngagement > 0 ? Math.max((post.engagement / maxEngagement) * 100, 4) : 4;
  return (
    <Link href={`/p/${post.id}`} className="flex items-center gap-3 group">
      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0" style={{ background: "var(--surface-2)" }}>
        {post.thumbnailUrl ? (
          <MediaImage src={post.thumbnailUrl} alt="" className="w-full h-full object-cover" wrapperClassName="w-full h-full" />
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs truncate mb-1" style={{ color: "var(--muted)" }}>
          {post.caption || "Untitled post"}
        </p>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--accent)" }} />
        </div>
      </div>
      <div className="text-xs font-mono shrink-0 w-16 text-right" style={{ color: "var(--text)" }}>
        {post.engagement.toLocaleString()}
      </div>
    </Link>
  );
}

function PostStatRow({ post }) {
  return (
    <Link
      href={`/p/${post.id}`}
      className="flex items-center gap-3 px-4 py-3 border-b last:border-0 hover:bg-black/20 transition-colors"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0" style={{ background: "var(--surface-2)" }}>
        {post.thumbnailUrl ? (
          <MediaImage src={post.thumbnailUrl} alt="" className="w-full h-full object-cover" wrapperClassName="w-full h-full" />
        ) : null}
      </div>
      <p className="flex-1 min-w-0 text-sm truncate" style={{ color: "var(--text)" }}>
        {post.caption || "Untitled post"}
      </p>
      <div className="flex items-center gap-3 shrink-0 text-xs font-mono" style={{ color: "var(--muted)" }}>
        <span className="flex items-center gap-1"><Heart size={13} /> {post.likeCount}</span>
        <span className="flex items-center gap-1"><Eye size={13} /> {post.viewCount}</span>
        <span className="flex items-center gap-1"><MessageCircle size={13} /> {post.commentCount}</span>
      </div>
    </Link>
  );
}

export default function AnalyticsPage() {
  const currentUser = useCurrentUser();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/analytics/me")
      .then((res) => res.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Could not load your analytics."));
  }, []);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-sm" style={{ color: "var(--accent)" }}>{error}</p>
        {!currentUser && (
          <Link href="/login?next=/analytics" className="text-sm underline mt-3 inline-block" style={{ color: "var(--gold)" }}>
            Log in
          </Link>
        )}
      </div>
    );
  }

  if (!data) {
    return <p className="text-center mt-16 text-sm" style={{ color: "var(--muted)" }}>Loading your analytics…</p>;
  }

  const maxEngagement = data.topPosts[0]?.engagement || 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 size={22} style={{ color: "var(--accent)" }} />
        <h1 className="font-display text-2xl" style={{ color: "var(--text)" }}>Your analytics</h1>
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        A private overview of how people engage with everything you've posted.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard icon={Images} label="Posts" value={data.postCount} />
        <StatCard icon={Users} label="Followers" value={data.followerCount} />
        <StatCard icon={Heart} label="Total likes" value={data.summary.totalLikes} />
        <StatCard icon={Eye} label="Total views" value={data.summary.totalViews} />
        <StatCard icon={MessageCircle} label="Total comments" value={data.summary.totalComments} />
        <StatCard icon={Bookmark} label="Total saves" value={data.summary.totalSaves} />
        <StatCard icon={Share2} label="Total shares" value={data.summary.totalShares} />
        <StatCard icon={TrendingUp} label="Profile visits" value={data.summary.totalProfileVisits} />
      </div>

      {data.topPosts.length > 0 && (
        <div
          className="rounded-2xl border p-4 sm:p-5 mb-8"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <h2 className="font-semibold mb-4 text-sm" style={{ color: "var(--text)" }}>Top performing posts</h2>
          <div className="space-y-4">
            {data.topPosts.map((post) => (
              <TopPostBar key={post.id} post={post} maxEngagement={maxEngagement} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-semibold mb-3 text-sm" style={{ color: "var(--text)" }}>Every post</h2>
        {data.posts.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>You haven't posted anything yet.</p>
        ) : (
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            {data.posts.map((post) => (
              <PostStatRow key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
