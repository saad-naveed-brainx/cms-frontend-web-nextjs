import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getPublicSite } from '@/lib/public-api';
import { SiteChrome } from '@/site/SiteChrome';
import { toSiteView } from '@/site/to-site-view';

/**
 * Every page of every tenant site. The site comes from the address the visitor used (the `Host`
 * header), never from the path, and the page from the path: `/` is the site's home page. What is
 * not there, or not published, is a 404.
 *
 * Reading the host makes this route dynamic: it is drawn fresh for every visit. Nothing is cached
 * here yet, so there is no cache key to get wrong (invariant 4 applies the day one is added).
 */
async function lookUp(params: PageProps<'/[[...path]]'>['params']) {
  const { path = [] } = await params;
  const host = (await headers()).get('host');
  if (!host) notFound();

  const found = await getPublicSite(host, `/${path.join('/')}`);
  if (!found) notFound();
  return found;
}

export async function generateMetadata({ params }: PageProps<'/[[...path]]'>): Promise<Metadata> {
  const { site, page } = await lookUp(params);

  return {
    title: page.seoTitle ?? `${page.title} — ${site.name}`,
    description: page.seoDescription ?? undefined,
    robots: page.noIndex ? { index: false, follow: false } : undefined,
  };
}

export default async function SitePage({ params }: PageProps<'/[[...path]]'>) {
  const found = await lookUp(params);
  return <SiteChrome site={toSiteView(found)} />;
}
