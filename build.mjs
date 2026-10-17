// Belastingcalculator static site builder. No dependencies (Node >= 20). Output: dist/
// Numbers come from data/params-2026.json, logic from engine/tax.mjs, calculators from site/calcs.mjs.
// Page copy lives in site/copy-nl.mjs and site/copy-en.mjs (same shape). Dutch is at the root, English under /en/.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { createEngine } from './engine/tax.mjs';
import { createCalcs } from './site/calcs.mjs';
import copyNl from './site/copy-nl.mjs';
import copyEn from './site/copy-en.mjs';

const SITE = 'https://cerberostech.github.io/belastingcalculator';
const BASE = '/belastingcalculator';
const BRAND = 'Belastingcalculator';
const UPDATED = '2026-10-17'; // shown as "Bijgewerkt" / "Updated" on every page and used as lastmod
const OUT = 'dist';
// Analytics: GoatCounter (cookieless, no personal data; see the privacy page). The tag ends every page, the 404 too.
// no_onload: client.js counts the page itself, without the query string (it holds the amounts a visitor typed).
const GOATCOUNTER = '<script data-goatcounter="https://belastingcalculator.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>';
const ANALYTICS = `<script>window.goatcounter={no_onload:true}</script>\n${GOATCOUNTER}`;

// Languages. x-default (for hreflang) points to the Dutch page.
const LANGS = ['nl', 'en'];
const LOCALE = {
  nl: { og: 'nl_NL', ld: 'nl-NL', date: 'nl-NL', name: 'Nederlands', code: 'NL' },
  en: { og: 'en_GB', ld: 'en', date: 'en-GB', name: 'English', code: 'EN' },
};
const other = lang => lang === 'nl' ? 'en' : 'nl';

// All URLs in one place (relative to BASE, with trailing slash), one Dutch and one English slug per page.
// Rename here; links, canonicals, hreflang, the language switcher and the sitemap follow.
const ROUTES = {
  home:         { nl: '',                              en: 'en/' },
  netto:        { nl: 'netto-salaris-berekenen/',      en: 'en/net-salary-calculator/' },
  ib:           { nl: 'inkomstenbelasting-berekenen/', en: 'en/income-tax-calculator/' },
  zzp:          { nl: 'zzp-belasting-berekenen/',      en: 'en/freelancer-tax-calculator/' },
  box3:         { nl: 'box-3-berekenen/',              en: 'en/box-3-calculator/' },
  vakantiegeld: { nl: 'vakantiegeld-berekenen/',       en: 'en/holiday-allowance-calculator/' },
  expat:        { nl: '30-procent-regeling-berekenen/', en: 'en/30-ruling-calculator/' },
  zorgtoeslag:  { nl: 'zorgtoeslag-berekenen/',        en: 'en/healthcare-allowance-calculator/' },
  gidsen:       { nl: 'gidsen/',                       en: 'en/guides/' },
  methode:      { nl: 'methode-en-bronnen/',           en: 'en/methodology-and-sources/' },
  privacy:      { nl: 'privacy/',                      en: 'en/privacy/' },
  affiliate:    { nl: 'affiliate-disclosure/',         en: 'en/affiliate-disclosure/' },
  over:         { nl: 'over/',                         en: 'en/about/' },
};
// Guides: every .md file in these folders becomes a page. A guide's "translationOf" (or the same slug) pairs it with the other language.
const GUIDE_DIRS = { nl: 'content/gidsen', en: 'content/guides-en' };
// Affiliate slots. Swap a url for the tracking URL when a programme is approved; nothing else has to change.
// Order is alphabetical on purpose: no ranking, no "beste" claims. Clicks are counted in GoatCounter as aff-<name> (see track()).
const AFFILIATE = {
  boekhouden: [
    { name: 'Jortt', url: 'https://www.jortt.nl/', what: { nl: 'Online boekhoudprogramma voor zzp\'ers en kleine ondernemers.', en: 'Online bookkeeping software for freelancers and small businesses.' } },
    { name: 'Moneybird', url: 'https://www.moneybird.nl/', what: { nl: 'Online boekhouden, facturen en btw-aangifte.', en: 'Online bookkeeping, invoices and VAT returns.' } },
    { name: 'Rompslomp', url: 'https://www.rompslomp.nl/', what: { nl: 'Online boekhoudprogramma met facturen en urenregistratie.', en: 'Online bookkeeping software with invoices and time tracking.' } },
    { name: 'SnelStart', url: 'https://www.snelstart.nl/', what: { nl: 'Boekhoudsoftware voor ondernemers en boekhouders.', en: 'Bookkeeping software for business owners and accountants.' } },
  ],
  bank: [
    { name: 'Knab', url: 'https://www.knab.nl/zakelijk', what: { nl: 'Zakelijke rekening voor zzp\'ers en ondernemers.', en: 'Business bank account for freelancers and business owners.' } },
  ],
};
const OFFICIAL = {
  proef: 'https://www.belastingdienst.nl/wps/wcm/connect/nl/toeslagen/content/hulpmiddel-proefberekening-toeslagen',
  contact: 'https://github.com/cerberostech/belastingcalculator/issues',
  ghPrivacy: 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement',
  goatcounter: 'https://www.goatcounter.com/',
  gcPrivacy: 'https://www.goatcounter.com/help/privacy',
};

// Routes must be unique per language, and the two languages must not overlap.
{ const seen = new Map();
  for (const [k, r] of Object.entries(ROUTES)) for (const lang of LANGS) {
    if (r[lang] == null) throw new Error(`ROUTES.${k}: no ${lang} slug`);
    if (seen.has(r[lang])) throw new Error(`ROUTES: "${r[lang]}" is used by ${seen.get(r[lang])} and ${k}.${lang}`);
    seen.set(r[lang], `${k}.${lang}`);
  } }

