"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Video,
  Trash2,
  Upload,
  ShieldCheck,
  Settings,
  LogOut,
  Pencil,
  KeyRound,
  Image as ImageIcon,
  Film,
  Grid3x3,
} from "lucide-react";
import { useCurrentUser } from "@/components/UserContext";
import { notifyError, notifySuccess, confirmToast } from "@/lib/toast";
import { MediaImage, MediaVideo } from "@/components/Media";

const TABS = [
  { key: "all", label: "All", icon: Grid3x3 },
  { key: "image", label: "Photos", icon: ImageIcon },
  { key: "video", label: "Videos", icon: Film },
];

function PostTile({ post, isMe, username, onDelete }) {
  return (
    <Link
      href={`/profile/${username}/post/${post.id}`}
      className="relative aspect-square overflow-hidden group"
      style={{ background: "var(--surface)" }}
    >
      {post.mediaType === "video" ? (
        <>
          <MediaVideo src={post.mediaUrl} className="w-full h-full object-cover" wrapperClassName="w-full h-full" muted />
          <Video size={16} className="absolute top-1.5 right-1.5 text-white drop-shadow pointer-events-none" />
        </>
      ) : (
        <MediaImage src={post.mediaUrl} alt="" className="w-full h-full object-cover" wrapperClassName="w-full h-full" />
      )}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-sm font-semibold pointer-events-none">
        <span className="flex items-center gap-1">
          <Heart size={16} fill="white" /> {post.likeCount}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle size={16} fill="white" /> {post.commentCount}
        </span>
      </div>
      {isMe && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(post.id);
          }}
          className="absolute top-1.5 left-1.5 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(0,0,0,0.6)" }}
        >
          <Trash2 size={14} color="white" />
        </button>
      )}
    </Link>
  );
}

