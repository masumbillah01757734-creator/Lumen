"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, X } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/toast";

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleFile(f) {
    if (!f) return;
    setFile(f);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(f);
    });
    setError("");
  }

  function clearFile() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      setError("Choose a photo or video first.");
      notifyError("Choose a photo or video first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("media", file);
      form.append("caption", caption);
      const res = await fetch("/api/posts", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not upload your post.");
        notifyError(data.error);
        setLoading(false);
        return;
      }
      notifySuccess("Shared to your feed.");
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      notifyError("Network error. Try again.");
      setLoading(false);
    }
  }

  const isVideo = file?.type?.startsWith("video");

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="font-display text-3xl mb-1" style={{ color: "var(--text)" }}>
        New frame
      </h1>
      <p className="font-mono text-xs mb-6" style={{ color: "var(--muted)" }}>
        jpg · png · webp · gif (up to 10MB) — mp4 · webm (up to 150MB)
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div
          className="relative rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden aspect-square"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          {preview ? (
            <>
              {isVideo ? (
                <video src={preview} controls className="w-full h-full object-contain" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Preview" className="w-full h-full object-contain" />
              )}
              <button
                type="button"
                onClick={clearFile}
                className="absolute top-3 right-3 p-1.5 rounded-full"
                style={{ background: "rgba(0,0,0,0.65)" }}
                aria-label="Remove file"
              >
                <X size={18} color="white" />
              </button>
            </>
          ) : (
            <div
              onClick={() => inputRef.current?.click()}
              className="w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer"
              style={{ color: "var(--muted)" }}
            >
              <ImagePlus size={36} strokeWidth={1.5} />
              <span className="text-sm">Tap to choose a photo or video</span>
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {preview && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-sm font-medium self-start"
            style={{ color: "var(--gold)" }}
          >
            Choose a different file
          </button>
        )}

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption…"
          rows={3}
          maxLength={2200}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none border resize-none"
          style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
        />

        {error && (
          <p className="text-sm font-mono" style={{ color: "var(--accent)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: "var(--accent)", color: "#14120f" }}
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Sharing…" : "Share"}
        </button>
      </form>
    </div>
  );
}
