"use client";

import { useEffect } from "react";

const POPUNDER_URL = "https://www.effectivecpmnetwork.com/aqvmf1r7?key=ca1d8f343778447473fec262b9470bed";
const STORAGE_KEY = "lumen_popunder_shown";

// "Direct link" popunder ads are the most aggressive ad format — they open
// a new tab/window behind the page on click. Heads up before you enable this:
//   - Most ad blockers strip these, and some browsers (Chrome, Safari) treat
//     unsolicited popunders as abusive behavior and can throttle or warn on
//     the site.
//   - It's the format most likely to make visitors feel your site is spammy
//     and not come back — which works against the "1k visitors/day" goal.
// This hook is written to fire at most once per browser session (on the
// user's first click anywhere on the page) rather than on every click, to
// keep it less disruptive. It is NOT wired up anywhere by default —
// import and call usePopunder() in a page/layout only if you've decided
// the tradeoff is worth it.
export default function usePopunder() {
  useEffect(() => {
    function handleFirstClick() {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
      sessionStorage.setItem(STORAGE_KEY, "1");
      window.open(POPUNDER_URL, "_blank");
    }
    document.addEventListener("click", handleFirstClick, { once: true });
    return () => document.removeEventListener("click", handleFirstClick);
  }, []);
}