const P = JSON.parse(fs.readFileSync('data/params-2026.json', 'utf8'));
const S = JSON.parse(fs.readFileSync('data/sources.json', 'utf8'));
const E = createEngine(P);
const url = (key, lang) => `${BASE}/${ROUTES[key][lang]}`;
const abs = rel => `${SITE}/${rel}`;
const altOf = key => ({ nl: ROUTES[key].nl, en: ROUTES[key].en }); // rels of one page in both languages
const L = Object.fromEntries(LANGS.map(lang => [lang, { ...Object.fromEntries(Object.keys(ROUTES).map(k => [k, url(k, lang)])), proef: OFFICIAL.proef }]));
const K = Object.fromEntries(LANGS.map(lang => [lang, createCalcs(E, P, S, L[lang], lang)]));
const { esc } = K.nl;

// ---------- text helpers ----------
const slug = s => String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
const squash = s => String(s).replace(/[^\S ]+/g, ' ').trim();
const clip = (s, max) => { s = squash(s); if (s.length <= max) return s; const cut = s.slice(0, max - 1), at = cut.lastIndexOf(' '); return (at > max / 2 ? cut.slice(0, at) : cut).replace(/[\s,.;:/(+–-]+$/, '') + '…'; };
const fit = (max, ...options) => options.map(squash).find(o => o.length <= max) ?? clip(options.at(-1), max);
const longDate = (iso, lang) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(LOCALE[lang].date, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const jsonLd = data => `\n<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
const tbl = (headCells, rows, cls = 'params') => `<div class="table-wrap"><table class="${cls}"><thead><tr>${headCells.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => i ? `<td>${c}</td>` : `<th scope="row">${c}</th>`).join('')}</tr>`).join('')}</tbody></table></div>`;

// ---------- page copy (site/copy-*.mjs) ----------
// Example results for the copy (computed, never typed by hand)
const ex = {
  n3000: E.nettoSalaris({ brutoMaand: 3000 }), n4000: E.nettoSalaris({ brutoMaand: 4000 }),
  z: [30000, 50000, 80000].map(w => [w, E.zzp({ winst: w })]),
  vg: E.vakantiegeld({ brutoMaand: 3500 }),
};
const zGrens = tab => { let g = 0; for (const [upTo, amt] of tab) if (amt > 0) g = upTo; return g; };
const COPY = {};
const srcName = (id, lang) => COPY[lang].sourceNames[id] || id;
const srcLink = (id, lang) => `<a href="${esc(S[id])}" rel="noopener"${lang === 'en' ? ' hreflang="nl"' : ''}>${esc(srcName(id, lang))}</a>`;
const ctx = lang => ({
  lang, P, S, E, ex, zGrens, BRAND, OFFICIAL, AFFILIATE, tbl,
  esc, eur: K[lang].eur, pct: K[lang].pct, num: K[lang].num, dec: K[lang].dec,
  url: key => url(key, lang), longDate: iso => longDate(iso, lang), UPDATED,
  srcLink: id => srcLink(id, lang), srcName: id => srcName(id, lang),
});
COPY.nl = copyNl(ctx('nl'));
COPY.en = copyEn(ctx('en'));
// Both copy files must have the same shape (same keys, same calculators, a FAQ and a method text for each).
{ const shape = (o, p = '') => Object.entries(o).flatMap(([k, v]) => v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof RegExp) ? shape(v, `${p}${k}.`) : [`${p}${k}`]).sort();
  const a = shape(COPY.nl), b = new Set(shape(COPY.en));
  const miss = [...a.filter(k => !b.has(k)).map(k => `en lacks ${k}`), ...[...b].filter(k => !a.includes(k)).map(k => `nl lacks ${k}`)];
  if (miss.length) throw new Error(`copy files differ:\n${miss.join('\n')}`);
  for (const lang of LANGS) for (const c of COPY[lang].calcs) if (!COPY[lang].faq[c.key] || !COPY[lang].how[c.key] || !ROUTES[c.key]) throw new Error(`copy-${lang}: calculator "${c.key}" needs a route, faq and how`);
  for (const lang of LANGS) for (const id of Object.keys(S)) if (!COPY[lang].sourceNames[id]) console.warn(`sources: no ${lang} name for "${id}"`); }
const updatedLine = (lang, iso = UPDATED) => `<p class="updated">${COPY[lang].ui.updated}: <time datetime="${iso}">${esc(longDate(iso, lang))}</time></p>`;

