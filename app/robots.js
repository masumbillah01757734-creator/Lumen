function getBaseUrl() {
    return (process.env.NEXT_PUBLIC_SITE_URL || "https://leakreels.site").replace(/\/$/, "");
}

export default function robots() {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: [
                    "/api/",
                    "/login",
                    "/register",
                    "/dashboard",
                    "/upload",
                    "/notifications",
                    "/analytics",
                    "/profile/edit",
                ],
            },
        ],
        sitemap: `${getBaseUrl()}/sitemap.xml`,
    };
}
