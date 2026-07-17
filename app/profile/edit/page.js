"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/toast";

export default function EditProfilePage() {
  const router = useRouter();
  const fileRef = useRef(null);

  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ displayName: "", username: "", bio: "" });
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    fetch("/api/users/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setForm({
            displayName: data.user.displayName || "",
            username: data.user.username || "",
            bio: data.user.bio || "",
          });
          setAvatarPreview(data.user.avatar || "");
        }
        setLoaded(true);
      });
  }, []);

  function handleAvatarChange(f) {
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const body = new FormData();
      body.append("displayName", form.displayName);
      body.append("username", form.username);
      body.append("bio", form.bio);
      if (avatarFile) body.append("avatar", avatarFile);

      const res = await fetch("/api/users/me", { method: "PATCH", body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save changes.");
        notifyError(data.error);
        setSaving(false);
        return;
      }
      setSuccess("Profile updated.");
      notifySuccess("Profile updated.");
      setSaving(false);
      router.refresh();
      setTimeout(() => router.push(`/profile/${data.user.username}`), 600);
    } catch {
      setError("Network error. Try again.");
      notifyError("Network error. Try again.");
      setSaving(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    if (pw.newPassword !== pw.confirm) {
      setPwError("New passwords don't match.");
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: pw.currentPassword,
          newPassword: pw.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error || "Could not change password.");
        notifyError(data.error);
        setPwSaving(false);
        return;
      }
      setPwSuccess("Password changed.");
      notifySuccess("Password changed.");
      setPw({ currentPassword: "", newPassword: "", confirm: "" });
      setPwSaving(false);
    } catch {
      setPwError("Network error. Try again.");
      notifyError("Network error. Try again.");
      setPwSaving(false);
    }
  }

  async function handleDeleteAccount(e) {
    e.preventDefault();
    setDeleteError("");
    setDeleting(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || "Could not delete your account.");
        notifyError(data.error);
        setDeleting(false);
        return;
      }
      notifySuccess("Account deleted.");
      router.push("/login");
      router.refresh();
    } catch {
      setDeleteError("Network error. Try again.");
      notifyError("Network error. Try again.");
      setDeleting(false);
    }
  }

  if (!loaded) {
    return (
      <p className="text-center mt-16 text-sm" style={{ color: "var(--muted)" }}>
        Loading…
      </p>
    );
  }

  const inputStyle = {
    background: "var(--surface-2)",
    borderColor: "var(--border)",
    color: "var(--text)",
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="font-display text-3xl mb-6" style={{ color: "var(--text)" }}>
        Edit profile
      </h1>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border p-6 flex flex-col gap-4 mb-8"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative w-20 h-20 rounded-full overflow-hidden shrink-0 flex items-center justify-center font-display text-2xl group"
            style={{ background: "var(--surface-2)", color: "var(--gold)", border: "1px solid var(--border)" }}
          >
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              form.displayName?.[0]?.toUpperCase() || "?"
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={20} color="white" />
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => handleAvatarChange(e.target.files?.[0])}
          />
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Tap the circle to change your profile photo.
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
            Display name
          </span>
          <input
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            maxLength={50}
            className="px-4 py-2.5 rounded-lg text-sm outline-none border"
            style={inputStyle}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
            Username
          </span>
          <input
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            className="px-4 py-2.5 rounded-lg text-sm outline-none border"
            style={inputStyle}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
            Bio
          </span>
          <textarea
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            maxLength={160}
            rows={3}
            className="px-4 py-2.5 rounded-lg text-sm outline-none border resize-none"
            style={inputStyle}
          />
        </label>

        {error && (
          <p className="text-sm font-mono" style={{ color: "var(--accent)" }}>
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm font-mono" style={{ color: "var(--gold)" }}>
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: "var(--accent)", color: "#14120f" }}
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>

      <h2 className="font-display text-2xl mb-4" style={{ color: "var(--text)" }}>
        Change password
      </h2>
      <form
        onSubmit={handlePasswordSubmit}
        className="rounded-2xl border p-6 flex flex-col gap-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <input
          type="password"
          placeholder="Current password"
          value={pw.currentPassword}
          onChange={(e) => setPw((f) => ({ ...f, currentPassword: e.target.value }))}
          className="px-4 py-2.5 rounded-lg text-sm outline-none border"
          style={inputStyle}
          required
        />
        <input
          type="password"
          placeholder="New password"
          value={pw.newPassword}
          onChange={(e) => setPw((f) => ({ ...f, newPassword: e.target.value }))}
          className="px-4 py-2.5 rounded-lg text-sm outline-none border"
          style={inputStyle}
          required
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={pw.confirm}
          onChange={(e) => setPw((f) => ({ ...f, confirm: e.target.value }))}
          className="px-4 py-2.5 rounded-lg text-sm outline-none border"
          style={inputStyle}
          required
        />

        {pwError && (
          <p className="text-sm font-mono" style={{ color: "var(--accent)" }}>
            {pwError}
          </p>
        )}
        {pwSuccess && (
          <p className="text-sm font-mono" style={{ color: "var(--gold)" }}>
            {pwSuccess}
          </p>
        )}

        <button
          type="submit"
          disabled={pwSaving}
          className="py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60"
          style={{ background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" }}
        >
          {pwSaving ? "Updating…" : "Update password"}
        </button>
      </form>

      <h2 className="font-display text-2xl mb-4 mt-10" style={{ color: "var(--accent)" }}>
        Delete account
      </h2>
      <div
        className="rounded-2xl border p-6 flex flex-col gap-4"
        style={{ background: "var(--surface)", borderColor: "var(--accent-dim)" }}
      >
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          This permanently deletes your account, all of your posts, and your comments.
          This cannot be undone.
        </p>

        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="py-2.5 rounded-lg text-sm font-semibold self-start px-4"
            style={{ background: "transparent", color: "var(--accent)", border: "1px solid var(--accent-dim)" }}
          >
            Delete my account
          </button>
        ) : (
          <form onSubmit={handleDeleteAccount} className="flex flex-col gap-3">
            <input
              type="password"
              placeholder="Enter your password to confirm"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="px-4 py-2.5 rounded-lg text-sm outline-none border"
              style={inputStyle}
              required
            />
            {deleteError && (
              <p className="text-sm font-mono" style={{ color: "var(--accent)" }}>
                {deleteError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={deleting}
                className="py-2.5 px-4 rounded-lg text-sm font-semibold disabled:opacity-60"
                style={{ background: "var(--accent)", color: "#14120f" }}
              >
                {deleting ? "Deleting…" : "Yes, permanently delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="py-2.5 px-4 rounded-lg text-sm font-semibold"
                style={{ background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
