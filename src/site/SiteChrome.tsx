import type { ReactNode } from 'react';
import { BlockRenderer } from '@/blocks/BlockRenderer';
import { SiteThemeRoot } from '@/theme/SiteThemeRoot';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';
import type { SiteView } from './types';

/**
 * A whole tenant site: theme scope, header and footer from site settings, and
 * the page's blocks in between. Nothing here reads a global colour, so any theme
 * can be laid over the same components.
 */
/** `banner` sits above the header, inside the theme: the preview strip uses it. */
export function SiteChrome({ site, banner }: { site: SiteView; banner?: ReactNode }) {
  return (
    <SiteThemeRoot theme={site.settings.theme} className="flex min-h-full flex-col">
      {banner}
      <SiteHeader settings={site.settings} />
      <main className="flex-1">
        <BlockRenderer blocks={site.page.blocks} />
      </main>
      <SiteFooter settings={site.settings} />
    </SiteThemeRoot>
  );
}
