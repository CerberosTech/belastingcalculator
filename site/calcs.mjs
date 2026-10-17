// Calculator definitions, shared by the build (server-side HTML) and the browser bundle.
// One source of truth: the example result in the HTML and the live result use the same code.
// Rules for this file: no imports, and only top-level "export function" (build.mjs strips "export" to bundle it).
export function createCalcs(E, P, S, L) {
  // ---------- formatting (identical on server and client, no Intl dependency) ----------
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = n => String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const eur = n => (n < 0 && Math.round(n) !== 0 ? '− ' : '') + '€ ' + num(n);
  const pct = (x, max = 2, min = 0) => { let s = (Math.abs(x) * 100).toFixed(max); if (max > min) s = s.replace(new RegExp(`0{1,${max - min}}$`), '').replace(/\.$/, ''); return (x < 0 ? '−' : '') + s.replace('.', ',') + '%'; };
  const dec = (x, d = 2) => String(x).includes('.') ? x.toFixed(d).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',') : String(x);
  const pos = x => Math.max(0, x);
  const tag = t => ` <span class="tag">${t}</span>`;
  const src = (id, text) => `<a href="${esc(S[id])}" rel="noopener">${text}</a>`;
  const aowKey = on => on ? 'aow' : 'none';

  // ---------- result building blocks ----------
  // Ledger rows: {h} = section heading; {l, v, o, c, n} = label, value, operator (+ − =), class (sub|total|muted), note.
  const row = (l, v, o = '', c = '', n = '') => ({ l, v, o, c, n });
  const head = (h) => ({ h });
  const val = v => typeof v === 'number' ? eur(v) : v;
  function ledger(rows, caption) {
    return `<table class="ledger"><caption class="vh">${esc(caption)}</caption><tbody>${rows.filter(Boolean).map(r => r.h
      ? `<tr class="lh"><th colspan="3" scope="colgroup">${r.h}</th></tr>`
      : `<tr${r.c ? ` class="${r.c}"` : ''}><th scope="row">${r.l}${r.n ? `<span class="ln">${r.n}</span>` : ''}</th><td class="op"${r.o === '=' || r.o === '+' ? ' aria-hidden="true"' : ''}>${r.o}</td><td class="amt">${val(r.v)}</td></tr>`).join('')}</tbody></table>`;
  }
  const note = html => `<p class="rnote">${html}</p>`;
  const notes = list => list.filter(Boolean).length ? `<ul class="rnotes">${list.filter(Boolean).map(x => `<li>${x}</li>`).join('')}</ul>` : '';
  const kortingRows = (k, aow) => [
    k.ahk ? row('Algemene heffingskorting', k.ahk, '−') : null,
    k.arbeidskorting ? row('Arbeidskorting', k.arbeidskorting, '−') : null,
    k.iack ? row('Inkomensafhankelijke combinatiekorting', k.iack, '−') : null,
    aow && k.ouderenkorting ? row('Ouderenkorting', k.ouderenkorting, '−') : null,
    aow && k.alleenstaandeOuderenkorting ? row('Alleenstaande ouderenkorting', k.alleenstaandeOuderenkorting, '−') : null,
  ];
  const unusedNote = t => t.kortingenGebruikt < t.kortingenTotaal ? note(`Je hebt ${eur(t.kortingenTotaal)} aan heffingskortingen, maar je betaalt maar ${eur(t.kortingenGebruikt)} belasting. Het verschil (${eur(t.kortingenTotaal - t.kortingenGebruikt)}) kun je niet verrekenen.`) : '';

  // ---------- calculators ----------
  const C = {};

  // Bruto → netto and netto → bruto for an employee
  C.netto = {
    id: 'netto', title: 'Netto salaris',
    sources: ['bd_fisin_berekening', 'bd_fisin_kortingen', 'bd_tabel_ak2026', 'bd_va2026'],
    fields: [
      { name: 'modus', type: 'choice', label: 'Wat wil je berekenen?', def: 'bruto', options: [['bruto', 'Bruto naar netto'], ['netto', 'Netto naar bruto']] },
      { name: 'periode', type: 'choice', label: 'Bedrag per', def: 'maand', options: [['maand', 'Maand'], ['jaar', 'Jaar']] },
      { name: 'bruto', type: 'money', def: 4000, max: 1e7, label: v => `Brutoloon per ${v.periode}`, help: 'Zonder vakantiegeld. Kijk op je loonstrook of in je contract.', show: v => v.modus === 'bruto' },
      { name: 'netto', type: 'money', def: 3000, max: 60000 * 12, label: v => `Gewenst nettoloon per ${v.periode}`, help: 'Wat je per maand op je rekening wilt zien, zonder vakantiegeld.', show: v => v.modus === 'netto' },
      { name: 'vakantiegeld', type: 'toggle', def: true, label: 'Ik krijg 8% vakantiegeld', help: '8% is het wettelijke minimum. Een cao kan meer geven.', show: v => v.modus === 'bruto' },
      { name: 'pensioen', type: 'pct', def: 0, max: 30, label: 'Pensioenpremie die jij betaalt', help: 'Het werknemersdeel. Dit staat op je loonstrook, vaak tussen 0 en 8%.' },
      { name: 'aow', type: 'toggle', def: false, label: 'Ik heb de AOW-leeftijd', help: 'Dan betaal je geen AOW-premie in de eerste schijf.' },
    ],
    compute(v) {
      const aow = aowKey(v.aow), pens = v.pensioen / 100;
      if (v.modus === 'netto') {
        const doel = v.periode === 'maand' ? v.netto : v.netto / 12;
        const b = E.brutoVoorNetto(doel, { pensioenPctWerknemer: pens, aow });
        const r = E.nettoSalaris({ brutoMaand: b, vakantiegeld: false, pensioenPctWerknemer: pens, aow });
        const maxed = b >= 100000;
        return {
          head: { label: `Benodigd brutoloon per ${v.periode}`, value: eur(v.periode === 'maand' ? b : b * 12), sub: [`Dat is ${eur(b * 12)} per jaar, zonder vakantiegeld.`, `Netto houd je dan ${eur(r.nettoMaandGemiddeld)} per maand over.`] },
          rows: nettoRows(r, v, `12 × ${eur(b)}`),
          after: (maxed ? note('Dit bedrag valt buiten het bereik van de calculator (maximaal € 100.000 bruto per maand).') : '')
            + notes(['Krijg je vakantiegeld? Dan komt dat bovenop dit brutoloon.', 'Je werkgever rekent per maand met de loonheffingstabellen. Over het hele jaar komt het op deze bedragen uit.']),
          live: `Benodigd brutoloon: ${eur(v.periode === 'maand' ? b : b * 12)} per ${v.periode}.`,
        };
      }
      const jaar = v.periode === 'maand' ? v.bruto * 12 : v.bruto;
      const r = E.nettoSalaris({ brutoJaar: jaar, vakantiegeld: v.vakantiegeld, pensioenPctWerknemer: pens, aow });
      const r2 = E.nettoSalaris({ brutoJaar: jaar + 1000, vakantiegeld: v.vakantiegeld, pensioenPctWerknemer: pens, aow });
      const extra = Math.round((r2.nettoJaar - r.nettoJaar) / (v.vakantiegeld ? 10.8 : 10));
      const maand = v.vakantiegeld ? r.nettoMaandExclVakantiegeld : r.nettoMaandGemiddeld;
      const primary = v.periode === 'maand' ? { label: 'Netto per maand', value: eur(maand) } : { label: 'Netto per jaar', value: eur(r.nettoJaar) };
      const sub = v.periode === 'maand'
        ? [`Dat is ${eur(r.nettoJaar)} netto per jaar${v.vakantiegeld ? ', inclusief vakantiegeld' : ''}.`, v.vakantiegeld ? `Je vakantiegeld is netto ${eur(r.nettoVakantiegeld)}. Meestal krijg je dat in mei of juni.` : '']
        : [`Dat is ${eur(maand)} netto per maand${v.vakantiegeld ? `, plus ${eur(r.nettoVakantiegeld)} netto vakantiegeld` : ''}.`];
      return {
        head: { ...primary, sub },
        rows: nettoRows(r, v, v.periode === 'maand' ? `12 × ${eur(v.bruto)}` : ''),
        after: notes([
          `Gemiddeld betaal je ${pct(r.gemiddeldTarief, 1)} loonheffing over je fiscale loon.`,
          jaar > 0 ? `Van elke € 100 die je bruto extra verdient, houd je ongeveer ${eur(extra)} netto over.` : '',
          'Je werkgever rekent per maand met de loonheffingstabellen. Over het hele jaar komt het op deze bedragen uit.',
        ]) + unusedNote(r.detail),
        live: `${primary.label}: ${primary.value}.`,
      };
    },
  };
  function nettoRows(r, v, brutoNote) {
    const d = r.detail;
    return [
      head('Bedragen per jaar'),
      row('Brutoloon', r.brutoJaar, '', '', brutoNote),
      r.vakantiegeld ? row('Vakantiegeld (8%)', r.vakantiegeld, '+') : null,
      r.pensioen ? row(`Pensioenpremie (${dec(v.pensioen)}%)`, r.pensioen, '−') : null,
      row('Fiscaal loon', r.fiscaalLoon, '=', 'sub'),
      row('Belasting en premies box 1', d.box1, '', '', 'Volgens de schijven van 2026'),
      ...kortingRows(d.kortingen, v.aow),
      row('Loonheffing', r.loonheffing, '=', 'sub'),
      row('Netto per jaar', r.nettoJaar, '=', 'total', 'Fiscaal loon min loonheffing'),
    ];
  }

  // Compact version for the home page
  C.snel = {
    id: 'snel', title: 'Snel netto berekenen', sources: C.netto.sources,
    fields: [
      { name: 'bruto', type: 'money', def: 3500, max: 1e6, label: 'Brutoloon per maand' },
      { name: 'vakantiegeld', type: 'toggle', def: true, label: 'Met 8% vakantiegeld' },
    ],
    compute(v) {
      const r = E.nettoSalaris({ brutoMaand: v.bruto, vakantiegeld: v.vakantiegeld });
      const maand = v.vakantiegeld ? r.nettoMaandExclVakantiegeld : r.nettoMaandGemiddeld;
      const q = `?modus=bruto&periode=maand&bruto=${Math.round(v.bruto)}&vakantiegeld=${v.vakantiegeld ? 1 : 0}&pensioen=0&aow=0`;
      return {
        head: { label: 'Netto per maand', value: eur(maand), sub: [`${eur(r.nettoJaar)} netto per jaar${v.vakantiegeld ? `, waarvan ${eur(r.nettoVakantiegeld)} vakantiegeld` : ''}.`] },
        rows: [row('Brutoloon per jaar', r.brutoJaar), r.vakantiegeld ? row('Vakantiegeld', r.vakantiegeld, '+') : null, row('Loonheffing', r.loonheffing, '−'), row('Netto per jaar', r.nettoJaar, '=', 'total')],
        after: `<p class="more"><a href="${L.netto}${q}">Bekijk de hele berekening</a></p>`,
        live: `Netto per maand: ${eur(maand)}.`,
      };
    },
  };

  // Full income tax return (box 1, 2, 3)
  C.ib = {
    id: 'ib', title: 'Inkomstenbelasting',
    sources: ['bd_fisin_berekening', 'bd_fisin_kortingen', 'bd_tabel_ak2026', 'bd_box2', 'bd_box3_2026', 'bd_zelfstandigenaftrek2026', 'bd_mkb2026'],
    fields: [
      { type: 'group', label: 'Box 1: werk en woning' },
      { name: 'loon', type: 'money', def: 45000, max: 1e8, label: 'Loon per jaar', help: 'Fiscaal loon van je jaaropgaaf, ook uitkering of pensioen.' },
      { name: 'winst', type: 'money', def: 0, max: 1e8, label: 'Winst uit onderneming', help: 'Vóór zelfstandigenaftrek en mkb-winstvrijstelling.' },
      { name: 'uren', type: 'toggle', def: true, label: `Ik haal het urencriterium (${num(P.ondernemer.urencriteriumUren)} uur)`, help: 'Dan krijg je zelfstandigenaftrek.', show: v => v.winst > 0 },
      { name: 'overig', type: 'money', def: 0, max: 1e8, label: 'Overig inkomen box 1', help: 'Bijvoorbeeld inkomsten uit freelance werk zonder onderneming.' },
      { name: 'aftrek', type: 'money', def: 0, max: 1e8, label: 'Aftrekposten', help: 'Bijvoorbeeld hypotheekrente min eigenwoningforfait, giften of zorgkosten.' },
      { type: 'group', label: 'Box 2 en box 3' },
      { name: 'box2', type: 'money', def: 0, max: 1e8, label: 'Inkomen uit aanmerkelijk belang (box 2)', help: 'Bijvoorbeeld dividend uit je eigen bv.' },
      { name: 'box3', type: 'money', def: 0, max: 1e8, label: 'Voordeel uit sparen en beleggen (box 3)', help: `Weet je dit niet? Bereken het met de <a href="${L.box3}">box 3-calculator</a>.` },
      { type: 'group', label: 'Jouw situatie' },
      { name: 'kind', type: 'toggle', def: false, label: 'Ik heb een kind jonger dan 12', help: 'Het kind woont bij je. Met een partner krijgt de partner met het laagste arbeidsinkomen deze korting.' },
      { name: 'aow', type: 'select', def: 'none', label: 'Leeftijd', options: [['none', 'Jonger dan de AOW-leeftijd'], ['aow', 'AOW-leeftijd, geboren in 1946 of later'], ['born<1946', 'AOW-leeftijd, geboren vóór 1946']], help: 'Bereik je in 2026 de AOW-leeftijd? Kies dan "jonger". De calculator rekent niet met het tarief per maand.' },
      { name: 'alleen', type: 'toggle', def: false, label: 'Ik heb AOW voor een alleenstaande', show: v => v.aow !== 'none' },
    ],
    compute(v) {
      const aow = v.aow;
      let za = 0, mkb = 0;
      if (v.winst > 0) { const z = E.zzp({ winst: v.winst, urencriterium: v.uren, aow }); za = z.zelfstandigenaftrek; mkb = z.mkbWinstvrijstelling; }
      const t = E.incomeTax({ loon: v.loon, winst: v.winst, overigBox1: v.overig, aftrekposten: v.aftrek, box2: v.box2, box3: v.box3, aow, kindOnder12: v.kind, alleenstaandeAOW: v.alleen, ondernemersaftrek: za, mkbVrijstelling: mkb });
      const aowOn = aow !== 'none';
      const voor = t.box1 + t.box2 + t.box3;
      return {
        head: { label: 'Inkomstenbelasting 2026', value: eur(t.totaal), sub: [t.verzamelinkomen > 0 ? `Dat is ${pct(t.totaal / t.verzamelinkomen, 1)} van je verzamelinkomen van ${eur(t.verzamelinkomen)}.` : ''] },
        rows: [
          head('Box 1: werk en woning'),
          row('Loon', v.loon),
          v.winst ? row('Winst uit onderneming', v.winst, '+') : null,
          za ? row('Zelfstandigenaftrek', za, '−') : null,
          mkb ? row(`Mkb-winstvrijstelling (${pct(P.ondernemer.mkbWinstvrijstelling, 1)})`, mkb, '−') : null,
          v.overig ? row('Overig inkomen', v.overig, '+') : null,
          v.aftrek ? row('Aftrekposten', v.aftrek, '−') : null,
          row('Belastbaar inkomen box 1', t.belastbaarBox1, '=', 'sub'),
          row('Belasting box 1', t.box1 - t.tariefsaanpassing, '', '', 'Inclusief premies volksverzekeringen'),
          t.tariefsaanpassing ? row('Tariefsaanpassing', t.tariefsaanpassing, '+', '', `Aftrek levert maximaal ${pct(P.ondernemer.aftrekTariefBeperking)} op`) : null,
          v.box2 ? head('Box 2: aanmerkelijk belang') : null,
          v.box2 ? row('Inkomen box 2', v.box2, '', 'muted') : null,
          v.box2 ? row('Belasting box 2', t.box2, '+') : null,
          v.box3 ? head('Box 3: sparen en beleggen') : null,
          v.box3 ? row('Voordeel box 3', v.box3, '', 'muted') : null,
          v.box3 ? row(`Belasting box 3 (${pct(P.box3.tarief)})`, t.box3, '+') : null,
          head('Heffingskortingen'),
          row('Belasting vóór heffingskortingen', voor, '=', 'sub'),
          ...kortingRows(t.kortingen, aowOn),
          row('Inkomstenbelasting', t.totaal, '=', 'total'),
        ],
        after: unusedNote(t) + notes([
          'Heeft je werkgever al loonheffing ingehouden? Dan trek je die van dit bedrag af. Het verschil betaal je bij of krijg je terug.',
          v.winst ? `De Zvw-bijdrage over je winst zit hier niet in. Die zie je in de <a href="${L.zzp}">zzp-calculator</a>.` : '',
          v.kind ? 'Heb je een partner? Dan krijgt alleen de partner met het laagste arbeidsinkomen de combinatiekorting.' : '',
        ]),
        live: `Inkomstenbelasting 2026: ${eur(t.totaal)}.`,
      };
    },
  };

  // ZZP / IB-ondernemer
  C.zzp = {
    id: 'zzp', title: 'Zzp-belasting',
    sources: ['bd_zelfstandigenaftrek2026', 'bd_mkb2026', 'bd_urencriterium', 'bd_fisin_zvw', 'bd_zvw_pct', 'bd_fisin_berekening', 'bd_fisin_kortingen', 'ro_sleuteltabel2026'],
    fields: [
      { type: 'group', label: 'Je onderneming' },
      { name: 'winst', type: 'money', def: 50000, max: 1e8, label: 'Verwachte winst in 2026', help: 'Omzet min kosten, zonder btw. Vóór zelfstandigenaftrek.' },
      { name: 'uren', type: 'toggle', def: true, label: `Ik werk minstens ${num(P.ondernemer.urencriteriumUren)} uur aan mijn onderneming`, help: 'Dit is het urencriterium. Ook reistijd en administratie tellen mee.' },
      { name: 'starter', type: 'toggle', def: false, label: 'Ik ben starter', help: 'Je was in 1 of meer van de vorige 5 jaren geen ondernemer, en je kreeg in die jaren maximaal 2 keer zelfstandigenaftrek.', show: v => v.uren },
      { name: 'loon', type: 'money', def: 0, max: 1e8, label: 'Loon uit een baan ernaast (per jaar)', help: 'Laat leeg als je alleen zzp\'er bent.' },
      { name: 'aow', type: 'toggle', def: false, label: 'Ik heb de AOW-leeftijd' },
      { type: 'group', label: 'Vergelijk met loondienst' },
      { name: 'bruto', type: 'money', def: 50000, max: 1e8, label: 'Brutojaarloon van een vergelijkbare baan', help: 'Alles inbegrepen, ook vakantiegeld.' },
    ],
    compute(v) {
      const aow = aowKey(v.aow);
      const z = E.zzp({ winst: v.winst, urencriterium: v.uren, starter: v.starter && v.uren, aow, loon: v.loon });
      const t = z.ib, perMaand = z.totaalAfdracht / 12;
      const c = E.vergelijk({ brutoJaar: v.bruto, winst: v.winst, urencriterium: v.uren, starter: v.starter && v.uren });
      const zvwPct = pct(P.zvw.bijdrageZelf);
      return {
        head: { label: 'Zet apart van je winst', value: pct(z.reserveerPct, 0), sub: [`Dat is ${eur(z.totaalAfdracht)} per jaar, of ${eur(perMaand)} per maand.`, `Na belasting houd je ${eur(z.nettoNaBelasting)} over (${eur(z.nettoNaBelasting / 12)} per maand).`] },
        rows: [
          head('Winst'),
          row('Winst', v.winst),
          z.zelfstandigenaftrek ? row('Zelfstandigenaftrek', z.zelfstandigenaftrek, '−') : null,
          z.startersaftrek ? row('Startersaftrek', z.startersaftrek, '−') : null,
          z.mkbWinstvrijstelling ? row(`Mkb-winstvrijstelling (${pct(P.ondernemer.mkbWinstvrijstelling, 1)})`, z.mkbWinstvrijstelling, '−') : null,
          row('Belastbare winst', z.belastbareWinst, '=', 'sub'),
          head('Inkomstenbelasting'),
          v.loon ? row('Loon uit je baan', v.loon, '+') : null,
          v.loon ? row('Belastbaar inkomen box 1', t.belastbaarBox1, '=', 'sub') : null,
          row('Belasting box 1', t.box1 - t.tariefsaanpassing, '', '', 'Inclusief premies volksverzekeringen'),
          t.tariefsaanpassing ? row('Tariefsaanpassing', t.tariefsaanpassing, '+', '', `Aftrek levert maximaal ${pct(P.ondernemer.aftrekTariefBeperking)} op`) : null,
          ...kortingRows(t.kortingen, v.aow),
          row('Inkomstenbelasting', t.totaal, '=', 'sub'),
          v.loon ? row('Al ingehouden via je loon', t.totaal - z.ibOverWinst, '−', '', 'Schatting: belasting als je geen winst had') : null,
          v.loon ? row('Inkomstenbelasting over je winst', z.ibOverWinst, '=', 'sub') : null,
          head('Zorgverzekeringswet'),
          row(`Zvw-bijdrage (${zvwPct})`, z.zvw, '+', '', `Over maximaal ${eur(P.zvw.maxBijdrageInkomen)}${v.loon ? ' samen met je loon' : ''}`),
          row('Totaal apart zetten', z.totaalAfdracht, '=', 'total'),
        ],
        after: unusedNote(t) + notes([
          'Btw zit hier niet in. Btw draag je apart af per kwartaal.',
          z.winst > 0 && !v.uren ? 'Zonder urencriterium krijg je geen zelfstandigenaftrek en geen startersaftrek. De mkb-winstvrijstelling krijg je wel.' : '',
          `Vraag een voorlopige aanslag aan. Dan betaal je de belasting per maand en krijg je geen grote rekening achteraf.`,
        ]) + compare(c, v),
        live: `Zet ${pct(z.reserveerPct, 0)} apart: ${eur(z.totaalAfdracht)} per jaar.`,
      };
    },
  };
  function compare(c, v) {
    const diff = c.verschil;
    return `<section class="compare" aria-labelledby="cmp-h"><h3 id="cmp-h">Loondienst of zzp?</h3>
<p>Netto per jaar, met een brutoloon van ${eur(v.bruto)} en een winst van ${eur(v.winst)}.${v.aow || v.loon ? ' Deze vergelijking gaat uit van iemand onder de AOW-leeftijd zonder loon uit een baan ernaast.' : ''}</p>
${ledger([row('Netto in loondienst', c.loondienstNetto, '', '', 'Zonder vakantiegeld en zonder pensioenpremie'), row('Netto als zzp\'er', c.zzpNetto, '', '', 'Na inkomstenbelasting en Zvw-bijdrage'), row(diff >= 0 ? 'Zzp levert netto meer op' : 'Loondienst levert netto meer op', Math.abs(diff), '=', 'total')], 'Vergelijking loondienst en zzp')}
<p><strong>Dit verschil is niet het hele verhaal.</strong> Als zzp'er betaal je zelf voor zaken die een werkgever regelt:</p>
<ul class="caveats">
<li>Geen pensioen via je werkgever. Je bouwt zelf pensioen op.</li>
<li>Geen verzekering bij ziekte of arbeidsongeschiktheid. Een AOV of broodfonds kost geld.</li>
<li>Geen vakantiegeld en geen doorbetaalde vakantiedagen.</li>
<li>Geen loon bij ziekte. Een werknemer krijgt bij ziekte tot twee jaar (een deel van het) loon.</li>
<li>Geen WW als je opdrachten wegvallen.</li>
<li>Een werkgever betaalt bovenop het brutoloon nog premies, zoals de Zvw-werkgeversheffing van ${pct(P.zvw.werkgeversheffing, 1)}.</li>
</ul></section>`;
  }

  // Box 3
  C.box3 = {
    id: 'box3', title: 'Box 3',
    sources: ['bd_box3_2026', 'bd_werkelijk_rendement', 'bd_va2026'],
    fields: [
      { type: 'group', label: 'Je vermogen op 1 januari 2026' },
      { name: 'bank', type: 'money', def: 60000, max: 1e9, label: 'Banktegoeden', help: 'Spaargeld en betaalrekeningen.' },
      { name: 'overig', type: 'money', def: 40000, max: 1e9, label: 'Overige bezittingen', help: 'Beleggingen, crypto, een tweede woning of uitgeleend geld.' },
      { name: 'groen', type: 'money', def: 0, max: 1e9, label: 'Groene beleggingen', help: `Vrijgesteld tot ${eur(P.box3.groeneBeleggingenVrijstellingPerPersoon)} per persoon.` },
      { name: 'schulden', type: 'money', def: 0, max: 1e9, label: 'Schulden', help: `Niet je hypotheek voor je eigen huis. De eerste ${eur(P.box3.schuldendrempelPerPersoon)} per persoon telt niet mee.` },
      { type: 'group', label: 'Partner' },
      { name: 'partner', type: 'toggle', def: false, label: 'Ik heb een fiscale partner', help: 'Vul dan hierboven jullie vermogen samen in.' },
      { name: 'aandeel', type: 'pct', def: 50, max: 100, label: 'Jouw deel van de grondslag', help: 'Partners mogen de verdeling zelf kiezen.', show: v => v.partner },
      { type: 'group', label: 'Werkelijk rendement (tegenbewijs)' },
      { name: 'tegen', type: 'toggle', def: false, label: 'Vergelijk met mijn werkelijke rendement' },
      { name: 'werkelijk', type: 'money', def: 1500, max: 1e9, label: 'Werkelijk rendement in 2026', help: 'Rente, dividend, huur en waardestijging, min kosten. Met partner: samen. Verlies? Vul 0 in.', show: v => v.tegen },
    ],
    compute(v) {
      const B = P.box3, n = v.partner ? 2 : 1;
      const r = E.box3({ bank: v.bank, overig: v.overig, schulden: v.schulden, groeneBeleggingen: v.groen, partner: v.partner, aandeelPct: v.partner ? v.aandeel / 100 : null, werkelijkRendement: v.tegen ? v.werkelijk : null });
      const groenBelast = pos(v.groen - B.groeneBeleggingenVrijstellingPerPersoon * n), overigTot = v.overig + groenBelast;
      const T = r.tegenbewijs;
      return {
        head: { label: v.partner ? 'Jouw box 3-belasting 2026' : 'Box 3-belasting 2026', value: eur(r.belasting), sub: [`Voordeel uit sparen en beleggen: ${eur(r.voordeel)}.`, 'Voorlopig: de percentages voor banktegoeden en schulden staan pas na 2026 vast.'] },
        rows: [
          head('Forfaitair rendement'),
          row(`Banktegoeden${tag('Voorlopig')}`, r.rendementBank, '', '', `${eur(v.bank)} × ${pct(B.rendement.bank.rate)}`),
          row('Overige bezittingen', r.rendementOverig, '+', '', `${eur(overigTot)} × ${pct(B.rendement.overig.rate, 2, 2)}${groenBelast ? ', inclusief groene beleggingen boven de vrijstelling' : ''}`),
          r.aftrekbareSchuld ? row(`Schulden${tag('Voorlopig')}`, Math.abs(r.rendementSchulden), '−', '', `${eur(r.aftrekbareSchuld)} × ${pct(B.rendement.schulden.rate)}`) : null,
          row('Belastbaar rendement', r.belastbaarRendement, '=', 'sub'),
          head('Grondslag'),
          row('Rendementsgrondslag', r.rendementsgrondslag, '', '', 'Bezittingen min schulden boven de drempel'),
          row('Heffingsvrij vermogen', r.heffingsvrijVermogen, '−', '', v.partner ? 'Voor jullie samen' : ''),
          row('Grondslag sparen en beleggen', r.grondslagSparenBeleggen, '=', 'sub'),
          v.partner ? row('Jouw deel', r.mijnGrondslag, '', '', `${dec(v.aandeel)}% van de grondslag`) : null,
          row('Jouw aandeel in het rendement', pct(r.aandeelPct, 2, 2), '', 'muted', 'Jouw grondslag gedeeld door de rendementsgrondslag'),
          row('Voordeel uit sparen en beleggen', r.voordeel, '=', 'sub', 'Belastbaar rendement × jouw aandeel'),
          row(`Belasting box 3 (${pct(B.tarief)})`, r.belasting, '=', 'total'),
        ],
        after: (T ? `<section class="compare" aria-labelledby="tb-h"><h3 id="tb-h">Forfaitair of werkelijk rendement?</h3>
${ledger([row('Forfaitair', r.belasting, '', '', 'Volgens de berekening hierboven'), row('Werkelijk rendement', T.belasting, '', '', `${eur(T.werkelijkVoordeel)} × ${pct(B.tarief)}, zonder heffingsvrij vermogen`), row(T.voordeligst === 'werkelijk' ? 'Werkelijk rendement is goedkoper' : 'Forfaitair is goedkoper (of gelijk)', Math.abs(r.belasting - T.belasting), '=', 'total')], 'Vergelijking forfaitair en werkelijk rendement')}
<p>${T.voordeligst === 'werkelijk' ? `Je werkelijke rendement is lager. Dan mag je dat aantonen met het opgaaf-formulier. ${src('bd_werkelijk_rendement', 'Lees hoe dat werkt bij de Belastingdienst')}.` : 'Het forfaitaire rendement is voor jou niet hoger dan je werkelijke rendement. Tegenbewijs levert dan niets op.'}</p></section>` : '')
          + notes([
            `Het heffingsvrij vermogen is ${eur(B.heffingsvrijVermogen)} per persoon (${eur(B.heffingsvrijVermogenPartners)} met fiscale partner).`,
            r.rendementsgrondslag <= r.heffingsvrijVermogen ? 'Je vermogen blijft onder het heffingsvrij vermogen. Je betaalt geen box 3-belasting.' : '',
          ]),
        live: `Box 3-belasting 2026: ${eur(r.belasting)}.`,
      };
    },
  };

  // Vakantiegeld
  C.vakantiegeld = {
    id: 'vakantiegeld', title: 'Vakantiegeld',
    sources: ['bd_fisin_berekening', 'bd_fisin_kortingen', 'bd_tabel_ak2026'],
    fields: [
      { name: 'bruto', type: 'money', def: 3500, max: 1e6, label: 'Brutoloon per maand', help: 'Zonder vakantiegeld en zonder toeslagen.' },
      { name: 'pct', type: 'pct', def: 8, max: 25, label: 'Percentage vakantiegeld', help: 'Wettelijk minimaal 8%. Je cao of contract kan meer geven.' },
      { name: 'aow', type: 'toggle', def: false, label: 'Ik heb de AOW-leeftijd' },
    ],
    compute(v) {
      const r = E.vakantiegeld({ brutoMaand: v.bruto, pct: v.pct / 100, aow: aowKey(v.aow) });
      return {
        head: { label: 'Netto vakantiegeld', value: eur(r.netto), sub: [`Bruto ${eur(r.bruto)}. Je betaalt ${pct(r.marginaalTarief, 1)} belasting over je vakantiegeld.`] },
        rows: [
          row('Brutoloon per jaar', v.bruto * 12, '', 'muted', `12 × ${eur(v.bruto)}`),
          row(`Vakantiegeld bruto (${dec(v.pct)}%)`, r.bruto),
          row('Extra belasting', r.belasting, '−', '', 'Verschil in jaarbelasting met en zonder vakantiegeld'),
          row('Netto vakantiegeld', r.netto, '=', 'total'),
        ],
        after: notes([
          'Je werkgever houdt loonheffing in met het tarief voor bijzondere beloningen. Over het hele jaar komt het op dit bedrag uit.',
          'De meeste werkgevers betalen vakantiegeld in mei of juni.',
          r.marginaalTarief > 0.4 ? 'Het percentage is hoger dan je schijf omdat je heffingskortingen lager worden als je meer verdient.' : '',
        ]),
        live: `Netto vakantiegeld: ${eur(r.netto)}.`,
      };
    },
  };

  // 30% regeling
  C.expat = {
    id: 'expat', title: '30%-regeling',
    sources: ['bd_expat', 'bd_fisin_berekening', 'bd_fisin_kortingen'],
    fields: [
      { name: 'bruto', type: 'money', def: 70000, max: 1e8, label: 'Brutojaarloon', help: 'Inclusief vakantiegeld en de vergoeding zelf.' },
      { name: 'master', type: 'toggle', def: false, label: 'Ik ben jonger dan 30 en heb een masterdiploma', help: `Dan geldt een lagere salarisnorm: ${eur(P.expatregeling.salarisnormOnder30Master)} in plaats van ${eur(P.expatregeling.salarisnorm)}.` },
    ],
    compute(v) {
      const X = P.expatregeling, r = E.expat({ brutoJaar: v.bruto, onder30Master: v.master });
      const belast = v.bruto - r.vergoeding, full = Math.min(v.bruto * X.pct, X.maxVergoeding), cut = r.voldoetAanNorm && r.vergoeding < Math.round(full);
      return {
        head: { label: 'Netto voordeel per jaar', value: eur(r.voordeel), sub: [r.voldoetAanNorm ? `Dat is ${eur(r.voordeel / 12)} per maand extra.` : 'Je voldoet niet aan de salarisnorm. Dan krijg je geen 30%-regeling.'] },
        rows: [
          row('Brutojaarloon', v.bruto),
          row('Onbelaste vergoeding', r.vergoeding, '−', '', cut ? 'Verlaagd, zodat je loon boven de norm blijft' : `Maximaal ${pct(X.pct, 0)}, tot ${eur(X.maxVergoeding)}`),
          row('Belast loon', belast, '=', 'sub'),
          head('Netto per jaar'),
          row('Zonder 30%-regeling', r.nettoZonder),
          row('Met 30%-regeling', r.nettoMet),
          row('Voordeel', r.voordeel, '=', 'total'),
        ],
        after: `<div class="check ${r.voldoetAanNorm ? 'ok' : 'no'}"><p><strong>Salarisnorm 2026: ${r.voldoetAanNorm ? 'je voldoet' : 'je voldoet niet'}.</strong> Je belaste loon (${eur(belast)}) moet hoger zijn dan ${eur(r.norm)}${v.master ? ' (norm voor jonger dan 30 met master)' : ''}.</p></div>`
          + notes([
            `De vergoeding is maximaal ${pct(X.pct, 0)} van de WNT-norm van ${eur(X.wntNorm)}: ${eur(X.maxVergoeding)}.`,
            'Er gelden meer voorwaarden. Je werkgever moet je uit het buitenland hebben aangeworven en je moet een specifieke deskundigheid hebben die in Nederland schaars is. De Belastingdienst beslist.',
          ]),
        live: `Netto voordeel 30%-regeling: ${eur(r.voordeel)} per jaar.`,
      };
    },
  };

  // Zorgtoeslag
  const lastBelow = tab => { let g = 0; for (const [upTo, amt] of tab) { if (amt > 0) g = upTo; } return g; };
  C.zorgtoeslag = {
    id: 'zorgtoeslag', title: 'Zorgtoeslag',
    sources: ['bd_zorgtoeslag_hoeveel', 'stcrt_2025_40022'],
    fields: [
      { name: 'inkomen', type: 'money', def: 28000, max: 1e8, label: 'Toetsingsinkomen 2026', help: 'Je verwachte verzamelinkomen over 2026. Met toeslagpartner: jullie samen.' },
      { name: 'partner', type: 'toggle', def: false, label: 'Ik heb een toeslagpartner' },
    ],
    compute(v) {
      const r = E.zorgtoeslag({ toetsingsinkomen: v.inkomen, partner: v.partner });
      const Z = P.toeslagen.zorgtoeslag, grens = lastBelow(v.partner ? Z.tablePartner : Z.tableSingle);
      return {
        head: { label: 'Zorgtoeslag per maand', value: eur(r.perMaand), sub: [r.perMaand ? `Dat is ${eur(r.perJaar)} per jaar.` : `Met een inkomen vanaf ${eur(grens)} ${v.partner ? '(samen) ' : ''}krijg je volgens de tabel geen zorgtoeslag.`] },
        rows: [
          row('Toetsingsinkomen', v.inkomen, '', 'muted'),
          row('Zorgtoeslag per maand', r.perMaand, '', '', 'Uit de tabel van Dienst Toeslagen (per € 500 afgerond)'),
          row('Zorgtoeslag per jaar', r.perJaar, '=', 'total', '12 maanden'),
        ],
        after: notes([
          'Je moet 18 jaar of ouder zijn en een Nederlandse zorgverzekering hebben.',
          'Er geldt ook een grens voor je vermogen. Die controleert deze calculator niet.',
          `De tabel is afgerond. Het precieze bedrag zie je in de <a href="${L.proef}" rel="noopener">officiële proefberekening</a>.`,
        ]),
        live: `Zorgtoeslag: ${eur(r.perMaand)} per maand.`,
      };
    },
  };

  // ---------- values ----------
  // Dutch number input: "4.000", "4000,50", "€ 4.000" → number. Returns NaN when it is not a number.
  function parseNum(s) {
    s = String(s ?? '').replace(/[€\s %]/g, '').replace(/^\+/, '');
    if (s === '') return 0;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    return /^-?\d*\.?\d+$/.test(s) ? Number(s) : NaN;
  }
  const fieldsOf = calc => calc.fields.filter(f => f.name);
  const defaults = calc => Object.fromEntries(fieldsOf(calc).map(f => [f.name, f.def]));
  const isShown = (f, v) => !f.show || f.show(v);
  const labelOf = (f, v) => typeof f.label === 'function' ? f.label(v) : f.label;
  // Clean one raw value (string from a form or query); returns [value, error].
  function clean(f, raw) {
    if (f.type === 'toggle') return [raw === true || raw === '1' || raw === 'on' || raw === 'true', ''];
    if (f.type === 'choice' || f.type === 'select') return [f.options.some(o => o[0] === raw) ? raw : f.def, ''];
    const n = parseNum(raw);
    if (Number.isNaN(n)) return [f.def, f.type === 'pct' ? 'Vul een percentage in, bijvoorbeeld 5,5.' : 'Vul een bedrag in, bijvoorbeeld 4.000.'];
    if (n < 0) return [0, 'Vul een bedrag van 0 of hoger in.'];
    if (n > f.max) return [f.max, `Het maximum is ${f.type === 'pct' ? dec(f.max) + '%' : eur(f.max)}.`];
    return [n, ''];
  }
  const showValue = (f, x) => f.type === 'money' ? num(x) : f.type === 'pct' ? dec(x) : x;
  // Query string: only the fields that are shown, so a shared link gives the same result.
  function toQuery(calc, v) {
    const q = [];
    for (const f of fieldsOf(calc)) if (isShown(f, v)) q.push(`${f.name}=${encodeURIComponent(f.type === 'toggle' ? (v[f.name] ? 1 : 0) : f.type === 'money' || f.type === 'pct' ? String(Math.round(v[f.name] * 100) / 100) : v[f.name])}`);
    return q.join('&');
  }

  // ---------- rendering ----------
  function renderField(f, v, prefix) {
    if (f.type === 'group') return `<h3 class="fgroup">${esc(f.label)}</h3>`;
    const id = `${prefix}-${f.name}`, shown = isShown(f, v), hid = shown ? '' : ' hidden';
    const help = f.help ? `<p class="help" id="${id}-h">${f.help}</p>` : '';
    const desc = `${f.help ? `${id}-h ` : ''}${id}-e`;
    const err = `<p class="err" id="${id}-e" hidden></p>`;
    if (f.type === 'toggle') return `<div class="field toggle" data-field="${f.name}"${hid}><input type="checkbox" role="switch" id="${id}" name="${f.name}"${v[f.name] ? ' checked' : ''}${f.help ? ` aria-describedby="${id}-h"` : ''}><label for="${id}" data-label>${esc(labelOf(f, v))}</label>${help}</div>`;
    if (f.type === 'choice') return `<fieldset class="field seg" data-field="${f.name}"${hid}><legend data-label>${esc(labelOf(f, v))}</legend><div class="seg-opts">${f.options.map(([val, lab]) => `<input type="radio" id="${id}-${val}" name="${f.name}" value="${val}"${v[f.name] === val ? ' checked' : ''}><label for="${id}-${val}">${esc(lab)}</label>`).join('')}</div>${help}</fieldset>`;
    if (f.type === 'select') return `<div class="field" data-field="${f.name}"${hid}><label for="${id}" data-label>${esc(labelOf(f, v))}</label><select id="${id}" name="${f.name}"${f.help ? ` aria-describedby="${id}-h"` : ''}>${f.options.map(([val, lab]) => `<option value="${esc(val)}"${v[f.name] === val ? ' selected' : ''}>${esc(lab)}</option>`).join('')}</select>${help}</div>`;
    const money = f.type === 'money';
    return `<div class="field" data-field="${f.name}"${hid}><label for="${id}" data-label>${esc(labelOf(f, v))}</label><div class="affix ${money ? 'pre' : 'post'}">${money ? '<span aria-hidden="true">€</span>' : ''}<input id="${id}" name="${f.name}" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" value="${esc(showValue(f, v[f.name]))}" aria-describedby="${desc}">${money ? '' : '<span aria-hidden="true">%</span>'}</div>${help}${err}</div>`;
  }
  const renderFields = (calc, v, prefix = calc.id) => calc.fields.map(f => renderField(f, v, prefix)).join('');
  function renderHead(res) {
    return `<p class="r-label">${esc(res.head.label)}</p><p class="r-value"><mark>${res.head.value}</mark></p>${res.head.sub.filter(Boolean).map(s => `<p class="r-sub">${s}</p>`).join('')}`;
  }
  const renderBody = (calc, res) => ledger(res.rows, `Berekening ${calc.title}`) + (res.after || '');
  function render(calc, v) { const res = calc.compute(v); return { head: renderHead(res), body: renderBody(calc, res), live: res.live }; }
  const sourceLinks = calc => calc.sources.map(id => S[id]);

  return { C, esc, num, eur, pct, dec, parseNum, defaults, fieldsOf, isShown, labelOf, clean, showValue, toQuery, renderFields, render, sourceLinks, ledger, row, head };
}