// ---------- markdown (from the ISDE-checker build; adds tables, calc: links and the affiliate marker) ----------
const SAFE_URL = /^(https?:|mailto:|tel:|calc:|[^:]*$)/i; // other schemes (javascript: and so on) are shown as text
const GUIDE_LINK = /^(?:\.{1,2}\/)*([\w-]+)\/?$/; // "slug", "slug/", "../slug/": a link to another guide
function href(u, lang) {
  if (/^calc:/i.test(u)) return L[lang][u.slice(5)] || (console.warn(`gidsen: unknown calc link "${u}"`), L[lang].home);
  if (GUIDE_LINK.test(u)) return guideHref(slug(u.match(GUIDE_LINK)[1]), lang);
  return /^\/(?!\/)/.test(u) && u !== BASE && !u.startsWith(BASE + '/') ? BASE + u : u; // root-relative links live under BASE
}
function inline(s, store, lang) {
  const keep = html => `\u0000${store.push(html) - 1}\u0000`;
  s = s.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, t, c) => keep(`<code>${esc(c.replace(/^ (.*) $/, '$1'))}</code>`))
    .replace(/\\([\\`*_{}\[\]()#+\-.!>~|])/g, (_, c) => keep(esc(c)))
    .replace(/\[([^\]]*)\]\(\s*<?([^\s)>]+)>?(?:\s+"([^"]*)")?\s*\)/g, (m, text, u, title) => !SAFE_URL.test(u) ? keep(esc(m))
      : keep(`<a href="${esc(href(u, lang))}"${title ? ` title="${esc(title)}"` : ''}${/^https?:/i.test(u) ? ' rel="noopener"' : ''}>${inline(text, store, lang)}</a>`))
    .replace(/<(https?:\/\/[^\s<>]+)>/g, (_, u) => keep(`<a href="${esc(u)}" rel="noopener">${esc(u)}</a>`))
    .replace(/(^|[\s(])(https?:\/\/[^\s<>]*[^\s<>.,;:!?)'"\]*_])/g, (_, pre, u) => pre + keep(`<a href="${esc(u)}" rel="noopener">${esc(u)}</a>`)); // bare URLs (source lists)
  return esc(s)
    .replace(/\*\*\*(?=\S)([\s\S]*?\S)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*|(^|[^\w])__(?=\S)([\s\S]*?\S)__(?!\w)/g, (_, a, pre, b) => a != null ? `<strong>${a}</strong>` : `${pre}<strong>${b}</strong>`)
    .replace(/\*(?=\S)([\s\S]*?\S)\*|(^|[^\w])_(?=\S)([\s\S]*?\S)_(?!\w)/g, (_, a, pre, b) => a != null ? `<em>${a}</em>` : `${pre}<em>${b}</em>`)
    .replace(/(?: {2,}|\\)\n/g, '<br>\n');
}
function markdown(src, lang) {
  const store = [], ids = new Set(['main', 'site-nav']); // ids the page itself uses
  const il = s => inline(s, store, lang);
  const LIST = /^( {0,3})([-*+]|\d{1,9}[.)])( +|$)/, FENCE = /^ {0,3}(`{3,}|~{3,})\s*([\w+-]*)/, HR = /^ {0,3}([-*_])( *\1){2,} *$/;
  const HEAD = /^ {0,3}(#{1,6})(?: +(.*?))?(?: +#+)? *$/, QUOTE = /^ {0,3}> ?/;
  const TROW = /^ {0,3}\|.*\|\s*$/, TSEP = /^ {0,3}\|?(\s*:?-{3,}:?\s*\|)+\s*(:?-{3,}:?\s*)?$/;
  const starts = l => HEAD.test(l) || HR.test(l) || FENCE.test(l) || QUOTE.test(l) || LIST.test(l) || TROW.test(l);
  const cells = l => l.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => c.trim());
  const blocks = (lines, tight = false) => { const out = []; let i = 0;
    while (i < lines.length) { const l = lines[i]; let m;
      if (!l.trim()) { i++; continue; }
      if ((m = l.match(FENCE))) { const end = new RegExp(`^ {0,3}${m[1][0]}{${m[1].length},} *$`), code = []; i++;
        while (i < lines.length && !end.test(lines[i])) code.push(lines[i++]); i++;
        out.push(`<pre><code${m[2] ? ` class="language-${esc(m[2])}"` : ''}>${esc(code.join('\n'))}</code></pre>`); continue; }
      if (/^ {4}/.test(l)) { const code = [];
        while (i < lines.length && (/^ {4}/.test(lines[i]) || !lines[i].trim())) code.push(lines[i++].slice(4));
        while (code.length && !code.at(-1).trim()) code.pop();
        out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`); continue; }
      if (TROW.test(l) && i + 1 < lines.length && TSEP.test(lines[i + 1])) { // GFM table: header, separator, rows
        const hd = cells(l), align = cells(lines[i + 1]).map(c => /:$/.test(c) ? (/^:/.test(c) ? 'center' : 'right') : ''); i += 2;
        const body = []; while (i < lines.length && TROW.test(lines[i])) body.push(cells(lines[i++]));
        const td = (tagName, c, k) => `<${tagName}${align[k] ? ` class="${align[k]}"` : ''}${tagName === 'th' ? ' scope="col"' : ''}>${il(c)}</${tagName}>`;
        out.push(`<div class="table-wrap"><table><thead><tr>${hd.map((c, k) => td('th', c, k)).join('')}</tr></thead><tbody>${body.map(r => `<tr>${hd.map((_, k) => td('td', r[k] ?? '', k)).join('')}</tr>`).join('')}</tbody></table></div>`); continue; }
      if ((m = l.match(HEAD))) { const n = Math.max(2, m[1].length), text = m[2] || '';
        const base = slug(text.replace(/\]\([^)]*\)|[*_`\[\]]/g, '')); let id = base, k = 1; while (ids.has(id)) id = `${base}-${++k}`; ids.add(id);
        out.push(`<h${n} id="${id}">${il(text)}</h${n}>`); i++; continue; }
      if (HR.test(l)) { out.push('<hr>'); i++; continue; }
      if (QUOTE.test(l)) { const q = [];
        while (i < lines.length && lines[i].trim() && (QUOTE.test(lines[i]) || !starts(lines[i]))) q.push(lines[i++].replace(QUOTE, ''));
        out.push(`<blockquote>${blocks(q)}</blockquote>`); continue; }
      if ((m = l.match(LIST))) { const ordered = /\d/.test(m[2]), items = []; let loose = false;
        while (i < lines.length) { const lm = lines[i].match(LIST);
          if (!lm || /\d/.test(lm[2]) !== ordered || lm[1].length > m[1].length + 1) break;
          const w = lm[0].length, item = [lines[i].slice(lm[0].length)]; i++;
          while (i < lines.length) { const x = lines[i];
            if (!x.trim()) { const next = lines.slice(i).find(y => y.trim()); if (next == null || !/^\s/.test(next) || next.search(/\S/) < Math.min(w, 2)) break; item.push(''); i++; continue; }
            if (x.search(/\S/) >= Math.min(w, 2)) { item.push(x.slice(Math.min(w, x.search(/\S/)))); i++; continue; }
            if (starts(x)) break;
            item.push(x); i++; }
          if (item.slice(0, -1).includes('')) loose = true;
          items.push(item);
          let j = i; while (j < lines.length && !lines[j].trim()) j++;
          if (j > i && j < lines.length && LIST.test(lines[j]) && lines[j].match(LIST)[1].length <= m[1].length + 1 && /\d/.test(lines[j].match(LIST)[2]) === ordered) { loose = true; i = j; }
        }
        const n = ordered ? parseInt(m[2], 10) : 1, tagName = ordered ? 'ol' : 'ul';
        const lis = items.map(it => blocks(it, !loose)), task = /^(<p>)?\[( |x|X)\] /; // "- [ ] item": a checklist
        const isTask = !ordered && lis.every(h => task.test(h));
        out.push(`<${tagName}${isTask ? ' class="tasks"' : ''}${ordered && n !== 1 ? ` start="${n}"` : ''}>${lis.map(h => `<li>${isTask ? h.replace(task, (_, p = '', x) => `${p}<span class="box${x.trim() ? ' done' : ''}" aria-hidden="true"></span>`) : h}</li>`).join('')}</${tagName}>`); continue; }
      const para = [];
      while (i < lines.length && lines[i].trim() && !(para.length && starts(lines[i]))) para.push(lines[i++].replace(/^ +/, ''));
      const html = il(para.join('\n').replace(/ +$/, ''));
      out.push(tight ? html : `<p>${html}</p>`);
    }
    return out.join('\n'); };
  let html = blocks(String(src).replace(/\u0000/g, '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n'));
  while (html.includes('\u0000')) html = html.replace(/\u0000(\d+)\u0000/g, (_, n) => store[n]);
  return html.replace(/([−-]) (?=€)/g, '$1\u00a0').replace(/€ (?=\d)/g, '€\u00a0'); // keep "− € 1.200" on one line
}

