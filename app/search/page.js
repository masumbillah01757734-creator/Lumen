"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Video, SearchX } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import { MediaImage } from "@/components/Media";

function SearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}&limit=24`)
      .then((res) => res.json())
      .then(setResults)
      .catch(() => setResults({ users: [], posts: [] }))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <SearchBar
        initialQuery={q}
        autoFocus={!q}
        onSubmitQuery={(next) => router.push(`/search?q=${encodeURIComponent(next)}`)}
        className="mb-8"
      />

      {!q.trim() && (
        <p className="text-center text-sm mt-16" style={{ color: "var(--muted)" }}>
          Search for people, captions, or hashtags.
        </p>
      )}

      {q.trim() && loading && (
        <p className="text-center text-sm mt-16" style={{ color: "var(--muted)" }}>
          Searching…
        </p>
      )}

      {q.trim() && !loading && results && (results.users.length > 0 || results.posts.length > 0) && (
        <div className="flex flex-col gap-10">
          {results.users.length > 0 && (
            <section>
              <h2 className="font-display text-lg mb-3" style={{ color: "var(--text)" }}>
                Accounts
              </h2>
              <div className="flex flex-col gap-1">
                {results.users.map((u) => (
                  <Link
                    key={u.id}
                    href={`/profile/${u.username}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--surface-2)]"
                  >
                    <div
                      className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center font-display text-base shrink-0"
                      style={{ background: "var(--surface-2)", color: "var(--gold)", border: "1px solid var(--border)" }}
                    >
                      {u.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.avatar} alt={u.username} className="w-full h-full object-cover" />
                      ) : (
                        u.displayName?.[0]?.toUpperCase() || u.username[0]?.toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                        {u.username}
                      </p>
                      {u.displayName && (
                        <p className="text-xs truncate" style={{ color: "var(--muted)" }}>
                          {u.displayName}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.posts.length > 0 && (
            <section>
              <h2 className="font-display text-lg mb-3" style={{ color: "var(--text)" }}>
                Posts
              </h2>
              <div className="grid grid-cols-3 gap-1">
                {results.posts.map((p) => (
                  <Link key={p.id} href={`/p/${p.id}`} className="relative aspect-square overflow-hidden group">
                    <MediaImage
                      src={p.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      wrapperClassName="w-full h-full"
                    />
                    {p.mediaType === "video" && (
                      <Video size={16} className="absolute top-1.5 right-1.5 text-white drop-shadow pointer-events-none" />
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {q.trim() && !loading && results && results.users.length === 0 && results.posts.length === 0 && (
        <div className="flex flex-col items-center gap-2 mt-16 text-center">
          <SearchX size={28} style={{ color: "var(--muted)" }} />
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            No results for “{q}”.
          </p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageInner />
    </Suspense>
  );
}
