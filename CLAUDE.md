@AGENTS.md

# cms-web — repo guide

Platform-wide guide and docs: **[../CLAUDE.md](../CLAUDE.md)** and **[../docs/](../docs/)**.
Read those first; this file covers only what is specific to this repo.

Next.js 16 App Router. Renders **all public tenant sites**: one optional catch-all route
(`src/app/[[...path]]/page.tsx`), tenant resolved from the request `Host` header, server-rendered.

## Invariants for this repo

1. **Server-rendered, deliberately.** The SEO surface — meta titles, canonical URLs, sitemaps,
   no-index — is only real if the server returns real HTML. Tenant pages stay server components.
   Page source will be inspected during the pitch.
2. **This repo is the original of every block component and the theme** (`src/blocks`, `src/theme`, and the
   helpers they import). The admin keeps an exact copy for its live preview: after changing them here, run
   `npm run blocks:sync` in `../admin` and commit both. Its gate fails while the copy differs
   (`../docs/DECISIONS.md` D-030, superseding D-008's package). Styling a block needs beyond Tailwind's
   utilities goes in `src/theme/site.css`, not `app/globals.css`, so it travels with the copy.
3. **Blocks are colour-agnostic**: `--site-*` custom properties only, no hex values and no Tailwind
   palette classes. Verify: `grep -rnE '#[0-9a-fA-F]{3,8}\b' src/blocks src/theme` → nothing.
4. **Cache keys must include the host.** A key on path alone serves tenant A's page to tenant B. The API's
   answers are cached with `fetch` `force-cache`, keyed by the whole request address (host and path are in
   its query) and tagged `site:<host>` (`src/lib/site-cache.ts`, D-032). Test with two hosts.
5. **Never sanitise on read.** Stored HTML was sanitised on write.
6. An unknown block type is skipped, not thrown on — a page saved with a block a later deploy
   removed must still render the rest of itself. `src/blocks/parse-blocks.ts` reads every stored block
   field by field before anything is drawn: a block it cannot read, or a link or image address that is
   not safe (`javascript:`), is left out and the rest of the page shows. `richText` is **not drawn at
   all** until the API cleans HTML on save (BLK-05, `../docs/DECISIONS.md` D-021): nothing sanitises
   stored HTML yet, so it cannot be trusted as markup.

## How a page is drawn

The route reads the `Host` header and the path, asks the API's public route (`GET /public/site?host=&path=`,
`src/lib/public-api.ts`) and draws what comes back: `src/site/to-site-view.ts` turns the answer into a
`SiteView`, `src/site/resolve-theme.ts` lays the site's stored theme over `DEFAULT_THEME` (a new site's
theme is `{}`, so it shows the default; every missing or invalid choice falls back), `SiteChrome` draws it.
A site, a page, a draft and an unpublished page that is not there are all `notFound()` (a real 404); an API
that cannot answer throws, which is `error.tsx` (a 500). `NEXT_PUBLIC_API_URL` is where the server finds the API.

**Caching** (CNT-08, `../docs/DECISIONS.md` D-032): the page is drawn on every visit (it reads the host), but the
API's answer is kept for up to five minutes, keyed by the whole request address and tagged `site:<host>`; only
200 answers are kept, so a "not found" is always asked afresh. The API POSTs a site's addresses to
`/api/revalidate` (with `REVALIDATE_SECRET`) after a publish, an unpublish or a change to a live page, and every
tagged answer is dropped at once (`revalidateTag(tag, { expire: 0 })`). **Caching is on only when
`REVALIDATE_SECRET` is set**; without it every answer is fresh. Previews are never cached. `start:test` clears
`.next/cache/fetch-cache`, so one test run never sees another's answers.

**Blog pages** (`../docs/DECISIONS.md` D-031): at a type's own address with no page there (`/blog`), the API answers
`kind: 'listing'` and the route draws `PostList` inside `SiteChrome` (its `children` replace the blocks): the type's
published items newest first, ten at a time, `?page=2` for older ones. The menu gains `Posts` once one is published.

