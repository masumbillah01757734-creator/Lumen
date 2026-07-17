"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Clapperboard } from "lucide-react";
import ReelCard from "@/components/ReelCard";
import { notifyError } from "@/lib/toast";

export default function ReelsPage() {
  const [reels, setReels] = useState(null);

  useEffect(() => {
    fetch("/api/posts?type=video")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) notifyError(data.error);
        else setReels(data.posts);
      })
      .catch(() => notifyError("Could not load reels."));
  }, []);

  function handleDeleted(id) {
    setReels((rs) => rs.filter((r) => r.id !== id));
  }

  if (reels === null) {
    return (
      <p className="text-center text-sm mt-16" style={{ color: "var(--muted)" }}>
        Loading reels…
      </p>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="text-center mt-20 flex flex-col items-center gap-3 px-4">
        <Clapperboard size={40} strokeWidth={1.3} style={{ color: "var(--accent)" }} />
        <p className="font-display text-2xl" style={{ color: "var(--text)" }}>
          No reels yet.
        </p>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Upload a video to kick things off.
        </p>
        <Link
          href="/upload"
          className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold"
          style={{ background: "var(--accent)", color: "#14120f" }}
        >
          <Plus size={16} /> Upload
        </Link>
      </div>
    );
  }

  return (
    <div
      className="w-full overflow-y-scroll snap-y snap-mandatory"
      style={{ height: "calc(100vh - 4rem)" }}
    >
      {reels.map((post) => (
        <ReelCard key={post.id} post={post} onDeleted={handleDeleted} />
      ))}
    </div>
  );
}
