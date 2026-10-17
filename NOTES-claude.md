# Notes from Claude Code (17-10-2026)

## Brief 3: analytics and privacy

See the last section ("Brief 3").

## Brief 2: English version

See the section after "Brief 1" below.

## Brief 1: Dutch site

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

1. ~~`nettoSalaris`: the 13th month was spread over the monthly net.~~ Fixed by the owner in brief 2 (`nettoDm`). The netto calculator now has a 13th-month toggle.
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

---

# Brief 2: English version (17-10-2026)

## What I built

- **Engine:** I copied `../bc-engine-tax.mjs` over `engine/tax.mjs`. I made no other change to `engine/` or `data/`.
- **English site under `/en/`:** 20 English pages next to the 20 Dutch pages: the hub "Dutch tax calculator 2026", 7 calculators, the guide list, 7 guides, methodology and sources, privacy, affiliate disclosure and about.
- **One `ROUTES` config:** each page has an `nl` and an `en` slug in `build.mjs`. The build stops on a duplicate slug.
- **Copy split by language:** `site/copy-nl.mjs` holds the Dutch text, moved without changes. `site/copy-en.mjs` holds the English text, written for expats, with Dutch terms in parentheses. Both files have the same shape, and the build stops when a key is missing in one.
- **Calculators:** `site/calcs.mjs` has both languages as `T(nl, en)` pairs. English uses English number format (`€4,000`, `37.56%`). English inputs also accept Dutch thousands (`4.000`). The ledger shows the Dutch term under an English label, marked `lang="nl"`. A Dutch build of every calculator gives byte-identical output to before. The only difference is the new `dertiende=0` in the home-page link.
- **13th month:** the engine fix made this possible, so the netto calculator now has a toggle "Ik krijg een 13e maand" / "I get a 13th month". The result shows the net 13th month. Query key: `dertiende`.
- **hreflang:** every page has nl, en and x-default (the Dutch page), with absolute URLs, and the links are reciprocal. `<html lang>`, `og:locale` and `og:locale:alternate` are correct. JSON-LD uses `inLanguage: "en"` on English pages.
- **Sitemap:** it has all 40 pages, with `xhtml:link` alternates. These are the same set as on each page.
- **Language switcher:** an NL/EN pill in the header. It sits right of the brand on mobile and after the menu on wide screens, and each tap target is 44 px or more. It links to the counterpart page. On calculators, `client.js` adds the current query string, so a shared result opens with the same inputs in the other language. A page without a translation links to the guide list of the other language.
- **Guides:** `content/guides-en/*.md` are paired by `translationOf` or the same slug.
  - I translated the 2 Dutch guides I wrote into native English.
  - Another agent (likely Bragi) added 5 English guides at 14:22 without `translationOf`. I added one `translationOf:` line to 4 of them. The fifth, `box-3-2026`, pairs by slug, but it got the line too. I did not change their text.
  - The English guide list shows Dutch-only guides under "Only in Dutch", marked `lang="nl"`. The Dutch list does the same for English-only guides.
- **404:** one `404.html` in both languages, because GitHub Pages serves one 404 for every path.
- **`scripts/check.mjs`:** both languages get the same checks. It now checks:
  - internal links and `#anchors`;
  - hreflang: self-reference, absolute URLs, reciprocity, x-default = Dutch, and the same set in the sitemap;
  - `<html lang>` and the canonical;
  - a counterpart for every page (an untranslated guide is a warning, not an error);
  - the switcher: present, visible, pointing to the counterpart, and keeping the query string (it also follows the link and checks the inputs);
  - no Dutch UI text on `/en/` pages: a list of 45 Dutch UI phrases, plus a Dutch-word ratio. Text inside `lang="nl"` does not count. The check also runs on English results with every option turned on;
  - the English behaviour tests: typing, a shared URL, box 3 = €4,667, and an English error message.

## Verification