// Guides: every .md file with front matter title + description (required), date or updated (YYYY-MM-DD), optional slug
// and optional translationOf (the slug of the same guide in the other language).
// A value is split from its key on the first colon only; "..." and '...' quotes are stripped.
const unquote = v => { let m = v.match(/^"((?:[^"\\]|\\.)*)"$/); if (m) return m[1].replace(/\\(["\\])/g, '$1');
  m = v.match(/^'((?:[^']|'')*)'$/); return m ? m[1].replace(/''/g, "'") : v; };
const plainText = s => squash(s.replace(/[*_`]/g, '')).replace(/ +/g, ' ').toLowerCase();
function readGuides(lang) {
  const dir = GUIDE_DIRS[lang], list = [], slugs = new Set();
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort() : [];
  for (const file of files) {
    const where = `${dir}/${file}`;
    const text = fs.readFileSync(path.join(dir, file), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const fm = text.match(/^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/), meta = {};
    for (const line of (fm ? fm[1] : '').split('\n')) { const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*?)\s*$/); if (m) meta[m[1].toLowerCase()] = unquote(m[2]); }
    const g = { lang, file: where, title: squash(meta.title || ''), description: squash(meta.description || ''), slug: slug(meta.slug || file.replace(/\.md$/, '')),
      translationOf: meta.translationof ? slug(meta.translationof) : '', body: fm ? text.slice(fm[0].length) : text, alt: {} };
    const h1 = g.body.match(/^\s*(?:# +(.*?)(?: +#+)? *|(\S.*?) *\n=+ *)(?:\n|$)/); // the page H1 is the title: drop a body H1 that repeats it
    if (h1 && plainText(h1[1] ?? h1[2]) === plainText(g.title)) g.body = g.body.slice(h1[0].length);
    if (!g.title || !g.description) { console.warn(`gidsen: ${where} skipped (title and description are required)`); continue; }
    if (slugs.has(g.slug)) { console.warn(`gidsen: ${where} skipped (slug "${g.slug}" is already used)`); continue; }
    const date = meta.updated || meta.date;
    if (date) { const d = new Date(`${date}T00:00:00Z`);
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(d) && d.toISOString().slice(0, 10) === date) g.updated = date;
      else console.warn(`gidsen: ${where}: date "${date}" ignored (use YYYY-MM-DD)`); }
    if (!/2026/.test(g.title)) { console.warn(`gidsen: ${where}: title has no "2026"; " (2026)" is added`); g.title += ' (2026)'; }
    slugs.add(g.slug); list.push(g);
  }
  return list.sort((a, b) => (b.updated || '').localeCompare(a.updated || '') || a.title.localeCompare(b.title, lang));
}
const guides = Object.fromEntries(LANGS.map(lang => [lang, readGuides(lang)]));
// Translation pairs: translationOf first (either direction), then the same slug. g.alt[otherLang] is the translated guide.
{ const pair = (a, b) => { if (a.alt[b.lang] || b.alt[a.lang]) return console.warn(`gidsen: ${a.file} and ${b.file}: one of them is already paired`); a.alt[b.lang] = b; b.alt[a.lang] = a; };
  for (const lang of LANGS) for (const g of guides[lang]) if (g.translationOf && !g.alt[other(lang)]) {
    const o = guides[other(lang)].find(x => x.slug === g.translationOf);
    if (o) pair(g, o); else console.warn(`gidsen: ${g.file}: translationOf "${g.translationOf}" has no ${other(lang)} guide`); }
  for (const g of guides.en) if (!g.alt.nl) { const o = guides.nl.find(x => x.slug === g.slug && !x.alt.en); if (o) pair(g, o); } }
const guideRel = g => `${ROUTES.gidsen[g.lang]}${g.slug}/`;
const guideUrl = g => `${BASE}/${guideRel(g)}`;
// A guide link inside a guide: the guide in this language, else the translation of a guide named by its other-language slug.
function guideHref(s, lang) {
  const own = guides[lang].find(g => g.slug === s) || guides[other(lang)].find(g => g.slug === s && g.alt[lang])?.alt[lang];
  if (own) return guideUrl(own);
  const foreign = guides[other(lang)].find(g => g.slug === s);
  if (foreign) return guideUrl(foreign);
  console.warn(`gidsen (${lang}): link to unknown guide "${s}"`);
  return `${BASE}/${ROUTES.gidsen[lang]}${s}/`;
}
// <title> of a guide: with the brand when it fits. A title over 60 characters becomes the part before ":" or "–"
// when that still has "2026", else it is shortened with " (2026)" added. The H1 keeps the full title.
function guideTitle(g) {
  const lead = g.title.split(/: | – | - /)[0], options = [`${g.title} | ${BRAND}`, g.title, ...(/2026/.test(lead) ? [`${lead} | ${BRAND}`, lead] : [])];
  const t = options.find(o => o.length <= 60) ?? `${clip(g.title, 53)} (2026)`;
  if (g.title.length > 60) console.warn(`gidsen: ${g.file}: title is ${g.title.length} characters (max 60); <title> is "${t}"`);
  return t;
}
const guideAlt = g => Object.fromEntries([[g.lang, guideRel(g)], ...Object.values(g.alt).map(o => [o.lang, guideRel(o)])]);

// ---------- calculators ----------
const calcsOf = lang => COPY[lang].calcs;
const matches = (c, g) => c.match.test(`${g.slug} ${g.title.toLowerCase()}`);
const related = (lang, c) => guides[lang].filter(g => matches(c, g)); // match: new guides link up without code changes
const calcsFor = g => calcsOf(g.lang).filter(c => matches(c, g));

// ---------- layout ----------
const OG_IMAGE = `${SITE}/og-image.png`;
const THEME = '#14213D';
const hash = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 8);
const LOGO = `<svg viewBox="0 0 64 64" width="32" height="32" aria-hidden="true" focusable="false"><rect width="64" height="64" rx="14" fill="#14213D"/><rect x="14" y="15" width="24" height="5" rx="1" fill="#fff"/><rect x="14" y="25" width="30" height="5" rx="1" fill="#fff"/><rect x="12" y="34" width="40" height="10" rx="2" fill="#FFE45C"/><rect x="14" y="48" width="36" height="3" fill="#fff"/><rect x="14" y="53" width="36" height="3" fill="#fff"/></svg>`;
let ASSET = {}; // filled after the bundle is written

// hreflang: one link per language that has this page, plus x-default (the Dutch page, or the only page).
const hreflang = alt => [...LANGS.filter(l => alt[l] != null).map(l => [l, alt[l]]), ['x-default', alt.nl ?? alt.en]];
// Language switcher: a link to the same page in the other language (client.js adds the query string of a shared result).
// A page without a translation (some guides) links to the guide list in the other language.
function langSwitch(lang, alt, fallback) {
  const to = other(lang), rel = alt[to] ?? fallback ?? ROUTES.home[to], ui = COPY[lang].ui;
  return `<div class="lang" role="group" aria-label="${esc(ui.language)}"><span class="lang-cur" aria-hidden="true">${LOCALE[lang].code}</span>`
    + `<a class="lang-alt" href="${BASE}/${rel}" hreflang="${to}" lang="${to}" data-lang-switch${alt[to] == null ? ' data-no-translation' : ''}><span aria-hidden="true">${LOCALE[to].code}</span><span class="vh">${esc(alt[to] == null ? COPY[to].ui.otherLangIndex : LOCALE[to].name)}</span></a></div>`;
}
function page({ lang, rel, alt = { [lang]: rel }, switchTo, title, desc, body, type = 'website', robots = '', ld = null, nav = '' }) {
  if (title.length > 60) throw new Error(`title > 60 (${title.length}): ${title}`);
  if (desc.length > 155) throw new Error(`description > 155 (${desc.length}): ${desc}`);
  if (alt[lang] !== rel) throw new Error(`page ${rel}: alt.${lang} must be the page itself`);
  const ui = COPY[lang].ui, home = url('home', lang);
  const alternates = robots.includes('noindex') ? '' : hreflang(alt).map(([l, r]) => `<link rel="alternate" hreflang="${l}" href="${abs(r)}">`).join('');
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${abs(rel)}">${robots ? `<meta name="robots" content="${robots}">` : ''}
${alternates}
<meta name="theme-color" content="${THEME}"><meta name="color-scheme" content="light">
<link rel="icon" href="${BASE}/favicon.ico" sizes="32x32"><link rel="icon" href="${BASE}/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="${BASE}/apple-touch-icon.png">
<meta property="og:type" content="${type}"><meta property="og:site_name" content="${BRAND}"><meta property="og:locale" content="${LOCALE[lang].og}">${alt[other(lang)] != null ? `<meta property="og:locale:alternate" content="${LOCALE[other(lang)].og}">` : ''}
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${abs(rel)}">
<meta property="og:image" content="${OG_IMAGE}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(ui.ogAlt)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${OG_IMAGE}">${ld ? jsonLd(ld) : ''}
<link rel="stylesheet" href="${BASE}/style.css?v=${ASSET.css}"><script defer src="${BASE}/app.js?v=${ASSET.js}"></script></head><body>
<a class="skip" href="#main">${esc(ui.skip)}</a>
<header class="site-head"><div class="wrap"><a class="brand" href="${home}">${LOGO}<span>${BRAND}</span></a>
${langSwitch(lang, alt, switchTo)}
<nav class="site-nav" id="site-nav" aria-label="${esc(ui.mainNav)}"><ul>${ui.nav.map(([k, label, hash = '']) => `<li><a href="${url(k, lang)}${hash}"${k === nav ? ' aria-current="page"' : ''}>${esc(label)}</a></li>`).join('')}</ul></nav></div></header>
<main id="main" tabindex="-1">${body}</main>
${footer(lang)}${ANALYTICS}</body></html>`;
}
const footer = lang => { const f = COPY[lang].ui.footer;
  return `<footer class="site-foot"><div class="wrap">
<div class="foot-cols">
<div><h2>${f.calcs}</h2><ul>${calcsOf(lang).map(c => `<li><a href="${url(c.key, lang)}">${esc(c.h1.replace(/ 2026$/, ''))}</a></li>`).join('')}</ul></div>
<div><h2>${f.guides}</h2><ul>${guides[lang].slice(0, 8).map(g => `<li><a href="${guideUrl(g)}">${esc(g.title)}</a></li>`).join('')}<li><a href="${url('gidsen', lang)}">${f.allGuides}</a></li></ul></div>
<div><h2>${f.site}</h2><ul><li><a href="${url('methode', lang)}">${f.method}</a></li><li><a href="${url('over', lang)}">${f.about}</a></li><li><a href="${url('privacy', lang)}">${f.privacy}</a></li><li><a href="${url('affiliate', lang)}">${f.affiliate}</a></li></ul></div>
</div>
<p class="foot-note">${f.note}</p>
</div></footer>`; };
const crumbs = (lang, items) => `<nav class="crumbs wrap" aria-label="${esc(COPY[lang].ui.crumbs)}"><ol><li><a href="${url('home', lang)}">${BRAND}</a></li>${items.map(([label, h], i) => i === items.length - 1 ? `<li><span aria-current="page">${esc(label)}</span></li>` : `<li><a href="${h}">${esc(label)}</a></li>`).join('')}</ol></nav>`;
const breadcrumbLd = (lang, items) => ({ '@type': 'BreadcrumbList', itemListElement: [[BRAND, abs(ROUTES.home[lang])], ...items].map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })) });
const PUBLISHER = { '@type': 'Organization', '@id': `${SITE}/#org`, name: BRAND, url: `${SITE}/`, logo: { '@type': 'ImageObject', url: `${SITE}/logo-512.png`, width: 512, height: 512 } };
const disclaimer = lang => `<aside class="disclaimer" aria-label="${esc(COPY[lang].ui.disclaimerLabel)}">${COPY[lang].ui.disclaimer}</aside>`;

