import { expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import type { SampleSite } from '../support/sample-sites';
import { flowApiUrl, flowDatabase } from './env';
import { owner } from './people';

/** A short lower-case token, so a test's sites never clash with another test's in the shared database. */
export const unique = (): string => Math.random().toString(36).slice(2, 8);

/** A theme's colour as the browser reports it: `#13201C` is `rgb(19, 32, 28)`. */
export function asRgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

/** SQL straight to the flow database, for what the API cannot do (yet) or refuses on purpose. */
export function sql(statement: string) {
  execFileSync('psql', [`postgresql://localhost:5432/${flowDatabase}`, '-v', 'ON_ERROR_STOP=1', '-q', '-c', statement]);
}

const literal = (value: object) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;

/**
 * Nothing in the API sets a site's theme yet, so it is written straight to the database. It must
 * happen before the site's first visit: the API remembers what it knows about an address for a minute.
 */
function setTheme(siteId: string, theme: object) {
  sql(`UPDATE sites SET theme = ${literal(theme)} WHERE id = '${siteId}'`);
}

/**
 * Replaces a page's blocks in the database. The API refuses a rich-text block (its HTML is not safe
 * to store until it is cleaned on save), so this is how one from before that rule is made.
 */
export function writeBlocks(pageId: string, blocks: object[]) {
  sql(`UPDATE content SET blocks = ${literal(blocks)} WHERE id = '${pageId}'`);
}

/**
 * The real API, called directly (not through the website) as the owner, so a test can make the
 * sites and pages it needs the way a person would: create a site with an address, create pages,
 * publish them.
 */
export async function realApi(request: APIRequestContext) {
  const login = await request.post(`${flowApiUrl}/auth/login`, {
    data: { email: owner.email, password: owner.password },
  });
  expect(login.status()).toBe(200);
  const { accessToken } = (await login.json()) as { accessToken: string };
  const signedIn = { Authorization: `Bearer ${accessToken}` };

  /** The handle of one site: make, publish and unpublish pages on it. */
  function site(siteId: string, host: string) {
    const headers = { ...signedIn, 'X-Site-Id': siteId };
    return {
      siteId,
      host,
      async createPage(data: { slug: string; title: string; blocks?: object[]; type?: string }) {
        const response = await request.post(`${flowApiUrl}/content`, {
          headers,
          data: { type: 'page', ...data },
        });
        expect(response.status(), `creating ${data.slug}`).toBe(201);
        return (await response.json()) as { id: string };
      },
      async publish(id: string) {
        const response = await request.post(`${flowApiUrl}/content/${id}/publish`, { headers });
        expect(response.status(), 'publishing').toBe(200);
      },
      async unpublish(id: string) {
        const response = await request.post(`${flowApiUrl}/content/${id}/unpublish`, { headers });
        expect(response.status(), 'unpublishing').toBe(200);
      },
      /** A page made and published in one go. */
      async publishPage(data: { slug: string; title: string; blocks?: object[]; type?: string }) {
        const page = await this.createPage(data);
        await this.publish(page.id);
        return page;
      },
    };
  }

  return {
    /** A new site on one address, in the owner's organisation, with no pages and no theme. */
    async createSite(name: string, host: string, theme?: object) {
      const response = await request.post(`${flowApiUrl}/sites`, {
        headers: signedIn,
        data: { name, hostnames: [host] },
      });
      expect(response.status(), `creating the site on ${host}`).toBe(201);
      const created = (await response.json()) as { site: { id: string } };
      if (theme) setTheme(created.site.id, theme);
      return site(created.site.id, host);
    },

    /** A sample site made the real way: created on `host`, themed, every page made and published. */
    async createSampleSite(sample: SampleSite, host: string) {
      const made = await this.createSite(sample.name, host, sample.theme);
      for (const page of sample.pages) await made.publishPage(page);
      return made;
    },
  };
}
