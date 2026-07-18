import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getSiteUrl } from "@/lib/site";
import ProfileClient from "./ProfileClient";

async function loadProfile(username) {
  try {
    await connectDB();
    return await User.findOne({ username: username.toLowerCase() })
      .select("username displayName bio avatar")
      .lean();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { username } = await params;
  const profile = await loadProfile(username);
  const siteUrl = await getSiteUrl();

  if (!profile) {
    return { title: "Profile not found" };
  }

  const title = profile.displayName ? `${profile.displayName} (@${profile.username})` : `@${profile.username}`;
  const description = profile.bio?.trim() || `See photos and videos shared by @${profile.username} on Lumen.`;
  // Use the person's own avatar for the link-preview thumbnail when they
  // have one; otherwise fall back to the Lumen logo so a plain profile-link
  // share still renders a card instead of a blank preview.
  const image = profile.avatar || `${siteUrl}/og-default.png`;
  const url = `${siteUrl}/profile/${profile.username}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Lumen",
      type: "profile",
      images: [{ url: image, width: profile.avatar ? 800 : 1200, height: profile.avatar ? 800 : 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function ProfilePage() {
  return <ProfileClient />;
}
