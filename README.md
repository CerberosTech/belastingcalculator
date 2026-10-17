# Belastingcalculator

Static site with Dutch tax calculators for 2026: netto salaris, inkomstenbelasting, zzp, box 3, vakantiegeld, 30%-regeling and zorgtoeslag, plus guides.
Dutch at the root, English under `/en/` (same calculators, same figures).
Live: https://cerberostech.github.io/belastingcalculator/ and https://cerberostech.github.io/belastingcalculator/en/

No npm dependencies. Node 20 or newer.

```sh
node --test test/      # engine tests (official Belastingdienst examples)
node build.mjs         # writes the site to dist/
node scripts/check.mjs # serves dist/ and checks every page (both languages) in headless Chrome
```

## Structure

| Path | What it is |
|---|---|
| `data/params-2026.json` | All 2026 figures (rates, credits, thresholds). Each block has `src` ids. Do not edit without a source. |
| `data/sources.json` | Source id → official URL. |
| `engine/tax.mjs` | The tax engine (pure functions, no dependencies). |
| `site/calcs.mjs` | The calculators: fields, defaults, result ledger, in both languages (`T(nl, en)` pairs). Used by the build (HTML) **and** the browser (bundled). |
| `site/client.js` | Browser code: reads the form, updates the result, keeps the URL query in sync, "Kopieer link", result bar, query string on the language switcher. |
| `site/copy-nl.mjs`, `site/copy-en.mjs` | All page copy per language: UI strings, calculator titles, FAQ, "how it works", source names, home, method page, privacy, about, 404. Same shape; the build stops if a key is missing in one. |
| `build.mjs` | Builds every page into `dist/`. Contains `ROUTES` (nl + en slug per page), `AFFILIATE`, layout, hreflang, markdown, sitemap. |
| `src/` | Static files copied as-is: `style.css`, `icon.svg`, `favicon.ico`, `apple-touch-icon.png`, `logo-512.png`, `og-image.png`. |
| `content/gidsen/*.md` | Dutch guides. Every `.md` file here becomes a page. |
| `content/guides-en/*.md` | English guides (under `/en/guides/`). Paired with a Dutch guide by `translationOf` or the same slug. |
| `scripts/make-icons.mjs` | Renders the PNG/ICO files in `src/` from `src/icon.svg` with headless Chrome. Run by hand; output is committed. |
| `scripts/check.mjs` | Local check, both languages: console errors, overflow at 360 px, tap targets, internal links and #anchors, hreflang (reciprocal, x-default, sitemap), counterparts, switcher, no Dutch UI text on `/en/`, calculator behaviour, shared links, GoatCounter (tag on every page, click names on sponsored and newsletter links, no query string sent). |
| `scripts/indexnow.mjs` | Pings IndexNow after a deploy (CI). |
| `.github/workflows/pages.yml` | CI: test, build, deploy to GitHub Pages, IndexNow. |
| `_ref/` | Reference material (SEO plan, monetisation notes, older build). Not used by the build. |

## How a page is built

- Every calculator page is plain HTML with a real example result (the defaults), so it works without JavaScript and search engines see the numbers.
- `dist/app.js` is one script: `engine/tax.mjs` + `site/calcs.mjs` + the params + `site/client.js`. It re-renders the same result HTML when you type.
- Inputs are stored in the query string (`?bruto=4000&periode=maand`). A shared link restores the inputs.

## Common changes

- **Rename a URL:** change `ROUTES` in `build.mjs` (each page has an `nl` and an `en` slug). Links, canonicals, hreflang, the switcher, the sitemap and JSON-LD follow.
- **Change text:** Dutch in `site/copy-nl.mjs`, English in `site/copy-en.mjs`; calculator labels and results in `site/calcs.mjs` (`T('nederlands', 'English')`).
- **Affiliate tracking links:** change the `url` in `AFFILIATE` in `build.mjs`. Keep `rel="sponsored nofollow"` (added by the build). The build also adds the GoatCounter click name `aff-<name>` (from `name`) and a `data-goatcounter-title`.
- **New year:** update `data/params-<year>.json`, `UPDATED` in `build.mjs`, titles and H1s (they contain the year), and the guides.
- **Analytics:** GoatCounter (https://belastingcalculator.goatcounter.com). `ANALYTICS` in `build.mjs` ends every page with the GoatCounter tag, after `window.goatcounter={no_onload:true}`. `site/client.js` then counts the page and binds the clicks itself. It removes the query string from `q`, the path and the referrer, because the query holds the visitor's amounts. The privacy pages describe this; change them first if you change the analytics.
- **Newsletter link (none yet):** give it `track('newsletter', name)` in `build.mjs`. The check fails on a newsletter link without `data-goatcounter-click="newsletter-…"`.

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
- No cookies, no AdSense, no ad trackers, no reviews or ratings, no "beste" claims. The only analytics is GoatCounter (cookieless, no personal data).
- Every page shows: "Indicatieve berekening — geen belastingadvies."

## Languages

- Dutch is at the root (`lang="nl"`), English under `/en/` (`lang="en"`). Every page has `hreflang` links for nl, en and x-default (the Dutch page), with absolute URLs. The sitemap repeats them as `xhtml:link`.
- The header has a language switcher (NL / EN). It links to the same page in the other language. On a calculator, the browser adds the query string, so a shared result opens with the same inputs. Query keys are the same in both languages (`?bruto=4000&periode=maand`).
- English numbers use English format (`€4,000`, `37.56%`). English inputs also accept Dutch thousands (`4.000`).
- English copy keeps Dutch terms in parentheses where people search for them. Mark Dutch names in English HTML with `lang="nl"`; the check ignores that text.
- Fixed English terms: "labour tax credit" (arbeidskorting), "start-up deduction (startersaftrek)", "self-employed deduction (zelfstandigenaftrek)".

## Writing English guides (`content/guides-en/*.md`)

Same front matter as the Dutch guides, plus `translationOf` with the slug of the Dutch guide:

```md
---
title: "Box 3 in 2026: tax-free allowance and rates"
description: "Max 155 characters."
date: 2026-10-17
slug: box-3-2026
translationOf: box-3-2026
---
```

- A guide with the same slug as a Dutch guide is paired without `translationOf`.
- A guide without a translation has no hreflang alternate. Its switcher goes to the guide list of the other language, and that list shows it under "Only in Dutch" / "Alleen in het Engels". `check.mjs` reports it as a warning, not an error.
- Keep the title at 60 characters or fewer. A longer title stays the H1; the `<title>` becomes the part before ":" (if it has "2026") or is shortened, and the build warns.
- `[calculator](calc:zzp)` links to the calculator in the guide's own language. `[guide](slug)` links to the guide in the same language (a Dutch slug resolves to its English translation).
