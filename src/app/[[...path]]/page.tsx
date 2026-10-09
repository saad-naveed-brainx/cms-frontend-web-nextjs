import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getPreview, getPublicSite } from '@/lib/public-api';
import type { PublicListing, PublicSite } from '@/lib/public-api';
import { PostList } from '@/site/PostList';
import { PreviewBar } from '@/site/PreviewBar';
import { PreviewExpired } from '@/site/PreviewExpired';
import { SiteChrome } from '@/site/SiteChrome';
import { toListingView, toSiteView } from '@/site/to-site-view';

type Props = PageProps<'/[[...path]]'>;

type Found =
  | { kind: 'page'; found: PublicSite; preview: { status: string } | null }
  | { kind: 'listing'; found: PublicListing }
  | { kind: 'expired' };

/**
 * Every page of every tenant site. The site comes from the address the visitor used (the `Host`
 * header), never from the path, and the page from the path: `/` is the site's home page. What is
 * not there, or not published, is a 404.
 *
 * At a type's own address with no page there (`/blog`), it is that type's blog page, `?page=2` for
 * older items.
 *
 * With `?preview=<link>` (the admin's Preview button) the page is the one the link names, as last
 * saved, whatever its status, and only at its own site's address; the path is not used. A link
 * the API refuses shows "expired".
 *
 * Reading the host makes this route dynamic: it is drawn fresh for every visit. Nothing is cached
 * here yet, so there is no cache key to get wrong (invariant 4 applies the day one is added).
 */
async function lookUp({ params, searchParams }: Props): Promise<Found> {
  const host = (await headers()).get('host');
  if (!host) notFound();

  const query = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const token = first(query.preview);
  if (token) {
    const answer = await getPreview(host, token);
    if (!answer) notFound();
    if (answer.kind === 'expired') return answer;
    return { kind: 'page', found: answer.found, preview: answer.found.preview };
  }

  const { path = [] } = await params;
  const found = await getPublicSite(host, `/${path.join('/')}`, first(query.page));
  if (!found) notFound();
  if (found.kind === 'listing') return { kind: 'listing', found };
  return { kind: 'page', found, preview: null };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const answer = await lookUp(props);
  if (answer.kind === 'expired') {
    return {
      title: 'Preview link expired',
      robots: { index: false, follow: false },
    };
  }

  if (answer.kind === 'listing') {
    const { listing, site } = answer.found;
    return {
      title:
        listing.page > 1
          ? `${listing.title}, page ${listing.page} — ${site.name}`
          : `${listing.title} — ${site.name}`,
    };
  }

  const { found, preview } = answer;
  const title = found.page.seoTitle ?? `${found.page.title} — ${found.site.name}`;
  return {
    title: preview ? `Preview: ${title}` : title,
    description: found.page.seoDescription ?? undefined,
    robots: found.page.noIndex || preview ? { index: false, follow: false } : undefined,
  };
}

export default async function SitePage(props: Props) {
  const answer = await lookUp(props);
  if (answer.kind === 'expired') return <PreviewExpired />;
  if (answer.kind === 'listing') {
    return (
      <SiteChrome site={toListingView(answer.found)}>
        <PostList listing={answer.found.listing} />
      </SiteChrome>
    );
  }

  return (
    <SiteChrome
      site={toSiteView(answer.found)}
      banner={answer.preview ? <PreviewBar status={answer.preview.status} /> : undefined}
    />
  );
}
