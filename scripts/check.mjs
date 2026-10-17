// Serves dist/ under /belastingcalculator/ and checks every page, in Dutch and in English.
// Static checks (from the HTML files): internal links and #fragments, hreflang (absolute, reciprocal, x-default = Dutch,
// same set in the sitemap), <html lang>, canonical, a counterpart in the other language, the language switcher,
// the GoatCounter tag at the end of every page, a GoatCounter click name on every sponsored and newsletter link.
// Folds (<details data-fold>): open in the HTML; the calculation, the per-period table, the compare section, "how it works"
// and the FAQ are in one; the FAQ in the JSON-LD is in the page HTML. In the browser: closed at 360 px, open at 1280 px,
// no layout shift on load, the result card right under the form, and the mobile result bar (see the end of the file).
// Browser checks (headless Chrome): no console errors, no horizontal scroll at 360 px (folds opened), tap targets >= 44 px,
// no Dutch UI text left on /en/ pages, the calculators react to input and to the query string, the switcher keeps the query,
// GoatCounter counts every page once and clicks on sponsored links, and never gets the query string (the visitor's amounts).
// count.js is fetched from gc.zgo.at (with its localhost filter off) or replaced by a stub when offline; no hit leaves the machine.
// Usage: node build.mjs && node scripts/check.mjs [--shots DIR]
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { launch } from './chrome.mjs';

