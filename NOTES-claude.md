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

---

# Redesign v2 (17-10-2026)

## What I studied

- **thetax.nl** (screenshots in `_ref/shots/v2/thetax/`). Good: the calculator is the first thing you see, the result changes as you type, the period select, the hours per week, the 30% ruling and 66+ options, and the output per year, month, week, day and hour. Weak: a plain Material form, a plain table as the only result, no visual, no explanation, no shared link, no other calculators, English only.
- **The old site** (`_ref/shots/`): correct, but it looked like a document. The calculator was in a grey band under a long intro, and the result was a ledger only.

## What I built

- **Calculator first.** The home page hero (nl and en) is now the full net salary calculator, with every option. Every calculator page has a dark hero band with the calculator card on top of it.
- **Net salary calculator:**
  - Input per month, year or hour. When you switch, the amount converts (€4,000 per month becomes €48,000 per year).
  - New fields: working hours per week, the 30% ruling (plus the under-30 master's threshold), and the tax year (2026, the only year with verified figures).
  - Every amount has a slider next to it.
- **Rich result on every calculator:**
  - The main figure counts up to its new value.
  - Animated stacked bars, for example "where your gross pay goes" and "tax before tax credits".
  - Rate tiles: effective rate, marginal rate, and what you keep of €100 extra.
  - An SVG chart with a "you are here" marker: net against gross (net salary), net against profit with the employee line (zzp), the benefit against salary (30% ruling) and the allowance against income (zorgtoeslag, straight from the table).
  - A per-period table (year, month, 4 weeks, week, day, hour).
- **Compare section:**
  - Employee, freelancer or DGA, side by side, on the net salary and zzp calculators. **DGA is not calculated.** It needs the corporate income tax and the customary salary (gebruikelijk loon), and these are not in `params-2026.json`. The card says so.
  - "What if you earn more?" (net salary and zzp).
  - Scenario A against B on every calculator. Scenario A is kept in the URL (`vs=`), so a shared link shows the same comparison.
- **Share and print:** "Copy link" (as before), "Copy result" (the result as plain text, with the link and the disclaimer) and "Print or PDF". The print stylesheet shows your inputs, the link, the result, the chart and the calculation.
- **Design system** (`src/style.css`, rewritten):
  - System font stack (no web font, no layout shift), tabular numbers.
  - An indigo accent, with green for net and red for tax. Cards with depth and small motion.
  - Dark mode: it follows the system. The toggle in the header stores the choice in localStorage, and an inline head script applies it before the first paint. I added one sentence about this to both privacy pages.
  - `prefers-reduced-motion` turns off all motion.
  - The same system is on every page: the calculators, the home page, the guide list (cards), the guides, methodology, privacy, about, affiliate and the 404 page (an article sheet on a soft band), in nl and en.
- **Kept:** URLs, hreflang, sitemap, JSON-LD, the GoatCounter tag and click tracking, the verification meta tags, the affiliate slots and disclosure, the disclaimers, the sources and the IndexNow key. `engine/` and `data/` are unchanged.

## How the 30% ruling in the net salary calculator works (no new tax maths)

It uses only engine functions, in the same two steps as the 30% ruling calculator: `E.expat` gives the tax-free allowance over the taxable salary (after pension, with holiday allowance and 13th month), and `E.incomeTax` gives the tax on the rest. The net holiday allowance and net 13th month are the difference in annual net with and without them. Without the ruling, all figures are the engine's own, and the defaults give the same result as before (€3,179 net per month at €4,000 gross, in both languages).

## Verification

- `node --test test/`: 20/20 pass.
- `node build.mjs`: 40 pages, no warnings.
- `node scripts/check.mjs`: 41 pages at 360 and 1280 px, no problems. New behaviour checks in both languages: the slider sets the amount and the URL, month → year converts the amount, scenario A/B makes a table and comes back from a shared link, the copy result / print / scenario / theme buttons show, the theme toggle switches, and the home page has the calculator under the hero. A mutation test (no period conversion, hidden scenario button) made the check fail, as expected.
- **Code review** (a separate review agent): it found 3 bugs, and I fixed all 3. (1) After a shared link in year or hour mode, the first period switch converted from the wrong period. A new check covers this. (2) The URL was written on every slider frame. Safari allows 100 `replaceState` calls per 30 seconds, so URL writes now happen at most once per 400 ms, and the last change is always written. (3) `aria-invalid` had an empty value, which screen readers read as "not invalid". It is now `"true"`.
- Screenshots for self-review: `_ref/shots/v2/after/` (desktop 1366 px and mobile 390 px, light and dark). Make new ones with `node scripts/shots.mjs OUTDIR [page …] [--dark]`.

## Open points for the owner

- **DGA comparison:** to calculate it, add the 2026 corporate income tax brackets and the customary salary to `params-2026.json`, with sources and a test.
- **Other tax years:** the year is shown, but only 2026 has figures. thetax.nl goes back to 2015.
- **Hourly figures** use 52 weeks × the hours per week. A day is 1/260 of a year.

---

# v2 mobile pass (17-10-2026)

## Result

The mobile pages are about half as long. Heights at 390 px, before and after:

| Page | Before | After |
|---|---|---|
| `/` | 10,453 px | 5,545 px (−47%) |
| `/en/` | 10,756 px | 5,584 px (−48%) |
| `/netto-salaris-berekenen/` | 9,580 px | 5,063 px |
| `/zzp-belasting-berekenen/` | 10,095 px | 5,333 px |
| `/inkomstenbelasting-berekenen/` | 7,720 px | 4,523 px |
| `/box-3-berekenen/` | 7,272 px | 4,017 px |
| `/vakantiegeld-berekenen/` | 6,064 px | 3,435 px |
| `/30-procent-regeling-berekenen/` | 6,493 px | 3,737 px |
| `/zorgtoeslag-berekenen/` | 7,444 px | 3,575 px |

The desktop look did not change. I took full-page screenshots of all 41 pages at 1366 px (light and dark) before and after. They are pixel-identical. At 800 px, the only difference is the old result bar. It showed on page load and covered a field label; the new bar does not.

## What I built

- **Folds.** Long parts are now `<details data-fold>` with the heading in the `<summary>` (`fold()` in `site/calcs.mjs`):
  - every calculator (home too): the calculation, the per-period table and the compare section;
  - calculator pages: "how it works", the FAQ and, on zorgtoeslag, the other allowances;
  - the home page: the guide list (a "Show the 7 guides" bar under the heading, which keeps its "All guides" link) and "how we calculate";
  - every page: the footer columns.
- **No layout shift.** The HTML has `open`. On a screen of 760 px (47.5em) or less, a small inline script in `<head>` closes each fold as the parser adds it. Mutation records are handled before the browser paints, so the page never shows them open. Without JavaScript all folds stay open. Search engines get the full content, and the FAQ JSON-LD is unchanged.
- **Wide screens:** the folds stay open and look like the old headings. `client.js` blocks the toggle there and takes the summaries out of the tab order.
- **Anchors and print:** a link to an anchor inside a closed fold opens it (for example `#faq-h`). Printing opens all folds and closes them again after.
- **Result card:** still directly under the form. The notes of the net salary calculator stay visible under the per-period fold, because they hold the 30% ruling result.
- **Result bar** (below 960 px, where the layout has one column):
  - It shows the live main figure ("Netto per maand € 3.798") while you edit the form and the result card is off screen.
  - It appears only after the first input or focus in the form, so it does not cover the form on a fresh page.
  - It hides as soon as the result card is above the bottom 96 px of the screen. So the last field can always scroll clear of it, and it never covers the result.
  - A tap scrolls to the result (under the sticky header) and moves the focus to the result heading. The URL keeps no `#fragment`.
  - It sits above the safe area (`env(safe-area-inset-*)`) and above an on-screen keyboard (`visualViewport`). While it shows, `scroll-padding-bottom` keeps focused fields clear of it.
  - It is a link with a visible label and amount, plus a hidden "– go to the result". It is not a live region, because the result head already announces changes.
- **Smaller mobile tweaks:** the calculator lists are compact rows (icon, title, example). The short text is hidden on mobile only and stays in the HTML. The per-period table now fits at 390 px; before, the net column was cut off ("€ 48.07").

## Verification

- `node --test test/`: 20/20 pass. `engine/` and `data/` are unchanged.
- `node build.mjs`: 40 pages, no warnings.
- `node scripts/check.mjs`: 41 pages, no problems. New checks (none of the old checks were removed or relaxed):
  - Static: every fold is open in the HTML and starts with its summary. The calculation, per-period table, compare section, "how it works", FAQ, guide list, trust text and other allowances are in a fold. Every JSON-LD block parses. Every FAQ question and answer from the JSON-LD is in the FAQ section of the HTML.
  - Every page at 360 and 1280 px: CLS on load is 0.001 or less. Folds are closed at 360 px and open at 1280 px. The result card is directly under the form. The overflow and tap-target checks now run with every fold open, so collapsed content is still checked. Summaries count as tap targets on mobile.
  - Wide screen: a fold does not toggle and is no tab stop, and the result bar never shows.
  - 390 px, both languages:
    - the home page heights are printed, with a budget of 6,500 px;
    - the result bar: hidden before input, shown while editing, the same figure as the result after two inputs, at the bottom of the screen, 44 px or higher, with scroll padding and a clear name;
    - it does not cover the last field, and it hides when the result card is in view;
    - a tap scrolls to the result and moves the focus there, with no hash;
    - a tap opens a fold, `#faq-h` opens the FAQ, and print opens and then restores the folds.
- **Mutation test of the check.** I broke `dist/` six ways: no head script, a fold closed in the HTML, the per-period table outside its fold, a FAQ answer removed from the HTML, a result bar that does not update, and a late 100 px block. The check caught all six, then I rebuilt.
- Screenshots: `_ref/shots/v2/mobile/` (390 px, light and dark, plus the result bar).

## Open points for the owner

- **Safari:** the compare heading row on wide screens is a `<summary>` with `display: flex`. I checked the pixels in Chrome only. Old Safari versions ignored flex on `<summary>`. If so, the short line "Zet je uitkomst naast andere keuzes…" moves under the heading on desktop Safari. Nothing else changes.
- **Real phones:** I tested with Chrome device emulation. Please check the result bar once on an iPhone with the keyboard open.
