// Belastingcalculator static site builder. No dependencies (Node >= 20). Output: dist/
// Numbers come from data/params-2026.json, logic from engine/tax.mjs, calculators from site/calcs.mjs.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { createEngine } from './engine/tax.mjs';
import { createCalcs } from './site/calcs.mjs';

const SITE = 'https://cerberostech.github.io/belastingcalculator';
const BASE = '/belastingcalculator';
const BRAND = 'Belastingcalculator';
const UPDATED = '2026-10-17'; // shown as "Bijgewerkt" on every page and used as lastmod
const OUT = 'dist';
const ANALYTICS = ''; // Analytics slot: keep empty. No cookies and no trackers without a new privacy review.

// All URLs in one place (relative to BASE, with trailing slash). Rename here; links, sitemap and canonicals follow.
const ROUTES = {
  home: '',
  netto: 'netto-salaris-berekenen/',
  ib: 'inkomstenbelasting-berekenen/',
  zzp: 'zzp-belasting-berekenen/',
  box3: 'box-3-berekenen/',
  vakantiegeld: 'vakantiegeld-berekenen/',
  expat: '30-procent-regeling-berekenen/',
  zorgtoeslag: 'zorgtoeslag-berekenen/',
  gidsen: 'gidsen/',
  methode: 'methode-en-bronnen/',
  privacy: 'privacy/',
  affiliate: 'affiliate-disclosure/',
  over: 'over/',
};
// Affiliate slots. Swap a url for the tracking URL when a programme is approved; nothing else has to change.
// Order is alphabetical on purpose: no ranking, no "beste" claims.
const AFFILIATE = {
  boekhouden: [
    { name: 'Jortt', url: 'https://www.jortt.nl/', what: 'Online boekhoudprogramma voor zzp\'ers en kleine ondernemers.' },
    { name: 'Moneybird', url: 'https://www.moneybird.nl/', what: 'Online boekhouden, facturen en btw-aangifte.' },
    { name: 'Rompslomp', url: 'https://www.rompslomp.nl/', what: 'Online boekhoudprogramma met facturen en urenregistratie.' },
    { name: 'SnelStart', url: 'https://www.snelstart.nl/', what: 'Boekhoudsoftware voor ondernemers en boekhouders.' },
  ],
  bank: [
    { name: 'Knab', url: 'https://www.knab.nl/zakelijk', what: 'Zakelijke rekening voor zzp\'ers en ondernemers.' },
  ],
};
const OFFICIAL = {
  proef: 'https://www.belastingdienst.nl/wps/wcm/connect/nl/toeslagen/content/hulpmiddel-proefberekening-toeslagen',
  contact: 'https://github.com/cerberostech/belastingcalculator/issues',
  ghPrivacy: 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement',
};

const P = JSON.parse(fs.readFileSync('data/params-2026.json', 'utf8'));
const S = JSON.parse(fs.readFileSync('data/sources.json', 'utf8'));
const E = createEngine(P);
const url = key => `${BASE}/${ROUTES[key]}`;
const abs = rel => `${SITE}/${rel}`;
const L = { ...Object.fromEntries(Object.keys(ROUTES).map(k => [k, url(k)])), proef: OFFICIAL.proef };
const K = createCalcs(E, P, S, L);
const { esc, eur, pct, num } = K;

// Readable names for data/sources.json ids (the URL is the source of truth).
const SOURCE_NAMES = {
  bd_va2026: 'Belastingdienst: voorlopige aanslag, tarieven en heffingskortingen',
  bd_fisin_berekening: 'Belastingdienst: belastingberekening 2026 (fiscale informatie)',
  bd_fisin_kortingen: 'Belastingdienst: heffingskortingen 2026 (fiscale informatie)',
  bd_tabel_ak2026: 'Belastingdienst: tabel arbeidskorting 2026',
  ro_heffingskorting: 'Rijksoverheid: wat is een heffingskorting?',
  bd_zelfstandigenaftrek2026: 'Belastingdienst: zelfstandigenaftrek 2026',
  bd_mkb2026: 'Belastingdienst: mkb-winstvrijstelling 2026',
  bd_urencriterium: 'Belastingdienst: voorwaarden urencriterium',
  ro_sleuteltabel2026: 'Rijksoverheid: fiscale sleuteltabel 2026 (pdf)',
  bd_kor: 'Belastingdienst: voorwaarden kleineondernemersregeling (KOR)',
  bd_zvw_pct: 'Belastingdienst: percentages Zvw',
  bd_fisin_zvw: 'Belastingdienst: inkomensafhankelijke bijdrage Zvw 2026',
  stcrt_2025_38055: 'Staatscourant 2025, 38055 (Zvw-percentages)',
  bd_box2: 'Belastingdienst: box 2, tarieven',
  bd_box3_2026: 'Belastingdienst: berekening box 3-inkomen 2026',
  bd_werkelijk_rendement: 'Belastingdienst: wat is mijn werkelijk rendement?',
  bd_expat: 'Belastingdienst: 30%-regeling aanvragen',
  bd_zorgtoeslag_hoeveel: 'Belastingdienst: hoeveel zorgtoeslag krijg ik?',
  stcrt_2025_40022: 'Staatscourant 2025, 40022 (zorgtoeslag)',
  ro_huurtoeslag2026: 'Rijksoverheid: huurtoeslagparameters 2026 (nieuwsbericht)',
  ro_kot2026: 'Rijksoverheid: bedragen kinderopvangtoeslag 2026',
  wetten_wkb2026: 'Wetten.nl: Wet op het kindgebonden budget (2026)',
  bd_oldb_cijfers2026: 'Belastingdienst: cijferbijlage loonheffingen 2026 (pdf)',
};
const srcName = id => SOURCE_NAMES[id] || id;
const srcLink = id => `<a href="${esc(S[id])}" rel="noopener">${esc(srcName(id))}</a>`;
for (const id of Object.keys(S)) if (!SOURCE_NAMES[id]) console.warn(`sources: no readable name for "${id}"`);

// ---------- text helpers ----------
const slug = s => String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
const squash = s => String(s).replace(/[^\S ]+/g, ' ').trim();
const clip = (s, max) => { s = squash(s); if (s.length <= max) return s; const cut = s.slice(0, max - 1), at = cut.lastIndexOf(' '); return (at > max / 2 ? cut.slice(0, at) : cut).replace(/[\s,.;:/(+–-]+$/, '') + '…'; };
const fit = (max, ...options) => options.map(squash).find(o => o.length <= max) ?? clip(options.at(-1), max);
const longDate = iso => new Date(`${iso}T00:00:00Z`).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const updatedLine = (iso = UPDATED) => `<p class="updated">Bijgewerkt: <time datetime="${iso}">${esc(longDate(iso))}</time></p>`;
const jsonLd = data => `\n<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

// ---------- markdown (from the ISDE-checker build; adds tables, calc: links and the affiliate marker) ----------
const SAFE_URL = /^(https?:|mailto:|tel:|calc:|[^:]*$)/i; // other schemes (javascript: and so on) are shown as text
const GUIDE_LINK = /^(?:\.{1,2}\/)*([\w-]+)\/?$/; // "slug", "slug/", "../slug/": a link to another guide
const href = u => /^calc:/i.test(u) ? (L[u.slice(5)] || (console.warn(`gidsen: unknown calc link "${u}"`), L.home))
  : GUIDE_LINK.test(u) ? `${BASE}/${ROUTES.gidsen}${slug(u.match(GUIDE_LINK)[1])}/`
  : /^\/(?!\/)/.test(u) && u !== BASE && !u.startsWith(BASE + '/') ? BASE + u : u; // root-relative links live under BASE
function inline(s, store) {
  const keep = html => `\u0000${store.push(html) - 1}\u0000`;
  s = s.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, t, c) => keep(`<code>${esc(c.replace(/^ (.*) $/, '$1'))}</code>`))
    .replace(/\\([\\`*_{}\[\]()#+\-.!>~|])/g, (_, c) => keep(esc(c)))
    .replace(/\[([^\]]*)\]\(\s*<?([^\s)>]+)>?(?:\s+"([^"]*)")?\s*\)/g, (m, text, u, title) => !SAFE_URL.test(u) ? keep(esc(m))
      : keep(`<a href="${esc(href(u))}"${title ? ` title="${esc(title)}"` : ''}${/^https?:/i.test(u) ? ' rel="noopener"' : ''}>${inline(text, store)}</a>`))
    .replace(/<(https?:\/\/[^\s<>]+)>/g, (_, u) => keep(`<a href="${esc(u)}" rel="noopener">${esc(u)}</a>`))
    .replace(/(^|[\s(])(https?:\/\/[^\s<>]*[^\s<>.,;:!?)'"\]*_])/g, (_, pre, u) => pre + keep(`<a href="${esc(u)}" rel="noopener">${esc(u)}</a>`)); // bare URLs (source lists)
  return esc(s)
    .replace(/\*\*\*(?=\S)([\s\S]*?\S)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*|(^|[^\w])__(?=\S)([\s\S]*?\S)__(?!\w)/g, (_, a, pre, b) => a != null ? `<strong>${a}</strong>` : `${pre}<strong>${b}</strong>`)
    .replace(/\*(?=\S)([\s\S]*?\S)\*|(^|[^\w])_(?=\S)([\s\S]*?\S)_(?!\w)/g, (_, a, pre, b) => a != null ? `<em>${a}</em>` : `${pre}<em>${b}</em>`)
    .replace(/(?: {2,}|\\)\n/g, '<br>\n');
}
function markdown(src) {
  const store = [], ids = new Set(['main', 'site-nav']); // ids the page itself uses
  const il = s => inline(s, store);
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

// Guides: every content/gidsen/*.md with front matter title + description (required), date or updated (YYYY-MM-DD), optional slug.
// A value is split from its key on the first colon only; "..." and '...' quotes are stripped.
const unquote = v => { let m = v.match(/^"((?:[^"\\]|\\.)*)"$/); if (m) return m[1].replace(/\\(["\\])/g, '$1');
  m = v.match(/^'((?:[^']|'')*)'$/); return m ? m[1].replace(/''/g, "'") : v; };