const SITE = 'https://cerberostech.github.io/belastingcalculator/', BASE = '/belastingcalculator/';
const PORT = 8000 + Math.floor(Math.random() * 900), ROOT = `http://127.0.0.1:${PORT}${BASE}`;
const shotsDir = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const problems = [], warnings = [];
const sitemap = fs.readFileSync('dist/sitemap.xml', 'utf8');
const pages = [...sitemap.matchAll(/<loc>[^<]*\/belastingcalculator\/([^<]*)<\/loc>/g)].map(m => m[1]);
const langOf = rel => rel.startsWith('en/') ? 'en' : 'nl';
const isGuide = rel => /^(gidsen|en\/guides)\/[^/]+\/$/.test(rel);
const fileOf = rel => path.join('dist', rel.endsWith('/') || rel === '' ? `${rel}index.html` : rel);
const html = Object.fromEntries([...pages, '404.html'].map(rel => [rel, fs.readFileSync(fileOf(rel), 'utf8')]));
const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1];
const ids = h => new Set([...h.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
const unesc = s => s.replace(/&amp;/g, '&');

// ---------- static checks ----------
// Internal links: every href/src under BASE points to a file in dist/, and a #fragment exists on the target page.
for (const [rel, h] of Object.entries(html)) {
  const own = ids(h);
  for (const [, u] of h.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const link = unesc(u);
    if (link.startsWith('#')) { if (link.length > 1 && !own.has(link.slice(1))) problems.push(`${rel || '/'}: link to missing #${link.slice(1)}`); continue; }
    if (!link.startsWith(BASE) && !link.startsWith(SITE)) continue;
    const [p, frag] = link.replace(SITE, BASE).slice(BASE.length).split('#'), target = p.split('?')[0];
    const f = fileOf(target);
    if (!fs.existsSync(f)) { problems.push(`${rel || '/'}: broken link ${link}`); continue; }
    if (frag && f.endsWith('.html') && !ids(html[target] ?? fs.readFileSync(f, 'utf8')).has(frag)) problems.push(`${rel || '/'}: link to missing ${link}`);
  }
}

// hreflang, <html lang>, canonical, counterparts, sitemap alternates, switcher markup
const alternatesOf = h => Object.fromEntries([...h.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map(m => [m[1], m[2]]));
const sitemapAlt = Object.fromEntries([...sitemap.matchAll(/<url><loc>([^<]+)<\/loc>.*?<\/url>/g)].map(m => [m[1], Object.fromEntries([...m[0].matchAll(/<xhtml:link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\/>/g)].map(x => [x[1], x[2]]))]));
const relOf = u => u.startsWith(SITE) ? u.slice(SITE.length) : null;
let untranslated = 0;
for (const rel of pages) {
  const h = html[rel], lang = langOf(rel), other = lang === 'nl' ? 'en' : 'nl', self = SITE + rel, alt = alternatesOf(h), where = rel || '/';
  if (attr(h.match(/<html[^>]*>/)[0], 'lang') !== lang) problems.push(`${where}: <html lang> is not "${lang}"`);
  if (attr(h.match(/<link rel="canonical"[^>]*>/)?.[0] || '', 'href') !== self) problems.push(`${where}: canonical is not ${self}`);
  if (alt[lang] !== self) problems.push(`${where}: no self-referencing hreflang="${lang}"`);
  for (const [l, u] of Object.entries(alt)) if (relOf(u) === null) problems.push(`${where}: hreflang ${l} is not an absolute URL on the site (${u})`);
  if (alt['x-default'] !== (alt.nl ?? alt.en)) problems.push(`${where}: x-default should be the Dutch page (${alt.nl})`);
  // Reciprocal: every alternate page lists the same set.
  for (const [l, u] of Object.entries(alt)) {
    if (l === 'x-default' || u === self) continue;
    const r = relOf(u);
    if (!(r in html)) { problems.push(`${where}: hreflang ${l} points to ${u}, which is not in the sitemap`); continue; }
    if (langOf(r) !== l) problems.push(`${where}: hreflang ${l} points to a ${langOf(r)} page`);
    const back = alternatesOf(html[r]);
    if (JSON.stringify(Object.entries(back).sort()) !== JSON.stringify(Object.entries(alt).sort())) problems.push(`${where}: hreflang not reciprocal with ${r} (${JSON.stringify(back)})`);
  }
  // Counterpart in the other language: required, except for guides that have no translation yet.
  if (!alt[other]) { if (isGuide(rel)) { untranslated++; warnings.push(`${where}: guide has no ${other} translation (no hreflang alternate)`); } else problems.push(`${where}: no ${other} counterpart`); }
  // Sitemap: the same alternates as the page (pages without a counterpart have none in the sitemap).
  const sm = sitemapAlt[self] || {};
  if (Object.keys(alt).length > 2 || Object.keys(sm).length) if (JSON.stringify(Object.entries(sm).sort()) !== JSON.stringify(Object.entries(alt).sort())) problems.push(`${where}: sitemap alternates differ from the page (${JSON.stringify(sm)})`);
  // Switcher: a link to the other language, to the counterpart when there is one.
  const sw = h.match(/<a [^>]*data-lang-switch[^>]*>/)?.[0];
  if (!sw) { problems.push(`${where}: no language switcher`); continue; }
  if (attr(sw, 'hreflang') !== other || attr(sw, 'lang') !== other) problems.push(`${where}: switcher should have hreflang and lang "${other}"`);
  const swAbs = SITE + attr(sw, 'href').slice(BASE.length);
  if (alt[other] && swAbs !== alt[other]) problems.push(`${where}: switcher goes to ${swAbs}, not to the counterpart ${alt[other]}`);
  if (!alt[other] && langOf(relOf(swAbs) ?? '') !== other) problems.push(`${where}: switcher does not go to a ${other} page`);
}
if (!/data-lang-switch/.test(html['404.html'])) problems.push('404.html: no language switcher');

// GoatCounter: every page (404 too) ends with the tag, after the no_onload setting that lets client.js count without the query.
const GC_TAG = '<script data-goatcounter="https://belastingcalculator.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>';
const SOURCES = new Set(Object.values(JSON.parse(fs.readFileSync('data/sources.json', 'utf8'))));
const GC_SETTINGS = '<script>window.goatcounter={no_onload:true}</script>';
for (const [rel, h] of Object.entries(html)) {
  const where = rel || '/';
  if (!h.trimEnd().endsWith(`${GC_TAG}</body></html>`)) problems.push(`${where}: does not end with the GoatCounter tag`);
  if (h.split(GC_TAG).length !== 2) problems.push(`${where}: GoatCounter tag not exactly once`);
  if (!h.includes(`${GC_SETTINGS}\n${GC_TAG}`)) problems.push(`${where}: no GoatCounter no_onload setting before the tag`);
  // Sponsored links: aff-<name>; newsletter links: newsletter-<name>. Both need a title for the GoatCounter dashboard.
  // Source links (data/sources.json, such as the Belastingdienst "Nieuwsbrief Loonheffingen") are not newsletter sign-ups.
  for (const [a, tag, text] of h.matchAll(/(<a\b[^>]*>)([\s\S]*?)<\/a>/g)) {
    const sponsored = /\bsponsored\b/.test(attr(tag, 'rel') || ''), newsletter = /newsletter|nieuwsbrief/i.test(tag + text) && !SOURCES.has(unesc(attr(tag, 'href') || ''));
    if (!sponsored && !newsletter) continue;
    const click = attr(tag, 'data-goatcounter-click'), title = attr(tag, 'data-goatcounter-title'), label = (attr(tag, 'href') || a).slice(0, 60);
    if (!click) { problems.push(`${where}: ${sponsored ? 'sponsored' : 'newsletter'} link without data-goatcounter-click (${label})`); continue; }
    if (sponsored && !/^aff-[a-z0-9-]+$/.test(click)) problems.push(`${where}: sponsored link click name "${click}" is not aff-<name>`);
    if (newsletter && !sponsored && !/^newsletter-[a-z0-9-]+$/.test(click)) problems.push(`${where}: newsletter link click name "${click}" is not newsletter-<name>`);
    if (!title) problems.push(`${where}: link ${click} has no data-goatcounter-title`);
  }
}
// Folds: every one is open in the HTML (no JavaScript, wide screens, search engines) and starts with its summary.
const escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inFold = (h, at) => { const open = h.lastIndexOf('<details', at); return open >= 0 && /^<details class="fold[^"]*" data-fold open><summary\b/.test(h.slice(open)) && h.lastIndexOf('</details>', at) < open; };
for (const [rel, h] of Object.entries(html)) {
  const where = rel || '/';
  for (const [tag] of h.matchAll(/<details\b[^>]*\bdata-fold\b[^>]*>(?!<summary)/g)) problems.push(`${where}: fold without a summary right after ${tag}`);
  for (const [tag] of h.matchAll(/<details\b[^>]*\bdata-fold\b[^>]*>/g)) if (!/\sopen[\s>]/.test(tag)) problems.push(`${where}: fold not open in the HTML: ${tag}`);
  // Long parts of a calculator page (and of the home page) are in a fold.
  if (/<form [^>]*data-main/.test(h)) {
    const parts = { 'the calculation': /data-body/, 'the compare section': /class="cmp-grid/, 'the per-period table': /data-table/, 'the other allowances': /<h2 id="ot-h">/ };
    if (!/class="hero hero-home"/.test(h)) Object.assign(parts, { '"how it works"': /<h2 id="how-h">/, 'the FAQ': /<h2 id="faq-h">/ });
    else Object.assign(parts, { 'the guide list': /<ul class="guides cards">/, 'the trust text': /<h2 id="trust-h">/ });
    for (const [name, re] of Object.entries(parts)) { const m = h.match(re); if (m && !inFold(h, m.index)) problems.push(`${where}: ${name} is not in a fold`); else if (!m && !/per-period|allowances/.test(name)) problems.push(`${where}: ${name} is missing`); }
    if (/netto/.test(h.match(/<form [^>]*data-calc="(\w+)"/)?.[1] || '') && !/data-table/.test(h)) problems.push(`${where}: no per-period table`);
  }
  // JSON-LD parses; every FAQ question and answer is in the FAQ section of the HTML (collapsed, not removed).
  for (const [, json] of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let ld; try { ld = JSON.parse(json); } catch (e) { problems.push(`${where}: JSON-LD does not parse (${e.message})`); continue; }
    for (const faq of (ld['@graph'] || [ld]).filter(x => x['@type'] === 'FAQPage')) {
      const sec = h.match(/<section class="faq"[\s\S]*?<\/section>/)?.[0] || '';
      if (!sec || !inFold(h, h.indexOf('<h2 id="faq-h">'))) problems.push(`${where}: FAQPage in JSON-LD, but no FAQ section in a fold`);
      for (const q of faq.mainEntity) if (!sec.includes(`<h3>${escHtml(q.name)}</h3>`) || !sec.includes(`<p>${escHtml(q.acceptedAnswer.text)}</p>`)) problems.push(`${where}: FAQ "${q.name.slice(0, 40)}" from the JSON-LD is not in the HTML`);
    }
  }
}

const count = l => pages.filter(p => langOf(p) === l).length;
if (Math.abs(count('nl') - count('en')) > untranslated) problems.push(`page count: ${count('nl')} nl and ${count('en')} en`);

// ---------- browser checks ----------
// Dutch UI text that must not appear on English pages (outside elements marked lang="nl"). Simple heuristic list.
const DUTCH_UI = ['Bijgewerkt', 'Naar de inhoud', 'Jouw gegevens', 'Uitkomst', 'Kopieer link', 'Link gekopieerd', 'Bronnen:', 'Zie ook', 'Veelgestelde vragen',
  'Andere calculators', 'Hoe werkt dit', 'Alle gidsen', 'Alle calculators', 'Voorbeeld:', 'Indicatieve berekening', 'geen belastingadvies', 'Controleer altijd',
  'Bekijk de hele berekening', 'Netto per maand', 'Netto per jaar', 'Brutoloon', 'Bedrag per', 'Wat wil je berekenen', 'Ik heb ', 'Ik ben ', 'Ik krijg', 'Ik werk',
  'Zet apart', 'Vul een', 'Het maximum is', 'Bedragen per jaar', 'Belasting box', 'Totaal apart zetten', 'Reken het zelf uit', 'Over deze site', 'Methode en bronnen',
  'Privacyverklaring', 'Advertentie', 'Maak de officiële proefberekening', 'Zakelijke rekening', 'Boekhoudprogramma', 'Gemiddeld betaal je', 'Dat is ', 'Lees ', 'Bron:'];
// Common Dutch words; a page with many of them (outside lang="nl") is probably not translated.
const DUTCH_WORDS = new Set(['het', 'een', 'je', 'jouw', 'niet', 'voor', 'wordt', 'ook', 'bij', 'naar', 'geen', 'deze', 'wij', 'onze', 'zijn', 'maar', 'dan', 'kun', 'hebt', 'jij', 'wat', 'hoe', 'uw', 'heeft', 'worden', 'alleen', 'nog', 'dat', 'van', 'met', 'als', 'ik', 'krijg', 'betaal', 'houd']);
const visibleEnglishText = `(() => { const c = document.body.cloneNode(true); c.querySelectorAll('[lang]:not([lang="en"]), script, style, [hidden], .vh, noscript').forEach(e => e.remove()); return c.innerText + ' ' + [...c.querySelectorAll('input[value]')].map(i => i.value).join(' '); })()`;
function dutchLeft(where, text) {
  const hits = DUTCH_UI.filter(s => text.includes(s));
  if (hits.length) problems.push(`${where}: Dutch UI text on an English page: ${hits.map(s => JSON.stringify(s)).join(', ')}`);
  const words = text.toLowerCase().match(/[a-zà-ÿ]+/g) || [], nl = words.filter(w => DUTCH_WORDS.has(w));
  if (nl.length > 12 && nl.length / words.length > 0.02) problems.push(`${where}: many Dutch words (${nl.length} of ${words.length}): ${[...new Set(nl)].slice(0, 12).join(', ')}`);
}

// count.js: the real file when we can fetch it (localhost filter off, so it counts on 127.0.0.1), else a stub with the same API.
const GC_STUB = `(function(){var g=window.goatcounter=window.goatcounter||{};
g.get_data=function(v){v=v||{};return{p:v.path===undefined?location.pathname+location.search:v.path,r:v.referrer===undefined?document.referrer:v.referrer,t:v.title===undefined?document.title:v.title,e:!!v.event,q:location.search}};
g.count=function(v){var d=g.get_data(v),q=[];for(var k in d)if(d[k]!==''&&d[k]!==false&&d[k]!=null)q.push(k+'='+encodeURIComponent(d[k]));navigator.sendBeacon('https://belastingcalculator.goatcounter.com/count?'+q.join('&'))};
g.bind_events=function(){document.querySelectorAll('[data-goatcounter-click]').forEach(function(e){var f=function(){g.count({event:true,path:e.dataset.goatcounterClick,title:e.dataset.goatcounterTitle,referrer:''})};e.addEventListener('click',f);e.addEventListener('auxclick',f)})};
if(!g.no_onload)g.count()})();`;
let COUNT_JS = GC_STUB;
try {
  const real = await (await fetch('https://gc.zgo.at/count.js', { signal: AbortSignal.timeout(5000) })).text();
  const local = real.replace('location.hostname.match(', 'false && location.hostname.match(');
  if (local !== real && /get_data/.test(real)) COUNT_JS = local; else warnings.push('GoatCounter: count.js changed shape; used the stub');
} catch { warnings.push('GoatCounter: could not fetch count.js; used the stub'); }
// Every tab answers count.js itself and records the hits (URL params of each request to the count endpoint).
const withGoat = async tab => {
  tab.gc = [];
  await tab.intercept(['*://gc.zgo.at/*', '*://belastingcalculator.goatcounter.com/*'], req => {
    if (req.url.includes('gc.zgo.at')) return { type: 'text/javascript', body: COUNT_JS };
    tab.gc.push(Object.fromEntries(new URL(req.url).searchParams)); return { body: '' };
  });
  return tab;
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (f, ms = 2000) => { for (const end = Date.now() + ms; Date.now() < end && !f(); ) await sleep(25); return f(); };
// A hit must not carry the query string anywhere: not as q, not in the path, not in the referrer.
const leaks = hit => ['q', 'p', 'r'].filter(k => k === 'q' ? hit.q != null : /[?#]/.test(hit[k] || ''));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bc-serve-'));
fs.symlinkSync(path.resolve('dist'), path.join(tmp, 'belastingcalculator'));
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: tmp, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const browserPages = [...pages, '404.html']; // the python server answers a plain 404 for unknown paths, so load 404.html directly
const b = await launch();
try {
  for (const [w, h, mobile] of [[360, 740, true], [1280, 900, false]]) {
    const tab = await withGoat(await b.open(w, h, { mobile }));
    for (const p of browserPages) {
      tab.errors.length = 0; tab.gc.length = 0;
      await tab.goto(ROOT + p);
      if (w === 1280) {
        // GoatCounter: one page view, with the path of this page.
        await waitFor(() => tab.gc.length > 0); await sleep(150);
        const views = tab.gc.filter(x => !x.e);
        if (views.length !== 1) problems.push(`${p || '/'}: GoatCounter counted ${views.length} page views (expected 1)`);
        else if (views[0].p !== BASE + p) problems.push(`${p || '/'}: GoatCounter path is ${views[0].p}, not ${BASE + p}`);
      }
      // No layout shift on load (the folds close before the first paint).
      const cls = await tab.eval(`new Promise(r => { let s = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) s += e.value; }).observe({ type: 'layout-shift', buffered: true }); setTimeout(() => r(s), 120); })`);
      if (cls > 0.001) problems.push(`${w}px ${p || '/'}: layout shift on load (CLS ${cls.toFixed(4)})`);
      const folds = await tab.eval(`[...document.querySelectorAll('details[data-fold]')].map(d => d.open)`);
      if (mobile && folds.some(Boolean)) problems.push(`${w}px ${p || '/'}: ${folds.filter(Boolean).length} of ${folds.length} folds open on load (expected closed)`);
      if (!mobile && !folds.every(Boolean)) problems.push(`${w}px ${p || '/'}: ${folds.filter(x => !x).length} of ${folds.length} folds closed (expected open)`);
      if (mobile && await tab.eval(`!!document.querySelector('form[data-main]')`)) {
        const gap = await tab.eval(`(() => { const f = document.querySelector('form[data-main]'), r = document.getElementById(f.dataset.out); return f.nextElementSibling === r ? Math.round(r.getBoundingClientRect().top - f.getBoundingClientRect().bottom) : null; })()`);
        if (gap === null || Math.abs(gap) > 1) problems.push(`${w}px ${p || '/'}: the result card is not directly under the form (gap ${gap})`);
      }
      // Overflow and tap targets with every fold open, so collapsed content is checked too.
      await tab.eval(`document.querySelectorAll('details[data-fold]').forEach(d => d.open = true)`);
      const overflow = await tab.eval('document.documentElement.scrollWidth - window.innerWidth');
      if (overflow > 0) problems.push(`${w}px ${p}: horizontal overflow ${overflow}px`);
      const small = await tab.eval(`[...document.querySelectorAll('main a, main button, main input, main select, .site-nav a, .lang a${mobile ? ', main summary, .site-foot summary' : ''}')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && e.offsetParent && !e.closest('p, li:not(.calc-index li):not(.aff-list li), td, th, .help, .r-sub, .rnote') && (r.height < 44 || (e.closest('.lang') && r.width < 44)) && e.type !== 'radio' && e.type !== 'checkbox'; }).map(e => (e.id || e.textContent.trim().slice(0, 30)) + ':' + Math.round(e.getBoundingClientRect().height))`);
      if (small.length) problems.push(`${w}px ${p}: small tap targets ${small.join(', ')}`);
      if (!(await tab.eval(`(() => { const a = document.querySelector('a[data-lang-switch]'); if (!a) return false; const r = a.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(a).visibility !== 'hidden'; })()`))) problems.push(`${w}px ${p}: language switcher not visible`);
      if (langOf(p) === 'en' && p !== '404.html' && w === 1280) dutchLeft(p, await tab.eval(visibleEnglishText));
      if (tab.errors.length) problems.push(`${w}px ${p}: ${tab.errors.join(' | ')}`);
      if (shotsDir) { fs.mkdirSync(shotsDir, { recursive: true }); fs.writeFileSync(path.join(shotsDir, `${w}-${(p || 'home').replace(/\W+/g, '_')}.png`), await tab.shot({ fullPage: true })); }
    }
    await tab.close();
  }

  // Behaviour, in both languages: typing changes the result and the URL; a shared URL restores the inputs;
  // the official box 3 example; an error message for wrong input; the switcher keeps the query string.
  const tab = await withGoat(await b.open(1280, 900));
  const type = (sel, value) => tab.eval(`(() => { const i = document.querySelector('${sel}'); i.value = '${value}'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  const LANG = {
    nl: { netto: 'netto-salaris-berekenen/', box3: 'box-3-berekenen/', zzp: 'zzp-belasting-berekenen/', ib: 'inkomstenbelasting-berekenen/', need: /Benodigd/, b3: '€ 4.667', err: /Vul een bedrag/, typed: '5000', shown: '3.000' },
    en: { netto: 'en/net-salary-calculator/', box3: 'en/box-3-calculator/', zzp: 'en/freelancer-tax-calculator/', ib: 'en/income-tax-calculator/', need: /Gross salary needed/, b3: '€4,667', err: /Enter an amount/, typed: '5,000', shown: '3,000' },
  };
  for (const [lang, T] of Object.entries(LANG)) {
    const other = LANG[lang === 'nl' ? 'en' : 'nl'];
    await tab.goto(ROOT + T.netto);
    const before = await tab.eval(`document.querySelector('.r-value').textContent`);
    await type('#netto-bruto', T.typed);
    await sleep(400);
    const after = await tab.eval(`document.querySelector('.r-value').textContent`), q = await tab.eval('location.search');
    if (before === after) problems.push(`${lang} netto: result did not change after input`);
    if (!q.includes('bruto=5000')) problems.push(`${lang} netto: query not updated (${q})`);
    if (!(await tab.eval(`!document.querySelector('[data-copy]').hidden`))) problems.push(`${lang} netto: copy button hidden`);
    const sw = await tab.eval(`document.querySelector('a[data-lang-switch]').getAttribute('href')`);
    if (sw !== `${BASE}${other.netto}${q}`) problems.push(`${lang} netto: switcher does not keep the query (${sw})`);
    // Follow the switcher: the other language opens with the same inputs.
    await tab.goto(ROOT + sw.slice(BASE.length));
    const carried = await tab.eval(`[document.documentElement.lang, document.querySelector('#netto-bruto').value]`);
    if (carried[1] !== (lang === 'nl' ? '5,000' : '5.000')) problems.push(`${lang} → switcher: inputs not carried over ${JSON.stringify(carried)}`);
    await tab.goto(ROOT + T.netto + '?modus=netto&periode=maand&netto=3000&pensioen=0&aow=0');
    const restored = await tab.eval(`[document.querySelector('#netto-netto').value, document.querySelector('[data-field=bruto]').hidden, document.querySelector('.r-label').textContent]`);
    if (restored[0] !== T.shown || !restored[1] || !T.need.test(restored[2])) problems.push(`${lang} netto: query not restored ${JSON.stringify(restored)}`);
    // Redesign v2: slider, period switch, scenario A/B (also from a shared link), result actions, theme toggle, home calculator.
    await tab.goto(ROOT + T.netto);
    await tab.eval(`(() => { const s = document.querySelector('input[data-range-for=bruto]'); s.value = 6000; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await sleep(150);
    const slid = await tab.eval(`[document.querySelector('#netto-bruto').value, location.search]`);
    if (slid[0] !== (lang === 'nl' ? '6.000' : '6,000') || !slid[1].includes('bruto=6000')) problems.push(`${lang} netto: slider does not set the amount ${JSON.stringify(slid)}`);
    await tab.eval(`(() => { const r = document.querySelector('#netto-periode-jaar'); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await sleep(100);
    const yearly = await tab.eval(`document.querySelector('#netto-bruto').value`);
    if (yearly !== (lang === 'nl' ? '72.000' : '72,000')) problems.push(`${lang} netto: month → year did not convert the amount (${yearly})`);
    // A shared link in year mode: switching to month converts from the year amount.
    await tab.goto(ROOT + T.netto + '?modus=bruto&periode=jaar&bruto=48000');
    await tab.eval(`(() => { const r = document.querySelector('#netto-periode-maand'); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await sleep(100);
    const monthly = await tab.eval(`document.querySelector('#netto-bruto').value`);
    if (monthly !== (lang === 'nl' ? '4.000' : '4,000')) problems.push(`${lang} netto: shared year link → month did not convert the amount (${monthly})`);
    await tab.goto(ROOT + T.netto);
    await tab.eval(`(() => { const r = document.querySelector('#netto-periode-jaar'); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await sleep(100);
    await tab.eval(`document.querySelector('[data-pin]').click()`);
    await type('#netto-bruto', '90000');
    await sleep(400);
    const scnRows = await tab.eval(`document.querySelectorAll('[data-scn] tbody tr').length`), scnQ = await tab.eval('location.search');
    if (scnRows < 5 || !scnQ.includes('&vs=')) problems.push(`${lang} netto: scenario A/B table or query missing (${scnRows} rows, ${scnQ})`);
    await tab.goto(ROOT + T.netto + scnQ);
    if ((await tab.eval(`document.querySelectorAll('[data-scn] tbody tr').length`)) !== scnRows) problems.push(`${lang} netto: scenario A not restored from a shared link`);
    if (!(await tab.eval(`['[data-copy-text]', '[data-print]', '[data-pin]', '[data-theme-toggle]'].every(s => { const e = document.querySelector(s); return e && !e.hidden; })`))) problems.push(`${lang} netto: copy result, print, scenario or theme button hidden`);
    const themed = await tab.eval(`(() => { const b = document.querySelector('[data-theme-toggle]'), a = b.getAttribute('aria-pressed'); b.click(); const r = [a, b.getAttribute('aria-pressed'), document.documentElement.dataset.theme]; localStorage.removeItem('theme'); delete document.documentElement.dataset.theme; return r; })()`);
    if (themed[0] === themed[1] || !themed[2]) problems.push(`${lang}: theme toggle does not switch ${JSON.stringify(themed)}`);
    await tab.goto(ROOT + (lang === 'nl' ? '' : 'en/'));
    if (!(await tab.eval(`!!document.querySelector('.hero ~ .calc-band form[data-calc=netto] #netto-bruto')`))) problems.push(`${lang} home: no net salary calculator under the hero`);
    await tab.goto(ROOT + T.box3 + '?bank=150000&overig=275000&schulden=100000&groen=0&partner=0&tegen=0');
    const b3 = await tab.eval(`document.querySelector('.r-value').textContent`);
    if (b3.replace(/\s/g, ' ') !== T.b3.replace(/\s/g, ' ')) problems.push(`${lang} box3 official example: got ${b3}`);
    await tab.goto(ROOT + T.zzp);
    await type('#zzp-winst', 'abc');
    await sleep(400);
    const err = await tab.eval(`document.querySelector('#zzp-winst-e').textContent`);
    if (!T.err.test(err)) problems.push(`${lang} zzp: no error message for invalid input (${JSON.stringify(err)})`);
    // GoatCounter with amounts in the query: a click on a sponsored link is an event (aff-<name>), and the next page view
    // (with this calculator as referrer) carries no query either.
    await tab.goto(ROOT + T.zzp + '?winst=61234&uren=1&starter=1&loon=0&aow=0&bruto=0');
    await waitFor(() => tab.gc.length > 0);
    tab.gc.length = 0;
    const clicked = await tab.eval(`(() => { const a = document.querySelector('a[rel~="sponsored"]'); if (!a) return null; addEventListener('click', e => e.preventDefault(), { once: true }); a.click(); return a.dataset.goatcounterClick; })()`);
    if (!clicked) problems.push(`${lang} zzp: no sponsored link to click`);
    else {
      await waitFor(() => tab.gc.some(x => x.e));
      const ev = tab.gc.find(x => x.e);
      if (!ev) problems.push(`${lang} zzp: click on ${clicked} not counted by GoatCounter`);
      else if (ev.p !== clicked || !/^Affiliate: /.test(ev.t || '')) problems.push(`${lang} zzp: GoatCounter click event ${JSON.stringify(ev)}`);
    }
    await tab.eval(`location.href = document.querySelector('.site-nav a').href`);
    await waitFor(() => tab.gc.some(x => !x.e));
    const next = tab.gc.find(x => !x.e);
    if (!next) problems.push(`${lang}: no GoatCounter page view after leaving the zzp calculator`);
    else if (!next.r || !next.r.includes(T.zzp)) problems.push(`${lang}: GoatCounter referrer should be the zzp calculator (${next.r})`);
    for (const hit of tab.gc) if (leaks(hit).length) problems.push(`${lang}: GoatCounter got the query string in ${leaks(hit).join(', ')}: ${JSON.stringify(hit)}`);
    if (lang === 'en') {
      // Every branch of the English results: turn on all options and look for Dutch text again.
      await tab.goto(ROOT + T.zzp + '?winst=60000&uren=0&loon=20000&aow=1&bruto=50000');
      dutchLeft('en zzp (all options)', await tab.eval(visibleEnglishText));
      await tab.goto(ROOT + T.ib + '?loon=50000&winst=20000&uren=1&overig=1000&aftrek=2000&box2=10000&box3=3000&kind=1&aow=aow&alleen=1');
      dutchLeft('en income tax (all options)', await tab.eval(visibleEnglishText));
      await tab.goto(ROOT + T.box3 + '?bank=200000&overig=100000&groen=80000&schulden=30000&partner=1&aandeel=60&tegen=1&werkelijk=500');
      dutchLeft('en box 3 (all options)', await tab.eval(visibleEnglishText));
      await tab.goto(ROOT + T.netto + '?modus=bruto&periode=jaar&bruto=60000&vakantiegeld=1&dertiende=1&pensioen=5&aow=0');
      dutchLeft('en net salary (all options)', await tab.eval(visibleEnglishText));
    }
  }
  if (tab.errors.length) problems.push(`behaviour: ${tab.errors.join(' | ')}`);
  // Wide screen: folds do not toggle and are no tab stop; the result bar never shows.
  await tab.goto(ROOT + LANG.nl.netto);
  const wide = await tab.eval(`(() => { const s = document.querySelector('details[data-fold] > summary'); s.click(); return [s.parentElement.open, s.tabIndex]; })()`);
  if (!wide[0] || wide[1] !== -1) problems.push(`1280px: a fold toggles or is a tab stop on a wide screen ${JSON.stringify(wide)}`);
  await type('#netto-bruto', '5000'); await sleep(400);
  if (await tab.eval(`(() => { const b = document.querySelector('.peek'); return !!b && getComputedStyle(b).display !== 'none'; })()`)) problems.push('1280px: the result bar shows on a wide screen');
  await tab.close();

  // Small screen (390 px): page heights, folds, and the result bar.
  const m = await withGoat(await b.open(390, 844, { mobile: true }));
  const heights = [];
  for (const p of ['', 'en/']) { await m.goto(ROOT + p); heights.push(`${p ? '/en/' : '/'} ${await m.eval('document.documentElement.scrollHeight')} px`); }
  console.log(`mobile page height at 390 px: ${heights.join(', ')}`);
  for (const hgt of heights) if (parseInt(hgt.split(' ')[1]) > 6500) problems.push(`390px: home page too long (${hgt}; the budget is 6500 px)`);
  const mtype = (sel, value) => m.eval(`(() => { const i = document.querySelector('${sel}'); i.focus({ preventScroll: true }); i.value = '${value}'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  const barState = `(() => { const b = document.querySelector('.peek'); if (!b) return null; const r = b.getBoundingClientRect(); return { shown: !b.hidden && getComputedStyle(b).display !== 'none', v: b.querySelector('.peek-v').textContent, name: b.textContent, top: r.top, bottom: r.bottom, left: r.left, right: r.right, head: document.querySelector('.r-value').textContent, pad: parseFloat(getComputedStyle(document.documentElement).scrollPaddingBottom) || 0 }; })()`;
  // Scroll so that the top of the result card is at innerHeight - y.
  const outAt = y => m.eval(`(() => { const o = document.querySelector('.result'); scrollTo(0, o.getBoundingClientRect().top + scrollY - innerHeight + ${y}); return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 60)))); })()`);
  for (const [lang, T] of Object.entries(LANG)) {
    await m.goto(ROOT + (lang === 'nl' ? '' : 'en/'));
    await m.eval(`document.querySelector('form[data-main]').scrollIntoView()`); await sleep(150);
    let s = await m.eval(barState);
    if (!s) { problems.push(`${lang} 390px: no result bar`); continue; }
    if (s.shown) problems.push(`${lang} 390px: the result bar shows before any input`);
    await mtype('#netto-bruto', '5000'); await sleep(500);
    s = await m.eval(barState);
    if (!s.shown) problems.push(`${lang} 390px: the result bar does not show while editing the form`);
    else {
      if (s.v !== s.head) problems.push(`${lang} 390px: the result bar shows ${s.v}, the result is ${s.head}`);
      if (s.bottom > 844 || s.top < 844 - 120 || s.left < 0 || s.right > 390) problems.push(`${lang} 390px: the result bar is not at the bottom of the screen ${JSON.stringify(s)}`);
      if (s.bottom - s.top < 44) problems.push(`${lang} 390px: the result bar is lower than 44 px`);
      if (s.pad < s.bottom - s.top) problems.push(`${lang} 390px: no scroll padding for the result bar (${s.pad}px)`);
      if (!s.name.includes(s.v) || !/naar de uitkomst|go to the result/.test(s.name)) problems.push(`${lang} 390px: the result bar has no clear name (${s.name})`);
    }
    await mtype('#netto-bruto', '6000'); await sleep(500);
    s = await m.eval(barState);
    if (s.v !== s.head) problems.push(`${lang} 390px: the result bar did not follow the input (${s.v}, result ${s.head})`);
    // The last field can scroll clear of the bar; once the result card is in view, the bar goes away.
    await outAt(80);
    const clear = await m.eval(`(() => { const f = [...document.querySelectorAll('form[data-main] .field')].filter(e => e.offsetParent).at(-1).getBoundingClientRect(), b = document.querySelector('.peek'); return b.hidden || f.bottom <= b.getBoundingClientRect().top; })()`);
    if (!clear) problems.push(`${lang} 390px: the result bar covers the last field of the form`);
    await outAt(220);
    if ((await m.eval(barState)).shown) problems.push(`${lang} 390px: the result bar shows while the result card is visible`);
    // A tap on the bar scrolls to the result and moves the focus there; the URL keeps no #fragment.
    await m.eval(`document.querySelector('form[data-main]').scrollIntoView()`); await sleep(200);
    await m.eval(`document.querySelector('.peek').click()`); await sleep(1200);
    const tapped = await m.eval(`(() => { const o = document.querySelector('.result'), t = o.getBoundingClientRect().top; return { t: Math.round(t), hash: location.hash, focus: o.contains(document.activeElement), shown: !document.querySelector('.peek').hidden }; })()`);
    if (tapped.t < 0 || tapped.t > 200 || tapped.hash || !tapped.focus || tapped.shown) problems.push(`${lang} 390px: tap on the result bar ${JSON.stringify(tapped)}`);
    // Folds: a tap opens one; a link to an anchor inside a fold opens it; printing opens all and closes them again.
    const tog = await m.eval(`(() => { const d = document.querySelector('.cmp details[data-fold]'), a = d.open; d.querySelector('summary').click(); return [a, d.open]; })()`);
    if (tog[0] || !tog[1]) problems.push(`${lang} 390px: a tap does not open a fold ${JSON.stringify(tog)}`);
    await m.goto(ROOT + T.zzp + '#faq-h');
    if (!(await m.eval(`document.getElementById('faq-h').closest('details').open`))) problems.push(`${lang} 390px: a link to #faq-h does not open the FAQ`);
    const printed = await m.eval(`(() => { const all = () => [...document.querySelectorAll('details[data-fold]')]; dispatchEvent(new Event('beforeprint')); const a = all().every(d => d.open); dispatchEvent(new Event('afterprint')); return [a, all().filter(d => d.open).length]; })()`);
    if (!printed[0] || printed[1] !== 1) problems.push(`${lang} 390px: print does not open the folds, or does not close them after ${JSON.stringify(printed)}`);
  }
  if (m.errors.length) problems.push(`390px behaviour: ${m.errors.join(' | ')}`);
  await m.close();
} finally { await b.close(); server.kill(); fs.rmSync(tmp, { recursive: true, force: true }); }

console.log(`checked ${browserPages.length} pages (${count('nl')} nl, ${count('en')} en, 404) at 360 and 1280 px, plus links, hreflang and the sitemap`);
if (warnings.length) console.log(`warnings:\n${warnings.join('\n')}`);
if (problems.length) { console.log(`problems:\n${problems.join('\n')}`); process.exit(1); }
console.log('no problems found');
