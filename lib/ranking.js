function seededRandom(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

// A post counts as "fresh" (eligible for its one free trip to the top of
// the feed) for this long after it's posted.
const FRESH_WINDOW_HOURS = 6;

export function isFreshPost(post) {
  const ageHours = (Date.now() - new Date(post.createdAt).getTime()) / 36e5;
  return ageHours >= 0 && ageHours < FRESH_WINDOW_HOURS;
}

/**
 * Ranks posts for a feed.
 *
 * options:
 *  - seed: per-viewer-session string. Randomizing per session (instead of
 *    per calendar day) means the same post doesn't camp at the top of
 *    everyone's feed all day, while staying stable while one session scrolls.
 *  - seenFreshIds: ids of posts this viewer already had shown to them once
 *    while fresh — their one-time "new post" boost is retired so they settle
 *    into the feed based on normal engagement instead of staying pinned up top.
 *  - skippedIds: ids of posts the viewer scrolled straight past without
 *    liking/commenting/opening — nudged down so the same ignored post
 *    doesn't keep resurfacing in the same spot.
 *  - interestTags / interestAuthors: hashtags/authors this viewer tends to
 *    engage with, used to lean the ranking toward similar posts.
 */
export function rankPosts(posts, options = {}) {
  const {
    seed = new Date().toISOString().slice(0, 10),
    seenFreshIds = [],
    skippedIds = [],
    interestTags = [],
    interestAuthors = [],
  } = options;

  const seenFresh = new Set(seenFreshIds);
  const skipped = new Set(skippedIds);
  const tagInterest = new Set(interestTags.map((t) => t.toLowerCase()));
  const authorInterest = new Set(interestAuthors);

  return posts
    .map((p) => {
      const id = p._id.toString();
      const ageHours = Math.max(0, (Date.now() - new Date(p.createdAt).getTime()) / 36e5);
      const likes = p.likes?.length || 0;
      const comments = p.comments?.length || 0;
      const views = (p.views?.length || 0) + (p.anonymousViews || 0);
      const saves = p.saves?.length || p.saveCount || 0;
      const shares = p.shareCount || p.shares || 0;
      const profileVisits = p.profileVisitCount || p.profileVisits || 0;
      const watchTimeMinutes = (p.watchTimeMs || 0) / 60000;

      const recentActivity = likes + comments + saves + shares;
      const engagementRatio = (recentActivity / Math.max(1, views + 1)) * 100;

      const weightedEngagement =
        views * 1.2 +
        watchTimeMinutes * 0.7 +
        likes * 4.5 +
        comments * 6 +
        saves * 8 +
        shares * 10 +
        profileVisits * 1.8 +
        engagementRatio * 2.4 +
        recentActivity * 3;

      const engagementScore = Math.log10(weightedEngagement + 1) * 34;

      // Fresh posts get a strong boost exactly once per viewer — after that
      // first appearance the boost is retired and the post has to earn its
      // place from engagement like everything else, which is what pushes it
      // further down the feed on later visits/scrolls.
      const stillFreshForViewer = isFreshPost(p) && !seenFresh.has(id);
      const freshnessBoost = stillFreshForViewer ? 90 / Math.pow(ageHours / 10 + 1, 1.2) : 0;
      const recencyBoost = stillFreshForViewer
        ? ageHours < 24
          ? 16
          : Math.max(0, 20 - ageHours / 6)
        : Math.max(0, 6 - ageHours / 12);

      // A post the viewer already scrolled past without engaging is treated
      // as "not interesting to them right now" and pushed well down, rather
      // than being shown at the top of the feed again and again.
      const skipPenalty = skipped.has(id) ? 55 : 0;

      // Nudge toward hashtags/authors this viewer tends to engage with.
      const tagMatches = (p.hashtags || []).filter((t) => tagInterest.has((t || "").toLowerCase())).length;
      const authorMatch = authorInterest.has(p.author?._id?.toString() || p.author?.toString());
      const interestBoost = tagMatches * 9 + (authorMatch ? 14 : 0);

      // Reshuffled every session (not frozen for the whole day) so the same
      // post isn't glued to the top forever, while still spreading enough
      // (7 points) to meaningfully break ties between similarly-scored posts.
      const jitter = seededRandom(id + seed) * 7;

      const score =
        engagementScore + freshnessBoost + recencyBoost + interestBoost + jitter - skipPenalty;

      return { post: p, score, isFresh: stillFreshForViewer };
    })
    .sort((a, b) => b.score - a.score)
    .map((s) => Object.assign(s.post, { __isFresh: s.isFresh }));
}