const plainText = s => squash(s.replace(/[*_`]/g, '')).replace(/ +/g, ' ').toLowerCase();
const GUIDES_DIR = 'content/gidsen';
function readGuides() {
  const list = [], slugs = new Set();
  const files = fs.existsSync(GUIDES_DIR) ? fs.readdirSync(GUIDES_DIR).filter(f => f.endsWith('.md')).sort() : [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(GUIDES_DIR, file), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const fm = text.match(/^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/), meta = {};
    for (const line of (fm ? fm[1] : '').split('\n')) { const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*?)\s*$/); if (m) meta[m[1].toLowerCase()] = unquote(m[2]); }
    const g = { file, title: squash(meta.title || ''), description: squash(meta.description || ''), slug: slug(meta.slug || file.replace(/\.md$/, '')), body: fm ? text.slice(fm[0].length) : text };
    const h1 = g.body.match(/^\s*(?:# +(.*?)(?: +#+)? *|(\S.*?) *\n=+ *)(?:\n|$)/); // the page H1 is the title: drop a body H1 that repeats it
    if (h1 && plainText(h1[1] ?? h1[2]) === plainText(g.title)) g.body = g.body.slice(h1[0].length);
    if (!g.title || !g.description) { console.warn(`gidsen: ${file} skipped (title and description are required)`); continue; }
    if (slugs.has(g.slug)) { console.warn(`gidsen: ${file} skipped (slug "${g.slug}" is already used)`); continue; }
    const date = meta.updated || meta.date;
    if (date) { const d = new Date(`${date}T00:00:00Z`);
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(d) && d.toISOString().slice(0, 10) === date) g.updated = date;
      else console.warn(`gidsen: ${file}: date "${date}" ignored (use YYYY-MM-DD)`); }
    if (!/2026/.test(g.title)) { console.warn(`gidsen: ${file}: title has no "2026"; " (2026)" is added`); g.title += ' (2026)'; }
    slugs.add(g.slug); list.push(g);
  }
  return list.sort((a, b) => (b.updated || '').localeCompare(a.updated || '') || a.title.localeCompare(b.title, 'nl'));
}
const guides = readGuides();
const guideUrl = g => `${BASE}/${ROUTES.gidsen}${g.slug}/`;

// ---------- calculators: page copy ----------
// match: which guides are "related" (tested on slug + title), so new guides link up without code changes.
const CALCS = [
  { key: 'netto', calc: 'netto', name: 'Netto salaris', h1: 'Netto salaris berekenen 2026',
    title: 'Netto salaris berekenen 2026 – bruto netto calculator', short: 'Bruto naar netto, of andersom. Met vakantiegeld, pensioen en AOW.',
    desc: 'Bereken je netto salaris voor 2026 per maand of per jaar. Met de schijven, heffingskortingen, vakantiegeld en pensioenpremie van 2026. Gratis.',
    lead: 'Vul je brutoloon in en zie wat je netto overhoudt in 2026. Of reken terug: welk brutoloon heb je nodig voor een nettobedrag?',
    match: /netto|bruto|salaris|loonheffing|heffingskorting|arbeidskorting|schijven|tarieven/ },
  { key: 'ib', calc: 'ib', name: 'Inkomstenbelasting', h1: 'Inkomstenbelasting berekenen 2026',
    title: 'Inkomstenbelasting berekenen 2026 – box 1, 2 en 3', short: 'Je totale inkomstenbelasting over box 1, 2 en 3 met alle heffingskortingen.',
    desc: 'Bereken je inkomstenbelasting over 2026: loon, winst, aftrekposten, box 2 en box 3. Met algemene heffingskorting, arbeidskorting en combinatiekorting.',
    lead: 'Bereken wat je in 2026 aan inkomstenbelasting betaalt over al je inkomen. Je ziet de belasting per box en elke heffingskorting apart.',
    match: /inkomstenbelasting|aangifte|schijven|heffingskorting|aftrekpost|box-?2|dga/ },
  { key: 'zzp', calc: 'zzp', name: 'Zzp-belasting', h1: 'Zzp belasting berekenen 2026',
    title: 'Zzp belasting berekenen 2026 – IB, Zvw en apart zetten', short: 'Hoeveel procent van je winst zet je apart voor inkomstenbelasting en Zvw?',
    desc: 'Bereken als zzp\'er je inkomstenbelasting en Zvw-bijdrage over 2026. Met zelfstandigenaftrek, startersaftrek en mkb-winstvrijstelling. Zie wat je apart zet.',
    lead: 'Vul je verwachte winst in. Je ziet je inkomstenbelasting, je Zvw-bijdrage en welk percentage van je winst je het beste apart zet.',
    match: /zzp|zelfstandig|ondernem|urencriterium|mkb|starters|opzij|eenmanszaak|boekhoud/ },
  { key: 'box3', calc: 'box3', name: 'Box 3', h1: 'Box 3 berekenen 2026',
    title: 'Box 3 berekenen 2026 – forfaitair of werkelijk rendement', short: 'Belasting over spaargeld en beleggingen, en of tegenbewijs loont.',
    desc: 'Bereken je box 3-belasting over 2026 met de officiële methode: spaargeld, beleggingen, schulden en partner. Vergelijk met je werkelijke rendement.',
    lead: 'Bereken je belasting over sparen en beleggen in 2026 met de 6 stappen van de Belastingdienst. Vergelijk daarna met je werkelijke rendement.',
    match: /box-?3|vermogen|spaargeld|sparen|beleggen|rendement/ },
  { key: 'vakantiegeld', calc: 'vakantiegeld', name: 'Vakantiegeld', h1: 'Vakantiegeld berekenen 2026',
    title: 'Vakantiegeld berekenen 2026 – bruto en netto', short: 'Wat je netto overhoudt van je vakantiegeld in 2026.',
    desc: 'Bereken hoeveel vakantiegeld je in 2026 krijgt en wat je er netto van overhoudt. Met het echte belastingpercentage over je vakantiegeld.',
    lead: 'Vul je brutoloon per maand in. Je ziet je vakantiegeld bruto en netto, en hoeveel procent belasting je erover betaalt.',
    match: /vakantiegeld/ },
  { key: 'expat', calc: 'expat', name: '30%-regeling', h1: '30%-regeling berekenen 2026',
    title: '30%-regeling berekenen 2026 – netto voordeel en norm', short: 'Je netto voordeel van de 30%-regeling en de check op de salarisnorm.',
    desc: 'Bereken het netto voordeel van de 30%-regeling in 2026. Met de salarisnorm van € 48.013, de norm voor jonge masters en de maximale vergoeding.',
    lead: 'Bereken wat de 30%-regeling je netto oplevert in 2026, en of je loon hoog genoeg is voor de salarisnorm.',
    match: /30-?procent|30%|expat|ruling/ },
  { key: 'zorgtoeslag', calc: 'zorgtoeslag', name: 'Zorgtoeslag', h1: 'Zorgtoeslag berekenen 2026',
    title: 'Zorgtoeslag berekenen 2026 – indicatie per maand', short: 'Een indicatie van je zorgtoeslag per maand, met de tabel van 2026.',
    desc: 'Bereken een indicatie van je zorgtoeslag voor 2026 met de tabel van Dienst Toeslagen. Met de inkomensgrens en links naar de officiële proefberekening.',
    lead: 'Vul je verwachte inkomen voor 2026 in. Je ziet een indicatie van je zorgtoeslag per maand, op basis van de tabel van Dienst Toeslagen.',
    match: /toeslag/ },
];
const calcByKey = Object.fromEntries(CALCS.map(c => [c.key, c]));
const related = c => guides.filter(g => c.match.test(`${g.slug} ${g.title.toLowerCase()}`));
const calcsFor = g => CALCS.filter(c => c.match.test(`${g.slug} ${g.title.toLowerCase()}`));

// Example results for the copy (computed, never typed by hand)
const ex = {
  n3000: E.nettoSalaris({ brutoMaand: 3000 }), n4000: E.nettoSalaris({ brutoMaand: 4000 }),
  z: [30000, 50000, 80000].map(w => [w, E.zzp({ winst: w })]),
  vg: E.vakantiegeld({ brutoMaand: 3500 }),
};
const Z = P.toeslagen.zorgtoeslag;
const zGrens = tab => { let g = 0; for (const [upTo, amt] of tab) if (amt > 0) g = upTo; return g; };
const b1 = P.box1.belowAOW, ahk = P.algemeneHeffingskorting.belowAOW, ak = P.arbeidskorting.belowAOW, O = P.ondernemer, B3 = P.box3, X = P.expatregeling;

const FAQ = {
  netto: [
    ['Hoeveel houd ik netto over van € 3.000 bruto per maand?', `Ongeveer ${eur(ex.n3000.nettoMaandExclVakantiegeld)} netto per maand in 2026. Daarnaast krijg je ongeveer ${eur(ex.n3000.nettoVakantiegeld)} netto vakantiegeld. Dit geldt onder de AOW-leeftijd, met 8% vakantiegeld en zonder pensioenpremie.`],
    ['Hoeveel is € 4.000 bruto netto?', `Ongeveer ${eur(ex.n4000.nettoMaandExclVakantiegeld)} netto per maand, plus ongeveer ${eur(ex.n4000.nettoVakantiegeld)} netto vakantiegeld per jaar. Met pensioenpremie houd je minder over.`],
    ['Wat zijn de belastingschijven in 2026?', `Onder de AOW-leeftijd betaal je ${pct(b1[0].rate)} tot ${eur(b1[0].upTo)}, ${pct(b1[1].rate)} tot ${eur(b1[1].upTo)} en ${pct(b1[2].rate, 2, 2)} daarboven. In de eerste schijf zitten ook de premies volksverzekeringen.`],
    ['Wat is loonheffing?', 'Loonheffing is de loonbelasting plus de premies volksverzekeringen die je werkgever inhoudt. Je werkgever trekt er de algemene heffingskorting en de arbeidskorting van af. Samen heet dat de loonheffingskorting.'],
    ['Waarom wijkt mijn loonstrook af?', 'Je werkgever rekent per maand met tabellen en past bijzondere tarieven toe op bijvoorbeeld vakantiegeld. Ook een bijtelling voor een auto, reiskosten of een andere pensioenregeling geven verschillen. Over het hele jaar komt het meestal dicht bij deze berekening.'],
  ],
  ib: [
    ['Wat zijn de tarieven in box 1 in 2026?', `${pct(b1[0].rate)} tot ${eur(b1[0].upTo)}, ${pct(b1[1].rate)} tot ${eur(b1[1].upTo)} en ${pct(b1[2].rate, 2, 2)} daarboven. Heb je de AOW-leeftijd, dan is het tarief in de eerste schijf ${pct(P.box1.aowBornFrom1946[0].rate)}.`],
    ['Hoeveel is de algemene heffingskorting in 2026?', `Maximaal ${eur(ahk.max)}. Boven een inkomen van ${eur(ahk.phaseOutFrom)} wordt de korting ${pct(ahk.phaseOutRate, 3)} lager per euro. Vanaf ${eur(ahk.zeroFrom)} is de korting € 0.`],
    ['Hoeveel is de arbeidskorting in 2026?', `Maximaal ${eur(ak[3].base)}, bij een arbeidsinkomen van ${eur(ak[3].from)}. Daarboven wordt de korting lager. Vanaf ${eur(ak[3].to)} is de arbeidskorting € 0.`],
    ['Wat is het tarief in box 2?', `${pct(P.box2.brackets[0].rate, 1)} over de eerste ${eur(P.box2.brackets[0].upTo)} en ${pct(P.box2.brackets[1].rate, 0)} daarboven. Box 2 gaat over inkomen uit een aanmerkelijk belang, zoals dividend uit je eigen bv.`],
    ['Wat is de tariefsaanpassing?', `Aftrekposten, zelfstandigenaftrek en mkb-winstvrijstelling leveren in 2026 maximaal ${pct(O.aftrekTariefBeperking)} op. Valt je inkomen in de hoogste schijf, dan betaal je het verschil als tariefsaanpassing.`],
  ],
  zzp: [
    ['Hoeveel belasting betaal ik als zzp\'er?', `Dat hangt af van je winst. Met het urencriterium en zonder ander inkomen kom je in 2026 ongeveer uit op: ${ex.z.map(([w, r]) => `${pct(r.reserveerPct, 0)} bij ${eur(w)} winst`).join(', ')}. Dat is inkomstenbelasting plus Zvw-bijdrage.`],
    ['Hoeveel is de zelfstandigenaftrek in 2026?', `${eur(O.zelfstandigenaftrek)}. Heb je aan het begin van het jaar de AOW-leeftijd, dan is het ${eur(O.zelfstandigenaftrekAOW)}. Starters krijgen er ${eur(O.startersaftrek)} startersaftrek bij.`],
    ['Wat is het urencriterium?', `Je werkt minstens ${num(O.urencriteriumUren)} uur per jaar aan je onderneming. Dan heb je recht op zelfstandigenaftrek en startersaftrek. Houd je uren bij: de Belastingdienst kan erom vragen.`],
    ['Hoeveel is de mkb-winstvrijstelling in 2026?', `${pct(O.mkbWinstvrijstelling, 1)} van je winst na ondernemersaftrek. Je krijgt de vrijstelling ook als je het urencriterium niet haalt.`],
    ['Hoeveel Zvw-bijdrage betaal ik als zzp\'er?', `${pct(P.zvw.bijdrageZelf)} van je belastbare winst, over maximaal ${eur(P.zvw.maxBijdrageInkomen)}. Heb je ook loon, dan telt dat mee voor dat maximum.`],
  ],
  box3: [
    ['Hoeveel is het heffingsvrij vermogen in 2026?', `${eur(B3.heffingsvrijVermogen)} per persoon. Met een fiscale partner is het ${eur(B3.heffingsvrijVermogenPartners)} samen.`],
    ['Welke percentages gelden in box 3 in 2026?', `Banktegoeden ${pct(B3.rendement.bank.rate)}, overige bezittingen ${pct(B3.rendement.overig.rate, 2, 2)} en schulden ${pct(B3.rendement.schulden.rate)}. Het tarief is ${pct(B3.tarief)}. De percentages voor banktegoeden en schulden zijn voorlopig.`],
    ['Welke schulden tellen mee?', `Schulden boven de drempel van ${eur(B3.schuldendrempelPerPersoon)} per persoon. Een hypotheek voor je eigen huis telt niet mee in box 3, die valt in box 1.`],
    ['Wat is tegenbewijs (werkelijk rendement)?', 'Is je echte rendement lager dan het forfaitaire rendement? Dan mag je dat aantonen. Je betaalt dan belasting over je werkelijke rendement, zonder heffingsvrij vermogen. De Belastingdienst heeft hiervoor een opgaaf-formulier.'],
    ['Hoe werkt box 3 met een fiscale partner?', 'Je telt het vermogen samen en krijgt samen twee keer het heffingsvrij vermogen. Daarna mogen jullie de grondslag verdelen zoals jullie willen.'],
  ],
  vakantiegeld: [
    ['Hoeveel vakantiegeld krijg ik?', `Minstens 8% van je brutoloon. Bij ${eur(3500)} bruto per maand is dat ${eur(ex.vg.bruto)} bruto per jaar. Je cao of contract kan een hoger percentage geven.`],
    ['Hoeveel houd ik netto over van mijn vakantiegeld?', `Bij ${eur(3500)} bruto per maand ongeveer ${eur(ex.vg.netto)} netto. Je betaalt dan ${pct(ex.vg.marginaalTarief, 1)} belasting over je vakantiegeld.`],
    ['Waarom gaat er zoveel belasting af?', 'Je vakantiegeld komt bovenop je loon, dus het valt in je hoogste schijf. Ook worden je heffingskortingen lager als je meer verdient. Daardoor is het percentage vaak hoger dan je schijf.'],
    ['Wanneer krijg ik vakantiegeld?', 'De meeste werkgevers betalen het in mei of juni. Je contract of cao noemt de maand. Sommige werkgevers betalen het elke maand uit.'],
  ],
  expat: [
    ['Wat is de 30%-regeling?', 'Je werkgever mag je een onbelaste vergoeding geven voor de extra kosten van werken in Nederland. Die vergoeding is maximaal 30% van je loon. Je betaalt dan over minder loon belasting.'],
    ['Wat is de salarisnorm in 2026?', `Je belaste loon moet hoger zijn dan ${eur(X.salarisnorm)} (2025: € 46.660). Ben je jonger dan 30 en heb je een masterdiploma, dan is de norm ${eur(X.salarisnormOnder30Master)}.`],
    ['Is er een maximum?', `Ja. De vergoeding is maximaal ${pct(X.pct, 0)} van de WNT-norm van ${eur(X.wntNorm)}. Dat is ${eur(X.maxVergoeding)} per jaar.`],
    ['Hoe vraag ik de 30%-regeling aan?', 'Jij en je werkgever vragen de regeling samen aan bij de Belastingdienst. De Belastingdienst beslist of je eraan voldoet.'],
  ],
  zorgtoeslag: [
    ['Wat is de inkomensgrens voor zorgtoeslag in 2026?', `Volgens de tabel krijg je geen zorgtoeslag meer bij een toetsingsinkomen vanaf ${eur(zGrens(Z.tableSingle))} (alleenstaand) of ${eur(zGrens(Z.tablePartner))} (met toeslagpartner). Er geldt ook een vermogensgrens.`],
    ['Hoeveel zorgtoeslag krijg ik maximaal?', `Met een laag inkomen ${eur(Z.tableSingle[0][1])} per maand als je alleen bent, of ${eur(Z.tablePartner[0][1])} per maand met een toeslagpartner.`],
    ['Wat is de standaardpremie in 2026?', `${eur(Z.standaardpremie)} per jaar. Dienst Toeslagen gebruikt dit bedrag om de zorgtoeslag te berekenen.`],
    ['Hoe vraag ik zorgtoeslag aan?', 'Via Mijn toeslagen bij Dienst Toeslagen, met DigiD. Maak eerst de officiële proefberekening om het precieze bedrag te zien.'],
  ],
};

// "Hoe werkt dit?": short method text per calculator (the full method is on methode-en-bronnen).
const HOW = {
  netto: `<p>De calculator rekent je jaarloon om naar fiscaal loon: brutoloon plus vakantiegeld, min jouw pensioenpremie. Daarover gelden de schijven van box 1. Daarna gaan de algemene heffingskorting en de arbeidskorting eraf. Wat overblijft is je loonheffing.</p>
<p>Netto per maand is zonder vakantiegeld. Je vakantiegeld rekenen we apart, met het verschil in belasting met en zonder vakantiegeld.</p>`,
  ib: `<p>Box 1, box 2 en box 3 hebben elk hun eigen tarief. De calculator telt de belasting van de drie boxen op en trekt daar de heffingskortingen van af. De algemene heffingskorting hangt af van je verzamelinkomen, de arbeidskorting van je arbeidsinkomen (loon en winst).</p>
<p>Bedragen rondt de calculator af zoals de Belastingdienst: per schijf naar beneden, op hele euro's.</p>`,
  zzp: `<p>Van je winst gaan eerst de zelfstandigenaftrek en eventueel de startersaftrek af. Daarna gaat er ${pct(O.mkbWinstvrijstelling, 1)} mkb-winstvrijstelling af. Over de rest betaal je inkomstenbelasting in box 1, min de heffingskortingen.</p>
<p>Daarbovenop betaal je de inkomensafhankelijke bijdrage Zvw van ${pct(P.zvw.bijdrageZelf)}. Een werknemer betaalt die niet zelf: de werkgever betaalt de werkgeversheffing.</p>`,
  box3: `<p>De calculator volgt de 6 stappen van de Belastingdienst. Elk soort bezit krijgt een vast (forfaitair) rendement. Het heffingsvrij vermogen bepaalt welk deel daarvan belast is. Over dat voordeel betaal je ${pct(B3.tarief)}.</p>
<p>We hebben de berekening getest met de 5 rekenvoorbeelden van de Belastingdienst. Alle 5 komen op de euro uit.</p>`,
  vakantiegeld: `<p>De calculator berekent je jaarbelasting twee keer: met en zonder vakantiegeld. Het verschil is de belasting over je vakantiegeld. Zo zie je ook het effect van lagere heffingskortingen.</p>`,
  expat: `<p>De calculator trekt de onbelaste vergoeding af van je loon. Daarbij blijft je belaste loon altijd boven de salarisnorm, zoals de regels vragen. Daarna vergelijkt hij je netto loon met en zonder de regeling.</p>`,
  zorgtoeslag: `<p>Dienst Toeslagen publiceert een tabel met de zorgtoeslag per maand bij een bepaald inkomen. De calculator zoekt je inkomen op in die tabel. De tabel is afgerond op stappen van € 500.</p>`,
};

// ---------- layout ----------
const OG_IMAGE = `${SITE}/og-image.png`;
const OG_ALT = 'Belastingcalculator: belasting berekenen 2026';
const THEME = '#14213D';
const hash = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 8);
const NAV = [['home', 'Calculators', '#calculators'], ['gidsen', 'Gidsen'], ['methode', 'Methode']];
const LOGO = `<svg viewBox="0 0 64 64" width="32" height="32" aria-hidden="true" focusable="false"><rect width="64" height="64" rx="14" fill="#14213D"/><rect x="14" y="15" width="24" height="5" rx="1" fill="#fff"/><rect x="14" y="25" width="30" height="5" rx="1" fill="#fff"/><rect x="12" y="34" width="40" height="10" rx="2" fill="#FFE45C"/><rect x="14" y="48" width="36" height="3" fill="#fff"/><rect x="14" y="53" width="36" height="3" fill="#fff"/></svg>`;
let ASSET = {}; // filled after the bundle is written
function page({ rel, title, desc, body, type = 'website', robots = '', ld = null, nav = '' }) {
  if (title.length > 60) throw new Error(`title > 60 (${title.length}): ${title}`);
  if (desc.length > 155) throw new Error(`description > 155 (${desc.length}): ${desc}`);
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${abs(rel)}">${robots ? `<meta name="robots" content="${robots}">` : ''}
<meta name="theme-color" content="${THEME}"><meta name="color-scheme" content="light">
<link rel="icon" href="${BASE}/favicon.ico" sizes="32x32"><link rel="icon" href="${BASE}/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="${BASE}/apple-touch-icon.png">
<meta property="og:type" content="${type}"><meta property="og:site_name" content="${BRAND}"><meta property="og:locale" content="nl_NL">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${abs(rel)}">
<meta property="og:image" content="${OG_IMAGE}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(OG_ALT)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${OG_IMAGE}">${ld ? jsonLd(ld) : ''}
<link rel="stylesheet" href="${BASE}/style.css?v=${ASSET.css}"><script defer src="${BASE}/app.js?v=${ASSET.js}"></script></head><body>
<a class="skip" href="#main">Naar de inhoud</a>
<header class="site-head"><div class="wrap"><a class="brand" href="${BASE}/">${LOGO}<span>${BRAND}</span></a>
<nav class="site-nav" id="site-nav" aria-label="Hoofdmenu"><ul>${NAV.map(([k, label, hash = '']) => `<li><a href="${url(k)}${hash}"${k === nav ? ' aria-current="page"' : ''}>${label}</a></li>`).join('')}</ul></nav></div></header>
<main id="main" tabindex="-1">${body}</main>
${footer()}${ANALYTICS}</body></html>`;
}
const footer = () => `<footer class="site-foot"><div class="wrap">
<div class="foot-cols">
<div><h2>Calculators</h2><ul>${CALCS.map(c => `<li><a href="${url(c.key)}">${esc(c.h1.replace(/ 2026$/, ''))}</a></li>`).join('')}</ul></div>
<div><h2>Gidsen</h2><ul>${guides.slice(0, 8).map(g => `<li><a href="${guideUrl(g)}">${esc(g.title)}</a></li>`).join('')}<li><a href="${url('gidsen')}">Alle gidsen</a></li></ul></div>
<div><h2>Over deze site</h2><ul><li><a href="${url('methode')}">Methode en bronnen</a></li><li><a href="${url('over')}">Over ${BRAND}</a></li><li><a href="${url('privacy')}">Privacy</a></li><li><a href="${url('affiliate')}">Affiliate-disclosure</a></li></ul></div>
</div>
<p class="foot-note">Indicatieve berekening, geen belastingadvies. ${BRAND} is onafhankelijk en niet verbonden aan de Belastingdienst of Dienst Toeslagen. Cijfers 2026, bijgewerkt op ${esc(longDate(UPDATED))}.</p>
</div></footer>`;
const crumbs = items => `<nav class="crumbs wrap" aria-label="Kruimelpad"><ol><li><a href="${BASE}/">${BRAND}</a></li>${items.map(([label, h], i) => i === items.length - 1 ? `<li><span aria-current="page">${esc(label)}</span></li>` : `<li><a href="${h}">${esc(label)}</a></li>`).join('')}</ol></nav>`;
const breadcrumbLd = items => ({ '@type': 'BreadcrumbList', itemListElement: [[BRAND, `${SITE}/`], ...items].map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })) });
const PUBLISHER = { '@type': 'Organization', '@id': `${SITE}/#org`, name: BRAND, url: `${SITE}/`, logo: { '@type': 'ImageObject', url: `${SITE}/logo-512.png`, width: 512, height: 512 } };
const DISCLAIMER = `<aside class="disclaimer" aria-label="Disclaimer"><p><strong>Indicatieve berekening — geen belastingadvies.</strong> Controleer altijd bij de Belastingdienst.</p><p>De uitkomst is een schatting met de cijfers van 2026. Aan deze berekening kun je geen rechten ontlenen.</p></aside>`;

function affiliateBlock(id = 'aff') {
  const item = a => `<li><a href="${esc(a.url)}" rel="sponsored nofollow noopener"><strong>${esc(a.name)}</strong><span>${esc(a.what)}</span></a></li>`;
  return `<aside class="aff" aria-labelledby="${id}-h"><div class="aff-top"><h2 id="${id}-h">Boekhouding en zakelijke rekening</h2><p class="aff-note">Advertentie / affiliate — zie <a href="${url('affiliate')}">disclosure</a></p></div>
<p>Als ondernemer houd je een administratie bij. Een aparte zakelijke rekening maakt dat makkelijker. Deze diensten staan op alfabetische volgorde. We hebben ze niet getest of vergeleken.</p>
<h3>Boekhoudprogramma's</h3><ul class="aff-list">${AFFILIATE.boekhouden.map(item).join('')}</ul>
<h3>Zakelijke rekening</h3><ul class="aff-list">${AFFILIATE.bank.map(item).join('')}</ul></aside>`;
}

// One calculator: form + result (default example rendered here, JS takes over in the browser).
function calcWidget(calcId, { main = true, prefix = calcId, titleTag = 'h2' } = {}) {
  const calc = K.C[calcId], v = K.defaults(calc), r = K.render(calc, v), out = `r-${prefix}`;
  return `<div class="calc">
<form class="calc-form" data-calc="${calcId}"${main ? ' data-main' : ''} data-out="${out}" novalidate aria-labelledby="${prefix}-fh">
<${titleTag} class="vh" id="${prefix}-fh">Jouw gegevens</${titleTag}>
${K.renderFields(calc, v, prefix)}
<noscript><p class="help">Zet JavaScript aan om met je eigen bedragen te rekenen. Hiernaast zie je een voorbeeld.</p></noscript>
</form>
<section class="result" id="${out}" aria-labelledby="${out}-h">
<${titleTag} class="r-title" id="${out}-h">Uitkomst<span class="vh">: ${esc(calc.title)}</span></${titleTag}>
<div class="r-head" data-head aria-live="polite" aria-atomic="true">${r.head}</div>
<div data-body>${r.body}</div>
${main ? `<div class="r-foot"><button type="button" class="btn" data-copy hidden>Kopieer link</button><p class="vh" data-copy-status aria-live="polite"></p>
<p class="r-src">Bronnen: ${calc.sources.map(srcLink).join(', ')}. Zie ook <a href="${url('methode')}">methode en bronnen</a>.</p></div>` : ''}
</section>
</div>`;
}

const faqHtml = list => `<section class="faq" aria-labelledby="faq-h"><h2 id="faq-h">Veelgestelde vragen</h2>${list.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}</section>`;
const faqLd = list => ({ '@type': 'FAQPage', mainEntity: list.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
const otherCalcs = except => `<section class="others" aria-labelledby="oc-h"><h2 id="oc-h">Andere calculators</h2><ul class="calc-index compact">${CALCS.filter(c => c.key !== except).map(c => `<li><a href="${url(c.key)}"><strong>${esc(c.h1)}</strong><span>${esc(c.short)}</span></a></li>`).join('')}</ul></section>`;

function calcPage(c, extra = {}) {
  const rel = ROUTES[c.key], faq = FAQ[c.key], rg = related(c);
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebApplication', name: c.h1, url: abs(rel), description: c.desc, applicationCategory: 'FinanceApplication', operatingSystem: 'Any', inLanguage: 'nl-NL', isAccessibleForFree: true, dateModified: UPDATED, offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }, publisher: { '@id': `${SITE}/#org` } },
    faqLd(faq), breadcrumbLd([[c.h1, abs(rel)]]), PUBLISHER] };
  const body = `${crumbs([[c.h1, url(c.key)]])}
<div class="intro wrap"><h1>${esc(c.h1)}</h1><p class="lead">${esc(c.lead)}</p>${updatedLine()}</div>
<div class="calc-band"><div class="wrap">${calcWidget(c.calc)}</div></div>
<div class="wrap content">
${DISCLAIMER}
${extra.afterCalc || ''}
<section class="how" aria-labelledby="how-h"><h2 id="how-h">Hoe werkt dit?</h2>${HOW[c.key]}
<ul class="links">${rg.map(g => `<li><a href="${guideUrl(g)}">${esc(g.title)}</a></li>`).join('')}<li><a href="${url('methode')}">Methode en bronnen: alle cijfers en afrondingsregels</a></li></ul></section>
${faqHtml(faq)}
${otherCalcs(c.key)}
</div>`;
  return page({ rel, title: fit(60, `${c.title} | ${BRAND}`, c.title), desc: c.desc, body, ld });
}

// ---------- write ----------
fs.rmSync(OUT, { recursive: true, force: true });
const write = (rel, html) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };
fs.cpSync('src', OUT, { recursive: true });
write('.nojekyll', '');
// Client bundle: engine + calculators + data + client, in one small script (no imports at runtime).
// Light minify: drop whole-line comments and indentation (no comment markers inside strings at line start).
const strip = f => fs.readFileSync(f, 'utf8').replace(/^export /gm, '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//')).join('\n');
write('app.js', `(()=>{"use strict";\n${strip('engine/tax.mjs')}\n${strip('site/calcs.mjs')}\nconst P=${JSON.stringify(P)};\nconst S=${JSON.stringify(S)};\nconst L=${JSON.stringify(L)};\n${strip('site/client.js')}\n})();\n`);
ASSET = { css: hash(path.join(OUT, 'style.css')), js: hash(path.join(OUT, 'app.js')) };
const key = fs.readFileSync('indexnow.key', 'utf8').trim();
if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) throw new Error('indexnow.key: invalid key');
write(`${key}.txt`, key);

