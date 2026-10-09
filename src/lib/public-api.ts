import { cache } from 'react';
import { isRecord, isText } from './guards';

/**
 * The public side of the API: what a visitor's page is drawn from. The answer mirrors
 * api/src/public/public-site.service.ts; anything that does not look like it is treated as a
 * failure, never drawn half-filled.
 */
export type PublicSite = {
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

function isPublicSite(value: unknown): value is PublicSite {
  if (!isRecord(value) || !isRecord(value.site) || !isRecord(value.page)) return false;
  const { site, page } = value;
  return (
    isText(site.name) &&
    isText(value.host) &&
    isText(value.canonicalHost) &&
    isText(page.title) &&
    isText(page.path) &&
    (page.seoTitle === null || isText(page.seoTitle)) &&
    (page.seoDescription === null || isText(page.seoDescription)) &&
    typeof page.noIndex === 'boolean' &&
    Array.isArray(page.blocks) &&
    Array.isArray(value.navigation) &&
    value.navigation.every((link) => isRecord(link) && isText(link.title) && isText(link.path))
  );
}

function apiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) throw new Error('NEXT_PUBLIC_API_URL is not set: the site cannot reach the API');
  return url.replace(/\/+$/, '');
}

/**
 * The published page at `path` of the site that answers on `host`, or `null` when there is nothing
 * to show: no site on that address, no published page there, or an address the API refuses. Throws
 * when the API itself cannot answer, so the visitor gets an error page rather than a false "not found".
 *
 * Asked fresh every time (no caching): a page that was just published or unpublished shows or
 * disappears at once. Within one request the page and its metadata share one call.
 */
export const getPublicSite = cache(async (host: string, path: string): Promise<PublicSite | null> => {
  const query = new URLSearchParams({ host, path });
  const response = await fetch(`${apiUrl()}/public/site?${query}`, {
    cache: 'no-store',
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(8_000),
  });

  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) throw new Error(`The API answered ${response.status}`);

  const body: unknown = await response.json();
  if (!isPublicSite(body)) throw new Error('The API answered with something the site cannot draw');
  return body;
});

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
  return { kind: 'page', found: { ...body, preview: { status: preview.status } } };
});
