"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, Video, Loader2 } from "lucide-react";
import { MediaImage } from "@/components/Media";

// A single search box that:
//  - shows a live dropdown of matching users/posts as you type (debounced)
//  - on Enter or clicking the search icon, navigates to the full /search page
//  - keeps working the same way once you're already on the search page, so
//    typing there still pops the dropdown before you commit to a new search
export default function SearchBar({ initialQuery = "", autoFocus = false, onSubmitQuery, className = "" }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);
  const reqIdRef = useRef(0);

  useEffect(() => setQuery(initialQuery), [initialQuery]);

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const myReqId = ++reqIdRef.current;
    debounceRef.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}&limit=6`)
        .then((res) => res.json())
        .then((data) => {
          if (reqIdRef.current !== myReqId) return; // stale response
          setResults(data);
        })
        .catch(() => {
          if (reqIdRef.current === myReqId) setResults({ users: [], posts: [] });
        })
        .finally(() => {
          if (reqIdRef.current === myReqId) setLoading(false);
        });
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function commitSearch(q = query) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setOpen(false);
    if (onSubmitQuery) {
      onSubmitQuery(trimmed);
    } else {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitSearch();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const hasDropdownContent = Boolean(query.trim()) && (loading || results);
  const noResults =
    results && !loading && (results.users?.length || 0) === 0 && (results.posts?.length || 0) === 0;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-full border transition-colors"
        style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
      >
        <Search size={16} strokeWidth={1.75} style={{ color: "var(--muted)" }} />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          placeholder="Search Lumen…"
          className="bg-transparent outline-none text-sm w-full min-w-0"
          style={{ color: "var(--text)" }}
        />
        {loading && <Loader2 size={14} className="animate-spin shrink-0" style={{ color: "var(--muted)" }} />}
        {!loading && query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults(null);
            }}
            className="shrink-0"
            style={{ color: "var(--muted)" }}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && hasDropdownContent && (
        <div
          className="absolute left-0 right-0 mt-2 rounded-xl border shadow-xl overflow-hidden z-30 max-h-[70vh] overflow-y-auto"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          {loading && !results && (
            <p className="px-4 py-3 text-sm" style={{ color: "var(--muted)" }}>
              Searching…
            </p>
          )}

          {noResults && (
            <p className="px-4 py-3 text-sm" style={{ color: "var(--muted)" }}>
              No matches for “{query.trim()}”.
            </p>
          )}

          {results?.users?.length > 0 && (
            <div className="py-1.5">
              <p className="px-4 pt-1 pb-1 text-[11px] font-mono uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                Accounts
              </p>
              {results.users.map((u) => (
                <Link
                  key={u.id}
                  href={`/profile/${u.username}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--surface-2)]"
                >
                  <div
                    className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center font-display text-sm shrink-0"
                    style={{ background: "var(--surface-2)", color: "var(--gold)" }}
                  >
                    {u.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatar} alt={u.username} className="w-full h-full object-cover" />
                    ) : (
                      u.displayName?.[0]?.toUpperCase() || u.username[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
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
          )}

          {results?.posts?.length > 0 && (
            <div className="py-1.5 border-t" style={{ borderColor: "var(--border)" }}>
              <p className="px-4 pt-1 pb-1 text-[11px] font-mono uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                Posts
              </p>
              {results.posts.map((p) => (
                <Link
                  key={p.id}
                  href={`/p/${p.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--surface-2)]"
                >
                  <MediaImage
                    src={p.thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    wrapperClassName="w-10 h-10 rounded-lg shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate" style={{ color: "var(--text)" }}>
                      {p.caption || (p.hashtags.length ? p.hashtags.map((t) => `#${t}`).join(" ") : `A ${p.mediaType} by ${p.author?.username || "someone"}`)}
                    </p>
                    <p className="text-xs truncate flex items-center gap-1" style={{ color: "var(--muted)" }}>
                      {p.mediaType === "video" && <Video size={11} />} {p.author?.username}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {(results?.users?.length > 0 || results?.posts?.length > 0) && (
            <button
              type="button"
              onClick={() => commitSearch()}
              className="w-full text-left px-4 py-2.5 text-sm border-t"
              style={{ borderColor: "var(--border)", color: "var(--accent)" }}
            >
              See all results for “{query.trim()}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}
