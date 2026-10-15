import { parseBlocks, SAFE_IMAGE } from '@/blocks/parse-blocks';
import { isRecord, isText } from '@/lib/guards';
import type { PublicListing, PublicSite } from '@/lib/public-api';
import { resolveTheme } from './resolve-theme';
import type { SiteView } from './types';

/**
 * What the API says about one page of one site, as the chrome draws it. The navigation the API
 * sends is shown in the header and again in the footer. The header's tagline and logo and the footer's
 * note come from the site's settings (the admin's Appearance screen, GOV-04, MED-03); anything not text
 * is none, and a logo address that is not one an image may load from is no logo.
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
  const settings = isRecord(data.site.settings) ? data.site.settings : {};
  const text = (value: unknown) => (isText(value) ? value.trim() : '');
  const logo = text(settings.logoUrl);

  return {
    settings: {
      name: data.site.name,
      ...(SAFE_IMAGE.test(logo) ? { logo } : {}),
      tagline: text(settings.tagline),
      host: data.canonicalHost,
      nav,
      footer: {
        note: text(settings.footerNote),
        groups: nav.length > 0 ? [{ title: 'Pages', links: nav }] : [],
      },
      theme: resolveTheme(data.site.theme),
    },
    page,
  };
}
