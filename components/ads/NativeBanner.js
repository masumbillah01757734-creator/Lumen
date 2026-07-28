"use client";

import { useEffect, useRef } from "react";

// effectivecpmnetwork.com "native banner" unit. Unlike the AdSlot units,
// this network's script renders directly into a container div rather than
// via an atOptions/iframe handshake, so we load it once per mount and let
// it populate its own div.
export default function NativeBanner() {
  const containerId = "container-5f4bc63e51990595ce30b5faed0a8b9b";
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.src =
      "https://pl30569614.effectivecpmnetwork.com/5f4bc63e51990595ce30b5faed0a8b9b/invoke.js";
    document.getElementById(containerId)?.appendChild(script);
  }, []);

  return <div id={containerId} />;
}
