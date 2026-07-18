"use client";

import { useRouter } from "next/navigation";
import { notifySuccess, notifyError } from "@/lib/toast";

export default function ImpersonationBanner({ adminUsername }) {
  const router = useRouter();

  async function stop() {
    try {
      const res = await fetch("/api/admin/stop-impersonate", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        notifyError(data.error || "Could not return to your account.");
        return;
      }
      notifySuccess("Back to your account.");
      router.push("/dashboard");
      router.refresh();
    } catch {
      notifyError("Could not return to your account.");
    }
  }

  return (
    <div
      className="text-center text-xs font-mono py-2 px-3"
      style={{ background: "var(--accent)", color: "#14120f" }}
    >
      Viewing as this user{adminUsername ? ` — signed in via @${adminUsername}` : ""}.{" "}
      <button onClick={stop} className="underline font-semibold">
        Return to admin
      </button>
    </div>
  );
}
