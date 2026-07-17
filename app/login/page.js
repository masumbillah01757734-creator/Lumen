"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Aperture } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/toast";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not sign in.");
        notifyError(data.error);
        setLoading(false);
        return;
      }
      notifySuccess("Welcome back.");
      router.push(params.get("next") || "/");
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
            Lumen
          </h1>
          <p className="font-mono text-xs mt-2 tracking-wide" style={{ color: "var(--muted)" }}>
            f/2.8 · share the frame
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-6 border flex flex-col gap-4"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <input
            type="text"
            placeholder="Username or email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg text-sm outline-none border"
            style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm mt-5" style={{ color: "var(--muted)" }}>
          New here?{" "}
          <Link href="/register" className="font-medium" style={{ color: "var(--gold)" }}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
