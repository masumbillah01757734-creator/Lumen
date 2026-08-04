"use client";

import Script from "next/script";
import { SOCIAL_BAR_SRC } from "@/lib/ads";

// Site-wide ad scripts that only need to load once, anywhere on the page.
// Mounted in the root layout.
export default function GlobalAdScripts() {
  return (
    <>
      {/* <Script src={POPUNDER_SRC} strategy="lazyOnload" /> */}
      <Script src={SOCIAL_BAR_SRC} strategy="lazyOnload" />
    </>
  );
}
