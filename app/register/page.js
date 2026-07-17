"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Aperture } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/toast";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create your account.");
        notifyError(data.error);
        setLoading(false);
        return;
      }
      notifySuccess("Account created — welcome to Lumen.");
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      notifyError("Network error. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Aperture size={40} strokeWidth={1.3} style={{ color: "var(--accent)" }} />
          <h1 className="font-display text-4xl mt-3" style={{ color: "var(--text)" }}>
            Join Lumen
          </h1>
          <p className="font-mono text-xs mt-2 tracking-wide" style={{ color: "var(--muted)" }}>
            ISO 100 · a fresh roll of film
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-6 border flex flex-col gap-4"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <input
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={(e) => update("username", e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg text-sm outline-none border"
            style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg text-sm outline-none border"
            style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
            required
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg text-sm outline-none border"
            style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
            required
          />

          {error && (
            <p className="text-sm font-mono" style={{ color: "var(--accent)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{ background: "var(--accent)", color: "#14120f" }}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm mt-5" style={{ color: "var(--muted)" }}>
          Already have an account?{" "}
          <Link href="/login" className="font-medium" style={{ color: "var(--gold)" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
