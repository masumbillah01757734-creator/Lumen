function seededRandom(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

export function rankPosts(posts, seed = new Date().toISOString().slice(0, 10)) {
  return posts
    .map((p) => {
      const ageHours = Math.max(0, (Date.now() - new Date(p.createdAt).getTime()) / 36e5);
      const likes = p.likes?.length || 0;
      const comments = p.comments?.length || 0;
      const views = p.views?.length || 0;
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
      const freshnessBoost = 90 / Math.pow(ageHours / 10 + 1, 1.2);
      const recencyBoost = ageHours < 24 ? 16 : Math.max(0, 20 - ageHours / 6);
      const jitter = seededRandom(p._id.toString() + seed) * 7;

      return { post: p, score: engagementScore + freshnessBoost + recencyBoost + jitter };
    })
    .sort((a, b) => b.score - a.score)
    .map((s) => s.post);
}
