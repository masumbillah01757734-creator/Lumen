import "./globals.css";
import Nav from "@/components/Nav";
import Toaster from "@/components/Toaster";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import GlobalAdScripts from "@/components/ads/GlobalAdScripts";
import AdBanner from "@/components/ads/AdBanner";
import { AD_BANNERS } from "@/lib/ads";
import { UserProvider } from "@/components/UserContext";
import { getCurrentUser, getImpersonatorId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const viewport = {
  viewportFit: "cover",
};

export const metadata = {
  title: {
    default: "LeakReels",
    template: "%s — LeakReels",
  },
  description: "Share the frame. A photo and video community.",
  // Default link-preview image for any page that doesn't set its own
  // (e.g. a profile page) — so sharing a plain link still shows a branded
  // card instead of nothing.
  openGraph: {
    siteName: "LeakReels",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "LeakReels" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-default.png"],
  },
};

export default async function RootLayout({ children }) {
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