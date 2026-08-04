export function serializePost(p, currentUserId) {
  // currentUserId is null for guests browsing without an account.
  const uid = currentUserId ? currentUserId.toString() : null;
  const mediaItems = Array.isArray(p.mediaItems) && p.mediaItems.length
    ? p.mediaItems
    : p.mediaUrl
      ? [{ url: p.mediaUrl, mediaType: p.mediaType }]
      : [];
  const primary = mediaItems[0];
  const thumbnailUrl = p.thumbnail || (primary?.mediaType === "image" ? primary?.url : "") || "";

  return {
    id: p._id.toString(),
    mediaUrl: primary?.url || p.mediaUrl,
    mediaType: primary?.mediaType || p.mediaType,
    mediaItems,
    thumbnailUrl,
    caption: p.caption,
    hashtags: p.hashtags || [],
    location: p.location || "",
    exif: p.exif,
    isFresh: Boolean(p.__isFresh),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    author: p.author
      ? {
          id: p.author._id.toString(),
          username: p.author.username,
          displayName: p.author.displayName,
          avatar: p.author.avatar,
        }
      : null,
    likeCount: p.likes?.length || 0,
    likedByMe: uid ? !!p.likes?.some((id) => id.toString() === uid) : false,
    viewCount: (p.views?.length || 0) + (p.anonymousViews || 0),
    saveCount: p.saves?.length || 0,
    shareCount: p.shares || 0,
    profileVisitCount: p.profileVisits || 0,
    watchTimeMs: p.watchTimeMs || 0,
    comments: (p.comments || []).map((c) => ({
      id: c._id.toString(),
      text: c.text,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      edited: c.createdAt?.getTime?.() !== c.updatedAt?.getTime?.(),
      likeCount: c.likes?.length || 0,
      likedByMe: uid ? !!c.likes?.some((id) => id.toString() === uid) : false,
      author: c.author
        ? {
            id: c.author._id.toString(),
            username: c.author.username,
            displayName: c.author.displayName,
            avatar: c.author.avatar,
          }
        : null,
    })),
  };
}
