import "./globals.css";
import Nav from "@/components/Nav";
import Toaster from "@/components/Toaster";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import { UserProvider } from "@/components/UserContext";
import { getCurrentUser, getImpersonatorId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import AdSlot from "@/components/ads/AdSlot";

export const viewport = {
  viewportFit: "cover",
};

export const metadata = {
  title: {
    default: "Lumen",
    template: "%s — Lumen",
  },
  description: "Share the frame. A photo and video community.",
  // Default link-preview image for any page that doesn't set its own
  // (e.g. a profile page) — so sharing a plain link still shows a branded
  // card instead of nothing.
  openGraph: {
    siteName: "Lumen",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Lumen" }],
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
          <main className="flex-1 w-full pb-16">{children}</main>
          <Toaster />

          {/* Site-wide sticky banner (320x50 mobile ad unit) */}
          <div
            className="fixed bottom-0 left-0 right-0 z-40 flex justify-center py-1"
            style={{ background: "var(--bg)", borderTop: "1px solid var(--border, #2a2a2a)" }}
          >
            <AdSlot adKey="5f75ff4433d4a2c2354d321132abaddd" width={320} height={50} />
          </div>
        </UserProvider>
      </body>
    </html>
  );
}