// GoatCounter click event for an outgoing link: kind 'aff' (affiliate) or 'newsletter'. The name comes from the config.
const track = (kind, name) => ` data-goatcounter-click="${kind}-${slug(name)}" data-goatcounter-title="${esc(`${kind === 'aff' ? 'Affiliate' : 'Newsletter'}: ${name}`)}"`;
function affiliateBlock(lang, id = 'aff') {
  const A = COPY[lang].affiliate;
  const item = a => `<li><a href="${esc(a.url)}" rel="sponsored nofollow noopener"${lang === 'en' ? ' hreflang="nl"' : ''}${track('aff', a.name)}><strong>${esc(a.name)}</strong><span>${esc(a.what[lang])}</span></a></li>`;
  return `<aside class="aff" aria-labelledby="${id}-h"><div class="aff-top"><h2 id="${id}-h">${A.heading}</h2><p class="aff-note">${A.note}</p></div>
<p>${A.intro}</p>
<h3>${A.software}</h3><ul class="aff-list">${AFFILIATE.boekhouden.map(item).join('')}</ul>
<h3>${A.bank}</h3><ul class="aff-list">${AFFILIATE.bank.map(item).join('')}</ul></aside>`;
}

// One calculator: form + result (default example rendered here, JS takes over in the browser).
function calcWidget(lang, calcId, { main = true, prefix = calcId, titleTag = 'h2' } = {}) {
  const k = K[lang], ui = COPY[lang].ui, calc = k.C[calcId], v = k.defaults(calc), r = k.render(calc, v), out = `r-${prefix}`;
  return `<div class="calc">
<form class="calc-form" data-calc="${calcId}"${main ? ' data-main' : ''} data-out="${out}" novalidate aria-labelledby="${prefix}-fh">
<${titleTag} class="vh" id="${prefix}-fh">${ui.yourData}</${titleTag}>
${k.renderFields(calc, v, prefix)}
<noscript><p class="help">${ui.noscript}</p></noscript>
</form>
<section class="result" id="${out}" aria-labelledby="${out}-h">
<${titleTag} class="r-title" id="${out}-h">${ui.result}<span class="vh">: ${esc(calc.title)}</span></${titleTag}>
<div class="r-head" data-head aria-live="polite" aria-atomic="true">${r.head}</div>
<div data-body>${r.body}</div>
${main ? `<div class="r-foot"><button type="button" class="btn" data-copy hidden>${ui.copyLink}</button><p class="vh" data-copy-status aria-live="polite"></p>
<p class="r-src">${ui.sources}: ${calc.sources.map(id => srcLink(id, lang)).join(', ')}. ${ui.seeAlso} <a href="${url('methode', lang)}">${ui.methodLower}</a>.</p></div>` : ''}
</section>
</div>`;
}