const pages = []; // [rel, lastmod] for the sitemap
const emit = (rel, html, lastmod = UPDATED) => { write(rel ? `${rel}index.html` : 'index.html', html); pages.push([rel, lastmod]); };

// Home
{
  const exampleOf = c => { const calc = K.C[c.calc], r = calc.compute(K.defaults(calc)); return `${r.head.label}: ${r.head.value}`; };
  const body = `<div class="hero"><div class="wrap hero-grid">
<div class="hero-text"><h1>Belasting berekenen 2026</h1>
<p class="lead">Reken je netto salaris, inkomstenbelasting, zzp-belasting en box 3 uit met de cijfers van 2026. Elk bedrag komt van de Belastingdienst, met bron.</p>
${updatedLine()}
<ul class="facts"><li>Gratis en zonder account</li><li>Geen cookies en geen trackers</li><li>Getest met de rekenvoorbeelden van de Belastingdienst</li></ul></div>
<div class="hero-calc"><h2 class="hero-calc-h">Snel je netto salaris</h2>${calcWidget('snel', { main: false, prefix: 'snel', titleTag: 'h3' })}</div>
</div></div>
<div class="wrap content">
<section aria-labelledby="calculators"><h2 id="calculators">Alle calculators</h2>
<ul class="calc-index">${CALCS.map(c => `<li><a href="${url(c.key)}"><strong>${esc(c.h1)}</strong><span>${esc(c.short)}</span><span class="ex">Voorbeeld: ${exampleOf(c)}</span></a></li>`).join('')}</ul></section>
<section aria-labelledby="gidsen-h"><h2 id="gidsen-h">Gidsen</h2>
${guides.length ? `<ul class="guides">${guides.map(g => `<li><a href="${guideUrl(g)}">${esc(g.title)}</a><p>${esc(g.description)}</p></li>`).join('')}</ul>` : '<p>Binnenkort staan hier gidsen.</p>'}
<p class="more"><a href="${url('gidsen')}">Alle gidsen</a></p></section>
<section class="trust" aria-labelledby="trust-h"><h2 id="trust-h">Zo rekenen we</h2>
<p>Alle tarieven, kortingen en grenzen komen van belastingdienst.nl, rijksoverheid.nl en officielebekendmakingen.nl. We ronden af zoals de Belastingdienst dat doet. De box 3-berekening komt bij alle 5 officiële rekenvoorbeelden op de euro uit.</p>
<p><a href="${url('methode')}">Bekijk alle cijfers en bronnen</a></p></section>
${DISCLAIMER}
</div>`;
  const ld = { '@context': 'https://schema.org', '@graph': [PUBLISHER, { '@type': 'WebSite', '@id': `${SITE}/#website`, name: BRAND, url: `${SITE}/`, inLanguage: 'nl-NL', publisher: { '@id': `${SITE}/#org` } }] };
  emit('', page({ rel: '', title: 'Belasting berekenen 2026: netto, IB, zzp en box 3', desc: 'Bereken je belasting voor 2026: netto salaris, inkomstenbelasting, zzp, box 3, vakantiegeld, 30%-regeling en zorgtoeslag. Gratis, met officiële bronnen.', body, ld, nav: 'home' }));
}

