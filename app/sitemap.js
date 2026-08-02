import { connectDB } from "@/lib/db";
import Post from "@/models/Post";
import User from "@/models/User";

export default async function sitemap() {
    await connectDB();

    const [posts, users] = await Promise.all([
        Post.find({}, "_id updatedAt").lean(),
        User.find({ isPublic: true }, "username updatedAt").lean(),
    ]);

    const staticPages = [
        {
            url: "https://leakreels.site",
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 1,
        },
        {
            url: "https://leakreels.site/reels",
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: "https://leakreels.site/search",
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.8,
        },
    ];

    const postPages = posts.map((post) => ({
        url: `https://leakreels.site/p/${post._id}`,
        lastModified: post.updatedAt || new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
    }));

    const profilePages = users.map((user) => ({
        url: `https://leakreels.site/profile/${user.username}`,
        lastModified: user.updatedAt || new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
    }));

    return [...staticPages, ...postPages, ...profilePages];
}