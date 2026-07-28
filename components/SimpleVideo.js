"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { MediaVideo } from "@/components/Media";

// Same press-and-hold gesture set as the reels player:
//  - hold (no drag): plays forward at 2x
//  - drag left past a threshold while holding: scrubs backward (real
//    rewind), faster the further left
//  - release: resumes normal 1x playback from wherever it landed
//  - a quick tap with no hold/drag toggles mute (matches prior behavior)
export default function SimpleVideo({ src, className }) {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const [speedLevel, setSpeedLevel] = useState(0); // 0 = normal, 1 = 2x, -1 = rewinding

  const SPEEDS = [1, 2];
  const STEP_PX = 50;
  const REWIND_THRESHOLD_PX = 70;
  const MAX_REWIND_RATE = 4;

  const holdTimerRef = useRef(null);
  const isHoldingRef = useRef(false);
  const startXRef = useRef(0);
  const pointerIdRef = useRef(null);
  const rewindActiveRef = useRef(false);
  const rewindRateRef = useRef(1);
  const rafIdRef = useRef(null);
  const lastFrameTimeRef = useRef(0);

  function clearHoldTimer() {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }

  function stepRewind(now) {
    const video = videoRef.current;
    if (!video || !rewindActiveRef.current) {
      rafIdRef.current = null;
      return;
    }
    const dt = (now - lastFrameTimeRef.current) / 1000;
    lastFrameTimeRef.current = now;
    video.currentTime = Math.max(0, video.currentTime - rewindRateRef.current * dt);
    rafIdRef.current = requestAnimationFrame(stepRewind);
  }

  function startRewind() {
    if (rewindActiveRef.current) return;
    rewindActiveRef.current = true;
    const video = videoRef.current;
    if (video) video.pause();
    lastFrameTimeRef.current = performance.now();
    rafIdRef.current = requestAnimationFrame(stepRewind);
  }

  function stopRewind({ resume } = { resume: false }) {
    rewindActiveRef.current = false;
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (resume) {
      const video = videoRef.current;
      if (video) video.play().catch(() => {});
    }
  }

  function handlePointerDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    clearHoldTimer();
    holdTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      setSpeedLevel(1);
      const video = videoRef.current;
      if (video) video.playbackRate = SPEEDS[1];
    }, 250);
  }

  function handlePointerMove(e) {
    if (!isHoldingRef.current || pointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    const deltaX = e.clientX - startXRef.current;

    if (deltaX <= -REWIND_THRESHOLD_PX) {
      startRewind();
      const overshoot = Math.abs(deltaX) - REWIND_THRESHOLD_PX;
      rewindRateRef.current = Math.min(MAX_REWIND_RATE, 1 + overshoot / 60);
      setSpeedLevel(-1);
      return;
    }

    if (rewindActiveRef.current) {
      stopRewind({ resume: true });
    }

    const level = Math.max(0, Math.min(1, 1 - Math.round(deltaX / STEP_PX)));
    setSpeedLevel(level);
    const video = videoRef.current;
    if (video) video.playbackRate = SPEEDS[level];
  }

  function endHold(e) {
    if (pointerIdRef.current !== null && e && e.pointerId !== pointerIdRef.current) return;
    clearHoldTimer();
    const wasHolding = isHoldingRef.current;
    const wasRewinding = rewindActiveRef.current;
    isHoldingRef.current = false;
    pointerIdRef.current = null;
    stopRewind({ resume: wasRewinding });
    const video = videoRef.current;
    if (wasHolding) {
      if (video) video.playbackRate = 1;
      setSpeedLevel(0);
    } else {
      togglePlay();
    }
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }

  useEffect(() => {
    return () => {
      clearHoldTimer();
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <MediaVideo
        src={src}
        ref={videoRef}
        muted={muted}
        playsInline
        loop
        draggable={false}
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endHold}
        onPointerCancel={endHold}
        onPointerLeave={endHold}
        onContextMenu={(e) => e.preventDefault()}
        style={{ touchAction: "pan-y", WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
        className={`${className || ""} cursor-pointer`}
        wrapperClassName="w-full h-full"
      />

      {speedLevel !== 0 && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full text-sm font-semibold text-white pointer-events-none flex items-center gap-1.5"
          style={{ background: "rgba(0,0,0,0.55)" }}
        >
          {speedLevel === -1 ? <>⏪ Rewinding</> : <>{SPEEDS[speedLevel]}x speed</>}
        </div>
      )}

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