export default function ProfileClient() {
  const { username } = useParams();
  const router = useRouter();
  const currentUser = useCurrentUser();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState("");
  const [followLoading, setFollowLoading] = useState(false);
  const [tab, setTab] = useState("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const settingsRef = useRef(null);

  useEffect(() => {
    fetch(`/api/users/${username}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setProfile(data.profile);
          setPosts(data.posts);
        }
      })
      .catch(() => setError("Could not load this profile."));
  }, [username]);

  useEffect(() => {
    function onClickOutside(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function toggleFollow() {
    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent(`/profile/${username}`)}`);
      return;
    }
    setFollowLoading(true);
    try {
      const res = await fetch(`/api/users/${username}/follow`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setProfile((p) => ({ ...p, isFollowing: data.following, followerCount: data.followerCount }));
      } else {
        notifyError(data.error);
      }
    } catch {
      notifyError("Couldn't update follow status.");
    } finally {
      setFollowLoading(false);
    }
  }

  function deletePost(postId) {
    confirmToast("Delete this post? This can't be undone.", async () => {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (res.ok) {
        setPosts((ps) => ps.filter((p) => p.id !== postId));
        setProfile((p) => ({ ...p, postCount: p.postCount - 1 }));
        notifySuccess("Post deleted.");
      } else {
        notifyError("Could not delete that post.");
      }
    });
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch {
      setLoggingOut(false);
      notifyError("Could not log out. Try again.");
    }
  }

  if (error) {
    return (
      <p className="text-center mt-16 font-mono text-sm" style={{ color: "var(--accent)" }}>
        {error}
      </p>
    );
  }

  if (!profile) {
    return (
      <p className="text-center mt-16 text-sm" style={{ color: "var(--muted)" }}>
        Loading profile…
      </p>
    );
  }

  const canModerate = profile.isMe && currentUser && (currentUser.role === "admin" || currentUser.role === "moderator");
  const photoCount = posts.filter((p) => p.mediaType === "image").length;
  const videoCount = posts.filter((p) => p.mediaType === "video").length;
  const visiblePosts = tab === "all" ? posts : posts.filter((p) => p.mediaType === tab);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div
        className="rounded-2xl border p-6 sm:p-8"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-start gap-5 sm:gap-6">
          <div
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden flex items-center justify-center font-display text-3xl shrink-0"
            style={{ background: "var(--surface-2)", color: "var(--gold)", border: "2px solid var(--border)" }}
          >
            {profile.avatar ? (
              <MediaImage src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" wrapperClassName="w-full h-full" />
            ) : (
              profile.displayName?.[0]?.toUpperCase() || "?"
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl truncate" style={{ color: "var(--text)" }}>
                {profile.username}
              </h1>
              {profile.displayName && (
                <span className="text-sm" style={{ color: "var(--muted)" }}>
                  {profile.displayName}
                </span>
              )}
            </div>

            <div className="flex gap-5 mt-2.5 font-mono text-sm">
              <span>
                <b style={{ color: "var(--text)" }}>{profile.postCount}</b>{" "}
                <span style={{ color: "var(--muted)" }}>posts</span>
              </span>
              <span>
                <b style={{ color: "var(--text)" }}>{profile.followerCount}</b>{" "}
                <span style={{ color: "var(--muted)" }}>followers</span>
              </span>
              <span>
                <b style={{ color: "var(--text)" }}>{profile.followingCount}</b>{" "}
                <span style={{ color: "var(--muted)" }}>following</span>
              </span>
            </div>

            {profile.bio && (
              <p className="text-sm mt-3 leading-relaxed" style={{ color: "var(--text)" }}>
                {profile.bio}
              </p>
            )}

            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {profile.isMe ? (
                <>
                  <Link
                    href="/profile/edit"
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold"
                    style={{ background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" }}
                  >
                    <Pencil size={13} /> Edit profile
                  </Link>
                  <Link
                    href="/upload"
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold"
                    style={{ background: "var(--accent)", color: "#14120f" }}
                  >
                    <Upload size={15} /> Upload
                  </Link>
                  {canModerate && (
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold"
                      style={{ background: "var(--surface-2)", color: "var(--gold)", border: "1px solid var(--border)" }}
                    >
                      <ShieldCheck size={15} /> {currentUser?.role === "admin" ? "Admin dashboard" : "Moderator dashboard"}
                    </Link>
                  )}

                  {/* Settings menu: houses logout and other account actions,
                      kept off the global nav bar so it only appears in the
                      one place it's relevant. */}
                  <div className="relative ml-auto" ref={settingsRef}>
                    <button
                      onClick={() => setSettingsOpen((v) => !v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
                      style={{ background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" }}
                      aria-label="Settings"
                    >
                      <Settings size={15} />
                    </button>
                    {settingsOpen && (
                      <div
                        className="absolute right-0 top-10 z-20 w-56 rounded-xl border overflow-hidden text-sm shadow-xl"
                        style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
                      >
                        <Link
                          href="/profile/edit"
                          onClick={() => setSettingsOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-3 hover:bg-black/20"
                          style={{ color: "var(--text)" }}
                        >
                          <KeyRound size={15} /> Account &amp; password
                        </Link>
                        <button
                          onClick={handleLogout}
                          disabled={loggingOut}
                          className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-black/20 disabled:opacity-60"
                          style={{ color: "var(--accent)" }}
                        >
                          <LogOut size={15} /> {loggingOut ? "Logging out…" : "Log out"}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <button
                  onClick={toggleFollow}
                  disabled={followLoading}
                  className="px-5 py-1.5 rounded-full text-sm font-semibold disabled:opacity-60"
                  style={
                    profile.isFollowing
                      ? { background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" }
                      : { background: "var(--accent)", color: "#14120f" }
                  }
                >
                  {profile.isFollowing ? "Following" : "Follow"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Photos / Videos tabs */}
      <div className="flex items-center gap-1 mt-6 border-b" style={{ borderColor: "var(--border)" }}>
        {TABS.map(({ key, label, icon: Icon }) => {
          const count = key === "all" ? posts.length : key === "image" ? photoCount : videoCount;
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors"
              style={{
                color: active ? "var(--accent)" : "var(--muted)",
                borderColor: active ? "var(--accent)" : "transparent",
              }}
            >
              <Icon size={15} strokeWidth={1.75} />
              {label}
              <span className="font-mono text-xs">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-1 mt-4">
        {visiblePosts.map((post) => (
          <PostTile key={post.id} post={post} isMe={profile.isMe} username={username} onDelete={deletePost} />
        ))}
      </div>

      {visiblePosts.length === 0 && (
        <p className="text-center mt-16 text-sm" style={{ color: "var(--muted)" }}>
          {tab === "video" ? "No videos yet." : tab === "image" ? "No photos yet." : "No posts yet."}
        </p>
      )}
    </div>
  );
}
