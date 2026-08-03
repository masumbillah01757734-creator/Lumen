import Script from "next/script";
import "./globals.css";
import Nav from "@/components/Nav";
import Toaster from "@/components/Toaster";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import GlobalAdScripts from "@/components/ads/GlobalAdScripts";
import AdBanner from "@/components/ads/AdBanner";
import { AD_BANNERS } from "@/lib/ads";
import { UserProvider } from "@/components/UserContext";
import { getCurrentUser, getImpersonatorId } from "@/lib/auth";
import { getSiteUrl } from "@/lib/site";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const viewport = {
  viewportFit: "cover",
};

// ✅ Metadata – আপনার দেওয়া সব পরিবর্তন যোগ করা হয়েছে
export async function generateMetadata() {
  const siteUrl = await getSiteUrl();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: "LeakReels - Adult Video & Photo Sharing Community",
      template: "%s | LeakReels",
    },
    description:
      "LeakReels is an adult video and photo sharing platform where users can discover, upload and explore trending videos, reels and creators.",
    applicationName: "LeakReels",
    creator: "LeakReels",
    publisher: "LeakReels",
    authors: [{ name: "LeakReels" }],
    category: "Adult Entertainment",
    keywords: [
      "LeakReels",
      "LeakReels Official",
      "LeakReels Videos",
      "LeakReels Reels",
      "LeakReels Photos",
      "Adult Videos",
      "Adult Reels",
      "Adult Community",
      "Video Sharing",
      "Photo Sharing",
      "Trending Videos",
      "Trending Reels",
    ],
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-video-preview": -1,
        "max-snippet": -1,
      },
    },
    icons: {
      icon: "/favicon.ico",
      shortcut: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },
    manifest: "/site.webmanifest",
    openGraph: {
      title: "LeakReels",
      description: "Trending adult videos, reels and photos.",
      url: siteUrl,
      siteName: "LeakReels",
      locale: "en_US",
      type: "website",
      images: [
        {
          url: "/og-default.png",
          width: 1200,
          height: 630,
          alt: "LeakReels",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "LeakReels",
      description: "Trending adult videos, reels and photos.",
      images: ["/og-default.png"],
    },
    // অ্যাডাল্ট কন্টেন্ট নির্দেশ করতে rating meta tag (Google SafeSearch-এর জন্য)
    other: {
      rating: "adult",
      "msvalidate.01": "ACF8EE7042BC460855419CC58BA0853E", // Bing verification (আপনার নিজের কোড)
    },
    alternates: { canonical: "/" },
  };
}

export default async function RootLayout({ children }) {
  const siteUrl = await getSiteUrl();

  // ✅ Sitewide JSON-LD – WebSite ও Organization (আপনার দেওয়া sameAs সহ)
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "LeakReels",
      alternateName: "Leak Reels",
      url: siteUrl,
      inLanguage: "en",
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "LeakReels",
      alternateName: "Leak Reels",
      url: siteUrl,
      logo: `${siteUrl}/og-default.png`,
      sameAs: [
        "https://x.com/LeakReels",        // আপনার নিজের লিংক দিন
        "https://www.facebook.com/LeakReels",
        "https://www.reddit.com/r/LeakReels",
        "https://github.com/LeakReels",
        // আরও সোশ্যাল প্রোফাইল যোগ করতে পারেন
      ],
    },
  ];

  // ইউজার ডেটা ফেচ করুন (আপনার আগের কোডের মতো)
  const raw = await getCurrentUser();
  const user = raw
    ? {
      id: raw._id,
      username: raw.username,
      displayName: raw.displayName,
      avatar: raw.avatar || "",
      role: raw.role || "user",
    }
    : null;

  const impersonatorId = await getImpersonatorId();
  let impersonatorUsername = null;
  if (impersonatorId) {
    await connectDB();
    const admin = await User.findById(impersonatorId).select("username").lean();
    impersonatorUsername = admin?.username || null;
  }

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col" style={{ background: "var(--bg)" }}>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-RVTRZ26K2P"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-RVTRZ26K2P');
          `}
        </Script>

        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />

        <UserProvider user={user}>
          {impersonatorId && <ImpersonationBanner adminUsername={impersonatorUsername} />}
          <Nav user={user} />

          {/* Desktop Leaderboard */}
          <div className="hidden sm:flex justify-center py-2" style={{ background: "var(--bg)" }}>
            <AdBanner
              adKey={AD_BANNERS.leaderboard_728x90.key}
              width={AD_BANNERS.leaderboard_728x90.width}
              height={AD_BANNERS.leaderboard_728x90.height}
            />
          </div>

          <main className="flex-1 w-full pb-14 sm:pb-0">{children}</main>

          {/* Sticky Mobile Banner */}
          <div
            className="sm:hidden fixed bottom-0 left-0 right-0 z-40 flex justify-center"
            style={{ background: "var(--bg)" }}
          >
            <AdBanner
              adKey={AD_BANNERS.mobile_320x50.key}
              width={AD_BANNERS.mobile_320x50.width}
              height={AD_BANNERS.mobile_320x50.height}
            />
          </div>

          <Toaster />
          <GlobalAdScripts />
        </UserProvider>
      </body>
    </html>
  );
}