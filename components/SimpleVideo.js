"use client";

import { useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { MediaVideo } from "@/components/Media";

export default function SimpleVideo({ src, className }) {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }

  return (
    <div className="relative w-full h-full">
      <MediaVideo
        src={src}
        ref={videoRef}
        muted={muted}
        playsInline
        loop
        onClick={togglePlay}
        className={className}
        wrapperClassName="w-full h-full"
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMuted((m) => !m);
        }}
        className="absolute bottom-2 right-2 p-2 rounded-full"
        style={{ background: "rgba(0,0,0,0.45)" }}
      >
        {muted ? <VolumeX size={16} color="white" /> : <Volume2 size={16} color="white" />}
      </button>
    </div>
  );
}
