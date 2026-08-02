# LeakReels SEO changes

Drop these files into your project at the same relative paths (they'll
overwrite the 9 modified files and add the 9 new `layout.js` files).
Nothing else in your project was touched — your ad system
(`components/ads/`, `lib/ads.js`), auth, DB schema, and API responses are
all untouched and verified byte-identical to your original.

## New files (9) — metadata-only layouts

Each of these just does `return children` — zero DOM impact, they only add
`<head>` metadata for their route:

- app/reels/layout.js — title/description/canonical for /reels
- app/search/layout.js — title/description/canonical for /search
- app/login/layout.js — noindex,nofollow
- app/register/layout.js — noindex,nofollow
- app/dashboard/layout.js — noindex,nofollow (admin panel)
- app/upload/layout.js — noindex,nofollow
- app/notifications/layout.js — noindex,nofollow
- app/analytics/layout.js — noindex,nofollow
- app/profile/edit/layout.js — noindex,nofollow (scoped to /profile/edit only)

## Modified files (9)

- **app/sitemap.js** — Fixed a real bug: it filtered profiles with
  `User.find({ isPublic: true })`, but `isPublic` doesn't exist on your
  User model, so every profile page was silently missing from your
  sitemap. Now excludes only banned users. Uses `NEXT_PUBLIC_SITE_URL`
  with your production domain as fallback. Added
  `export const dynamic = "force-dynamic"` so `next build` no longer
  requires live DB access at build time.

- **app/robots.js** — Added `disallow` for `/api/`, `/login`, `/register`,
  `/dashboard`, `/upload`, `/notifications`, `/analytics`,
  `/profile/edit`.

- **app/layout.js** — Switched to `generateMetadata()` to set
  `metadataBase`, sitewide `keywords`, and `alternates.canonical: "/"`.
  Added sitewide JSON-LD (`WebSite` with `SearchAction`, `Organization`).

- **app/p/[id]/page.js** — Added `VideoObject`/`SocialMediaPosting`
  JSON-LD built from already-fetched post data. Added
  `robots: noindex` to the not-found metadata branch.

- **app/profile/[username]/page.js** — Added `ProfilePage`/`Person`
  JSON-LD, `keywords`, and `robots: noindex` on not-found.

- **components/Media.js** — `MediaImage` defaults to
  `loading="lazy" decoding="async"` (overridable via a `loading` prop).
  `MediaVideo` defaults to `preload="metadata"` (overridable).

- **components/SimpleVideo.js** — Added a `poster` prop, passed through
  to the video element.

- **components/PostCard.js** — Wired `poster={displayPost.thumbnailUrl}`
  into the main video; gave the lightbox image and comment avatars real
  `alt` text instead of `alt=""`.

- **components/ReelCard.js** — Added `poster` + `preload="metadata"` to
  the reel `<video>`; fixed two empty `alt=""` avatar attributes.

## Verified

- `next build` completes successfully (confirmed with your real
  dependencies installed).
- `eslint` output is identical to your original project — no new
  warnings or errors introduced.
- Every file under `components/ads/` and `lib/ads.js` is byte-identical
  to your original — the ad system was not touched.