// Calculators
const toeslagInfo = (() => {
  const H = P.toeslagen.huurtoeslag, KO = P.toeslagen.kinderopvangtoeslag, KB = P.toeslagen.kindgebondenBudget;
  const proef = `<p class="more"><a href="${OFFICIAL.proef}" rel="noopener">Maak de officiële proefberekening</a></p>`;
  const tr = (l, v) => `<tr><th scope="row">${l}</th><td class="amt">${v}</td></tr>`;
  const eur2 = n => '€\u00a0' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `<section class="info" aria-labelledby="ot-h"><h2 id="ot-h">Andere toeslagen in 2026</h2>
<p>Deze toeslagen berekenen we niet. De regels hebben te veel uitzonderingen voor een betrouwbare indicatie. Hieronder staan de belangrijkste bedragen. Voor je eigen bedrag maak je de proefberekening van Dienst Toeslagen.</p>
<h3>Huurtoeslag <span class="tag">Voorlopig</span></h3>
<div class="table-wrap"><table class="params"><tbody>${tr('Huurgrens (maximale huur)', eur2(H.huurgrens))}${tr('Kwaliteitskortingsgrens', eur2(H.kwaliteitskortingsgrens))}${tr('Aftoppingsgrens (1 of 2 personen)', eur2(H.aftoppingsgrensLaag))}${tr('Aftoppingsgrens (3 of meer personen)', eur2(H.aftoppingsgrensHoog))}</tbody></table></div>
<p class="src">Bron: ${srcLink('ro_huurtoeslag2026')}. ${esc('Nog vast te stellen in de Staatscourant.')}</p>${proef}
<h3>Kinderopvangtoeslag</h3>
<div class="table-wrap"><table class="params"><tbody>${tr('Maximale uurprijs dagopvang', eur2(KO.maxUurprijs.dagopvang))}${tr('Maximale uurprijs buitenschoolse opvang', eur2(KO.maxUurprijs.bso))}${tr('Maximale uurprijs gastouderopvang', eur2(KO.maxUurprijs.gastouder))}${tr('Maximaal aantal uren per maand', String(KO.maxUrenPerMaand))}</tbody></table></div>
<p class="src">Bron: ${srcLink('ro_kot2026')}.</p>${proef}
<h3>Kindgebonden budget <span class="tag">Niet geverifieerd</span></h3>
<div class="table-wrap"><table class="params"><tbody>${tr('Per kind per jaar', eur(KB.perKind))}${tr('Extra voor een kind van 12 tot 15', eur(KB.extra12tot15))}${tr('Extra voor een kind van 16 of 17', eur(KB.extra16tot17))}${tr('Extra voor een alleenstaande ouder', eur(KB.alleenstaandeOuderKop))}${tr('Lager boven (alleenstaand)', eur(KB.drempelAlleenstaand))}${tr('Lager boven (met partner)', eur(KB.drempelPartners))}</tbody></table></div>
<p class="src">Bron: ${srcLink('wetten_wkb2026')}. We hebben deze bedragen nog niet zelf in de wettekst gecontroleerd.</p>${proef}
</section>`;
})();
for (const c of CALCS) emit(ROUTES[c.key], calcPage(c, { afterCalc: c.key === 'zzp' ? affiliateBlock() : c.key === 'zorgtoeslag' ? toeslagInfo : '' }));

