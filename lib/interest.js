// Lightweight client-side "interest profile" built from what the viewer
// actually engages with (likes, comments, watching a post's own permalink).
// Nothing here ever leaves the browser except as an anonymous list of
// hashtags/author ids sent to /api/posts so the feed can lean toward what
// this browser tends to enjoy.
const TAGS_KEY = "lumen_interest_tags";
const AUTHORS_KEY = "lumen_interest_authors";
const MAX_ENTRIES = 40;

function readMap(key) {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

function writeMap(key, map) {
  if (typeof window === "undefined") return;
  try {
    // Keep only the strongest signals so the payload stays small.
    const entries = Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_ENTRIES);
    localStorage.setItem(key, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // ignore storage errors (private mode, quota, etc.)
  }
}

function bump(key, id, weight) {
  if (!id) return;
  const map = readMap(key);
  map[id] = (map[id] || 0) + weight;
  writeMap(key, map);
}

// Call whenever the viewer signals genuine interest in a post (like, comment,
// opening its permalink). `weight` lets stronger signals (comment) count more
// than a passive one (opening a post).
export function recordInterest(post, weight = 1) {
  if (!post) return;
  (post.hashtags || []).forEach((tag) => bump(TAGS_KEY, tag.toLowerCase(), weight));
  if (post.author?.id) bump(AUTHORS_KEY, post.author.id, weight);
}

export function getInterestProfile() {
  const tags = Object.entries(readMap(TAGS_KEY))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([tag]) => tag);
  const authors = Object.entries(readMap(AUTHORS_KEY))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([id]) => id);
  return { tags, authors };
}
