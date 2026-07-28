"use client";

import { useMemo } from "react";

// Reads up to 5 images + 5 videos from env vars and shows one at random
// each time this ad slot renders. All values come from your .env.local —
// nothing is hardcoded here. Add whichever of these you have; empty ones
// are skipped automatically.
//
//   NEXT_PUBLIC_AD_IMAGE_1 .. NEXT_PUBLIC_AD_IMAGE_5
//   NEXT_PUBLIC_AD_VIDEO_1 .. NEXT_PUBLIC_AD_VIDEO_5
//   NEXT_PUBLIC_AD_LINK          (click-through URL for all of them)
//
// NOTE: only NEXT_PUBLIC_-prefixed env vars are readable in the browser —
// this is a Next.js requirement, not something we added. After changing
// .env.local you need to restart `npm run dev` for new values to load.
const AD_LINK = process.env.NEXT_PUBLIC_AD_LINK || "#";

const IMAGE_URLS = [
  process.env.NEXT_PUBLIC_AD_IMAGE_1,
  process.env.NEXT_PUBLIC_AD_IMAGE_2,
  process.env.NEXT_PUBLIC_AD_IMAGE_3,
  process.env.NEXT_PUBLIC_AD_IMAGE_4,
  process.env.NEXT_PUBLIC_AD_IMAGE_5,
].filter(Boolean);

const VIDEO_URLS = [
  process.env.NEXT_PUBLIC_AD_VIDEO_1,
  process.env.NEXT_PUBLIC_AD_VIDEO_2,
  process.env.NEXT_PUBLIC_AD_VIDEO_3,
  process.env.NEXT_PUBLIC_AD_VIDEO_4,
  process.env.NEXT_PUBLIC_AD_VIDEO_5,
].filter(Boolean);

const ALL_MEDIA = [
  ...IMAGE_URLS.map((url) => ({ type: "image", url })),
  ...VIDEO_URLS.map((url) => ({ type: "video", url })),
];

export default function ReelImageAd() {
  // Picked once per mount so it doesn't flicker between renders of the
  // same slot, but different reel-ad slots on the page can show different
  // creatives.
  const media = useMemo(() => {
    if (ALL_MEDIA.length === 0) return null;
    return ALL_MEDIA[Math.floor(Math.random() * ALL_MEDIA.length)];
  }, []);

  if (!media) return null;

  return (
    <div
      className="snap-start shrink-0 w-full h-full relative flex items-center justify-center"
      style={{ background: "#000" }}
    >
      <a
        href={AD_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full h-full flex items-center justify-center"
      >
        {media.type === "video" ? (
          <video
            src={media.url}
            className="w-full h-full object-contain"
            autoPlay
            loop
            muted
            playsInline
            draggable={false}
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
            onContextMenu={(e) => e.preventDefault()}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media.url} alt="" className="w-full h-full object-contain" draggable={false} />
        )}
      </a>
      <span
        className="absolute top-4 left-4 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wide"
        style={{ background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.7)" }}
      >
        Sponsored
      </span>
    </div>
  );
}