// Guides
{
  const body = `${crumbs([['Gidsen', url('gidsen')]])}
<div class="wrap content prose"><h1>Gidsen over belasting in 2026</h1>
<p class="lead">Uitleg in gewone taal, met de cijfers van 2026 en een bron bij elk bedrag.</p>${updatedLine(guides.map(g => g.updated).filter(Boolean).sort().at(-1) || UPDATED)}
${guides.length ? `<ul class="guides">${guides.map(g => `<li><a href="${guideUrl(g)}">${esc(g.title)}</a><p>${esc(g.description)}</p>${g.updated ? `<p class="updated">Bijgewerkt: <time datetime="${g.updated}">${esc(longDate(g.updated))}</time></p>` : ''}</li>`).join('')}</ul>` : '<p>Er staan nog geen gidsen op deze site.</p>'}
</div>`;
  emit(ROUTES.gidsen, page({ rel: ROUTES.gidsen, title: 'Gidsen over belasting in 2026 | Belastingcalculator', desc: 'Gidsen over belasting in 2026: wat er verandert voor zzp\'ers, een checklist voor je aangifte en meer. In gewone taal, met officiële bronnen.', body, nav: 'gidsen', ld: { '@context': 'https://schema.org', ...breadcrumbLd([['Gidsen', abs(ROUTES.gidsen)]]) } }), guides.map(g => g.updated).filter(Boolean).sort().at(-1) || UPDATED);
}
for (const g of guides) {
  const rel = `${ROUTES.gidsen}${g.slug}/`, cs = calcsFor(g), date = g.updated || UPDATED;
  let html = markdown(g.body);
  for (const [, to] of html.matchAll(new RegExp(`href="${BASE}/${ROUTES.gidsen}([^/"#]+)/`, 'g'))) if (!guides.some(x => x.slug === to)) console.warn(`gidsen: ${g.file}: link to unknown guide "${to}"`);
  html = html.replace(/<p>\[\[affiliate:boekhouden\]\]<\/p>/g, () => affiliateBlock(`aff-${g.slug}`));
  const cta = cs[0] ? `<p class="cta"><a class="btn" href="${url(cs[0].key)}">${esc(cs[0].h1)}</a></p>` : '';
  const body = `${crumbs([['Gidsen', url('gidsen')], [g.title, guideUrl(g)]])}
<article class="wrap content prose md"><h1>${esc(g.title)}</h1>
<p class="lead">${esc(g.description)}</p>${updatedLine(date)}
${cta}
${html}
${DISCLAIMER}
<section class="how" aria-labelledby="rc-h"><h2 id="rc-h">Reken het zelf uit</h2><ul class="calc-index compact">${(cs.length ? cs : CALCS).map(c => `<li><a href="${url(c.key)}"><strong>${esc(c.h1)}</strong><span>${esc(c.short)}</span></a></li>`).join('')}</ul></section>
<p class="more"><a href="${url('gidsen')}">Alle gidsen</a></p>
</article>`;
  const u = abs(rel);
  emit(rel, page({ rel, title: fit(60, `${g.title} | ${BRAND}`, g.title), desc: fit(155, g.description), body, type: 'article', nav: 'gidsen',
    ld: { '@context': 'https://schema.org', '@graph': [{ '@type': 'Article', headline: clip(g.title, 110), description: g.description, datePublished: date, dateModified: date, url: u, mainEntityOfPage: u, inLanguage: 'nl-NL', image: OG_IMAGE, author: PUBLISHER, publisher: PUBLISHER }, breadcrumbLd([['Gidsen', abs(ROUTES.gidsen)], [g.title, u]])] } }), date);
}

