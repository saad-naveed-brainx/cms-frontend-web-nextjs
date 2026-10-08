# cms-web

Next.js (App Router) renderer for the **public tenant sites**. Server-rendered
so that meta tags, canonical URLs and sitemaps are real HTML rather than
client-side decoration. Tenants are resolved from the request host; page content
comes from `cms-api` over REST.

## Prerequisites

- Node 22 (`.nvmrc`)
- `cms-api` running (default `http://localhost:4001`)

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev                 # http://localhost:3000
```

`.env.local`:

```
NEXT_PUBLIC_API_URL="http://localhost:4001"
DEFAULT_TENANT_HOST="localhost:3000"   # fallback tenant for local dev
```

## Scripts

| Script              | Does                          |
| ------------------- | ----------------------------- |
| `npm run dev`       | dev server on :3000           |
| `npm run build`     | production build              |
| `npm start`         | serve the build on :3000      |
| `npm run lint`      | eslint                        |
| `npm run typecheck` | `tsc --noEmit`                |

## Blocks and theming

```
src/blocks/         block types, registry, renderer, and one component per block
src/theme/          SiteTheme type, presets, and the CSS-variable wrapper
src/site/           header, footer, and the whole-site composition
src/lib/            the API client the pages are drawn from
src/app/            one catch-all route that draws every tenant site
```

**The contract:** a block component may reference `--site-*` custom properties
and nothing else. No block carries a colour, typeface, radius or spacing value
of its own, so any tenant can restyle every block through `theme_json` alone.
This is enforceable in review with a grep:

```bash
grep -rnE '#[0-9a-fA-F]{3,8}\b' src/blocks src/site      # must return nothing
```

A site's theme is stored on the site (`sites.theme`, empty for a new site) and laid over
a default one when the page is drawn (`src/site/resolve-theme.ts`), so every block is
restyled by the stored theme alone. If a block ever hardcodes a colour, a themed site
shows it immediately.

**Adding a block:** add its type to the `Block` union in `blocks/types.ts`, write
the component, and register it in `blocks/registry.ts`. The registry is typed as
`{ [T in BlockType]: BlockDefinition<T> }`, so a type without a component — or a
component without a type — is a compile error rather than a blank section.

**Routes:** `src/app/[[...path]]/page.tsx` draws every tenant site: the site comes
from the request host, the page from the path (`/` is the page at `/home`), both
read from the API's public route. In development open a site at
`http://<name>.localhost:3000/`.

## Notes

- Tailwind CSS 4 via `@tailwindcss/postcss`.
- Block components are colour-agnostic by rule (see above); tenant palettes are
  stored with each site and read from the API.
- Sample artwork in `public/media/` is hand-written SVG, used by the tests' sample
  sites, so there are no binary assets and no remote image hosts to configure yet.
  `next/image` arrives with the media library.
- Blocks are intended to be React components shared between the editor canvas in
  `cms-admin` and this renderer, so preview is exact rather than approximate.
  Since the projects are separate repos, that sharing happens through a
  published package or a copied block registry — not a workspace import.
- ISR cache keys must include the request host, or one tenant can be served
  another tenant's page.
