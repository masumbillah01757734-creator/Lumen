import { getSiteUrl } from "@/lib/site";

export async function generateMetadata() {
  const siteUrl = await getSiteUrl();
  const url = `${siteUrl}/reels`;
  const title = "Reels";
  const description =
    "Watch an endless stream of short videos from the LeakReels community — swipe through reels shared by photographers and creators.";

  return {
    title,
    description,
    keywords: ["reels", "short videos", "video feed", "LeakReels reels"],
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

// Metadata-only layout: no wrapping element, so it changes nothing about
// how /reels renders — it only adds the <head> tags above.
export default function ReelsLayout({ children }) {
  return children;
}