const faqHtml = (lang, list) => `<section class="faq" aria-labelledby="faq-h"><h2 id="faq-h">${COPY[lang].ui.faq}</h2>${list.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}</section>`;
const faqLd = list => ({ '@type': 'FAQPage', mainEntity: list.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
const calcList = (lang, list, cls = 'calc-index compact') => `<ul class="${cls}">${list.map(c => `<li><a href="${url(c.key, lang)}"><strong>${esc(c.h1)}</strong><span>${esc(c.short)}</span></a></li>`).join('')}</ul>`;
const otherCalcs = (lang, except) => `<section class="others" aria-labelledby="oc-h"><h2 id="oc-h">${COPY[lang].ui.otherCalcs}</h2>${calcList(lang, calcsOf(lang).filter(c => c.key !== except))}</section>`;

function calcPage(lang, c, extra = '') {
  const rel = ROUTES[c.key][lang], ui = COPY[lang].ui, faq = COPY[lang].faq[c.key], rg = related(lang, c);
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebApplication', name: c.h1, url: abs(rel), description: c.desc, applicationCategory: 'FinanceApplication', operatingSystem: 'Any', inLanguage: LOCALE[lang].ld, isAccessibleForFree: true, dateModified: UPDATED, offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }, publisher: { '@id': `${SITE}/#org` } },
    faqLd(faq), breadcrumbLd(lang, [[c.h1, abs(rel)]]), PUBLISHER] };
  const body = `${crumbs(lang, [[c.h1, url(c.key, lang)]])}
<div class="intro wrap"><h1>${esc(c.h1)}</h1><p class="lead">${esc(c.lead)}</p>${updatedLine(lang)}</div>
<div class="calc-band"><div class="wrap">${calcWidget(lang, c.calc)}</div></div>
<div class="wrap content">
${disclaimer(lang)}
${extra}
<section class="how" aria-labelledby="how-h"><h2 id="how-h">${ui.how}</h2>${COPY[lang].how[c.key]}
<ul class="links">${rg.map(g => `<li><a href="${guideUrl(g)}">${esc(g.title)}</a></li>`).join('')}<li><a href="${url('methode', lang)}">${ui.howMethod}</a></li></ul></section>
${faqHtml(lang, faq)}
${otherCalcs(lang, c.key)}
</div>`;
  return page({ lang, rel, alt: altOf(c.key), title: fit(60, `${c.title} | ${BRAND}`, c.title), desc: c.desc, body, ld });
}

