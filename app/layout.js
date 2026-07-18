import "./globals.css";
import Nav from "@/components/Nav";
import Toaster from "@/components/Toaster";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import { UserProvider } from "@/components/UserContext";
import { getCurrentUser, getImpersonatorId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const metadata = {
  title: "Lumen",
  description: "Share the frame. A photo and video community.",
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
          <main className="flex-1 w-full">{children}</main>
          <Toaster />
        </UserProvider>
      </body>
    </html>
  );
}