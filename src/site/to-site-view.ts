import { parseBlocks } from '@/blocks/parse-blocks';
import type { PublicListing, PublicSite } from '@/lib/public-api';
import { resolveTheme } from './resolve-theme';
import type { SiteView } from './types';

/**
 * What the API says about one page of one site, as the chrome draws it. The navigation the API
 * sends is shown in the header and again in the footer. The site's `settings` (tagline, footer
 * note) are not read yet: nothing can set them until site settings have a screen.
 */
export function toSiteView(data: PublicSite): SiteView {
  return frameView(data, {
    path: data.page.path,
    title: data.page.title,
    blocks: parseBlocks(data.page.blocks),
  });
}

/** A blog page: the site's frame around the list, which `PostList` draws (it has no blocks). */
export function toListingView(data: PublicListing): SiteView {
  return frameView(data, {
    path: data.listing.path,
    title: data.listing.title,
    blocks: [],
  });
}

function frameView(
  data: Pick<PublicSite, 'site' | 'canonicalHost' | 'navigation'>,
  page: SiteView['page'],
): SiteView {
  const nav = data.navigation.map(({ title, path }) => ({
    label: title,
    href: path,
  }));

  return {
    settings: {
      name: data.site.name,
      tagline: '',
      host: data.canonicalHost,
      nav,
      footer: {
        note: '',
        groups: nav.length > 0 ? [{ title: 'Pages', links: nav }] : [],
      },
      theme: resolveTheme(data.site.theme),
    },
    page,
  };
}