// ---------- write ----------
fs.rmSync(OUT, { recursive: true, force: true });
const write = (rel, html) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };
fs.cpSync('src', OUT, { recursive: true });
write('.nojekyll', '');
// Client bundle: engine + calculators + data + client, in one small script (no imports at runtime). L holds the links of both languages.
// Light minify: drop whole-line comments and indentation (no comment markers inside strings at line start).
const strip = f => fs.readFileSync(f, 'utf8').replace(/^export /gm, '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//')).join('\n');
write('app.js', `(()=>{"use strict";\n${strip('engine/tax.mjs')}\n${strip('site/calcs.mjs')}\nconst P=${JSON.stringify(P)};\nconst S=${JSON.stringify(S)};\nconst L=${JSON.stringify(L)};\n${strip('site/client.js')}\n})();\n`);
ASSET = { css: hash(path.join(OUT, 'style.css')), js: hash(path.join(OUT, 'app.js')) };
const key = fs.readFileSync('indexnow.key', 'utf8').trim();
if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) throw new Error('indexnow.key: invalid key');
write(`${key}.txt`, key);

const pages = []; // { rel, lastmod, alt } for the sitemap
const emit = (rel, html, { lastmod = UPDATED, alt = null } = {}) => { write(rel ? `${rel}index.html` : 'index.html', html); pages.push({ rel, lastmod, alt: alt || { [html.match(/<html lang="(\w+)"/)[1]]: rel } }); };
const newest = list => list.map(g => g.updated).filter(Boolean).sort().at(-1) || UPDATED;

for (const lang of LANGS) {
  const C = COPY[lang], ui = C.ui, k = K[lang];

  // Home
  {
    const H = C.home;
    const exampleOf = c => { const calc = k.C[c.calc], r = calc.compute(k.defaults(calc)); return `${r.head.label}: ${r.head.value}`; };
    const body = `<div class="hero"><div class="wrap hero-grid">
<div class="hero-text"><h1>${esc(H.h1)}</h1>
<p class="lead">${H.lead}</p>
${updatedLine(lang)}
<ul class="facts">${H.facts.map(f => `<li>${f}</li>`).join('')}</ul></div>
<div class="hero-calc"><h2 class="hero-calc-h">${H.quick}</h2>${calcWidget(lang, 'snel', { main: false, prefix: 'snel', titleTag: 'h3' })}</div>
</div></div>
<div class="wrap content">
<section aria-labelledby="calculators"><h2 id="calculators">${H.allCalcs}</h2>
<ul class="calc-index">${calcsOf(lang).map(c => `<li><a href="${url(c.key, lang)}"><strong>${esc(c.h1)}</strong><span>${esc(c.short)}</span><span class="ex">${ui.example}: ${exampleOf(c)}</span></a></li>`).join('')}</ul></section>
<section aria-labelledby="gidsen-h"><h2 id="gidsen-h">${H.guides}</h2>
${guides[lang].length ? `<ul class="guides">${guides[lang].map(g => `<li><a href="${guideUrl(g)}">${esc(g.title)}</a><p>${esc(g.description)}</p></li>`).join('')}</ul>` : `<p>${H.noGuides}</p>`}
<p class="more"><a href="${url('gidsen', lang)}">${ui.footer.allGuides}</a></p></section>
<section class="trust" aria-labelledby="trust-h"><h2 id="trust-h">${H.trustH}</h2>
${H.trust}
<p><a href="${url('methode', lang)}">${H.trustLink}</a></p></section>
${disclaimer(lang)}
</div>`;
    const ld = { '@context': 'https://schema.org', '@graph': [PUBLISHER, { '@type': 'WebSite', '@id': `${abs(ROUTES.home[lang])}#website`, name: BRAND, url: abs(ROUTES.home[lang]), inLanguage: LOCALE[lang].ld, publisher: { '@id': `${SITE}/#org` } }] };
    emit(ROUTES.home[lang], page({ lang, rel: ROUTES.home[lang], alt: altOf('home'), title: H.title, desc: H.desc, body, ld, nav: 'home' }), { alt: altOf('home') });
  }

  // Calculators
  for (const c of calcsOf(lang)) emit(ROUTES[c.key][lang], calcPage(lang, c, c.key === 'zzp' ? affiliateBlock(lang) : c.key === 'zorgtoeslag' ? C.toeslagInfo() : ''), { alt: altOf(c.key) });

  // Guide list. Guides that exist only in the other language are listed too, marked with their language.
  {
    const G = C.guidesIndex, rel = ROUTES.gidsen[lang], foreign = guides[other(lang)].filter(g => !g.alt[lang]);
    const item = (g, mark = false) => `<li${mark ? ` lang="${g.lang}"` : ''}><a href="${guideUrl(g)}"${mark ? ` hreflang="${g.lang}"` : ''}>${esc(g.title)}</a><p>${esc(g.description)}</p>${g.updated ? `<p class="updated">${COPY[g.lang].ui.updated}: <time datetime="${g.updated}">${esc(longDate(g.updated, g.lang))}</time></p>` : ''}</li>`;
    const body = `${crumbs(lang, [[G.crumb, url('gidsen', lang)]])}
<div class="wrap content prose"><h1>${esc(G.h1)}</h1>
<p class="lead">${G.lead}</p>${updatedLine(lang, newest(guides[lang]))}
${guides[lang].length ? `<ul class="guides">${guides[lang].map(g => item(g)).join('')}</ul>` : `<p>${G.empty}</p>`}
${foreign.length ? `<section aria-labelledby="foreign-h"><h2 id="foreign-h">${G.foreignH}</h2><p>${G.foreignLead}</p><ul class="guides">${foreign.map(g => item(g, true)).join('')}</ul></section>` : ''}
</div>`;
    emit(rel, page({ lang, rel, alt: altOf('gidsen'), title: G.title, desc: G.desc, body, nav: 'gidsen', ld: { '@context': 'https://schema.org', ...breadcrumbLd(lang, [[G.crumb, abs(rel)]]) } }), { lastmod: newest(guides[lang]), alt: altOf('gidsen') });
  }

  // Guides
  for (const g of guides[lang]) {
    const rel = guideRel(g), cs = calcsFor(g), date = g.updated || UPDATED, alt = guideAlt(g), G = C.guide;
    let html = markdown(g.body, lang);
    html = html.replace(/<p>\[\[affiliate:boekhouden\]\]<\/p>/g, () => affiliateBlock(lang, `aff-${g.slug}`));
    const cta = cs[0] ? `<p class="cta"><a class="btn" href="${url(cs[0].key, lang)}">${esc(cs[0].h1)}</a></p>` : '';
    const body = `${crumbs(lang, [[C.guidesIndex.crumb, url('gidsen', lang)], [g.title, guideUrl(g)]])}
<article class="wrap content prose md"><h1>${esc(g.title)}</h1>
<p class="lead">${esc(g.description)}</p>${updatedLine(lang, date)}
${cta}
${html}
${disclaimer(lang)}
<section class="how" aria-labelledby="rc-h"><h2 id="rc-h">${G.calcH}</h2>${calcList(lang, cs.length ? cs : calcsOf(lang))}</section>
<p class="more"><a href="${url('gidsen', lang)}">${ui.footer.allGuides}</a></p>
</article>`;
    const u = abs(rel);
    emit(rel, page({ lang, rel, alt, switchTo: ROUTES.gidsen[other(lang)], title: guideTitle(g), desc: fit(155, g.description), body, type: 'article', nav: 'gidsen',
      ld: { '@context': 'https://schema.org', '@graph': [{ '@type': 'Article', headline: clip(g.title, 110), description: g.description, datePublished: date, dateModified: date, url: u, mainEntityOfPage: u, inLanguage: LOCALE[lang].ld, image: OG_IMAGE, author: PUBLISHER, publisher: PUBLISHER }, breadcrumbLd(lang, [[C.guidesIndex.crumb, abs(ROUTES.gidsen[lang])], [g.title, u]])] } }), { lastmod: date, alt });
  }

  // Methode en bronnen / methodology and sources: rendered from params + sources
  {
    const M = C.methode, rel = ROUTES.methode[lang];
    const body = `${crumbs(lang, [[M.crumb, url('methode', lang)]])}
<div class="wrap content prose"><h1>${esc(M.h1)}</h1>
<p class="lead">${M.lead}</p>${updatedLine(lang)}
${M.body()}
<h2 id="${M.sourcesId}">${M.sourcesH}</h2>
<p>${M.retrieved}</p>
<ol class="sources">${Object.entries(S).map(([id, u]) => `<li>${esc(srcName(id, lang))}<br><a href="${esc(u)}" rel="noopener"${lang === 'en' ? ' hreflang="nl"' : ''}>${esc(u)}</a></li>`).join('')}</ol>
${disclaimer(lang)}
</div>`;
    emit(rel, page({ lang, rel, alt: altOf('methode'), title: M.title, desc: M.desc, body, nav: 'methode', ld: { '@context': 'https://schema.org', ...breadcrumbLd(lang, [[M.crumb, abs(rel)]]) } }), { alt: altOf('methode') });
  }

  // Simple text pages
  for (const key of ['privacy', 'affiliate', 'over']) {
    const T = C.pages[key], rel = ROUTES[key][lang];
    emit(rel, page({ lang, rel, alt: altOf(key), title: T.title, desc: T.desc,
      body: `${crumbs(lang, [[T.h1, url(key, lang)]])}<div class="wrap content prose"><h1>${esc(T.h1)}</h1>${updatedLine(lang)}${T.html}</div>`,
      ld: { '@context': 'https://schema.org', ...breadcrumbLd(lang, [[T.h1, abs(rel)]]) } }), { alt: altOf(key) });
  }
}

