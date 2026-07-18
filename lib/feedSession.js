// Keeps the feed from feeling static: a random seed per browser tab session
// (so the shuffle differs each visit instead of freezing to one order for
// the whole day), plus small "memory" of which posts have already had their
// one free trip to the top of the feed and which ones the viewer scrolled
// past without engaging, so they don't keep resurfacing in the same spot.
const SEED_KEY = "lumen_feed_seed";
const SEEN_FRESH_KEY = "lumen_seen_fresh";
const SKIPPED_KEY = "lumen_skipped_posts";
const MAX_ENTRIES = 400;

export function getSessionSeed() {
  if (typeof window === "undefined") return "server";
  try {
    let seed = sessionStorage.getItem(SEED_KEY);
    if (!seed) {
      seed = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(SEED_KEY, seed);
    }
    return seed;
  } catch {
    return "fallback";
  }
}

function readList(key) {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function addToList(key, ids) {
  if (typeof window === "undefined" || !ids?.length) return;
  try {
    const current = readList(key);
    const merged = Array.from(new Set([...current, ...ids])).slice(-MAX_ENTRIES);
    localStorage.setItem(key, JSON.stringify(merged));
  } catch {
    // ignore
  }
}

// Posts the server flagged as "fresh" (new enough to deserve a top-of-feed
// boost) that this browser has already been shown once.
export function getSeenFreshIds() {
  return readList(SEEN_FRESH_KEY);
}
export function markSeenFresh(ids) {
  addToList(SEEN_FRESH_KEY, ids);
}

// Posts that scrolled fully past the viewport without a like/comment/tap —
// treated as "not interesting to this viewer right now" and nudged down.
export function getSkippedIds() {
  return readList(SKIPPED_KEY);
}
export function markSkipped(ids) {
  addToList(SKIPPED_KEY, ids);
}

// Once a post is liked/commented on it should stop being treated as
// "skipped" even if it was scrolled past earlier.
export function clearSkipped(id) {
  if (typeof window === "undefined" || !id) return;
  try {
    const current = readList(SKIPPED_KEY).filter((x) => x !== id);
    localStorage.setItem(SKIPPED_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
}