// Methode en bronnen: rendered from params + sources
{
  const src = ids => `<p class="src">Bron: ${[].concat(ids).map(srcLink).join(', ')}.</p>`;
  const tbl = (headCells, rows, cls = 'params') => `<div class="table-wrap"><table class="${cls}"><thead><tr>${headCells.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => i ? `<td>${c}</td>` : `<th scope="row">${c}</th>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const kv = rows => tbl(['Onderdeel', 'Waarde 2026'], rows);
  const brackets = (list, min = 0) => list.map((b, i) => [i === 0 ? `tot ${eur(b.upTo)}` : b.upTo == null ? `vanaf ${eur(list[i - 1].upTo)}` : `${eur(list[i - 1].upTo)} tot ${eur(b.upTo)}`, pct(b.rate, 2, min)]);
  const voorlopig = ' <span class="tag">Voorlopig</span>';
  const akRow = (s, i) => [s.to == null ? `vanaf ${eur(s.from)}` : `${eur(s.from)} tot ${eur(s.to)}`, s.to == null ? '€ 0' : s.rate >= 0 ? (s.base ? `${eur(s.base)} + ${pct(s.rate, 3)} × (inkomen − ${eur(s.from)})` : `${pct(s.rate, 3)} × inkomen`) : `${eur(s.base)} − ${pct(-s.rate, 3)} × (inkomen − ${eur(s.from)})`];
  const A = P.algemeneHeffingskorting, IA = P.inkomensafhankelijkeCombinatiekorting, OK = P.ouderenkorting, ZV = P.zvw, H = P.toeslagen.huurtoeslag, KO = P.toeslagen.kinderopvangtoeslag, KB = P.toeslagen.kindgebondenBudget;
  const thetax = [['€ 30.000', '€ 27.754,21', '€ 27.754', '0'], ['€ 45.000', '€ 36.614,07', '€ 36.614', '0'], ['€ 60.000', '€ 44.093,96', '€ 44.094', '0'], ['€ 90.000', '€ 58.312,13', '€ 58.313', '+1'], ['€ 150.000', '€ 85.818,00', '€ 85.819', '+1'], ['€ 40.000, AOW-leeftijd', '€ 38.718,53', '€ 38.720', '+1,5'], ['€ 75.600 met 30%-regeling', '€ 63.267,10', '€ 63.266', '−1']];
  const body = `${crumbs([['Methode en bronnen', url('methode')]])}
<div class="wrap content prose"><h1>Methode en bronnen 2026</h1>
<p class="lead">Hoe de calculators rekenen, welke cijfers we gebruiken en waar elk cijfer vandaan komt.</p>${updatedLine()}
<p>Alle cijfers zijn opgehaald op <time datetime="${P.retrieved}">${esc(longDate(P.retrieved))}</time> van belastingdienst.nl, rijksoverheid.nl, wetten.overheid.nl en officielebekendmakingen.nl. Een cijfer met het label <span class="tag">Voorlopig</span> heeft de overheid zelf voorlopig genoemd.</p>
<nav aria-label="Op deze pagina" class="toc"><ul><li><a href="#zo-rekenen-we">Zo rekenen we</a></li><li><a href="#afronding">Afronding</a></li><li><a href="#controle">Controle</a></li><li><a href="#cijfers">Alle cijfers 2026</a></li><li><a href="#niet">Wat we niet berekenen</a></li><li><a href="#bronnen">Alle bronnen</a></li></ul></nav>
<h2 id="zo-rekenen-we">Zo rekenen we</h2>
<ul><li>We rekenen per jaar. Werkgevers rekenen per maand met de loonheffingstabellen. Over een heel jaar komt dat dicht bij elkaar.</li>
<li>Loonheffing is bij ons de inkomstenbelasting over je fiscale loon, min de algemene heffingskorting en de arbeidskorting.</li>
<li>Heffingskortingen gaan alleen af van de belasting die je betaalt. Je krijgt geen geld terug als de kortingen hoger zijn.</li>
<li>Aftrekposten, zelfstandigenaftrek en mkb-winstvrijstelling leveren maximaal ${pct(O.aftrekTariefBeperking)} op (tariefsaanpassing).</li>
<li>De arbeidskorting gaat uit van je arbeidsinkomen: loon plus winst vóór ondernemersaftrek en mkb-winstvrijstelling.</li>
<li>Vakantiegeld netto is het verschil in jaarbelasting met en zonder vakantiegeld.</li>
<li>Box 3 volgt de 6 stappen van de Belastingdienst voor 2026.</li>
<li>Alle berekeningen gebeuren in je eigen browser. We slaan niets op.</li></ul>
<h2 id="afronding">Afronding</h2>
<p>We ronden af zoals in de officiële rekenvoorbeelden:</p>
<ul><li>Belasting per schijf: naar beneden afgerond op hele euro's.</li><li>Heffingskortingen: naar beneden afgerond op hele euro's.</li><li>Box 3: rendement op bezittingen naar beneden, rendement op schulden naar boven, het aandeel in procenten afgekapt op 2 decimalen, het voordeel naar beneden.</li><li>Uitkomsten zoals netto per maand: afgerond op hele euro's.</li></ul>
<h2 id="controle">Controle</h2>
<p>De rekenregels zijn getest met 19 automatische tests. Daarin zitten de officiële rekenvoorbeelden van de Belastingdienst: box 3 (€ 417, € 72, € 4.667, € 1.842 en € 4.973) en box 2 (€ 70.000 geeft € 17.224). Alle voorbeelden komen op de euro uit.</p>
<p>We hebben het netto jaarloon van werknemers ook vergeleken met thetax.nl (17 oktober 2026, zonder vakantiegeld):</p>
${tbl(['Brutojaarloon', 'thetax.nl', 'Belastingcalculator', 'Verschil'], thetax)}
<p>De verschillen zijn maximaal € 2. Thetax.nl rekent in centen. Wij ronden kortingen en schijven af op hele euro's, zoals de Belastingdienst.</p>
<h2 id="cijfers">Alle cijfers 2026</h2>
<h3>Box 1: tarieven</h3>
${tbl(['Belastbaar inkomen', 'Onder de AOW-leeftijd'], brackets(P.box1.belowAOW, 2))}
${tbl(['Belastbaar inkomen', 'AOW-leeftijd, geboren 1946 of later'], brackets(P.box1.aowBornFrom1946, 2))}
${tbl(['Belastbaar inkomen', 'AOW-leeftijd, geboren vóór 1946'], brackets(P.box1.aowBornBefore1946, 2))}
${src(P.box1.src)}
<h3>Algemene heffingskorting</h3>
${kv([['Maximaal (onder AOW-leeftijd)', eur(A.belowAOW.max)], ['Afbouw vanaf', eur(A.belowAOW.phaseOutFrom)], ['Afbouw per euro', pct(A.belowAOW.phaseOutRate, 3)], ['€ 0 vanaf', eur(A.belowAOW.zeroFrom)], ['Maximaal (AOW-leeftijd)', eur(A.aowWholeYear.max)], ['Afbouw per euro (AOW-leeftijd)', pct(A.aowWholeYear.phaseOutRate, 3)]])}
${src(A.src)}
<h3>Arbeidskorting (onder de AOW-leeftijd)</h3>
${tbl(['Arbeidsinkomen', 'Arbeidskorting'], P.arbeidskorting.belowAOW.map(akRow))}
${src(P.arbeidskorting.src)}
<h3>Arbeidskorting (AOW-leeftijd)</h3>
${tbl(['Arbeidsinkomen', 'Arbeidskorting'], P.arbeidskorting.aowWholeYear.map(akRow))}
<h3>Andere heffingskortingen</h3>
${kv([['Inkomensafhankelijke combinatiekorting', `${pct(IA.belowAOW.rate, 2)} × (arbeidsinkomen − ${eur(IA.belowAOW.minArbeidsinkomen)}), maximaal ${eur(IA.belowAOW.max)}`], ['Combinatiekorting (AOW-leeftijd)', `maximaal ${eur(IA.aowWholeYear.max)}`], ['Ouderenkorting', `${eur(OK.max)}, lager vanaf ${eur(OK.phaseOutFrom)} (${pct(OK.phaseOutRate, 0)} per euro), € 0 vanaf ${eur(OK.zeroFrom)}`], ['Alleenstaande ouderenkorting', eur(P.alleenstaandeOuderenkorting.amount)], ['Jonggehandicaptenkorting (niet in de calculators)', eur(P.jonggehandicaptenkorting.amount)]])}
${src(['bd_fisin_kortingen', 'bd_va2026'])}
<h3>Ondernemers</h3>
${kv([['Urencriterium', `${num(O.urencriteriumUren)} uur`], ['Zelfstandigenaftrek', eur(O.zelfstandigenaftrek)], ['Zelfstandigenaftrek (AOW-leeftijd)', eur(O.zelfstandigenaftrekAOW)], ['Startersaftrek', eur(O.startersaftrek)], ['Startersaftrek (AOW-leeftijd)', eur(O.startersaftrekAOW)], ['Mkb-winstvrijstelling', pct(O.mkbWinstvrijstelling, 1)], ['Maximaal tarief voor aftrek', pct(O.aftrekTariefBeperking)], ['KOR-omzetgrens (btw)', eur(P.kor.omzetgrens)]])}
${src([...O.src, ...P.kor.src])}
<h3>Zorgverzekeringswet</h3>
${kv([['Bijdrage zzp\'ers en andere eigen inkomsten', pct(ZV.bijdrageZelf)], ['Werkgeversheffing', pct(ZV.werkgeversheffing, 2)], ['Maximaal bijdrage-inkomen', eur(ZV.maxBijdrageInkomen)]])}
${src(ZV.src)}
<h3>Box 2</h3>
${tbl(['Inkomen uit aanmerkelijk belang', 'Tarief'], brackets(P.box2.brackets))}
${src(P.box2.src)}
<h3>Box 3</h3>
${kv([['Heffingsvrij vermogen', eur(B3.heffingsvrijVermogen)], ['Heffingsvrij vermogen (fiscale partners)', eur(B3.heffingsvrijVermogenPartners)], ['Rendement banktegoeden' + voorlopig, pct(B3.rendement.bank.rate)], ['Rendement overige bezittingen', pct(B3.rendement.overig.rate, 2, 2)], ['Rendement schulden' + voorlopig, pct(B3.rendement.schulden.rate)], ['Schuldendrempel per persoon', eur(B3.schuldendrempelPerPersoon)], ['Vrijstelling groene beleggingen per persoon', eur(B3.groeneBeleggingenVrijstellingPerPersoon)], ['Tarief', pct(B3.tarief)]])}
${src(B3.src)}
<h3>30%-regeling</h3>
${kv([['Maximale vergoeding', pct(X.pct, 0)], ['Salarisnorm', eur(X.salarisnorm)], ['Salarisnorm jonger dan 30 met master', eur(X.salarisnormOnder30Master)], ['WNT-norm', eur(X.wntNorm)], ['Maximale vergoeding in euro', eur(X.maxVergoeding)]])}
${src(X.src)}
<h3>Zorgtoeslag</h3>
${kv([['Standaardpremie', eur(Z.standaardpremie)], ['Maximaal per maand (alleenstaand)', eur(Z.tableSingle[0][1])], ['Maximaal per maand (met toeslagpartner)', eur(Z.tablePartner[0][1])], ['Geen zorgtoeslag vanaf (alleenstaand)', eur(zGrens(Z.tableSingle))], ['Geen zorgtoeslag vanaf (met toeslagpartner)', eur(zGrens(Z.tablePartner))]])}
<details><summary>Hele tabel zorgtoeslag 2026 (afgerond)</summary>
${tbl(['Toetsingsinkomen lager dan', 'Alleenstaand per maand', 'Met toeslagpartner per maand'], Z.tablePartner.map(([upTo, amt]) => { const s = Z.tableSingle.find(x => x[0] === upTo); return [eur(upTo), s ? eur(s[1]) : '€ 0', eur(amt)]; }))}</details>
${src(Z.src)}
<h3>Huurtoeslag${voorlopig}</h3>
${kv([['Huurgrens', `€ ${H.huurgrens.toFixed(2).replace('.', ',')}`], ['Kwaliteitskortingsgrens', `€ ${H.kwaliteitskortingsgrens.toFixed(2).replace('.', ',')}`], ['Aftoppingsgrens laag', `€ ${H.aftoppingsgrensLaag.toFixed(2).replace('.', ',')}`], ['Aftoppingsgrens hoog', `€ ${H.aftoppingsgrensHoog.toFixed(2).replace('.', ',')}`]])}
<p>Niet berekend: de formule voor de normhuur is niet gecontroleerd.</p>
${src(H.src)}
<h3>Kinderopvangtoeslag</h3>
${kv([['Maximale uurprijs dagopvang', `€ ${KO.maxUurprijs.dagopvang.toFixed(2).replace('.', ',')}`], ['Maximale uurprijs bso', `€ ${KO.maxUurprijs.bso.toFixed(2).replace('.', ',')}`], ['Maximale uurprijs gastouder', `€ ${KO.maxUurprijs.gastouder.toFixed(2).replace('.', ',')}`], ['Maximaal uren per maand', String(KO.maxUrenPerMaand)]])}
${src(KO.src)}
<h3>Kindgebonden budget <span class="tag">Niet geverifieerd</span></h3>
${kv([['Per kind', eur(KB.perKind)], ['Extra 12 tot 15 jaar', eur(KB.extra12tot15)], ['Extra 16 en 17 jaar', eur(KB.extra16tot17)], ['Extra alleenstaande ouder', eur(KB.alleenstaandeOuderKop)], ['Afbouw', pct(KB.afbouwRate, 1)], ['Afbouw vanaf (alleenstaand)', eur(KB.drempelAlleenstaand)], ['Afbouw vanaf (partners)', eur(KB.drempelPartners)]])}
<p>Deze bedragen zijn nog niet door ons in de wettekst gecontroleerd. We gebruiken ze niet in een calculator.</p>
${src(KB.src)}
<h2 id="niet">Wat we niet berekenen</h2>
<ul><li>De loonheffingstabellen per maand en het tarief voor bijzondere beloningen.</li>
<li>Het tarief per maand als je in 2026 de AOW-leeftijd bereikt.</li>
<li>De jonggehandicaptenkorting, bijtelling voor een auto van de zaak en de eigen woning in detail.</li>
<li>Btw, de KOR en de vennootschapsbelasting.</li>
<li>Huurtoeslag, kinderopvangtoeslag en kindgebonden budget. Daarvoor verwijzen we naar de <a href="${OFFICIAL.proef}" rel="noopener">proefberekening van Dienst Toeslagen</a>.</li>
<li>De vermogensgrens voor zorgtoeslag.</li></ul>
<h2 id="bronnen">Alle bronnen</h2>
<p>Opgehaald op <time datetime="${P.retrieved}">${esc(longDate(P.retrieved))}</time>.</p>
<ol class="sources">${Object.entries(S).map(([id, u]) => `<li>${esc(srcName(id))}<br><a href="${esc(u)}" rel="noopener">${esc(u)}</a></li>`).join('')}</ol>
${DISCLAIMER}
</div>`;
  emit(ROUTES.methode, page({ rel: ROUTES.methode, title: 'Methode en bronnen 2026 | Belastingcalculator', desc: 'Hoe Belastingcalculator rekent: alle tarieven en kortingen van 2026, de afrondingsregels, voorlopige cijfers en elke officiële bron met datum.', body, nav: 'methode', ld: { '@context': 'https://schema.org', ...breadcrumbLd([['Methode en bronnen', abs(ROUTES.methode)]]) } }));
}