// 404: GitHub Pages serves one dist/404.html for every unknown path, so it is in both languages (all links are absolute).
{
  const N = COPY.nl.notFound, NE = COPY.en.notFound;
  write('404.html', page({ lang: 'nl', rel: '404.html', alt: { nl: '404.html', en: ROUTES.home.en }, title: N.title, desc: N.desc, robots: 'noindex',
    body: `<div class="wrap content prose"><h1>${esc(N.h1)}</h1>${updatedLine('nl')}<p class="lead">${N.lead}</p></div><div class="wrap content">${otherCalcs('nl', '')}<p class="more"><a href="${url('home', 'nl')}">${N.home}</a></p></div>
<section class="wrap content" lang="en" aria-labelledby="nf-en"><h2 id="nf-en">${esc(NE.h1)}</h2><p class="lead">${NE.lead}</p>${calcList('en', calcsOf('en'))}<p class="more"><a href="${url('home', 'en')}">${NE.home}</a></p></section>` }));
}

// Sitemap (with hreflang alternates, the same set as on the page), robots
const xhtml = alt => Object.keys(alt).length > 1 ? hreflang(alt).map(([l, r]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${abs(r)}"/>`).join('') : '';
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${pages.map(p => `<url><loc>${abs(p.rel)}</loc><lastmod>${p.lastmod}</lastmod>${xhtml(p.alt)}</url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);

// Checks: unique titles and descriptions, 2026 in every title
const seen = new Map();
for (const { rel } of pages) { const html = fs.readFileSync(path.join(OUT, rel, 'index.html'), 'utf8'); const t = html.match(/<title>(.*?)<\/title>/)[1], d = html.match(/<meta name="description" content="(.*?)"/)[1];
  for (const k of [`t:${t}`, `d:${d}`]) { if (seen.has(k)) throw new Error(`duplicate ${k.startsWith('t') ? 'title' : 'description'} on ${rel} and ${seen.get(k)}`); seen.set(k, rel || '/'); }
  if (!/2026/.test(t)) throw new Error(`title without 2026: ${rel}`); }
const count = lang => `${pages.filter(p => p.rel.startsWith('en/') === (lang === 'en')).length} ${lang}`;
const untranslated = LANGS.flatMap(lang => guides[lang].filter(g => !g.alt[other(lang)]).map(g => g.file));
console.log(`wrote ${pages.length} pages (${count('nl')}, ${count('en')}; guides ${guides.nl.length} nl, ${guides.en.length} en) to ${OUT}/`);
if (untranslated.length) console.log(`guides without a translation (no hreflang alternate): ${untranslated.join(', ')}`);