- `node --test test/`: 19/19 pass.
- `node build.mjs`: OK, 40 pages (20 nl, 20 en). All 7 guide pairs are matched.
- `node scripts/check.mjs`: 41 pages (with the 404) at 360 and 1280 px. No problems found.
- **Mutation test of the check:** I put a Dutch heading on an English page, removed one hreflang, broke a link and an anchor, removed a switcher and set a wrong `<html lang>`. The check caught all six faults, then I rebuilt.
- **Untranslated-guide test:** I added a temporary Dutch-only guide. It got no false alternate, the switcher went to `/en/guides/`, and it was listed under "Only in Dutch". The check gave only a warning. Then I removed the guide.
- **Meta and JSON-LD:** all 40 JSON-LD blocks parse, and every FAQ answer is visible on its page. Every title is 60 characters or fewer and every description 155 or fewer. Every title has "2026", and every page shows "Updated" or "Bijgewerkt: 17 oktober 2026".
- **Dutch words on English pages:** 0.6% at most (the methodology page, because of Dutch source names). The threshold is 2%.
- **Bundle:** `app.js` grew from 56 KB to 74 KB (22 KB gzipped), because both languages are in one bundle.

## Engine finding (not changed)

7. ~~Fixed by the owner in brief 3: `nettoDm` now subtracts the pension.~~ `nettoSalaris`: `nettoDm = dm − (tax difference)`, but `nettoVakantiegeld` uses `vg × (1 − pensioenPct) − …`. With a pension contribution, the monthly net without the 13th month is too low by about `dm × pensioenPct / 12`. For example, at €4,000 and 5% pension that is about €17 per month. The site shows the net 13th month as the difference in annual net, with and without the 13th month (this includes the pension correctly). Without a pension contribution, both methods give the same result.

## Open points for the owner

- ~~Done in brief 3.~~ **Long English guide titles:** 4 of Bragi's English titles are over 60 characters. The H1 keeps the full title. The `<title>` uses the part before ":" or is shortened, and the build warns. "How much tax should a freelancer (zzp) in the Netherlands set aside in 2026?" becomes "How much tax should a freelancer (zzp) in the… (2026)". Please give it a shorter title. Two of Bragi's descriptions are over 155 characters and are shortened with "…".
- ~~Done in brief 3: "start-up deduction (startersaftrek)".~~ **Terms:** the site now uses "labour tax credit" for arbeidskorting everywhere, as Bragi's guides do. Bragi uses "start-up deduction" for startersaftrek, and my pages use "starter's deduction". Choose one.
- **Query keys stay Dutch** (`?bruto=…&periode=maand`) on English pages. This is on purpose: a shared link then works in both languages.
- **Not a git repo:** I committed nothing and pushed nothing. I deleted nothing outside this folder.

---

# Brief 3: analytics and privacy (17-10-2026)

## What I built

- **GoatCounter tag:** `ANALYTICS` in `build.mjs` ends every page (40 pages and the 404) with the tag from the brief. Before the tag there is one inline line, `<script>window.goatcounter={no_onload:true}</script>`. The reason is in the next point.
- **No amounts to GoatCounter:** I read count.js (gc.zgo.at, 17-10-2026). It sends `location.search` as `q` on every page view and every click. On a calculator, the query string holds the amounts the visitor typed (`?bruto=4000`). The referrer can also hold them, after a move from a calculator to another page of the site. The privacy page says the amounts go to nobody, so I stopped this:
  - With `no_onload`, count.js does not count by itself.
  - `site/client.js` wraps `goatcounter.get_data`. It removes `q` and strips the query from the path and the referrer. Then it counts the page and binds the click events.
  - The path comes from the canonical link, so it has no query. If the site moves to its own domain, the canonical host and the page host can differ. Then count.js uses `location`, with the query. The client strips the query from the path, so this case is safe too.
  - Without JavaScript, or with GoatCounter blocked, nothing is counted and the site works as before.
