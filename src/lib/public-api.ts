import { cache } from 'react';
import { isRecord, isText } from './guards';
import { cacheFor } from './site-cache';

/**
 * The public side of the API: what a visitor's page is drawn from. The answer mirrors
 * api/src/public/public-site.service.ts; anything that does not look like it is treated as a
 * failure, never drawn half-filled.
 */
export type PublicSite = {
  kind?: 'page';
  site: { name: string; theme: unknown; settings: unknown };
  host: string;
  canonicalHost: string;
  page: {
    title: string;
    path: string;
    seoTitle: string | null;
    seoDescription: string | null;
    noIndex: boolean;
    /** Not trusted: `parseBlocks` keeps only what the block components can draw. */
    blocks: unknown[];
  };
  navigation: { title: string; path: string }[];
};

/**
 * A type's blog page (`/blog`): its published items, newest first, `pageSize` at a time. The answer
 * mirrors `PublicListingView` in api/src/public/public-site.service.ts.
 */
export type PublicListing = Omit<PublicSite, 'kind' | 'page'> & {
  kind: 'listing';
  listing: {
    title: string;
    path: string;
    items: { title: string; path: string; publishedAt: string | null }[];
    page: number;
    pageSize: number;
    total: number;
  };
};

/** What every answer carries: the site, its addresses and its menu. */
function hasSiteFrame(value: Record<string, unknown>): boolean {
  return (
    isRecord(value.site) &&
    isText(value.site.name) &&
    isText(value.host) &&
    isText(value.canonicalHost) &&
    Array.isArray(value.navigation) &&
    value.navigation.every((link) => isRecord(link) && isText(link.title) && isText(link.path))
  );
}

function isPublicListing(value: unknown): value is PublicListing {
  if (!isRecord(value) || value.kind !== 'listing' || !isRecord(value.listing)) return false;
  const { listing } = value;
  return (
    hasSiteFrame(value) &&
    isText(listing.title) &&
    isText(listing.path) &&
    Number.isInteger(listing.page) &&
    Number.isInteger(listing.pageSize) &&
    Number.isInteger(listing.total) &&
    Array.isArray(listing.items) &&
    listing.items.every(
      (item) =>
        isRecord(item) &&
        isText(item.title) &&
        isText(item.path) &&
        (item.publishedAt === null || isText(item.publishedAt)),
    )
  );
}

function isPublicSite(value: unknown): value is PublicSite {
  if (!isRecord(value) || !isRecord(value.site) || !isRecord(value.page)) return false;
  const { page } = value;
  return (
    hasSiteFrame(value) &&
    isText(page.title) &&
    isText(page.path) &&
    (page.seoTitle === null || isText(page.seoTitle)) &&
    (page.seoDescription === null || isText(page.seoDescription)) &&
    typeof page.noIndex === 'boolean' &&
    Array.isArray(page.blocks)
  );
}

function apiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) throw new Error('NEXT_PUBLIC_API_URL is not set: the site cannot reach the API');
  return url.replace(/\/+$/, '');
}

/**
 * What is published at `path` of the site that answers on `host`: a page, or a blog page (`page` is
 * its page number, for `?page=2`). `null` when there is nothing to show: no site on that address,
 * nothing published there, a blog page past its end, or an address or number the API refuses.
 * Throws when the API itself cannot answer, so the visitor gets an error page rather than a false
 * "not found".
 *
 * Kept in the website's cache, per site address and page, until the API says the site changed
 * (`src/lib/site-cache.ts`, CNT-08); asked fresh every time when caching is off. Within one request
 * the page and its metadata share one call.
 */
export const getPublicSite = cache(
  async (host: string, path: string, page?: string): Promise<PublicSite | PublicListing | null> => {
    const query = new URLSearchParams({ host, path });
    if (page !== undefined) query.set('page', page);
    const response = await fetch(`${apiUrl()}/public/site?${query}`, {
      ...cacheFor(host),
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    });

    if (response.status === 404 || response.status === 400) return null;
    if (!response.ok) throw new Error(`The API answered ${response.status}`);

    const body: unknown = await response.json();
    if (isPublicListing(body)) return body;
    if (!isPublicSite(body)) throw new Error('The API answered with something the site cannot draw');
    return body;
  },
);

/** A page opened through a preview link: as last saved, whatever its status. */
export type PublicPreview = PublicSite & { preview: { status: string } };

/**
 * What a preview link opens to: the page, `expired` when the API refuses the link itself (out of
 * date, tampered with, or not a link), or `null` when there is nothing to show (another site's
 * address, a page since trashed). Never cached: a preview must show the latest save.
 */
export type PreviewAnswer = { kind: 'page'; found: PublicPreview } | { kind: 'expired' } | null;

export const getPreview = cache(async (host: string, token: string): Promise<PreviewAnswer> => {
  const query = new URLSearchParams({ host, token });
  const response = await fetch(`${apiUrl()}/public/preview?${query}`, {
    cache: 'no-store',
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(8_000),
  });

  if (response.status === 401) return { kind: 'expired' };
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) throw new Error(`The API answered ${response.status}`);

  const body: unknown = await response.json();
  const preview = isRecord(body) ? body.preview : undefined;
  if (!isPublicSite(body) || !isRecord(preview) || !isText(preview.status)) {
    throw new Error('The API answered with something the site cannot draw');
  }
  return {
    kind: 'page',
    found: { ...body, preview: { status: preview.status } },
  };
});
