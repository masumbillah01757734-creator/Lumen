// This route is the admin panel (user management/moderation) — private,
// never indexed.
export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function DashboardLayout({ children }) {
  return children;
}
