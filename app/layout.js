import "./globals.css";
import Nav from "@/components/Nav";
import Toaster from "@/components/Toaster";
import { UserProvider } from "@/components/UserContext";
import { getCurrentUser } from "@/lib/auth";

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
      }
    : null;

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col" style={{ background: "var(--bg)" }}>
        <UserProvider user={user}>
          <Nav user={user} />
          <main className="flex-1 w-full">{children}</main>
          <Toaster />
        </UserProvider>
      </body>
    </html>
  );
}
