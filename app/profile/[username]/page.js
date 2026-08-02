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
    // Paired with the 404 that ProfileClient renders when its fetch comes
    // back empty — keeps a dead profile link out of the index.
    return {
      title: "Profile not found",
      robots: { index: false, follow: false },
    };
  }

  const title = profile.displayName ? `${profile.displayName} (@${profile.username})` : `@${profile.username}`;
  const description = profile.bio?.trim() || `See photos and videos shared by @${profile.username} on LeakReels.`;
  // Use the person's own avatar for the link-preview thumbnail when they
  // have one; otherwise fall back to the LeakReels logo so a plain profile-link
  // share still renders a card instead of a blank preview.
  const image = profile.avatar || `${siteUrl}/og-default.png`;
  const url = `${siteUrl}/profile/${profile.username}`;

  return {
    title,
    description,
    keywords: [profile.username, profile.displayName, "LeakReels profile"].filter(Boolean),
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "LeakReels",
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

export default async function ProfilePage({ params }) {
  const { username } = await params;
  const profile = await loadProfile(username);

  // ProfileClient does its own client-side fetch/404 handling, so this
  // stays defensive: only render structured data when we actually have a
  // profile to describe.
  const jsonLd = profile && {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    dateModified: profile.updatedAt || undefined,
    mainEntity: {
      "@type": "Person",
      name: profile.displayName || profile.username,
      alternateName: `@${profile.username}`,
      description: profile.bio || undefined,
      image: profile.avatar || undefined,
    },
  };

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      )}
      <ProfileClient />
    </>
  );
}
