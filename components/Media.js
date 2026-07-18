"use client";

import { forwardRef, useState } from "react";
import { ImageOff, VideoOff, Loader2 } from "lucide-react";

function Skeleton() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background:
          "linear-gradient(100deg, var(--surface) 30%, var(--surface-2) 50%, var(--surface) 70%)",
        backgroundSize: "200% 100%",
        animation: "lumen-shimmer 1.4s ease-in-out infinite",
      }}
    >
      <Loader2 size={22} className="animate-spin" style={{ color: "var(--muted)" }} />
      <style jsx>{`
        @keyframes lumen-shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}

function Fallback({ video }) {
  const Icon = video ? VideoOff : ImageOff;
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
      style={{ background: "var(--surface)", color: "var(--muted)" }}
    >
      <Icon size={22} strokeWidth={1.5} />
      <span className="text-[11px] font-mono">{video ? "Video unavailable" : "Image unavailable"}</span>
    </div>
  );
}

// Wraps <img> with a shimmering placeholder while it loads and a friendly
// fallback if the media fails to load — so a slow/broken image never leaves
// a blank hole in the layout.
export function MediaImage({ src, alt, className, wrapperClassName, style }) {
  const [state, setState] = useState(src ? "loading" : "error");

  return (
    <div className={`relative overflow-hidden ${wrapperClassName || ""}`} style={style}>
      {state !== "error" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt || ""}
          className={className}
          style={{ opacity: state === "loaded" ? 1 : 0, transition: "opacity 0.25s ease" }}
          onLoad={() => setState("loaded")}
          onError={() => setState("error")}
        />
      )}
      {state === "loading" && <Skeleton />}
      {state === "error" && <Fallback />}
    </div>
  );
}

// Same idea for <video>: shows a shimmer until the first frame is ready and
// a fallback icon if the video can't be loaded at all.
export const MediaVideo = forwardRef(function MediaVideo(
  { src, className, wrapperClassName, style, onLoadedData, onError, ...videoProps },
  ref
) {
  const [state, setState] = useState(src ? "loading" : "error");

  return (
    <div className={`relative overflow-hidden ${wrapperClassName || ""}`} style={style}>
      {state !== "error" && (
        <video
          ref={ref}
          src={src}
          className={className}
          style={{ opacity: state === "loaded" ? 1 : 0, transition: "opacity 0.25s ease" }}
          onLoadedData={(e) => {
            setState("loaded");
            onLoadedData?.(e);
          }}
          onError={(e) => {
            setState("error");
            onError?.(e);
          }}
          {...videoProps}
        />
      )}
      {state === "loading" && <Skeleton />}
      {state === "error" && <Fallback video />}
    </div>
  );
});