- **Click events:** every affiliate link gets `data-goatcounter-click="aff-<name>"` (`aff-jortt`, `aff-knab`, `aff-moneybird`, `aff-rompslomp`, `aff-snelstart`) and `data-goatcounter-title="Affiliate: <name>"`. One helper, `track(kind, name)` in `build.mjs`, makes the attributes from the `AFFILIATE` config. The site has no newsletter link yet. When you add one, use `track('newsletter', name)`.
- **Privacy pages (nl + en):** a new section "Bezoekersstatistiek met GoatCounter" / "Visit statistics with GoatCounter". It says what GoatCounter gets and what it does not store:
  - It gets the path without the amounts, the title, the referrer, the screen width, the browser, the operating system, the language and the country. For a click, it gets the click name.
  - It does not store the IP address, and it sets no cookies.
  - It keeps the IP address and browser in memory for 8 hours at most, to count a visit once.
  - The data is on Hetzner servers in Germany and Finland.
  Source: goatcounter.com/help/privacy and /help/sessions (read 17-10-2026). "Geen cookies" stays true everywhere. I removed "geen trackers" / "no trackers" from the privacy pages and the home page facts. The home page now says "Geen cookies, alleen anonieme bezoekstatistiek" / "No cookies, only anonymous visit counts".
- **`scripts/check.mjs`:**
  - Static: every page ends with the exact tag (once), after the `no_onload` line. Every `rel="sponsored"` link has an `aff-<name>` click name and a title. Every newsletter link has a `newsletter-<name>` click name; links to sources in `data/sources.json` (such as the Belastingdienst "Nieuwsbrief Loonheffingen") do not count.
  - Browser: Chrome answers requests to gc.zgo.at and to the count endpoint itself (`tab.intercept` in `scripts/chrome.mjs`), so no hit leaves the machine. The check uses the real count.js, with its localhost filter turned off. If it cannot fetch it, it uses a stub and gives a warning.
  - The browser test checks: one page view per page with the right path; a click on an affiliate link with amounts in the URL gives an `aff-…` event; the next page has the calculator as referrer; and no hit carries the query string (`q`, path or referrer).
- **Engine:** `engine/tax.mjs` has the owner's fix (`nettoDm` subtracts the pension). I did not change the engine. I added a test: at €4,000 a month, with 0% and 5% pension, the monthly net is the same with and without a 13th month (±€1). The old engine fails this test by about €17. The netto calculator still shows the net 13th month as the difference in annual net, which agrees with the engine.
- **English guide titles:** all are now 60 characters or fewer, so the build gives no title warnings:
  - "Box 3 in the Netherlands 2026: allowance, rates and example"
  - "Dutch tax credits 2026: general and labour tax credit"
  - "Dutch freelancer (zzp): how much tax to set aside in 2026"
  - "Self-employed deduction 2026 (zelfstandigenaftrek): €1,200"
- **Term:** English uses "start-up deduction (startersaftrek)" in every place: the FAQ, how it works, the methodology table, the ledger row ("Start-up deduction" with the Dutch term under it), the hours-criterion note and the guides. Later mentions in the same text say "start-up deduction". The README lists the fixed terms.

## Verification

- `node --test test/`: 20/20 pass.
- `node build.mjs`: 40 pages, no warnings.
- `node scripts/check.mjs`: 41 pages at 360 and 1280 px, no problems found, no warnings (the real count.js was used).
- **Mutation test of the check:** I broke dist/ five ways:
  - the client sends `q`;
  - the client keeps the referrer query;
  - no `no_onload` on one page;
  - an affiliate link without a click name;
  - no tag on the 404 page.
  The check caught all five, then I rebuilt. The first fault showed the real leak: count.js sent `q=?winst=61234&…` with the click.

## Open points for the owner

- **Two English descriptions are over 155 characters.** The build clips them with "…": `how-much-tax-to-set-aside-freelancer.md` (185) and `tax-credits-2026.md` (162). I did not change them, because the brief did not ask for it.
- **Your own visits:** to exclude them, open any page with `#toggle-goatcounter` once. count.js then stores `skipgc` in localStorage in your own browser only.
- **Not a git repo:** I committed nothing and pushed nothing.
