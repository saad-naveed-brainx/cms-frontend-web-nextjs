import { parseBlocks } from '@/blocks/parse-blocks';
import type { PublicSite } from '@/lib/public-api';
import { resolveTheme } from './resolve-theme';
import type { SiteView } from './types';

/**
 * What the API says about one page of one site, as the chrome draws it. The navigation the API
 * sends is shown in the header and again in the footer. The site's `settings` (tagline, footer
 * note) are not read yet: nothing can set them until site settings have a screen.
 */
export function toSiteView(data: PublicSite): SiteView {
  const nav = data.navigation.map(({ title, path }) => ({ label: title, href: path }));

  return {
    settings: {
      name: data.site.name,
      tagline: '',
      host: data.canonicalHost,
      nav,
      footer: { note: '', groups: nav.length > 0 ? [{ title: 'Pages', links: nav }] : [] },
      theme: resolveTheme(data.site.theme),
    },
    page: {
      path: data.page.path,
      title: data.page.title,
      blocks: parseBlocks(data.page.blocks),
    },
  };
}
