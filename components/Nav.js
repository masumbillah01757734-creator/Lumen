"use client";

import Link from "next/link";
import { Aperture, Upload, Search, User as UserIcon, Clapperboard, Shield } from "lucide-react";
import SearchBar from "@/components/SearchBar";

export default function Nav({ user }) {
  if (!user) {
    return (
      <header
        className="sticky top-0 z-20 border-b backdrop-blur"
        style={{ borderColor: "var(--border)", background: "rgba(20,18,15,0.85)" }}
      >
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 h-16">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <Aperture
              size={26}
              strokeWidth={1.5}
              style={{ color: "var(--accent)" }}
              className="transition-transform group-hover:rotate-45 duration-500"
            />
            <span className="font-display text-2xl tracking-tight hidden xs:inline" style={{ color: "var(--text)" }}>
              Lumen
            </span>
          </Link>

          <SearchBar className="hidden sm:block flex-1 max-w-xs" />

          <nav className="flex items-center gap-1 ml-auto">
            <Link
              href="/search"
              className="p-2 rounded-full transition-colors hover:bg-[var(--surface-2)] sm:hidden"
              style={{ color: "var(--text)" }}
              aria-label="Search"
            >
              <Search size={20} strokeWidth={1.75} />
            </Link>
            <Link
              href="/reels"
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
              style={{ color: "var(--text)" }}
            >
              <Clapperboard size={18} strokeWidth={1.75} />
              <span className="hidden sm:inline">Reels</span>
            </Link>
            <Link
              href="/login"
              className="px-3 py-2 rounded-full text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
              style={{ color: "var(--text)" }}
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-full text-sm font-semibold"
              style={{ background: "var(--accent)", color: "#14120f" }}
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>
    );
  }

  return (
    <header
      className="sticky top-0 z-20 border-b backdrop-blur"
      style={{ borderColor: "var(--border)", background: "rgba(20,18,15,0.85)" }}
    >
      <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 h-16">
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <Aperture
            size={26}
            strokeWidth={1.5}
            style={{ color: "var(--accent)" }}
            className="transition-transform group-hover:rotate-45 duration-500"
          />
          <span className="font-display text-2xl tracking-tight hidden xs:inline" style={{ color: "var(--text)" }}>
            Lumen
          </span>
        </Link>

        <SearchBar className="hidden sm:block flex-1 max-w-xs" />

        <nav className="flex items-center gap-1 ml-auto">
          <Link
            href="/search"
            className="p-2 rounded-full transition-colors hover:bg-[var(--surface-2)] sm:hidden"
            style={{ color: "var(--text)" }}
            aria-label="Search"
          >
            <Search size={20} strokeWidth={1.75} />
          </Link>
          <Link
            href="/reels"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: "var(--text)" }}
          >
            <Clapperboard size={18} strokeWidth={1.75} />
            <span className="hidden sm:inline">Reels</span>
          </Link>
          <Link
            href="/upload"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: "var(--text)" }}
          >
            <Upload size={18} strokeWidth={1.75} />
            <span className="hidden sm:inline">Upload</span>
          </Link>
          {(user.role === "moderator" || user.role === "admin") && (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
              style={{ color: "var(--text)" }}
            >
              <Shield size={18} strokeWidth={1.75} />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
          <Link
            href={`/profile/${user.username}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: "var(--text)" }}
          >
            {user.avatar ? (
              <span className="w-[18px] h-[18px] rounded-full overflow-hidden inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
              </span>
            ) : (
              <UserIcon size={18} strokeWidth={1.75} />
            )}
            <span className="hidden sm:inline">{user.username}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
