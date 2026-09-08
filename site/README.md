# Catalogue site

Interactive demos for the solutions in [`../solutions`](../solutions) — a
Next.js app exported to static HTML and served from GitHub Pages.

Every demo runs entirely in the browser on representative sample data. No
Marketing API calls are made and no credentials are involved.

## Develop

```bash
npm install
npm run dev          # http://localhost:3000
```

## Build

`BASE_PATH` must match the path the site is served from, because GitHub Pages
serves a project site at `https://<owner>.github.io/<repo>/`. Leave it unset for
local work.

```bash
BASE_PATH=/catalogue-of-api-solutions npm run build
```

Output lands in `out/`.

## Deploy

The repo publishes from the `docs/` folder on `main` (Settings → Pages → Deploy
from a branch → `main` / `/docs`):

```bash
BASE_PATH=/catalogue-of-api-solutions npm run build
rm -rf ../docs && mkdir -p ../docs
cp -r out/. ../docs/
touch ../docs/.nojekyll
```

`.nojekyll` is required. Without it GitHub runs Jekyll over the output, which
silently discards `_next/` and every asset 404s.

## Adding a solution

1. Add the blueprint to `../solutions/<category>/<slug>.md`
2. Register it in `lib/catalogue.ts`
3. Add sample data in `lib/demos/<slug>.ts` and the UI in
   `app/components/demos/<slug>/`
4. Wire it into the `DEMOS` map in `app/solutions/[slug]/demo/page.tsx`

The nav, theme, breadcrumbs, and API view are inherited from `ConsoleShell` —
nothing else to hook up.
