"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import PostCard from "@/components/PostCard";

export default function FeedPage() {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/posts")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setPosts(data.posts);
      })
      .catch(() => setError("Could not load the feed."));
  }, []);

  function handleDeleted(id) {
    setPosts((ps) => ps.filter((p) => p.id !== id));
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      {error && (
        <p className="font-mono text-sm mb-4" style={{ color: "var(--accent)" }}>
          {error}
        </p>
      )}

      {posts === null && !error && (
        <p className="text-center text-sm mt-16" style={{ color: "var(--muted)" }}>
          Loading the feed…
        </p>
      )}

      {posts?.length === 0 && (
        <div className="text-center mt-20 flex flex-col items-center gap-3">
          <p className="font-display text-2xl" style={{ color: "var(--text)" }}>
            No frames yet.
          </p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Be the first to share a photo or video.
          </p>
          <Link
            href="/upload"
            className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold"
            style={{ background: "var(--accent)", color: "#14120f" }}
          >
            <Plus size={16} /> Upload
          </Link>
        </div>
      )}

      {posts?.map((post) => (
        <PostCard key={post.id} post={post} onDeleted={handleDeleted} />
      ))}
    </div>
  );
}
