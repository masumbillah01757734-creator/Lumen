"use client";

import Script from "next/script";

// Adsterra native banner. Renders into a container div with the id the
// script expects, loaded once per mount.
export default function NativeBanner({ containerId, src, className = "" }) {
  return (
    <div className={className}>
      <div id={`container-${containerId}`} />
      <Script
        src={src}
        strategy="lazyOnload"
        data-cfasync="false"
        async
      />
    </div>
  );
}
