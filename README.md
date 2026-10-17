# Belastingcalculator

Static site with Dutch tax calculators for 2026: netto salaris, inkomstenbelasting, zzp, box 3, vakantiegeld, 30%-regeling and zorgtoeslag, plus guides.
Live (after deploy): https://cerberostech.github.io/belastingcalculator/

No npm dependencies. Node 20 or newer.

```sh
node --test test/      # engine tests (official Belastingdienst examples)
node build.mjs         # writes the site to dist/
node scripts/check.mjs # optional: serves dist/ and checks every page in headless Chrome
```

## Structure

| Path | What it is |
|---|---|
| `data/params-2026.json` | All 2026 figures (rates, credits, thresholds). Each block has `src` ids. Do not edit without a source. |
| `data/sources.json` | Source id → official URL. |
| `engine/tax.mjs` | The tax engine (pure functions, no dependencies). |
| `site/calcs.mjs` | The calculators: fields, defaults, result ledger. Used by the build (HTML) **and** the browser (bundled). |
| `site/client.js` | Browser code: reads the form, updates the result, keeps the URL query in sync, "Kopieer link", result bar. |
| `build.mjs` | Builds every page into `dist/`. Contains `ROUTES`, `AFFILIATE`, page copy, FAQ, layout, markdown, sitemap. |
| `src/` | Static files copied as-is: `style.css`, `icon.svg`, `favicon.ico`, `apple-touch-icon.png`, `logo-512.png`, `og-image.png`. |
| `content/gidsen/*.md` | Guides. Every `.md` file here becomes a page. |
| `scripts/make-icons.mjs` | Renders the PNG/ICO files in `src/` from `src/icon.svg` with headless Chrome. Run by hand; output is committed. |
| `scripts/check.mjs` | Local check: console errors, overflow at 360 px, tap targets, calculator behaviour, shared links. |
| `scripts/indexnow.mjs` | Pings IndexNow after a deploy (CI). |
| `.github/workflows/pages.yml` | CI: test, build, deploy to GitHub Pages, IndexNow. |
| `_ref/` | Reference material (SEO plan, monetisation notes, older build). Not used by the build. |

## How a page is built

- Every calculator page is plain HTML with a real example result (the defaults), so it works without JavaScript and search engines see the numbers.
- `dist/app.js` is one script: `engine/tax.mjs` + `site/calcs.mjs` + the params + `site/client.js`. It re-renders the same result HTML when you type.
- Inputs are stored in the query string (`?bruto=4000&periode=maand`). A shared link restores the inputs.

## Common changes

- **Rename a URL:** change `ROUTES` in `build.mjs`. Links, canonicals, the sitemap and JSON-LD follow.
- **Affiliate tracking links:** change the `url` in `AFFILIATE` in `build.mjs`. Keep `rel="sponsored nofollow"` (added by the build).
- **New year:** update `data/params-<year>.json`, `UPDATED` in `build.mjs`, titles and H1s (they contain the year), and the guides.
- **Analytics:** the `ANALYTICS` constant is empty on purpose. The privacy page says there are no cookies or trackers; change it first.

## Writing guides (`content/gidsen/*.md`)

```md
---
title: "Box 3 in 2026: zo werkt het"
description: "Max 155 tekens. Wordt de meta description."
date: 2026-10-17
---
```

- `title` and `description` are required. `date` (or `updated`) is `YYYY-MM-DD`. Optional `slug` (default: the file name).
- The title should contain `2026`. If it does not, the build adds " (2026)" and warns.
- Links: `[zzp-calculator](calc:zzp)` links to a calculator by its `ROUTES` key. `[andere gids](slug-van-gids)` links to a guide. `/over/` is a root-relative link inside the site.
- Supported markdown: headings, paragraphs, bold/italic, links, lists, `- [ ]` checklists, tables, blockquotes, code. Raw HTML is escaped.
- `[[affiliate:boekhouden]]` on its own line inserts the marked affiliate block.
- Guides are linked automatically from matching calculators (see `match` in `CALCS` in `build.mjs`) and in the guide list, footer and sitemap.

## Rules

- Do not change numbers in `data/params-2026.json` or logic in `engine/tax.mjs` without an official source and a test.
- No cookies, no trackers, no AdSense, no reviews or ratings, no "beste" claims.
- Every page shows: "Indicatieve berekening — geen belastingadvies."
