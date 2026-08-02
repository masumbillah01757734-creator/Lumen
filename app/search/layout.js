import { getSiteUrl } from "@/lib/site";

export async function generateMetadata() {
  const siteUrl = await getSiteUrl();
  const url = `${siteUrl}/search`;
  const title = "Search";
  const description = "Search LeakReels for photos, videos, hashtags, and people.";

  return {
    title,
    description,
    keywords: ["search", "find photos", "find videos", "find people", "LeakReels search"],
    // Canonicalize every /search?q=... variant back to the plain URL so
    // query-string permutations don't get indexed as separate pages.
    alternates: { canonical: url },
    openGraph: {
      title: `${title} — LeakReels`,
      description,
      url,
      siteName: "LeakReels",
      type: "website",
      images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "LeakReels" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — LeakReels`,
      description,
      images: ["/og-default.png"],
    },
  };
}

export default function SearchLayout({ children }) {
  return children;
}
