import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getPreview, getPublicSite } from '@/lib/public-api';
import type { PublicSite } from '@/lib/public-api';
import { PreviewBar } from '@/site/PreviewBar';
import { PreviewExpired } from '@/site/PreviewExpired';
import { SiteChrome } from '@/site/SiteChrome';
import { toSiteView } from '@/site/to-site-view';

type Props = PageProps<'/[[...path]]'>;

type Found =
  | { kind: 'page'; found: PublicSite; preview: { status: string } | null }
  | { kind: 'expired' };

/**
 * Every page of every tenant site. The site comes from the address the visitor used (the `Host`
 * header), never from the path, and the page from the path: `/` is the site's home page. What is
 * not there, or not published, is a 404.
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

  const asked = (await searchParams).preview;
  const token = Array.isArray(asked) ? asked[0] : asked;
  if (token) {
    const answer = await getPreview(host, token);
    if (!answer) notFound();
    if (answer.kind === 'expired') return answer;
    return { kind: 'page', found: answer.found, preview: answer.found.preview };
  }

  const { path = [] } = await params;
  const found = await getPublicSite(host, `/${path.join('/')}`);
  if (!found) notFound();
  return { kind: 'page', found, preview: null };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const answer = await lookUp(props);
  if (answer.kind === 'expired') {
    return { title: 'Preview link expired', robots: { index: false, follow: false } };
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

  return (
    <SiteChrome
      site={toSiteView(answer.found)}
      banner={answer.preview ? <PreviewBar status={answer.preview.status} /> : undefined}
    />
  );
}
