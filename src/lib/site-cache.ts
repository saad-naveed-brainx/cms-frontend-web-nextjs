/**
 * The website's cache of the API's answers (CNT-08, docs/DECISIONS.md D-032).
 *
 * An answer is kept for up to `CACHE_SECONDS`, keyed by the whole request address, so the site's
 * address and the page's address are both in the key and one client's page can never be served for
 * another's (invariant 6). Each answer is also tagged with its site's address, so the API can have a
 * whole site forgotten the moment something on it is published, unpublished or changed while live
 * (`POST /api/revalidate`). Only 200 answers are kept: a "not found" is always asked afresh.
 *
 * On only when `REVALIDATE_SECRET` is set, because the API can then tell the site to forget; without
 * it every answer is asked fresh, as before, so a change is never hidden behind a cache nobody clears.
 */

/** The safety net: the longest an answer is kept if the API could not tell the website to forget it. */
export const CACHE_SECONDS = 300;

export const cachingEnabled = (): boolean => Boolean(process.env.REVALIDATE_SECRET);

/**
 * The tag of everything cached for one site address. The address is tidied the way the API stores
 * it (lower case, no port, no trailing dot), so `Cafe.Localhost:3000` and the API's `cafe.localhost`
 * name the same entries.
 */
export function siteTag(host: string): string {
  const tidy = host.trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
  return `site:${tidy}`;
}

/** The `fetch` options for one answer from the API about a site, cached or not. */
export function cacheFor(host: string): RequestInit {
  return cachingEnabled()
    ? { cache: 'force-cache', next: { revalidate: CACHE_SECONDS, tags: [siteTag(host)] } }
    : { cache: 'no-store' };
}
