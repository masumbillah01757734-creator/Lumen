"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import PostCard from "@/components/PostCard";

export default function ProfilePostViewerPage() {
  const { username, id } = useParams();
  const router = useRouter();
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/users/${username}/posts`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        // The clicked post goes first; everything else keeps following in
        // date order (the API already returns posts sorted newest-first).
        const clickedIndex = data.posts.findIndex((p) => p.id === id);
        if (clickedIndex === -1) {
          setPosts(data.posts);
          return;
        }
        const clicked = data.posts[clickedIndex];
        const rest = data.posts.filter((_, i) => i !== clickedIndex);
        setPosts([clicked, ...rest]);
      })
      .catch(() => setError("Could not load these posts."));
  }, [username, id]);

  function handleDeleted(postId) {
    setPosts((ps) => ps.filter((p) => p.id !== postId));
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <button
        onClick={() => router.push(`/profile/${username}`)}
        className="flex items-center gap-1.5 text-sm mb-4"
        style={{ color: "var(--muted)" }}
      >
        <ArrowLeft size={16} /> Back to profile
      </button>

      {error && (
        <p className="font-mono text-sm mb-4" style={{ color: "var(--accent)" }}>
          {error}
        </p>
      )}

      {posts === null && !error && (
        <p className="text-center text-sm mt-16" style={{ color: "var(--muted)" }}>
          Loading posts…
        </p>
      )}

      {posts?.map((post) => (
        <PostCard key={post.id} post={post} onDeleted={handleDeleted} />
      ))}
    </div>
  );
}
