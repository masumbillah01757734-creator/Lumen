"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Eye, MessageCircle, ArrowLeft, Clapperboard, Image as ImageIcon, Clock, TrendingUp, Search, Trash2 } from "lucide-react";
import { MediaImage, MediaVideo } from "@/components/Media";
import { notifyError, notifySuccess, confirmToast } from "@/lib/toast";

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
      style={{
        background: active ? "var(--accent)" : "var(--surface-2)",
        color: active ? "#14120f" : "var(--text)",
      }}
    >
      <Icon size={15} strokeWidth={1.75} />
      {children}
    </button>
  );
}

function ContentCard({ item, onDelete, deleting }) {
  // Videos don't always have a captured poster frame (thumbnail). Rather
  // than showing a generic "video unavailable" icon for those (which made
  // some cards look broken/different-sized), fall back to rendering the
  // actual video muted so its first frame shows as a natural thumbnail.
  const showVideoFallback = item.mediaType === "video" && !item.thumbnailUrl && item.mediaUrl;

  return (
    <div
      className="h-full self-stretch rounded-2xl border overflow-hidden flex flex-col relative"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onDelete(item);
        }}
        disabled={deleting}
        title="Delete this post/reel"
        className="absolute top-2 right-2 z-10 rounded-full p-1.5 disabled:opacity-50"
        style={{ background: "rgba(0,0,0,0.55)", color: "white" }}
      >
        <Trash2 size={14} />
      </button>
      <Link href={`/p/${item.id}`} className="flex flex-col flex-1 h-full transition-opacity hover:opacity-90">
        <div className="relative aspect-square shrink-0" style={{ background: "var(--surface-2)" }}>
          {showVideoFallback ? (
            <MediaVideo
              src={item.mediaUrl}
              className="w-full h-full object-cover"
              wrapperClassName="w-full h-full"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <MediaImage
              src={item.thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
              wrapperClassName="w-full h-full"
            />
          )}
          <span
            className="absolute top-2 left-2 rounded-full px-2 py-0.5 text-[11px] font-mono flex items-center gap-1"
            style={{ background: "rgba(0,0,0,0.55)", color: "white" }}
          >
            {item.mediaType === "video" ? <Clapperboard size={11} /> : <ImageIcon size={11} />}
            {item.mediaType === "video" ? "Reel" : "Post"}
          </span>
        </div>
        <div className="p-3 flex-1 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center font-display text-xs shrink-0"
              style={{ background: "var(--surface-2)", color: "var(--gold)" }}
            >
              {item.author?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.author.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                item.author?.displayName?.[0]?.toUpperCase() || item.author?.username?.[0]?.toUpperCase() || "?"
              )}
            </div>
            <span className="text-xs truncate" style={{ color: "var(--muted)" }}>
              @{item.author?.username || "unknown"}
            </span>
          </div>
          {/* Always reserve this line's height (whether or not there's a
              caption) so every card's footer is the same height and the
              stats row lines up across the whole grid. */}
          <p className="text-xs truncate leading-4 h-4" style={{ color: item.caption ? "var(--text)" : "transparent" }}>
            {item.caption || "\u00A0"}
          </p>
          <div className="mt-auto flex items-center justify-between text-xs font-mono" style={{ color: "var(--muted)" }}>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1"><Eye size={12} /> {item.viewCount}</span>
              <span className="flex items-center gap-1"><Heart size={12} /> {item.likeCount}</span>
              <span className="flex items-center gap-1"><MessageCircle size={12} /> {item.commentCount}</span>
            </div>
            <span>{timeAgo(item.createdAt)}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function AdminContentPage() {
  const router = useRouter();
  const [sort, setSort] = useState("new"); // new | top
  const [type, setType] = useState("all"); // all | video | image
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  // Debounce the search box so we're not firing a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async (currentSort, currentType, currentSearch) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ sort: currentSort, type: currentType, limit: "60" });
      if (currentSearch) params.set("q", currentSearch);
      const res = await fetch(`/api/admin/content?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Access denied.");
        return;
      }
      setItems(data.items || []);
    } catch {
      setError("Could not load content.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(sort, type, search);
  }, [sort, type, search, load]);

  function handleDelete(item) {
    confirmToast(
      `Delete this ${item.mediaType === "video" ? "reel" : "post"} by @${item.author?.username || "unknown"}? This can't be undone.`,
      async () => {
        setDeletingId(item.id);
        try {
          const res = await fetch(`/api/admin/content/${item.id}`, { method: "DELETE" });
          const data = await res.json();
          if (!res.ok) {
            notifyError(data.error || "Could not delete this.");
            return;
          }
          setItems((current) => current.filter((i) => i.id !== item.id));
          notifySuccess("Deleted.");
        } catch {
          notifyError("Could not delete this.");
        } finally {
          setDeletingId(null);
        }
      }
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl" style={{ color: "var(--text)" }}>Content</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Newest uploads and top-viewed reels &amp; posts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm"
            style={{ background: "var(--surface-2)", color: "var(--text)" }}
          >
            <ArrowLeft size={16} />
            Users
          </Link>
          <Link href="/" className="rounded-full px-4 py-2 text-sm" style={{ background: "var(--surface-2)", color: "var(--text)" }}>
            Home
          </Link>
        </div>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by username or caption…"
          className="w-full rounded-full pl-9 pr-4 py-2 text-sm outline-none"
          style={{ background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <TabButton active={sort === "new"} onClick={() => setSort("new")} icon={Clock}>
          Newest
        </TabButton>
        <TabButton active={sort === "top"} onClick={() => setSort("top")} icon={TrendingUp}>
          Top viewed
        </TabButton>

        <span className="w-px h-5 mx-1" style={{ background: "var(--border)" }} />

        <TabButton active={type === "all"} onClick={() => setType("all")} icon={ImageIcon}>
          All
        </TabButton>
        <TabButton active={type === "video"} onClick={() => setType("video")} icon={Clapperboard}>
          Reels
        </TabButton>
        <TabButton active={type === "image"} onClick={() => setType("image")} icon={ImageIcon}>
          Posts
        </TabButton>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>Loading content…</p>
      ) : error ? (
        <div>
          <p className="text-sm mb-3" style={{ color: "var(--accent)" }}>{error}</p>
          <button
            onClick={() => router.push("/")}
            className="rounded-full px-4 py-2 text-sm"
            style={{ background: "var(--surface-2)", color: "var(--text)" }}
          >
            Back home
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {search ? `No results for "${search}".` : "Nothing here yet."}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-stretch">
          {items.map((item) => (
            <ContentCard key={item.id} item={item} onDelete={handleDelete} deleting={deletingId === item.id} />
          ))}
        </div>
      )}
    </div>
  );
}
