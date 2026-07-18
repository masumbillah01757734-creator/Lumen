"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ImagePlus,
  Loader2,
  X,
  MapPin,
  Hash,
  AlignLeft,
  ArrowLeft,
  Film,
  UploadCloud,
} from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/toast";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_COUNT = 10;
const MAX_CAPTION = 2200;
const MAX_HASHTAGS = 200;
const MAX_LOCATION = 120;

function formatBytes(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

// Grabs a frame from a video file to use as its share/social-preview thumbnail
// (social apps need a still image to render a link card, not the video itself).
function captureVideoThumbnail(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    const cleanup = () => URL.revokeObjectURL(objectUrl);

    video.onloadeddata = () => {
      try {
        video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
      } catch {
        cleanup();
        resolve(null);
      }
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            cleanup();
            resolve(blob);
          },
          "image/jpeg",
          0.85
        );
      } catch {
        cleanup();
        resolve(null);
      }
    };
    video.onerror = () => {
      cleanup();
      resolve(null);
    };
  });
}

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [replaceIndex, setReplaceIndex] = useState(null);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  function handleFiles(nextFiles) {
    if (!nextFiles?.length) return;

    const normalized = Array.from(nextFiles);
    const hasVideo = normalized.some((file) => VIDEO_TYPES.includes(file.type));
    const hasImage = normalized.some((file) => IMAGE_TYPES.includes(file.type));

    if (hasVideo && hasImage) {
      setError("Images and videos cannot be mixed in one post.");
      notifyError("Images and videos cannot be mixed in one post.");
      return;
    }
    if (hasVideo && normalized.length > 1) {
      setError("Only one video is allowed per post.");
      notifyError("Only one video is allowed per post.");
      return;
    }
    if (hasImage && normalized.length > MAX_IMAGE_COUNT) {
      setError(`You can add up to ${MAX_IMAGE_COUNT} images in one post.`);
      notifyError(`You can add up to ${MAX_IMAGE_COUNT} images in one post.`);
      return;
    }

    const invalid = normalized.find((file) => !IMAGE_TYPES.includes(file.type) && !VIDEO_TYPES.includes(file.type));
    if (invalid) {
      setError("Only jpg, png, webp, gif, mp4, webm, or mov files are allowed.");
      notifyError("Only jpg, png, webp, gif, mp4, webm, or mov files are allowed.");
      return;
    }

    const oversized = normalized.find((file) => file.size > MAX_BYTES);
    if (oversized) {
      setError(`"${oversized.name}" is too large. The max size is 50MB.`);
      notifyError(`"${oversized.name}" is too large. The max size is 50MB.`);
      return;
    }

    const nextPreview = {
      name: normalized[0].name,
      type: normalized[0].type,
      url: URL.createObjectURL(normalized[0]),
      size: normalized[0].size,
    };

    if (replaceIndex !== null) {
      setFiles((current) => {
        const next = [...current];
        next[replaceIndex] = normalized[0];
        return next;
      });
      setPreviews((current) => {
        const next = [...current];
        const previous = current[replaceIndex];
        if (previous?.url) URL.revokeObjectURL(previous.url);
        next[replaceIndex] = nextPreview;
        return next;
      });
      setReplaceIndex(null);
      setError("");
      return;
    }

    const currentSelection = files;
    const currentType = currentSelection.some((file) => file.type.startsWith("video")) ? "video" : "image";
    const nextType = normalized[0].type.startsWith("video") ? "video" : "image";

    if (currentSelection.length && currentType !== nextType) {
      setFiles(normalized);
      setPreviews([nextPreview]);
      setError("");
      return;
    }

    setFiles((current) => [...current, ...normalized]);
    setPreviews((current) => [...current, nextPreview]);
    setError("");
  }

  function removeItem(index) {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setPreviews((current) => {
      const entry = current[index];
      if (entry?.url) URL.revokeObjectURL(entry.url);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!files.length) {
      setError("Choose a photo or video first.");
      notifyError("Choose a photo or video first.");
      return;
    }

    setLoading(true);
    setError("");
    setProgress(0);

    const isVideoPost = files.some((file) => file.type.startsWith("video"));

    try {
      if (isVideoPost) {
        // Vercel Functions reject request bodies over 4.5MB, so the video
        // never goes through /api/posts. Instead, ask the server for a
        // presigned R2 URL and upload the file straight to storage.
        const videoFile = files[0];
        const presignRes = await fetch("/api/uploads/video-presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: videoFile.name,
            contentType: videoFile.type,
            size: videoFile.size,
          }),
        });
        const presignData = await presignRes.json().catch(() => ({}));
        if (!presignRes.ok) {
          throw new Error(presignData.error || "Could not prepare video upload.");
        }

        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", presignData.uploadUrl);
          xhr.setRequestHeader("Content-Type", videoFile.type);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              setProgress(Math.round((event.loaded / event.total) * 90));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error("Could not upload your video to storage."));
            }
          };
          xhr.onerror = () => reject(new Error("Network error while uploading your video."));
          xhr.send(videoFile);
        });

        setProgress(95);

        // Best-effort: capture a frame so shared links show a real thumbnail
        // instead of no image at all. If this fails, the post still gets created.
        let thumbnailUrl = "";
        try {
          const thumbBlob = await captureVideoThumbnail(videoFile);
          if (thumbBlob) {
            const thumbForm = new FormData();
            thumbForm.append("file", thumbBlob, "thumbnail.jpg");
            const thumbRes = await fetch("/api/uploads/thumbnail", { method: "POST", body: thumbForm });
            const thumbData = await thumbRes.json().catch(() => ({}));
            if (thumbRes.ok) thumbnailUrl = thumbData.url || "";
          }
        } catch {
          // no thumbnail — not fatal
        }

        const postRes = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caption,
            hashtags,
            location,
            thumbnailUrl,
            mediaItems: [
              {
                url: presignData.publicUrl,
                key: presignData.key,
                mediaType: "video",
              },
            ],
          }),
        });
        const postData = await postRes.json().catch(() => ({}));
        if (!postRes.ok) {
          throw new Error(postData.error || "Could not create your post.");
        }
      } else {
        const form = new FormData();
        files.forEach((file) => form.append("media", file));
        form.append("caption", caption);
        form.append("hashtags", hashtags);
        form.append("location", location);

        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/posts");

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              setProgress(Math.round((event.loaded / event.total) * 100));
            }
          };

          xhr.onload = () => {
            let data = {};
            try {
              data = JSON.parse(xhr.responseText || "{}");
            } catch {
              // ignore malformed body
            }
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(data);
            } else {
              reject(new Error(data.error || "Could not upload your post."));
            }
          };

          xhr.onerror = () => reject(new Error("Network error. Try again."));
          xhr.send(form);
        });
      }

      setProgress(100);
      notifySuccess("Shared to your feed.");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err.message || "Could not upload your post.");
      notifyError(err.message || "Could not upload your post.");
      setLoading(false);
    }
  }

  const isVideo = files.some((file) => file.type.startsWith("video"));
  const canAddMore = !files.length || (!isVideo && files.length < MAX_IMAGE_COUNT);

  const previewSummary = useMemo(() => {
    if (!files.length) return "No media selected";
    if (isVideo) return "1 video selected";
    return `${files.length} of ${MAX_IMAGE_COUNT} images selected`;
  }, [files.length, isVideo]);

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full p-2 border transition-opacity hover:opacity-70"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
          aria-label="Go back"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="font-display text-2xl leading-tight" style={{ color: "var(--text)" }}>
            New frame
          </h1>
          <p className="font-mono text-[11px]" style={{ color: "var(--muted)" }}>
            Share up to {MAX_IMAGE_COUNT} images or one video · 50MB max each
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Media section */}
        <section className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div
            onClick={() => canAddMore && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              if (canAddMore) setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={canAddMore ? handleDrop : (e) => e.preventDefault()}
            className={`flex items-center justify-center overflow-hidden transition-colors ${previews.length ? "" : "aspect-square"
              }`}
            style={{
              cursor: canAddMore ? "pointer" : "default",
              background: dragActive ? "var(--surface-2)" : "transparent",
              outline: dragActive ? `2px dashed var(--accent)` : "none",
              outlineOffset: "-8px",
            }}
          >
            {previews.length ? (
              <div className="w-full h-full overflow-y-auto p-3 grid gap-3 sm:grid-cols-2">
                {previews.map((preview, index) => (
                  <div
                    key={`${preview.name}-${index}`}
                    className="relative rounded-xl overflow-hidden border aspect-square"
                    style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                  >
                    {preview.type.startsWith("video") ? (
                      <video src={preview.url} controls className="w-full h-full object-contain bg-black" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview.url} alt={preview.name} className="w-full h-full object-contain" />
                    )}
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setReplaceIndex(index);
                          inputRef.current?.click();
                        }}
                        className="rounded-full p-1.5 transition-transform hover:scale-105"
                        style={{ background: "rgba(0,0,0,0.65)" }}
                        aria-label="Replace file"
                      >
                        <ImagePlus size={13} color="white" />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeItem(index);
                        }}
                        className="rounded-full p-1.5 transition-transform hover:scale-105"
                        style={{ background: "rgba(0,0,0,0.65)" }}
                        aria-label="Remove file"
                      >
                        <X size={13} color="white" />
                      </button>
                    </div>
                    <div
                      className="absolute bottom-0 inset-x-0 px-2 py-1 text-[10px] font-mono truncate"
                      style={{ background: "rgba(0,0,0,0.55)", color: "white" }}
                    >
                      {preview.name}
                    </div>
                  </div>
                ))}
                {canAddMore && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      inputRef.current?.click();
                    }}
                    className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 aspect-square transition-colors hover:opacity-80"
                    style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                  >
                    <ImagePlus size={20} strokeWidth={1.5} />
                    <span className="text-[11px] font-mono">Add more</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2.5 px-6 text-center" style={{ color: "var(--muted)" }}>
                <div className="rounded-full p-4 border" style={{ borderColor: "var(--border)" }}>
                  <UploadCloud size={26} strokeWidth={1.5} />
                </div>
                <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                  Drag files here or tap to browse
                </span>
                <span className="text-[11px] font-mono">jpg · png · webp · gif · mp4 · webm · mov</span>
              </div>
            )}
          </div>

          <div
            className="flex items-center justify-between px-4 py-2.5 border-t text-[11px] font-mono"
            style={{ borderColor: "var(--border)", color: "var(--muted)" }}
          >
            <span className="flex items-center gap-1.5">
              {isVideo && <Film size={12} />}
              {previewSummary}
            </span>
            {!canAddMore && isVideo && <span style={{ color: "var(--accent)" }}>Video selected — remove it to add images</span>}
          </div>
        </section>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
          className="hidden"
          multiple={!isVideo}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {/* Details section */}
        <section className="rounded-2xl border p-4 flex flex-col gap-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h2 className="font-display text-sm" style={{ color: "var(--text)" }}>
            Details
          </h2>

          <label className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-[11px] font-mono" style={{ color: "var(--muted)" }}>
              <MapPin size={12} /> Location
            </span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add a location"
              maxLength={MAX_LOCATION}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none border transition-colors focus:opacity-100"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-[11px] font-mono" style={{ color: "var(--muted)" }}>
              <Hash size={12} /> Hashtags
            </span>
            <input
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value.slice(0, MAX_HASHTAGS))}
              placeholder="#launch #frame"
              maxLength={MAX_HASHTAGS}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none border"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
            />
            <span className="self-end text-[10px] font-mono" style={{ color: "var(--muted)" }}>
              {hashtags.length}/{MAX_HASHTAGS}
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-[11px] font-mono" style={{ color: "var(--muted)" }}>
              <AlignLeft size={12} /> Caption
            </span>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
              placeholder="Write a caption…"
              rows={3}
              maxLength={MAX_CAPTION}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none border resize-none"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
            />
            <span className="self-end text-[10px] font-mono" style={{ color: "var(--muted)" }}>
              {caption.length}/{MAX_CAPTION}
            </span>
          </label>
        </section>

        {loading && (
          <div className="rounded-xl border p-3 text-xs font-mono" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
            <div className="flex items-center justify-between mb-2">
              <span>Uploading…</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
              <div className="h-1.5 rounded-full transition-all duration-200" style={{ width: `${progress}%`, background: "var(--accent)" }} />
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm font-mono px-1" style={{ color: "var(--accent)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !files.length}
          className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#14120f" }}
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Sharing…" : "Share"}
        </button>
      </form>
    </div>
  );
}