"use client";

import { useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

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
      <video
        ref={videoRef}
        src={src}
        muted={muted}
        playsInline
        loop
        onClick={togglePlay}
        className={className}
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