// Simple text pages
const textPage = (key, h1, title, desc, html) => emit(ROUTES[key], page({ rel: ROUTES[key], title, desc,
  body: `${crumbs([[h1, url(key)]])}<div class="wrap content prose"><h1>${esc(h1)}</h1>${updatedLine()}${html}</div>`, ld: { '@context': 'https://schema.org', ...breadcrumbLd([[h1, abs(ROUTES[key])]]) } }));
textPage('privacy', 'Privacyverklaring 2026', 'Privacyverklaring 2026 | Belastingcalculator', 'Belastingcalculator gebruikt geen cookies en geen trackers. Je berekening blijft in je eigen browser. Lees wat er wel en niet gebeurt met je gegevens.', `
<p class="lead">Kort: we gebruiken geen cookies en geen trackers, en we slaan je berekeningen niet op.</p>
<h2>Je berekening blijft bij jou</h2>
<p>Alle berekeningen gebeuren in je eigen browser. De bedragen die je invult, gaan niet naar ons of naar iemand anders.</p>
<p>Je invoer staat wel in het adres van de pagina (bijvoorbeeld <code>?bruto=4000</code>). Zo kun je een berekening delen met de knop "Kopieer link". Deel je die link, dan ziet de ontvanger jouw bedragen. Je browser kan het adres in je geschiedenis bewaren.</p>
<h2>Geen cookies, geen trackers</h2>
<p>We plaatsen geen cookies. We gebruiken geen analytics, geen advertentienetwerken en geen social-media-knoppen. Daarom vragen we ook geen toestemming met een cookiebanner.</p>
<h2>Hosting</h2>
<p>De site staat op GitHub Pages. GitHub verwerkt technische gegevens, zoals je IP-adres, om de pagina's te leveren en te beveiligen. Lees de <a href="${OFFICIAL.ghPrivacy}" rel="noopener" hreflang="en">privacyverklaring van GitHub</a> (Engels).</p>
<h2>Links naar andere sites</h2>
<p>We linken naar de Belastingdienst, de Rijksoverheid en een paar commerciële diensten. Klik je daarop, dan geldt het privacybeleid van die site. Zie ook de <a href="${url('affiliate')}">affiliate-disclosure</a>.</p>
<h2>Vragen</h2>
<p>Heb je een vraag over privacy? Maak een melding op <a href="${OFFICIAL.contact}" rel="noopener">GitHub</a>.</p>`);
textPage('affiliate', 'Affiliate-disclosure 2026', 'Affiliate-disclosure 2026 | Belastingcalculator', 'Hoe Belastingcalculator geld kan verdienen met links naar boekhoudprogramma\'s en een zakelijke rekening, en waarom dat de berekeningen niet beïnvloedt.', `
<p class="lead">Op een paar pagina's staan links naar commerciële diensten. Die zijn duidelijk gemarkeerd met "Advertentie / affiliate".</p>
<h2>Wat is een affiliate-link?</h2>
<p>Als je via zo'n link een account aanmaakt of een abonnement neemt, kunnen wij een vergoeding krijgen van die dienst. Jij betaalt daar niets extra voor.</p>
<h2>Welke diensten?</h2>
<ul>${[...AFFILIATE.boekhouden, ...AFFILIATE.bank].map(a => `<li>${esc(a.name)}: ${esc(a.what)}</li>`).join('')}</ul>
<p>Op dit moment zijn dit gewone links naar de websites van deze diensten. Ze kunnen later affiliate-links worden. Alle links hebben het kenmerk <code>rel="sponsored"</code>.</p>
<h2>Onze regels</h2>
<ul><li>De berekeningen zijn nooit afhankelijk van een affiliate-partij.</li><li>We zetten diensten op alfabetische volgorde. We noemen niets "de beste".</li><li>We schrijven geen reviews en tonen geen beoordelingen.</li><li>We tonen geen advertenties van advertentienetwerken.</li></ul>`);
textPage('over', 'Over Belastingcalculator (2026)', 'Over Belastingcalculator: belasting rekenen in 2026', 'Belastingcalculator is een onafhankelijke, gratis site om je belasting voor 2026 te berekenen. Lees hoe we werken en hoe je contact opneemt.', `
<p class="lead">${BRAND} is een gratis, onafhankelijke site om je belasting voor 2026 uit te rekenen. Zonder account, zonder cookies.</p>
<h2>Waarom deze site?</h2>
<p>De rekenhulpen van de overheid zijn betrouwbaar, maar leggen weinig uit. Veel andere calculators laten niet zien waar hun cijfers vandaan komen. Wij laten elke stap van de berekening zien, met de officiële bron erbij.</p>
<h2>Hoe we werken</h2>
<ul><li>Elk cijfer komt van een officiële bron. Je vindt ze allemaal op <a href="${url('methode')}">methode en bronnen</a>.</li><li>We testen de rekenregels met de rekenvoorbeelden van de Belastingdienst.</li><li>De rekenregels en teksten zijn gemaakt met hulp van AI en daarna gecontroleerd tegen de bronnen.</li><li>We geven geen belastingadvies. Twijfel je? Vraag het aan de Belastingdienst of een belastingadviseur.</li></ul>
<h2>Onafhankelijk</h2>
<p>We zijn niet verbonden aan de Belastingdienst, Dienst Toeslagen of de Rijksoverheid. Op een paar pagina's staan gemarkeerde affiliate-links. Lees de <a href="${url('affiliate')}">affiliate-disclosure</a>.</p>
<h2>Contact</h2>
<p>Zie je een fout of heb je een vraag? Maak een melding op <a href="${OFFICIAL.contact}" rel="noopener">GitHub</a>.</p>`);

