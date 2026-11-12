/**
 * Shown for a site whose organization the platform has suspended (platform-admin T4, D-062). Neutral
 * shell colours, like the not-found page: the site's own look belongs to its organization and nothing of
 * the site is shown while it is suspended. The page is hidden from search engines (see the route's metadata).
 */
export function SiteUnavailable() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6 py-24">
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-[var(--shell-muted)]">503</p>
      <h1 className="text-3xl font-semibold tracking-tight">This site is unavailable</h1>
      <p className="text-[var(--shell-muted)]">
        This website is not available right now. Please try again later.
      </p>
    </main>
  );
}
