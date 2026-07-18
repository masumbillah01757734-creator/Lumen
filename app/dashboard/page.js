"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { notifyError, notifySuccess, confirmToast } from "@/lib/toast";
import { useCurrentUser } from "@/components/UserContext";

export default function AdminPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [canManageRoles, setCanManageRoles] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [banningId, setBanningId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  async function loadUsers() {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Access denied.");
        return;
      }
      setUsers(data.users || []);
      setCanManageRoles(Boolean(data.canManageRoles));
    } catch {
      setError("Could not load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function updateRole(userId, role) {
    if (!canManageRoles) return;
    setSavingRole(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not update role.");
        return;
      }
      setUsers((current) => current.map((user) => (user.id === userId ? { ...user, role } : user)));
      setSelectedUser((current) => (current?.id === userId ? { ...current, role } : current));
    } catch {
      setError("Could not update role.");
    } finally {
      setSavingRole(false);
    }
  }

  async function toggleBan(user) {
    const nextBanned = !user.banned;
    setBanningId(user.id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, banned: nextBanned }),
      });
      const data = await res.json();
      if (!res.ok) {
        notifyError(data.error || "Could not update this user.");
        return;
      }
      setUsers((current) => current.map((u) => (u.id === user.id ? { ...u, banned: nextBanned } : u)));
      setSelectedUser((current) => (current?.id === user.id ? { ...current, banned: nextBanned } : current));
      notifySuccess(nextBanned ? "User banned." : "User unbanned.");
    } catch {
      notifyError("Could not update this user.");
    } finally {
      setBanningId(null);
    }
  }

  function deleteUser(user) {
    confirmToast(`Permanently delete ${user.username}? This can't be undone.`, async () => {
      setDeletingId(user.id);
      try {
        const res = await fetch("/api/admin/users", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        });
        const data = await res.json();
        if (!res.ok) {
          notifyError(data.error || "Could not delete this user.");
          return;
        }
        setUsers((current) => current.filter((u) => u.id !== user.id));
        setSelectedUser((current) => (current?.id === user.id ? null : current));
        notifySuccess("User deleted.");
      } catch {
        notifyError("Could not delete this user.");
      } finally {
        setDeletingId(null);
      }
    });
  }

  async function loginAsUser(user) {
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        notifyError(data.error || "Could not log in as this user.");
        return;
      }
      notifySuccess(`Signed in as @${data.username}.`);
      router.push("/");
      router.refresh();
    } catch {
      notifyError("Could not log in as this user.");
    }
  }

  function canImpersonate(user) {
    if (!currentUser || user.id === currentUser.id) return false;
    if (currentUser.role === "admin") return true;
    return user.role === "user";
  }

  const filteredUsers = users.filter((user) =>
    user.username?.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  if (loading) {
    return <p className="p-6 text-sm" style={{ color: "var(--muted)" }}>Loading Dashboard…</p>;
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-sm" style={{ color: "var(--accent)" }}>{error}</p>
        <button onClick={() => router.push("/")} className="mt-4 rounded-full px-4 py-2 text-sm" style={{ background: "var(--surface-2)", color: "var(--text)" }}>
          Back home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl" style={{ color: "var(--text)" }}>
            {currentUser?.role === "admin" ? "Admin Panel" : "Moderator Panel"}
          </h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>View users and account details</p>
        </div>
        <Link href="/" className="self-start sm:self-auto rounded-full px-4 py-2 text-sm" style={{ background: "var(--surface-2)", color: "var(--text)" }}>
          Home
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="order-2 lg:order-1 rounded-2xl border p-3 sm:p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h2 className="font-semibold mb-3" style={{ color: "var(--text)" }}>Users</h2>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username…"
            className="w-full rounded-full px-4 py-2 text-sm mb-3 outline-none"
            style={{ background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" }}
          />
          <div className="space-y-2">
            {filteredUsers.length === 0 && (
              <p className="text-sm" style={{ color: "var(--muted)" }}>No users match "{searchQuery}".</p>
            )}
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="w-full rounded-xl border p-3 text-left"
                style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
              >
                <button onClick={() => setSelectedUser(user)} className="w-full text-left">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center font-display text-sm shrink-0"
                        style={{ background: "var(--surface)", color: "var(--gold)", border: "1px solid var(--border)" }}
                      >
                        {user.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          user.displayName?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || "?"
                        )}
                      </div>
                      <span className="truncate" style={{ color: "var(--text)" }}>{user.username}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {user.banned && (
                        <span className="text-xs uppercase" style={{ color: "var(--accent)" }}>Banned</span>
                      )}
                      <span className="text-xs uppercase" style={{ color: "var(--accent)" }}>{user.role}</span>
                    </div>
                  </div>
                  <div className="text-xs mt-1 truncate" style={{ color: "var(--muted)" }}>{user.email}</div>
                </button>
                {(canManageRoles || user.role !== "admin") && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => toggleBan(user)}
                      disabled={banningId === user.id}
                      className="rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-60"
                      style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}
                    >
                      {banningId === user.id ? "Saving…" : user.banned ? "Unban" : "Ban"}
                    </button>
                    {canImpersonate(user) && (
                      <button
                        type="button"
                        onClick={() => loginAsUser(user)}
                        className="rounded-full px-3 py-1 text-xs font-semibold"
                        style={{ background: "var(--surface)", color: "var(--gold)", border: "1px solid var(--border)" }}
                      >
                        Login as
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteUser(user)}
                      disabled={deletingId === user.id}
                      className="rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-60"
                      style={{ background: "transparent", color: "var(--accent)", border: "1px solid var(--accent-dim)" }}
                    >
                      {deletingId === user.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="order-1 lg:order-2 rounded-2xl border p-3 sm:p-4 h-max" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h2 className="font-semibold mb-3" style={{ color: "var(--text)" }}>User details</h2>
          {selectedUser ? (
            <div className="space-y-3 text-sm">
              <Link
                href={`/profile/${selectedUser.username}`}
                className="flex items-center gap-3 pb-2 border-b transition-opacity hover:opacity-80"
                style={{ borderColor: "var(--border)" }}
              >
                <div
                  className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-display text-lg shrink-0"
                  style={{ background: "var(--surface-2)", color: "var(--gold)", border: "1px solid var(--border)" }}
                >
                  {selectedUser.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selectedUser.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    selectedUser.displayName?.[0]?.toUpperCase() || selectedUser.username?.[0]?.toUpperCase() || "?"
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold truncate" style={{ color: "var(--text)" }}>
                    {selectedUser.displayName || selectedUser.username}
                  </div>
                  <div className="text-xs font-mono truncate" style={{ color: "var(--muted)" }}>@{selectedUser.username}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                    {selectedUser.followersCount ?? selectedUser.followers?.length ?? 0} followers
                  </div>
                </div>
              </Link>
              <div>
                <div style={{ color: "var(--muted)" }}>Username</div>
                <div style={{ color: "var(--text)" }}>{selectedUser.username}</div>
              </div>
              <div>
                <div style={{ color: "var(--muted)" }}>Email</div>
                <div style={{ color: "var(--text)" }}>{selectedUser.email}</div>
              </div>
              <div>
                <div style={{ color: "var(--muted)" }}>Role</div>
                <div style={{ color: "var(--text)" }}>{selectedUser.role}</div>
              </div>
              <div>
                <div style={{ color: "var(--muted)" }}>Status</div>
                <div style={{ color: selectedUser.banned ? "var(--accent)" : "var(--text)" }}>
                  {selectedUser.banned ? "Banned" : "Active"}
                </div>
              </div>

              {(canManageRoles || selectedUser.role !== "admin") ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => toggleBan(selectedUser)}
                    disabled={banningId === selectedUser.id}
                    className="rounded-full px-3 py-1.5 text-sm font-semibold disabled:opacity-60"
                    style={{ background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" }}
                  >
                    {banningId === selectedUser.id ? "Saving…" : selectedUser.banned ? "Unban user" : "Ban user"}
                  </button>
                  {canImpersonate(selectedUser) && (
                    <button
                      type="button"
                      onClick={() => loginAsUser(selectedUser)}
                      className="rounded-full px-3 py-1.5 text-sm font-semibold"
                      style={{ background: "var(--surface-2)", color: "var(--gold)", border: "1px solid var(--border)" }}
                    >
                      Login as this user
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteUser(selectedUser)}
                    disabled={deletingId === selectedUser.id}
                    className="rounded-full px-3 py-1.5 text-sm font-semibold disabled:opacity-60"
                    style={{ background: "transparent", color: "var(--accent)", border: "1px solid var(--accent-dim)" }}
                  >
                    {deletingId === selectedUser.id ? "Deleting…" : "Delete user"}
                  </button>
                </div>
              ) : (
                <p className="text-xs pt-1" style={{ color: "var(--muted)" }}>
                  Moderators can't ban or delete admin accounts.
                </p>
              )}

              {canManageRoles ? (
                <div>
                  <div style={{ color: "var(--muted)" }}>Change role</div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(["user", "moderator", "admin"].filter((role) => role !== selectedUser.role)).map((role) => (
                      <button
                        key={role}
                        onClick={() => updateRole(selectedUser.id, role)}
                        disabled={savingRole}
                        className="rounded-full px-3 py-1.5 text-sm"
                        style={{ background: "var(--surface-2)", color: "var(--text)" }}
                      >
                        Make {role}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs" style={{ color: "var(--muted)" }}>Moderators can view users, but only admins can change roles.</p>
              )}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--muted)" }}>Select a user to view details.</p>
          )}
        </div>
      </div>
    </div>
  );
}