**Appearance** (GOV-04, `../docs/DECISIONS.md` D-036): the header's tagline and the footer's note come from the site's
`settings` (`tagline`, `footerNote`), saved with its name and theme on the admin's Appearance screen. The ready-made palettes
are `src/site/palettes.ts` (the first is the default theme's), each passing the contrast checks in `e2e/palettes.spec.ts`
(text pairs and the accent at least 4.5:1, `src/site/contrast.ts`); the admin copies both for its screen. They live in
`src/site`, not `src/theme`, because blocks and the theme may hold no colour (invariant 3).

**Preview links** (`../docs/DECISIONS.md` D-029): with `?preview=<token>` on any path, the route asks
`GET /public/preview?host=&token=` instead (`getPreview`) and draws the page the link names, as last saved and
whatever its status, under a `PreviewBar` (inside the theme, `SiteChrome`'s `banner`), with `noindex, nofollow`;
the path is not used. A link the API refuses (401) is `PreviewExpired`; a good link at another site's address is
`notFound()`. Never cached: a preview always shows the latest save.

**Search engines and share cards** (SEO-01, `src/site/seo.ts`, `../docs/DECISIONS.md` D-033): `generateMetadata` writes the
title (`seoTitle`, else "Title — Site"), the description, the canonical link (the page's `canonicalUrl`, else its address on
the site's main host, with the visitor's scheme from `x-forwarded-proto` and the visit's port; `/home` is `/`), Open Graph and
X tags, and the share picture: the page's first hero or image-and-text picture, until the media library. A hidden page
(`noIndex`) is `noindex, follow` with no canonical link; a blog page names each of its pages (`/blog?page=2`); a preview is
`noindex, nofollow` with no canonical link or share card. **The tags are in `<head>` as sent only because the page waits for
the same answer:** a `loading.tsx` or a Suspense boundary around the page lets Next.js stream them into `<body>`, which
`UC-SEO-04` catches. Production's nginx must pass `X-Forwarded-Proto`, or canonical links say `http://`.

## Gotchas

- **Visit a site at `<name>.localhost:3000`.** Create the site in the admin with the web address
  `cafe.localhost`, then open `http://cafe.localhost:3000/`. Chrome and Firefox send every `*.localhost`
  to this machine (Safari does not). `next.config.ts` allows `*.localhost` for the dev server
  (`allowedDevOrigins`). `http://localhost:3000` itself has no site, so it is a 404 page.
- **Three kinds of browser test.** `e2e` needs no API (the site is pointed at an address nothing listens
  on, so "the API is down" is real) and is what GitHub CI runs. `flow` is the real thing: it starts the
  **api repo** (`../api`) on its own port (`DEVFLOW_PORT_API` + 600) and database (`cms_wt<N>_webflow`),
  makes the owner with the real seed command, and each test makes its own sites and pages through the real
  API and visits them at `<name>.localhost`. It needs the api repo beside this one (in a slot:
  `devflow-wt new <slug> api web`) and is not in CI yet (backlog B-26). `visual` is macOS screenshots of two
  real sites (made through the same API, on fixed addresses). A site's theme is saved through the real
  `PATCH /appearance` (`setAppearance` in `e2e/flow/support.ts`, GOV-04). The sample
  sites live only in `e2e/support/sample-sites.ts`; `public/media/*.svg` are the sample images they use.
- **`turbopack.root` must stay set** in `next.config.ts`, or Turbopack walks up past this repo and
  warns about a lockfile outside it.
- **`.gitignore` ignores `.env*`**, so the `!.env.example` negation is required.
- **`localhost:3000` may 308-redirect to `/en` and 404** — a stale cached redirect from an unrelated
  project on that origin, not a bug here. Use `http://127.0.0.1:3000` or clear site data.
- **Headless Chrome `--window-size` does not reliably set layout width.** For responsive checks,
  render the page in a fixed-width `<iframe>` in a probe page and screenshot that.
- `NEXT_PUBLIC_API_URL` points at **`:4001`** locally, not 4000.
- **`typecheck` runs `next typegen` first.** `PageProps`/`LayoutProps` are generated globals; without
  `.next/` (fresh clone, devflow slot, CI) plain `tsc` fails.
- **Browser tests run against a production build** (`npm run start:test`) on port 3090, or the slot's
  port, never the dev server. Expect a `next build` on every `test:e2e` / `test:flow` / `test:visual` run.
- **Visual baselines** live in `e2e/visual/*-snapshots/` and are macOS-only; CI skips them. After one fails, Playwright
  restarts the worker and `beforeAll` tries to create the fixed sites again (a 409): record new baselines with
  `--update-snapshots` rather than reading the second error.
- **No Prettier config in this repo.** The code is single quotes, semicolons, 110 columns: format with
  `npx prettier --single-quote --print-width 110`, never the defaults (they rewrite every quote).

## Commands

```bash
npm run dev          # next dev, port 3000 (or $PORT)
npm run typecheck    # next typegen && tsc
npm run lint         # eslint
npm run tokens       # invariant 3 grep + no arbitrary colour/px classes
npm run test:e2e     # browser tests with no API (what CI runs)
npm run test:flow    # the real flow: starts ../api on its own database, makes sites and pages, visits them
npm run test:visual  # screenshots of two real sites at 375/768/1280 vs the approved baselines
```
