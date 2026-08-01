// Session helpers for the Reels feed. Unlike the main feed (lib/feedSession.js),
// which keeps one seed for the whole tab session so scrolling doesn't jump
// around mid-read, Reels wants a brand new random order every time the page
// is opened or refreshed, and again every time the scroll completes a full
// pass — so it never settles into a fixed, repeatable sequence.
const WATCHED_KEY = "leakreels_reels_watched";
const MAX_ENTRIES = 500;

function randomSeed() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Generated once per module load (i.e. once per page visit/refresh).
let currentSeed = null;

export function getReelsSeed() {
  if (!currentSeed) currentSeed = randomSeed();
  return currentSeed;
}

// Call when the scroll finishes a full pass through the available reels,
// so the next pass reshuffles into a different random order instead of
// repeating the same one.
export function reshuffleReelsSeed() {
  currentSeed = randomSeed();
  return currentSeed;
}

function readWatched() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(WATCHED_KEY) || "{}");
  } catch {
    return {};
  }
}

export function getWatchedHistory() {
  return readWatched();
}

// Records "watched this reel just now". Called every time a reel plays,
// even on a rewatch — each viewing resets its cooldown, so a reel you just
// watched stays out of rotation for a while before it's eligible to show
// up again.
export function markReelWatched(id) {
  if (typeof window === "undefined" || !id) return;
  try {
    const watched = readWatched();
    watched[id] = Date.now();
    const trimmed = Object.entries(watched)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_ENTRIES);
    localStorage.setItem(WATCHED_KEY, JSON.stringify(Object.fromEntries(trimmed)));
  } catch {
    // private browsing / storage disabled — safe to ignore
  }
}

// Serializes the watched history as "id:timestamp,id:timestamp,..." for the
// server to use when scoring how eligible each reel is to resurface.
export function watchedQueryParam() {
  const watched = readWatched();
  return Object.entries(watched)
    .map(([id, ts]) => `${id}:${ts}`)
    .join(",");
}
