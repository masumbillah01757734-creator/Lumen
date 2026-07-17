"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Heart, MessageCircle, Video, Trash2, Upload, ShieldCheck } from "lucide-react";
import { useCurrentUser } from "@/components/UserContext";
import { notifyError, notifySuccess, confirmToast } from "@/lib/toast";

export default function ProfilePage() {
  const { username } = useParams();
  const currentUser = useCurrentUser();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState("");
  const [followLoading, setFollowLoading] = useState(false);

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

  async function toggleFollow() {
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-6">
        <div
          className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center font-display text-3xl shrink-0"
          style={{ background: "var(--surface)", color: "var(--gold)", border: "1px solid var(--border)" }}
        >
          {profile.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" />
          ) : (
            profile.displayName?.[0]?.toUpperCase() || "?"
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl" style={{ color: "var(--text)" }}>
              {profile.username}
            </h1>
            {profile.isMe ? (
              <>
                <Link
                  href="/profile/edit"
                  className="px-4 py-1.5 rounded-full text-sm font-semibold"
                  style={{ background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" }}
                >
                  Edit profile
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
              </>
            ) : (
              <button
                onClick={toggleFollow}
                disabled={followLoading}
                className="px-4 py-1.5 rounded-full text-sm font-semibold disabled:opacity-60"
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
          <div className="flex gap-5 mt-2 font-mono text-sm" style={{ color: "var(--muted)" }}>
            <span>
              <b style={{ color: "var(--text)" }}>{profile.postCount}</b> posts
            </span>
            <span>
              <b style={{ color: "var(--text)" }}>{profile.followerCount}</b> followers
            </span>
            <span>
              <b style={{ color: "var(--text)" }}>{profile.followingCount}</b> following
            </span>
          </div>
          {profile.bio && (
            <p className="text-sm mt-2" style={{ color: "var(--text)" }}>
              {profile.bio}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 mt-8">
        {posts.map((post) => (
          <Link
            key={post.id}
            href="/"
            className="relative aspect-square overflow-hidden group"
            style={{ background: "var(--surface)" }}
          >
            {post.mediaType === "video" ? (
              <>
                <video src={post.mediaUrl} className="w-full h-full object-cover" />
                <Video size={16} className="absolute top-1.5 right-1.5 text-white drop-shadow" />
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-sm font-semibold">
              <span className="flex items-center gap-1">
                <Heart size={16} fill="white" /> {post.likeCount}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle size={16} fill="white" /> {post.commentCount}
              </span>
            </div>
            {profile.isMe && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  deletePost(post.id);
                }}
                className="absolute top-1.5 left-1.5 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.6)" }}
              >
                <Trash2 size={14} color="white" />
              </button>
            )}
          </Link>
        ))}
      </div>

      {posts.length === 0 && (
        <p className="text-center mt-16 text-sm" style={{ color: "var(--muted)" }}>
          No posts yet.
        </p>
      )}
    </div>
  );
}