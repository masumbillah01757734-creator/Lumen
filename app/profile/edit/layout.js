// Account/settings page — private, never indexed. Scoped to /profile/edit
// only (this layout does not affect the sibling /profile/[username] route).
export const metadata = {
  title: "Edit profile",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function ProfileEditLayout({ children }) {
  return children;
}
