// Deterministic "random" in [0,1) seeded by a string — same input always
// gives the same output, but different posts/days get different values.
function seededRandom(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

// A "hot" ranking, in the spirit of Reddit's hot-sort: engagement is
// log-scaled so one viral post can't bury everything else forever, recent
// posts get a gentle time-decay boost instead of a hard cutoff, and a
// per-day seeded jitter reshuffles ties so the feed doesn't feel robotic.
// The seed is stable for a whole day, so paging through the feed never
// repeats a post — the order only reshuffles once every 24h.
export function rankPosts(posts, seed = new Date().toISOString().slice(0, 10)) {
  return posts
    .map((p) => {
      const ageHours = Math.max(
        0,
        (Date.now() - new Date(p.createdAt).getTime()) / 36e5
      );
      const likes = p.likes?.length || 0;
      const comments = p.comments?.length || 0;
      const views = p.views?.length || 0;

      const weightedEngagement = likes * 4 + comments * 6 + views * 0.4;
      const engagementScore = Math.log10(weightedEngagement + 1) * 25;

      // Half-life style decay: still visible after a few days, fades slowly.
      const timeDecay = 60 / Math.pow(ageHours / 12 + 1, 1.4);

      const jitter = seededRandom(p._id.toString() + seed) * 9;

      return { post: p, score: engagementScore + timeDecay + jitter };
    })
    .sort((a, b) => b.score - a.score)
    .map((s) => s.post);
}
