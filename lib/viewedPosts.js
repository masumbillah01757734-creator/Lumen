// Keeps track of which posts this browser has already counted a view for,
// so refreshing the page (or scrolling past a reel again) doesn't inflate
// the view count for anonymous (not logged-in) visitors.
const STORAGE_KEY = "lumen_viewed_posts";
const MAX_ENTRIES = 500;

export function hasViewedLocally(postId) {
  if (typeof window === "undefined") return false;
  try {
    const viewed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return viewed.includes(postId);
  } catch {
    return false;
  }
}

export function markViewedLocally(postId) {
  if (typeof window === "undefined") return;
  try {
    const viewed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!viewed.includes(postId)) {
      viewed.push(postId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(viewed.slice(-MAX_ENTRIES)));
    }
  } catch {
    // private browsing / storage disabled — safe to ignore
  }
}
