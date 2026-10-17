# Notes from Claude Code (17-10-2026)

## What I built

- `build.mjs` builds 15 pages into `dist/`: the home page, 7 calculators, the guides list, 2 guides, methode en bronnen, privacy, affiliate-disclosure and over. It also writes 404.html, the sitemap, robots.txt, the IndexNow key file and `app.js`.
- `site/calcs.mjs` holds the calculators. The build and the browser use the same file, so the example result in the HTML and the live result always match.
- The design idea is the "rekenstrook" (calculation ledger). Each result is an itemized ledger: a single rule above a subtotal, a double rule under the total, and a highlighter mark on the main figure. The page uses the system font only, and no framework.
- Two guides in Dutch: `wat-verandert-er-in-2026-voor-zzpers.md` and `aangifte-checklist.md`. They use only figures from `params-2026.json` and the 2025 values in the brief. Each figure has a source URL from `sources.json`. The €50.000 example is computed with the engine.
- Icons: `src/icon.svg` plus favicon.ico (32 px), apple-touch-icon (180 px), logo-512 and og-image (1200×630). Re-render them with `node scripts/make-icons.mjs`.
- `.github/workflows/pages.yml`: test, build, deploy, then an IndexNow ping (`scripts/indexnow.mjs`, continue-on-error).

## Verification

- `node --test test/`: 19/19 pass.
- `node build.mjs`: OK. The build stops on a title over 60 characters, a description over 155, a duplicate title or description, or a title without "2026".
- `node scripts/check.mjs`: all 16 pages pass in headless Chrome at 360 px and 1280 px. The script serves dist/ under /belastingcalculator/ and checks for:
  - console errors;
  - horizontal overflow;
  - tap targets under 44 px.
- The same script tests behaviour:
  - Typing changes the result and the URL.
  - A shared URL restores the inputs.
  - The official box 3 example gives € 4.667 in the browser.
  - A wrong input shows an error message.
- Other checks:
  - 3,200 random renders of all calculators gave no errors and no NaN.
  - The JSON-LD on all pages parses, and every FAQ in the JSON-LD is visible on its page.
  - All 482 internal links resolve.
  - All external links return 200, except the site's own canonical URLs (not deployed yet).
- I added a test guide file to check that new guides are picked up. The guide went into the sitemap, the guides list and the matching calculator. Then I removed the file.

## Engine and data findings (not changed, as the brief asks)

1. `nettoSalaris`: `nettoMaandExclVg` contains `(dm ? dm : 0) * 0`, which does nothing. With `dertiendeMaand: true` the 13th month is spread over the monthly net (€ 3.179 becomes € 3.344 at € 4.000 bruto). The site does not offer a 13th-month option because of this.
2. `zorgtoeslag` accepts `vermogen` but ignores it. The vermogensgrens is not in the params. The page says the calculator does not check it.
3. `vergelijk` ignores `aow` and `loon`. The zzp page shows a note when those inputs are set.
4. `box1.aowReachedIn2026FirstBracketByMonth` is not used. People who reach AOW age during 2026 get the full-year rate. The IB form tells them to choose "jonger dan de AOW-leeftijd".
5. IACK: the engine gives the full credit to the user. With a partner, only the partner with the lowest arbeidsinkomen gets it. The UI shows a note.
6. `kindgebondenBudget` has `verified: false`. It is shown only as information, labelled "Niet geverifieerd". It is not calculated.

## Open points for the owner

- **Contact:** privacy and over link to https://github.com/cerberostech/belastingcalculator/issues (the repo URL answers 200). Change `OFFICIAL.contact` in build.mjs if there is a better channel.
- **robots.txt:** it is in dist/ as the brief asks. Crawlers read robots.txt only at the host root (cerberostech.github.io/robots.txt), so this file has no effect. Submit the sitemap in Google Search Console and Bing Webmaster Tools.
- **Affiliate links:** these are plain homepage links now. Swap in tracking URLs in `AFFILIATE` in build.mjs when the programmes are approved.
- **Proefberekening URL:** `OFFICIAL.proef` is the Belastingdienst "hulpmiddel proefberekening toeslagen" page. It answered 200 on 17-10-2026.
- **Guide style:** the brief requires "2026" in every title. If a new guide title has no "2026", the build adds " (2026)" and prints a warning.
- **Not a git repo:** this folder has no git repository, so I did not commit anything. I did not push anything.
