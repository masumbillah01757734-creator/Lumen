"use client";

import { useEffect } from "react";

// Reads from the same NEXT_PUBLIC_AD_LINK env var as the reels ad slot
// (see .env.local), falling back to the link you gave if it's unset.
const POPUNDER_URL =
  process.env.NEXT_PUBLIC_AD_LINK ||
  "https://www.effectivecpmnetwork.com/d3jk6rggng?key=b28433beacbba9e5a6258ca35c168fe2";
const STORAGE_KEY = "lumen_popunder_last_shown";
const COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes

// "Direct link" popunder ads open a new tab/window behind the page on
// click. Frequency-capping (this 3-min cooldown) is what these networks
// themselves recommend, since firing on every single click is what gets
// sites flagged by Safe Browsing / browser popup-abuse detection — capped
// like this is a meaningfully safer middle ground than uncapped.
// Fires on any click, but only once every COOLDOWN_MS at most.
export default function usePopunder() {
  useEffect(() => {
    function handleClick() {
      const last = Number(localStorage.getItem(STORAGE_KEY) || 0);
      const now = Date.now();
      if (now - last < COOLDOWN_MS) return;
      localStorage.setItem(STORAGE_KEY, String(now));
      window.open(POPUNDER_URL, "_blank");
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);
}
