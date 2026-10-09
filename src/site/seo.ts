import type { Metadata } from 'next';
import type { Block, ImageRef } from '@/blocks/types';
import type { PublicListing, PublicSite } from '@/lib/public-api';

/**
 * What a page tells search engines and share cards (SEO-01): its title and description, the one
 * address it should be known by (the canonical link), and the title, description, address and
 * picture a link to it shows in WhatsApp, Slack or LinkedIn (Open Graph, and X's own tags).
 */

/**
 * The site's own web address for this visit: the scheme the visitor used (Next.js fills in
 * `x-forwarded-proto`; behind nginx, nginx sets it), the site's MAIN address (whichever of its
 * addresses was visited), and the visit's port, when it is not the scheme's usual one.
 * `http://cafe.localhost:3000` locally, `https://cafe.example.com` in production.
 */
export function siteOrigin(
  forwardedProto: string | null,
  visitedHost: string,
  canonicalHost: string,
): string {
  const scheme = forwardedProto?.split(',')[0].trim().toLowerCase() === 'https' ? 'https' : 'http';
  const port = /:(\d+)$/.exec(visitedHost)?.[1];
  const usual = scheme === 'https' ? '443' : '80';
  const host = canonicalHost.toLowerCase().replace(/:\d+$/, '');
  return `${scheme}://${host}${port && port !== usual ? `:${port}` : ''}`;
}

/** A page's public address: the home page (stored at `/home`) is the site's `/`. */
export const publicPath = (path: string): string => (path === '/home' ? '/' : path);

/**
 * The picture a share card shows: the page's first picture, from the top (a hero's or an "image
 * and text" block's), until the media library lets a person choose one. The blocks are already
 * read by `parseBlocks`, so an address that is not safe never reaches here.
 */
export function shareImage(blocks: Block[]): ImageRef | null {
  for (const block of blocks) {
    if ((block.type === 'hero' || block.type === 'imageText') && block.image) return block.image;
  }
  return null;
}

/**
 * A published page's `<head>`. A page hidden from search engines says `noindex, follow` (its links
 * may still be followed, as WordPress does) and names no canonical address, as Yoast does.
 */
export function pageMetadata(found: PublicSite, blocks: Block[], origin: string): Metadata {
  const { page, site } = found;
  const title = page.seoTitle ?? page.title;
  const description = page.seoDescription ?? undefined;
  const address = page.canonicalUrl ?? new URL(publicPath(page.path), origin).toString();
  const image = shareImage(blocks);
  const images = image
    ? [{ url: new URL(image.src, origin).toString(), alt: image.alt || undefined }]
    : undefined;

  return {
    metadataBase: new URL(origin),
    title: page.seoTitle ?? `${page.title} — ${site.name}`,
    description,
    robots: page.noIndex ? { index: false, follow: true } : undefined,
    alternates: page.noIndex ? undefined : { canonical: address },
    openGraph: { type: 'website', siteName: site.name, url: address, title, description, images },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description, images },
  };
}

/** A blog page's `<head>`: each of its pages is its own address (`/blog`, `/blog?page=2`). */
export function listingMetadata(found: PublicListing, origin: string): Metadata {
  const { listing, site } = found;
  const address = new URL(listing.path, origin);
  if (listing.page > 1) address.searchParams.set('page', String(listing.page));

  return {
    metadataBase: new URL(origin),
    title:
      listing.page > 1
        ? `${listing.title}, page ${listing.page} — ${site.name}`
        : `${listing.title} — ${site.name}`,
    alternates: { canonical: address.toString() },
    openGraph: { type: 'website', siteName: site.name, url: address.toString(), title: listing.title },
    twitter: { card: 'summary', title: listing.title },
  };
}
