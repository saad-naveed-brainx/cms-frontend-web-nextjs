import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { parseBlocks } from '@/blocks/parse-blocks';
import { getPreview, getPublicSite } from '@/lib/public-api';
import type { PublicListing, PublicSite } from '@/lib/public-api';
import { PostList } from '@/site/PostList';
import { PreviewBar } from '@/site/PreviewBar';
import { PreviewExpired } from '@/site/PreviewExpired';
import { listingMetadata, pageMetadata, siteOrigin } from '@/site/seo';
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
 * Reading the host makes this route dynamic: it is drawn fresh for every visit. The API's answer
 * is cached per site address and page (`src/lib/site-cache.ts`, invariant 4).
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

/**
 * The `<head>`: what search engines and share cards read (SEO-01, `src/site/seo.ts`). A preview is
 * a private link: never indexed, and it names no address and shows no share card.
 */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const answer = await lookUp(props);
  if (answer.kind === 'expired') {
    return {
      title: 'Preview link expired',
      robots: { index: false, follow: false },
    };
  }

  const request = await headers();
  const origin = siteOrigin(
    request.get('x-forwarded-proto'),
    request.get('host') ?? '',
    answer.found.canonicalHost,
  );
  if (answer.kind === 'listing') return listingMetadata(answer.found, origin);

  const { found, preview } = answer;
  if (preview) {
    return {
      title: `Preview: ${found.page.seoTitle ?? `${found.page.title} — ${found.site.name}`}`,
      description: found.page.seoDescription ?? undefined,
      robots: { index: false, follow: false },
    };
  }
  return pageMetadata(found, parseBlocks(found.page.blocks), origin);
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