// 404 (GitHub Pages serves dist/404.html for unknown paths; all links are absolute)
write('404.html', page({ rel: '404.html', title: 'Pagina niet gevonden | Belastingcalculator 2026', desc: 'Deze pagina bestaat niet. Kies een van de calculators voor 2026 of lees een van de gidsen.', robots: 'noindex',
  body: `<div class="wrap content prose"><h1>Deze pagina bestaat niet</h1>${updatedLine()}<p class="lead">Misschien is het adres verkeerd getypt, of is de pagina verhuisd. Kies hieronder een calculator.</p></div><div class="wrap content">${otherCalcs('')}<p class="more"><a href="${BASE}/">Naar de startpagina</a></p></div>` }));

// Sitemap, robots
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(([rel, d]) => `<url><loc>${abs(rel)}</loc><lastmod>${d}</lastmod></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);

// Checks: unique titles and descriptions
const seen = new Map();
for (const [rel] of pages) { const html = fs.readFileSync(path.join(OUT, rel, 'index.html'), 'utf8'); const t = html.match(/<title>(.*?)<\/title>/)[1], d = html.match(/<meta name="description" content="(.*?)"/)[1];
  for (const k of [`t:${t}`, `d:${d}`]) { if (seen.has(k)) throw new Error(`duplicate ${k.startsWith('t') ? 'title' : 'description'} on ${rel} and ${seen.get(k)}`); seen.set(k, rel || '/'); }
  if (!/2026/.test(t)) throw new Error(`title without 2026: ${rel}`); }
console.log(`wrote ${pages.length} pages (${guides.length} gidsen) to ${OUT}/`);
