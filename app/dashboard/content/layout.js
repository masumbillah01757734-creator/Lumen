// Admin/moderator content overview — private, never indexed.
export const metadata = {
  title: "Content · Admin",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function DashboardContentLayout({ children }) {
  return children;
}
