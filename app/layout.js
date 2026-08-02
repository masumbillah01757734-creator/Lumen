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

// generateMetadata (instead of a static `metadata` export) so we can set
// metadataBase from the actual request host/env — this is what lets every
// other page's relative canonical/OG urls resolve correctly.
export async function generateMetadata() {
  const siteUrl = await getSiteUrl();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: "LeakReels",
      template: "%s — LeakReels",
    },
    description: "Share the frame. A photo and video community.",
    keywords: ["LeakReels", "photo sharing", "video sharing", "reels", "photo community", "video community"],
    alternates: { canonical: "/" },
    // Default link-preview image for any page that doesn't set its own
    // (e.g. a profile page) — so sharing a plain link still shows a branded
    // card instead of nothing.
    openGraph: {
      siteName: "LeakReels",
      title: "LeakReels",
      description: "Share the frame. A photo and video community.",
      url: siteUrl,
      type: "website",
      images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "LeakReels" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "LeakReels",
      description: "Share the frame. A photo and video community.",
      images: ["/og-default.png"],
    },
  };
}

export default async function RootLayout({ children }) {
  const siteUrl = await getSiteUrl();

  // Sitewide structured data: a WebSite entity (enables a sitelinks search
  // box in Google results) plus an Organization entity that ties the brand
  // name/logo to the domain. These describe the site as a whole, so they're
  // emitted once here rather than duplicated on every page.
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "LeakReels",
      url: siteUrl,
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
      url: siteUrl,
      logo: `${siteUrl}/og-default.png`,
    },
  ];

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
        {/* Google tag (gtag.js) */}
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

        {/* Sitewide structured data. A plain <script> works anywhere in the
            DOM (it doesn't need to live in <head>) — this is the pattern
            Next.js recommends for JSON-LD, since it isn't covered by the
            Metadata API. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
        <UserProvider user={user}>
          {impersonatorId && <ImpersonationBanner adminUsername={impersonatorUsername} />}
          <Nav user={user} />

          {/* Leaderboard banner — desktop only, sits just under the nav */}
          <div className="hidden sm:flex justify-center py-2" style={{ background: "var(--bg)" }}>
            <AdBanner
              adKey={AD_BANNERS.leaderboard_728x90.key}
              width={AD_BANNERS.leaderboard_728x90.width}
              height={AD_BANNERS.leaderboard_728x90.height}
            />
          </div>

          <main className="flex-1 w-full pb-14 sm:pb-0">{children}</main>

          {/* Sticky mobile banner, fixed to the bottom of the viewport */}
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