import { connectDB } from "@/lib/db";
import Post from "@/models/Post";
import User from "@/models/User";

// Force this route to be computed per-request rather than once at build
// time. Two reasons: (1) it needs a live DB connection, which many CI/build
// environments don't have — without this, `next build` would fail whenever
// the database isn't reachable from the build machine; (2) a sitemap should
// reflect the current set of posts/profiles, not a snapshot from whenever
// the app was last built.
export const dynamic = "force-dynamic";

// Falls back to the production domain when NEXT_PUBLIC_SITE_URL isn't set,
// same convention as lib/site.js. Sitemaps/robots run outside a request
// context at build time on some hosts, so we can't rely on headers() here.
function getBaseUrl() {
    return (process.env.NEXT_PUBLIC_SITE_URL || "https://leakreels.site").replace(/\/$/, "");
}

export default async function sitemap() {
    await connectDB();

    const [posts, users] = await Promise.all([
        Post.find({}, "_id updatedAt").lean(),
        // NOTE: previously filtered on `isPublic: true`, a field that doesn't
        // exist on the User model — that silently excluded every profile
        // from the sitemap. Every profile is publicly viewable per
        // middleware.js (guests can browse /profile/:username), so the only
        // thing worth excluding here is banned accounts.
        User.find({ banned: { $ne: true } }, "username updatedAt").lean(),
    ]);

    const baseUrl = getBaseUrl();

    const staticPages = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 1,
        },
        {
            url: `${baseUrl}/reels`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: `${baseUrl}/search`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.8,
        },
    ];

    const postPages = posts.map((post) => ({
        url: `${baseUrl}/p/${post._id}`,
        lastModified: post.updatedAt || new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
    }));

    const profilePages = users.map((user) => ({
        url: `${baseUrl}/profile/${user.username}`,
        lastModified: user.updatedAt || new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
    }));

    return [...staticPages, ...postPages, ...profilePages];
}
