// Calculator definitions, shared by the build (server-side HTML) and the browser bundle.
// One source of truth: the example result in the HTML and the live result use the same code.
// Rules for this file: no imports, and only top-level "export function" (build.mjs strips "export" to bundle it).
// Language: lang is 'nl' (default) or 'en'. T(nl, en) keeps both texts side by side, so they stay in step.
// Field names and option values are the same in both languages: a shared query string works on both versions.
export function createCalcs(E, P, S, L, lang = 'nl') {
  const EN = lang === 'en';
  const T = (nl, en) => EN ? en : nl;
  // ---------- formatting (identical on server and client, no Intl dependency) ----------
  // nl: "€ 4.000", "37,56%". en: "€4,000", "37.56%".
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = n => String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, T('.', ','));
  const eur = n => (n < 0 && Math.round(n) !== 0 ? T('−\u00a0', '−') : '') + T('€\u00a0', '€') + num(n);
  const pct = (x, max = 2, min = 0) => { let s = (Math.abs(x) * 100).toFixed(max); if (max > min) s = s.replace(new RegExp(`0{1,${max - min}}$`), '').replace(/\.$/, ''); return (x < 0 ? '−' : '') + s.replace('.', T(',', '.')) + '%'; };
  const dec = (x, d = 2) => String(x).includes('.') ? x.toFixed(d).replace(/0+$/, '').replace(/\.$/, '').replace('.', T(',', '.')) : String(x);
  const pos = x => Math.max(0, x);
  const tag = t => ` <span class="tag">${t}</span>`;
  const src = (id, text) => `<a href="${esc(S[id])}" rel="noopener">${text}</a>`;
  const aowKey = on => on ? 'aow' : 'none';
  // Dutch term next to an English label (English pages only), marked lang="nl" for screen readers.
  const nlTerm = t => EN ? `<span lang="nl">${t}</span>` : '';
  const PERIOD = { maand: T('maand', 'month'), jaar: T('jaar', 'year') };
  const VOORLOPIG = T('Voorlopig', 'Provisional');

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
    k.ahk ? row(T('Algemene heffingskorting', 'General tax credit'), k.ahk, '−', '', nlTerm('algemene heffingskorting')) : null,
    k.arbeidskorting ? row(T('Arbeidskorting', 'Labour tax credit'), k.arbeidskorting, '−', '', nlTerm('arbeidskorting')) : null,
    k.iack ? row(T('Inkomensafhankelijke combinatiekorting', 'Working parent tax credit'), k.iack, '−', '', nlTerm('inkomensafhankelijke combinatiekorting')) : null,
    aow && k.ouderenkorting ? row(T('Ouderenkorting', 'Senior tax credit'), k.ouderenkorting, '−', '', nlTerm('ouderenkorting')) : null,
    aow && k.alleenstaandeOuderenkorting ? row(T('Alleenstaande ouderenkorting', 'Single senior tax credit'), k.alleenstaandeOuderenkorting, '−', '', nlTerm('alleenstaande ouderenkorting')) : null,
  ];
  const unusedNote = t => t.kortingenGebruikt < t.kortingenTotaal ? note(T(
    `Je hebt ${eur(t.kortingenTotaal)} aan heffingskortingen, maar je betaalt maar ${eur(t.kortingenGebruikt)} belasting. Het verschil (${eur(t.kortingenTotaal - t.kortingenGebruikt)}) kun je niet verrekenen.`,
    `Your tax credits add up to ${eur(t.kortingenTotaal)}, but you only pay ${eur(t.kortingenGebruikt)} in tax. You cannot use the difference (${eur(t.kortingenTotaal - t.kortingenGebruikt)}).`)) : '';
  const monthlyTables = T('Je werkgever rekent per maand met de loonheffingstabellen. Over het hele jaar komt het op deze bedragen uit.',
    'Your employer uses the monthly payroll tax tables. Over a full year, the result comes close to these amounts.');

  // ---------- calculators ----------
  const C = {};

  // Bruto → netto and netto → bruto for an employee
  C.netto = {
    id: 'netto', title: T('Netto salaris', 'Net salary'),
    sources: ['bd_fisin_berekening', 'bd_fisin_kortingen', 'bd_tabel_ak2026', 'bd_va2026'],
    fields: [
      { name: 'modus', type: 'choice', label: T('Wat wil je berekenen?', 'What do you want to calculate?'), def: 'bruto', options: [['bruto', T('Bruto naar netto', 'Gross to net')], ['netto', T('Netto naar bruto', 'Net to gross')]] },
      { name: 'periode', type: 'choice', label: T('Bedrag per', 'Amount per'), def: 'maand', options: [['maand', T('Maand', 'Month')], ['jaar', T('Jaar', 'Year')]] },
      { name: 'bruto', type: 'money', def: 4000, max: 1e7, label: v => T(`Brutoloon per ${PERIOD[v.periode]}`, `Gross salary per ${PERIOD[v.periode]}`), help: T('Zonder vakantiegeld. Kijk op je loonstrook of in je contract.', 'Without holiday allowance. Check your payslip or your contract.'), show: v => v.modus === 'bruto' },
      { name: 'netto', type: 'money', def: 3000, max: 60000 * 12, label: v => T(`Gewenst nettoloon per ${PERIOD[v.periode]}`, `Net salary you want per ${PERIOD[v.periode]}`), help: T('Wat je per maand op je rekening wilt zien, zonder vakantiegeld.', 'What you want in your bank account, without holiday allowance.'), show: v => v.modus === 'netto' },
      { name: 'vakantiegeld', type: 'toggle', def: true, label: T('Ik krijg 8% vakantiegeld', 'I get 8% holiday allowance (vakantiegeld)'), help: T('8% is het wettelijke minimum. Een cao kan meer geven.', '8% is the legal minimum. A collective agreement (cao) can give more.'), show: v => v.modus === 'bruto' },
      { name: 'dertiende', type: 'toggle', def: false, label: T('Ik krijg een 13e maand', 'I get a 13th month'), help: T('Een extra maandsalaris per jaar, vaak in december. Staat in je cao of contract.', 'One extra month\'s salary per year, often paid in December. Check your cao or contract.'), show: v => v.modus === 'bruto' },
      { name: 'pensioen', type: 'pct', def: 0, max: 30, label: T('Pensioenpremie die jij betaalt', 'Pension contribution you pay'), help: T('Het werknemersdeel. Dit staat op je loonstrook, vaak tussen 0 en 8%.', 'The employee part. It is on your payslip, often between 0 and 8%.') },
      { name: 'aow', type: 'toggle', def: false, label: T('Ik heb de AOW-leeftijd', 'I have reached state pension age (AOW)'), help: T('Dan betaal je geen AOW-premie in de eerste schijf.', 'Then you pay no state pension contribution in the first bracket.') },
    ],
    compute(v) {
      const aow = aowKey(v.aow), pens = v.pensioen / 100;
      if (v.modus === 'netto') {
        const doel = v.periode === 'maand' ? v.netto : v.netto / 12;
        const b = E.brutoVoorNetto(doel, { pensioenPctWerknemer: pens, aow });
        const r = E.nettoSalaris({ brutoMaand: b, vakantiegeld: false, pensioenPctWerknemer: pens, aow });
        const maxed = b >= 100000, need = eur(v.periode === 'maand' ? b : b * 12);
        return {
          head: { label: T(`Benodigd brutoloon per ${PERIOD[v.periode]}`, `Gross salary needed per ${PERIOD[v.periode]}`), value: need,
            sub: [T(`Dat is ${eur(b * 12)} per jaar, zonder vakantiegeld.`, `That is ${eur(b * 12)} per year, without holiday allowance.`), T(`Netto houd je dan ${eur(r.nettoMaandGemiddeld)} per maand over.`, `You then take home ${eur(r.nettoMaandGemiddeld)} net per month.`)] },
          rows: nettoRows(r, v, `12 × ${eur(b)}`),
          after: (maxed ? note(T('Dit bedrag valt buiten het bereik van de calculator (maximaal € 100.000 bruto per maand).', 'This amount is outside the range of the calculator (maximum €100,000 gross per month).')) : '')
            + notes([T('Krijg je vakantiegeld? Dan komt dat bovenop dit brutoloon.', 'Do you get holiday allowance? It comes on top of this gross salary.'), monthlyTables]),
          live: T(`Benodigd brutoloon: ${need} per ${PERIOD[v.periode]}.`, `Gross salary needed: ${need} per ${PERIOD[v.periode]}.`),
        };
      }
      const jaar = v.periode === 'maand' ? v.bruto * 12 : v.bruto;
      const opts = { vakantiegeld: v.vakantiegeld, dertiendeMaand: v.dertiende, pensioenPctWerknemer: pens, aow };
      const r = E.nettoSalaris({ brutoJaar: jaar, ...opts });
      const r2 = E.nettoSalaris({ brutoJaar: jaar + 1000, ...opts });
      // Net 13th month: the difference in net pay per year with and without it (the same marginal method as the engine).
      const nettoDm = v.dertiende ? r.nettoJaar - E.nettoSalaris({ brutoJaar: jaar, ...opts, dertiendeMaand: false }).nettoJaar : 0;
      const extra = Math.round((r2.nettoJaar - r.nettoJaar) / ((12 + (v.vakantiegeld ? 0.96 : 0) + (v.dertiende ? 1 : 0)) / 1.2));
      const maand = v.vakantiegeld || v.dertiende ? r.nettoMaandExclVakantiegeld : r.nettoMaandGemiddeld;
      const primary = v.periode === 'maand' ? { label: T('Netto per maand', 'Net per month'), value: eur(maand) } : { label: T('Netto per jaar', 'Net per year'), value: eur(r.nettoJaar) };
      const incl = [v.vakantiegeld ? T('vakantiegeld', 'holiday allowance') : '', v.dertiende ? T('13e maand', '13th month') : ''].filter(Boolean).join(T(' en ', ' and '));
      const plus = [v.vakantiegeld ? T(`${eur(r.nettoVakantiegeld)} netto vakantiegeld`, `${eur(r.nettoVakantiegeld)} net holiday allowance`) : '', v.dertiende ? T(`${eur(nettoDm)} netto 13e maand`, `${eur(nettoDm)} net 13th month`) : ''].filter(Boolean).join(T(' en ', ' and '));
      const sub = v.periode === 'maand'
        ? [T(`Dat is ${eur(r.nettoJaar)} netto per jaar${incl ? `, inclusief ${incl}` : ''}.`, `That is ${eur(r.nettoJaar)} net per year${incl ? `, including ${incl}` : ''}.`),
          v.vakantiegeld ? T(`Je vakantiegeld is netto ${eur(r.nettoVakantiegeld)}. Meestal krijg je dat in mei of juni.`, `Your holiday allowance is ${eur(r.nettoVakantiegeld)} net. Most employers pay it in May or June.`) : '',
          v.dertiende ? T(`Je 13e maand is netto ongeveer ${eur(nettoDm)}.`, `Your 13th month is about ${eur(nettoDm)} net.`) : '']
        : [T(`Dat is ${eur(maand)} netto per maand${plus ? `, plus ${plus}` : ''}.`, `That is ${eur(maand)} net per month${plus ? `, plus ${plus}` : ''}.`)];
      return {
        head: { ...primary, sub },
        rows: nettoRows(r, v, v.periode === 'maand' ? `12 × ${eur(v.bruto)}` : ''),
        after: notes([
          T(`Gemiddeld betaal je ${pct(r.gemiddeldTarief, 1)} loonheffing over je fiscale loon.`, `On average you pay ${pct(r.gemiddeldTarief, 1)} payroll tax on your taxable salary.`),
          jaar > 0 ? T(`Van elke € 100 die je bruto extra verdient, houd je ongeveer ${eur(extra)} netto over.`, `Of every extra €100 you earn gross, you keep about ${eur(extra)} net.`) : '',
          monthlyTables,
        ]) + unusedNote(r.detail),
        live: `${primary.label}: ${primary.value}.`,
      };
    },
  };
  function nettoRows(r, v, brutoNote) {
    const d = r.detail;
    return [
      head(T('Bedragen per jaar', 'Amounts per year')),
      row(T('Brutoloon', 'Gross salary'), r.brutoJaar, '', '', brutoNote),
      r.vakantiegeld ? row(T('Vakantiegeld (8%)', 'Holiday allowance (8%)'), r.vakantiegeld, '+', '', nlTerm('vakantiegeld')) : null,
      r.dertiendeMaand ? row(T('13e maand', '13th month'), r.dertiendeMaand, '+', '', nlTerm('dertiende maand')) : null,
      r.pensioen ? row(T(`Pensioenpremie (${dec(v.pensioen)}%)`, `Pension contribution (${dec(v.pensioen)}%)`), r.pensioen, '−') : null,
      row(T('Fiscaal loon', 'Taxable salary'), r.fiscaalLoon, '=', 'sub', nlTerm('fiscaal loon')),
      row(T('Belasting en premies box 1', 'Tax and contributions box 1'), d.box1, '', '', T('Volgens de schijven van 2026', 'Using the 2026 tax brackets')),
      ...kortingRows(d.kortingen, v.aow),
      row(T('Loonheffing', 'Payroll tax'), r.loonheffing, '=', 'sub', nlTerm('loonheffing')),
      row(T('Netto per jaar', 'Net per year'), r.nettoJaar, '=', 'total', T('Fiscaal loon min loonheffing', 'Taxable salary minus payroll tax')),
    ];
  }

  // Compact version for the home page
  C.snel = {
    id: 'snel', title: T('Snel netto berekenen', 'Quick net salary'), sources: C.netto.sources,
    fields: [
      { name: 'bruto', type: 'money', def: 3500, max: 1e6, label: T('Brutoloon per maand', 'Gross salary per month') },
      { name: 'vakantiegeld', type: 'toggle', def: true, label: T('Met 8% vakantiegeld', 'With 8% holiday allowance') },
    ],
    compute(v) {
      const r = E.nettoSalaris({ brutoMaand: v.bruto, vakantiegeld: v.vakantiegeld });
      const maand = v.vakantiegeld ? r.nettoMaandExclVakantiegeld : r.nettoMaandGemiddeld;
      const q = `?modus=bruto&periode=maand&bruto=${Math.round(v.bruto)}&vakantiegeld=${v.vakantiegeld ? 1 : 0}&dertiende=0&pensioen=0&aow=0`;
      return {
        head: { label: T('Netto per maand', 'Net per month'), value: eur(maand), sub: [T(`${eur(r.nettoJaar)} netto per jaar${v.vakantiegeld ? `, waarvan ${eur(r.nettoVakantiegeld)} vakantiegeld` : ''}.`, `${eur(r.nettoJaar)} net per year${v.vakantiegeld ? `, including ${eur(r.nettoVakantiegeld)} holiday allowance` : ''}.`)] },
        rows: [row(T('Brutoloon per jaar', 'Gross salary per year'), r.brutoJaar), r.vakantiegeld ? row(T('Vakantiegeld', 'Holiday allowance'), r.vakantiegeld, '+') : null, row(T('Loonheffing', 'Payroll tax'), r.loonheffing, '−'), row(T('Netto per jaar', 'Net per year'), r.nettoJaar, '=', 'total')],
        after: `<p class="more"><a href="${L.netto}${q}">${T('Bekijk de hele berekening', 'See the full calculation')}</a></p>`,
        live: T(`Netto per maand: ${eur(maand)}.`, `Net per month: ${eur(maand)}.`),
      };
    },
  };

  // Full income tax return (box 1, 2, 3)
  C.ib = {
    id: 'ib', title: T('Inkomstenbelasting', 'Income tax'),
    sources: ['bd_fisin_berekening', 'bd_fisin_kortingen', 'bd_tabel_ak2026', 'bd_box2', 'bd_box3_2026', 'bd_zelfstandigenaftrek2026', 'bd_mkb2026'],
    fields: [
      { type: 'group', label: T('Box 1: werk en woning', 'Box 1: work and home') },
      { name: 'loon', type: 'money', def: 45000, max: 1e8, label: T('Loon per jaar', 'Salary per year'), help: T('Fiscaal loon van je jaaropgaaf, ook uitkering of pensioen.', 'Taxable wage from your annual income statement (jaaropgaaf). Benefits and pensions count too.') },
      { name: 'winst', type: 'money', def: 0, max: 1e8, label: T('Winst uit onderneming', 'Business profit'), help: T('Vóór zelfstandigenaftrek en mkb-winstvrijstelling.', 'Before the self-employed deduction and the SME profit exemption.') },
      { name: 'uren', type: 'toggle', def: true, label: T(`Ik haal het urencriterium (${num(P.ondernemer.urencriteriumUren)} uur)`, `I meet the hours criterion (${num(P.ondernemer.urencriteriumUren)} hours)`), help: T('Dan krijg je zelfstandigenaftrek.', 'Then you get the self-employed deduction (zelfstandigenaftrek).'), show: v => v.winst > 0 },
      { name: 'overig', type: 'money', def: 0, max: 1e8, label: T('Overig inkomen box 1', 'Other box 1 income'), help: T('Bijvoorbeeld inkomsten uit freelance werk zonder onderneming.', 'For example income from freelance work that is not a business.') },
      { name: 'aftrek', type: 'money', def: 0, max: 1e8, label: T('Aftrekposten', 'Deductions'), help: T('Bijvoorbeeld hypotheekrente min eigenwoningforfait, giften of zorgkosten.', 'For example mortgage interest minus the notional rental value (eigenwoningforfait), gifts or medical costs.') },
      { type: 'group', label: T('Box 2 en box 3', 'Box 2 and box 3') },
      { name: 'box2', type: 'money', def: 0, max: 1e8, label: T('Inkomen uit aanmerkelijk belang (box 2)', 'Income from a substantial interest (box 2)'), help: T('Bijvoorbeeld dividend uit je eigen bv.', 'For example dividend from your own bv (private limited company).') },
      { name: 'box3', type: 'money', def: 0, max: 1e8, label: T('Voordeel uit sparen en beleggen (box 3)', 'Income from savings and investments (box 3)'), help: T(`Weet je dit niet? Bereken het met de <a href="${L.box3}">box 3-calculator</a>.`, `Not sure? Work it out with the <a href="${L.box3}">box 3 calculator</a>.`) },
      { type: 'group', label: T('Jouw situatie', 'Your situation') },
      { name: 'kind', type: 'toggle', def: false, label: T('Ik heb een kind jonger dan 12', 'I have a child under 12'), help: T('Het kind woont bij je. Met een partner krijgt de partner met het laagste arbeidsinkomen deze korting.', 'The child lives with you. With a partner, only the partner with the lowest income from work gets this credit.') },
      { name: 'aow', type: 'select', def: 'none', label: T('Leeftijd', 'Age'), options: [['none', T('Jonger dan de AOW-leeftijd', 'Below state pension age (AOW)')], ['aow', T('AOW-leeftijd, geboren in 1946 of later', 'State pension age, born in 1946 or later')], ['born<1946', T('AOW-leeftijd, geboren vóór 1946', 'State pension age, born before 1946')]], help: T('Bereik je in 2026 de AOW-leeftijd? Kies dan "jonger". De calculator rekent niet met het tarief per maand.', 'Do you reach state pension age during 2026? Choose "below". The calculator does not use the month-by-month rate.') },
      { name: 'alleen', type: 'toggle', def: false, label: T('Ik heb AOW voor een alleenstaande', 'I get the AOW state pension for a single person'), show: v => v.aow !== 'none' },
    ],
    compute(v) {
      const aow = v.aow;
      let za = 0, mkb = 0;
      if (v.winst > 0) { const z = E.zzp({ winst: v.winst, urencriterium: v.uren, aow }); za = z.zelfstandigenaftrek; mkb = z.mkbWinstvrijstelling; }
      const t = E.incomeTax({ loon: v.loon, winst: v.winst, overigBox1: v.overig, aftrekposten: v.aftrek, box2: v.box2, box3: v.box3, aow, kindOnder12: v.kind, alleenstaandeAOW: v.alleen, ondernemersaftrek: za, mkbVrijstelling: mkb });
      const aowOn = aow !== 'none';
      const voor = t.box1 + t.box2 + t.box3;
      return {
        head: { label: T('Inkomstenbelasting 2026', 'Income tax 2026'), value: eur(t.totaal), sub: [t.verzamelinkomen > 0 ? T(`Dat is ${pct(t.totaal / t.verzamelinkomen, 1)} van je verzamelinkomen van ${eur(t.verzamelinkomen)}.`, `That is ${pct(t.totaal / t.verzamelinkomen, 1)} of your aggregate income (verzamelinkomen) of ${eur(t.verzamelinkomen)}.`) : ''] },
        rows: [
          head(T('Box 1: werk en woning', 'Box 1: work and home')),
          row(T('Loon', 'Salary'), v.loon),
          v.winst ? row(T('Winst uit onderneming', 'Business profit'), v.winst, '+') : null,
          za ? row(T('Zelfstandigenaftrek', 'Self-employed deduction'), za, '−', '', nlTerm('zelfstandigenaftrek')) : null,
          mkb ? row(T(`Mkb-winstvrijstelling (${pct(P.ondernemer.mkbWinstvrijstelling, 1)})`, `SME profit exemption (${pct(P.ondernemer.mkbWinstvrijstelling, 1)})`), mkb, '−', '', nlTerm('mkb-winstvrijstelling')) : null,
          v.overig ? row(T('Overig inkomen', 'Other income'), v.overig, '+') : null,
          v.aftrek ? row(T('Aftrekposten', 'Deductions'), v.aftrek, '−', '', nlTerm('aftrekposten')) : null,
          row(T('Belastbaar inkomen box 1', 'Taxable income box 1'), t.belastbaarBox1, '=', 'sub'),
          row(T('Belasting box 1', 'Tax box 1'), t.box1 - t.tariefsaanpassing, '', '', T('Inclusief premies volksverzekeringen', 'Including national insurance contributions')),
          t.tariefsaanpassing ? row(T('Tariefsaanpassing', 'Rate adjustment'), t.tariefsaanpassing, '+', '', T(`Aftrek levert maximaal ${pct(P.ondernemer.aftrekTariefBeperking)} op`, `Deductions save at most ${pct(P.ondernemer.aftrekTariefBeperking)} (tariefsaanpassing)`)) : null,
          v.box2 ? head(T('Box 2: aanmerkelijk belang', 'Box 2: substantial interest')) : null,
          v.box2 ? row(T('Inkomen box 2', 'Income box 2'), v.box2, '', 'muted') : null,
          v.box2 ? row(T('Belasting box 2', 'Tax box 2'), t.box2, '+') : null,
          v.box3 ? head(T('Box 3: sparen en beleggen', 'Box 3: savings and investments')) : null,
          v.box3 ? row(T('Voordeel box 3', 'Income box 3'), v.box3, '', 'muted') : null,
          v.box3 ? row(T(`Belasting box 3 (${pct(P.box3.tarief)})`, `Tax box 3 (${pct(P.box3.tarief)})`), t.box3, '+') : null,
          head(T('Heffingskortingen', 'Tax credits')),
          row(T('Belasting vóór heffingskortingen', 'Tax before tax credits'), voor, '=', 'sub'),
          ...kortingRows(t.kortingen, aowOn),
          row(T('Inkomstenbelasting', 'Income tax'), t.totaal, '=', 'total'),
        ],
        after: unusedNote(t) + notes([
          T('Heeft je werkgever al loonheffing ingehouden? Dan trek je die van dit bedrag af. Het verschil betaal je bij of krijg je terug.', 'Has your employer already withheld payroll tax? Subtract it from this amount. You pay or get back the difference.'),
          v.winst ? T(`De Zvw-bijdrage over je winst zit hier niet in. Die zie je in de <a href="${L.zzp}">zzp-calculator</a>.`, `The health insurance contribution (Zvw) on your profit is not included. See the <a href="${L.zzp}">freelancer tax calculator</a>.`) : '',
          v.kind ? T('Heb je een partner? Dan krijgt alleen de partner met het laagste arbeidsinkomen de combinatiekorting.', 'Do you have a partner? Then only the partner with the lowest income from work gets the working parent tax credit.') : '',
        ]),
        live: T(`Inkomstenbelasting 2026: ${eur(t.totaal)}.`, `Income tax 2026: ${eur(t.totaal)}.`),
      };
    },
  };

  // ZZP / IB-ondernemer
  C.zzp = {
    id: 'zzp', title: T('Zzp-belasting', 'Freelancer tax'),
    sources: ['bd_zelfstandigenaftrek2026', 'bd_mkb2026', 'bd_urencriterium', 'bd_fisin_zvw', 'bd_zvw_pct', 'bd_fisin_berekening', 'bd_fisin_kortingen', 'ro_sleuteltabel2026'],
    fields: [
      { type: 'group', label: T('Je onderneming', 'Your business') },
      { name: 'winst', type: 'money', def: 50000, max: 1e8, label: T('Verwachte winst in 2026', 'Expected profit in 2026'), help: T('Omzet min kosten, zonder btw. Vóór zelfstandigenaftrek.', 'Revenue minus costs, without VAT (btw). Before the self-employed deduction.') },
      { name: 'uren', type: 'toggle', def: true, label: T(`Ik werk minstens ${num(P.ondernemer.urencriteriumUren)} uur aan mijn onderneming`, `I work at least ${num(P.ondernemer.urencriteriumUren)} hours on my business`), help: T('Dit is het urencriterium. Ook reistijd en administratie tellen mee.', 'This is the hours criterion (urencriterium). Travel time and admin count too.') },
      { name: 'starter', type: 'toggle', def: false, label: T('Ik ben starter', 'I am a starter'), help: T('Je was in 1 of meer van de vorige 5 jaren geen ondernemer, en je kreeg in die jaren maximaal 2 keer zelfstandigenaftrek.', 'You were not self-employed in 1 or more of the previous 5 years, and you got the self-employed deduction no more than 2 times in those years.'), show: v => v.uren },
      { name: 'loon', type: 'money', def: 0, max: 1e8, label: T('Loon uit een baan ernaast (per jaar)', 'Salary from a job on the side (per year)'), help: T('Laat leeg als je alleen zzp\'er bent.', 'Leave empty if you are only self-employed.') },
      { name: 'aow', type: 'toggle', def: false, label: T('Ik heb de AOW-leeftijd', 'I have reached state pension age (AOW)') },
      { type: 'group', label: T('Vergelijk met loondienst', 'Compare with employment') },
      { name: 'bruto', type: 'money', def: 50000, max: 1e8, label: T('Brutojaarloon van een vergelijkbare baan', 'Gross annual salary of a similar job'), help: T('Alles inbegrepen, ook vakantiegeld.', 'Everything included, also holiday allowance.') },
    ],
    compute(v) {
      const aow = aowKey(v.aow);
      const z = E.zzp({ winst: v.winst, urencriterium: v.uren, starter: v.starter && v.uren, aow, loon: v.loon });
      const t = z.ib, perMaand = z.totaalAfdracht / 12;
      const c = E.vergelijk({ brutoJaar: v.bruto, winst: v.winst, urencriterium: v.uren, starter: v.starter && v.uren });
      const zvwPct = pct(P.zvw.bijdrageZelf);
      return {
        head: { label: T('Zet apart van je winst', 'Set aside from your profit'), value: pct(z.reserveerPct, 0),
          sub: [T(`Dat is ${eur(z.totaalAfdracht)} per jaar, of ${eur(perMaand)} per maand.`, `That is ${eur(z.totaalAfdracht)} per year, or ${eur(perMaand)} per month.`), T(`Na belasting houd je ${eur(z.nettoNaBelasting)} over (${eur(z.nettoNaBelasting / 12)} per maand).`, `After tax you keep ${eur(z.nettoNaBelasting)} (${eur(z.nettoNaBelasting / 12)} per month).`)] },
        rows: [
          head(T('Winst', 'Profit')),
          row(T('Winst', 'Profit'), v.winst),
          z.zelfstandigenaftrek ? row(T('Zelfstandigenaftrek', 'Self-employed deduction'), z.zelfstandigenaftrek, '−', '', nlTerm('zelfstandigenaftrek')) : null,
          z.startersaftrek ? row(T('Startersaftrek', 'Start-up deduction'), z.startersaftrek, '−', '', nlTerm('startersaftrek')) : null,
          z.mkbWinstvrijstelling ? row(T(`Mkb-winstvrijstelling (${pct(P.ondernemer.mkbWinstvrijstelling, 1)})`, `SME profit exemption (${pct(P.ondernemer.mkbWinstvrijstelling, 1)})`), z.mkbWinstvrijstelling, '−', '', nlTerm('mkb-winstvrijstelling')) : null,
          row(T('Belastbare winst', 'Taxable profit'), z.belastbareWinst, '=', 'sub'),
          head(T('Inkomstenbelasting', 'Income tax')),
          v.loon ? row(T('Loon uit je baan', 'Salary from your job'), v.loon, '+') : null,
          v.loon ? row(T('Belastbaar inkomen box 1', 'Taxable income box 1'), t.belastbaarBox1, '=', 'sub') : null,
          row(T('Belasting box 1', 'Tax box 1'), t.box1 - t.tariefsaanpassing, '', '', T('Inclusief premies volksverzekeringen', 'Including national insurance contributions')),
          t.tariefsaanpassing ? row(T('Tariefsaanpassing', 'Rate adjustment'), t.tariefsaanpassing, '+', '', T(`Aftrek levert maximaal ${pct(P.ondernemer.aftrekTariefBeperking)} op`, `Deductions save at most ${pct(P.ondernemer.aftrekTariefBeperking)} (tariefsaanpassing)`)) : null,
          ...kortingRows(t.kortingen, v.aow),
          row(T('Inkomstenbelasting', 'Income tax'), t.totaal, '=', 'sub'),
          v.loon ? row(T('Al ingehouden via je loon', 'Already withheld from your salary'), t.totaal - z.ibOverWinst, '−', '', T('Schatting: belasting als je geen winst had', 'Estimate: the tax without your profit')) : null,
          v.loon ? row(T('Inkomstenbelasting over je winst', 'Income tax on your profit'), z.ibOverWinst, '=', 'sub') : null,
          head(T('Zorgverzekeringswet', 'Health Insurance Act (Zvw)')),
          row(T(`Zvw-bijdrage (${zvwPct})`, `Zvw contribution (${zvwPct})`), z.zvw, '+', '', T(`Over maximaal ${eur(P.zvw.maxBijdrageInkomen)}${v.loon ? ' samen met je loon' : ''}`, `On at most ${eur(P.zvw.maxBijdrageInkomen)}${v.loon ? ' together with your salary' : ''}`)),
          row(T('Totaal apart zetten', 'Total to set aside'), z.totaalAfdracht, '=', 'total'),
        ],
        after: unusedNote(t) + notes([
          T('Btw zit hier niet in. Btw draag je apart af per kwartaal.', 'VAT (btw) is not included. You pay VAT separately, every quarter.'),
          z.winst > 0 && !v.uren ? T('Zonder urencriterium krijg je geen zelfstandigenaftrek en geen startersaftrek. De mkb-winstvrijstelling krijg je wel.', 'Without the hours criterion you get no self-employed deduction and no start-up deduction (startersaftrek). You do get the SME profit exemption.') : '',
          T('Vraag een voorlopige aanslag aan. Dan betaal je de belasting per maand en krijg je geen grote rekening achteraf.', 'Ask for a provisional assessment (voorlopige aanslag). Then you pay the tax every month and get no big bill afterwards.'),
        ]) + compare(c, v),
        live: T(`Zet ${pct(z.reserveerPct, 0)} apart: ${eur(z.totaalAfdracht)} per jaar.`, `Set aside ${pct(z.reserveerPct, 0)}: ${eur(z.totaalAfdracht)} per year.`),
      };
    },
  };
  function compare(c, v) {
    const diff = c.verschil;
    return `<section class="compare" aria-labelledby="cmp-h"><h3 id="cmp-h">${T('Loondienst of zzp?', 'Employee or freelancer?')}</h3>
<p>${T(`Netto per jaar, met een brutoloon van ${eur(v.bruto)} en een winst van ${eur(v.winst)}.`, `Net per year, with a gross salary of ${eur(v.bruto)} and a profit of ${eur(v.winst)}.`)}${v.aow || v.loon ? T(' Deze vergelijking gaat uit van iemand onder de AOW-leeftijd zonder loon uit een baan ernaast.', ' This comparison assumes someone below state pension age with no salary from a job on the side.') : ''}</p>
${ledger([row(T('Netto in loondienst', 'Net as an employee'), c.loondienstNetto, '', '', T('Zonder vakantiegeld en zonder pensioenpremie', 'Without holiday allowance and without pension contribution')), row(T('Netto als zzp\'er', 'Net as a freelancer'), c.zzpNetto, '', '', T('Na inkomstenbelasting en Zvw-bijdrage', 'After income tax and Zvw contribution')), row(diff >= 0 ? T('Zzp levert netto meer op', 'Freelancing pays more net') : T('Loondienst levert netto meer op', 'Employment pays more net'), Math.abs(diff), '=', 'total')], T('Vergelijking loondienst en zzp', 'Comparison of employment and freelancing'))}
<p><strong>${T('Dit verschil is niet het hele verhaal.', 'This difference is not the whole story.')}</strong> ${T('Als zzp\'er betaal je zelf voor zaken die een werkgever regelt:', 'As a freelancer you pay yourself for things an employer arranges:')}</p>
<ul class="caveats">
<li>${T('Geen pensioen via je werkgever. Je bouwt zelf pensioen op.', 'No pension through an employer. You build up your own pension.')}</li>
<li>${T('Geen verzekering bij ziekte of arbeidsongeschiktheid. Een AOV of broodfonds kost geld.', 'No insurance for illness or disability. Disability insurance (AOV) or a broodfonds costs money.')}</li>
<li>${T('Geen vakantiegeld en geen doorbetaalde vakantiedagen.', 'No holiday allowance and no paid holidays.')}</li>
<li>${T('Geen loon bij ziekte. Een werknemer krijgt bij ziekte tot twee jaar (een deel van het) loon.', 'No pay when you are ill. An employee gets (part of) their salary for up to two years of illness.')}</li>
<li>${T('Geen WW als je opdrachten wegvallen.', 'No unemployment benefit (WW) when your clients stop.')}</li>
<li>${T(`Een werkgever betaalt bovenop het brutoloon nog premies, zoals de Zvw-werkgeversheffing van ${pct(P.zvw.werkgeversheffing, 1)}.`, `An employer pays contributions on top of the gross salary, such as the ${pct(P.zvw.werkgeversheffing, 1)} employer Zvw levy.`)}</li>
</ul></section>`;
  }

  // Box 3
  C.box3 = {
    id: 'box3', title: 'Box 3',
    sources: ['bd_box3_2026', 'bd_werkelijk_rendement', 'bd_va2026'],
    fields: [
      { type: 'group', label: T('Je vermogen op 1 januari 2026', 'Your assets on 1 January 2026') },
      { name: 'bank', type: 'money', def: 60000, max: 1e9, label: T('Banktegoeden', 'Bank balances'), help: T('Spaargeld en betaalrekeningen.', 'Savings and current accounts.') },
      { name: 'overig', type: 'money', def: 40000, max: 1e9, label: T('Overige bezittingen', 'Other assets'), help: T('Beleggingen, crypto, een tweede woning of uitgeleend geld.', 'Investments, crypto, a second home or money you lent out.') },
      { name: 'groen', type: 'money', def: 0, max: 1e9, label: T('Groene beleggingen', 'Green investments'), help: T(`Vrijgesteld tot ${eur(P.box3.groeneBeleggingenVrijstellingPerPersoon)} per persoon.`, `Exempt up to ${eur(P.box3.groeneBeleggingenVrijstellingPerPersoon)} per person.`) },
      { name: 'schulden', type: 'money', def: 0, max: 1e9, label: T('Schulden', 'Debts'), help: T(`Niet je hypotheek voor je eigen huis. De eerste ${eur(P.box3.schuldendrempelPerPersoon)} per persoon telt niet mee.`, `Not the mortgage on your own home. The first ${eur(P.box3.schuldendrempelPerPersoon)} per person does not count.`) },
      { type: 'group', label: 'Partner' },
      { name: 'partner', type: 'toggle', def: false, label: T('Ik heb een fiscale partner', 'I have a fiscal partner'), help: T('Vul dan hierboven jullie vermogen samen in.', 'Then enter your combined assets above.') },
      { name: 'aandeel', type: 'pct', def: 50, max: 100, label: T('Jouw deel van de grondslag', 'Your share of the tax base'), help: T('Partners mogen de verdeling zelf kiezen.', 'Partners may choose how to split it.'), show: v => v.partner },
      { type: 'group', label: T('Werkelijk rendement (tegenbewijs)', 'Actual return (tegenbewijs)') },
      { name: 'tegen', type: 'toggle', def: false, label: T('Vergelijk met mijn werkelijke rendement', 'Compare with my actual return') },
      { name: 'werkelijk', type: 'money', def: 1500, max: 1e9, label: T('Werkelijk rendement in 2026', 'Actual return in 2026'), help: T('Rente, dividend, huur en waardestijging, min kosten. Met partner: samen. Verlies? Vul 0 in.', 'Interest, dividend, rent and increase in value, minus costs. With a partner: combined. A loss? Enter 0.'), show: v => v.tegen },
    ],
    compute(v) {
      const B = P.box3, n = v.partner ? 2 : 1;
      const r = E.box3({ bank: v.bank, overig: v.overig, schulden: v.schulden, groeneBeleggingen: v.groen, partner: v.partner, aandeelPct: v.partner ? v.aandeel / 100 : null, werkelijkRendement: v.tegen ? v.werkelijk : null });
      const groenBelast = pos(v.groen - B.groeneBeleggingenVrijstellingPerPersoon * n), overigTot = v.overig + groenBelast;
      const Tb = r.tegenbewijs;
      return {
        head: { label: v.partner ? T('Jouw box 3-belasting 2026', 'Your box 3 tax 2026') : T('Box 3-belasting 2026', 'Box 3 tax 2026'), value: eur(r.belasting),
          sub: [T(`Voordeel uit sparen en beleggen: ${eur(r.voordeel)}.`, `Income from savings and investments: ${eur(r.voordeel)}.`), T('Voorlopig: de percentages voor banktegoeden en schulden staan pas na 2026 vast.', 'Provisional: the rates for bank balances and debts are only final after 2026.')] },
        rows: [
          head(T('Forfaitair rendement', 'Deemed return')),
          row(`${T('Banktegoeden', 'Bank balances')}${tag(VOORLOPIG)}`, r.rendementBank, '', '', `${eur(v.bank)} × ${pct(B.rendement.bank.rate)}`),
          row(T('Overige bezittingen', 'Other assets'), r.rendementOverig, '+', '', `${eur(overigTot)} × ${pct(B.rendement.overig.rate, 2, 2)}${groenBelast ? T(', inclusief groene beleggingen boven de vrijstelling', ', including green investments above the exemption') : ''}`),
          r.aftrekbareSchuld ? row(`${T('Schulden', 'Debts')}${tag(VOORLOPIG)}`, Math.abs(r.rendementSchulden), '−', '', `${eur(r.aftrekbareSchuld)} × ${pct(B.rendement.schulden.rate)}`) : null,
          row(T('Belastbaar rendement', 'Taxable return'), r.belastbaarRendement, '=', 'sub'),
          head(T('Grondslag', 'Tax base')),
          row(T('Rendementsgrondslag', 'Return base'), r.rendementsgrondslag, '', '', T('Bezittingen min schulden boven de drempel', 'Assets minus debts above the threshold')),
          row(T('Heffingsvrij vermogen', 'Tax-free allowance'), r.heffingsvrijVermogen, '−', '', v.partner ? T('Voor jullie samen', 'For the two of you') : nlTerm('heffingsvrij vermogen')),
          row(T('Grondslag sparen en beleggen', 'Savings and investments base'), r.grondslagSparenBeleggen, '=', 'sub'),
          v.partner ? row(T('Jouw deel', 'Your share'), r.mijnGrondslag, '', '', T(`${dec(v.aandeel)}% van de grondslag`, `${dec(v.aandeel)}% of the base`)) : null,
          row(T('Jouw aandeel in het rendement', 'Your share of the return'), pct(r.aandeelPct, 2, 2), '', 'muted', T('Jouw grondslag gedeeld door de rendementsgrondslag', 'Your base divided by the return base')),
          row(T('Voordeel uit sparen en beleggen', 'Income from savings and investments'), r.voordeel, '=', 'sub', T('Belastbaar rendement × jouw aandeel', 'Taxable return × your share')),
          row(T(`Belasting box 3 (${pct(B.tarief)})`, `Tax box 3 (${pct(B.tarief)})`), r.belasting, '=', 'total'),
        ],
        after: (Tb ? `<section class="compare" aria-labelledby="tb-h"><h3 id="tb-h">${T('Forfaitair of werkelijk rendement?', 'Deemed or actual return?')}</h3>
${ledger([row(T('Forfaitair', 'Deemed return'), r.belasting, '', '', T('Volgens de berekening hierboven', 'From the calculation above')), row(T('Werkelijk rendement', 'Actual return'), Tb.belasting, '', '', T(`${eur(Tb.werkelijkVoordeel)} × ${pct(B.tarief)}, zonder heffingsvrij vermogen`, `${eur(Tb.werkelijkVoordeel)} × ${pct(B.tarief)}, without tax-free allowance`)), row(Tb.voordeligst === 'werkelijk' ? T('Werkelijk rendement is goedkoper', 'Actual return is cheaper') : T('Forfaitair is goedkoper (of gelijk)', 'Deemed return is cheaper (or equal)'), Math.abs(r.belasting - Tb.belasting), '=', 'total')], T('Vergelijking forfaitair en werkelijk rendement', 'Comparison of deemed and actual return'))}
<p>${Tb.voordeligst === 'werkelijk'
    ? T(`Je werkelijke rendement is lager. Dan mag je dat aantonen met het opgaaf-formulier. ${src('bd_werkelijk_rendement', 'Lees hoe dat werkt bij de Belastingdienst')}.`, `Your actual return is lower. You may prove this with the Belastingdienst form (opgaaf werkelijk rendement). ${src('bd_werkelijk_rendement', 'Read how it works at the Belastingdienst')} (in Dutch).`)
    : T('Het forfaitaire rendement is voor jou niet hoger dan je werkelijke rendement. Tegenbewijs levert dan niets op.', 'For you, the deemed return is not higher than your actual return. Proving your actual return (tegenbewijs) gives no benefit.')}</p></section>` : '')
          + notes([
            T(`Het heffingsvrij vermogen is ${eur(B.heffingsvrijVermogen)} per persoon (${eur(B.heffingsvrijVermogenPartners)} met fiscale partner).`, `The tax-free allowance is ${eur(B.heffingsvrijVermogen)} per person (${eur(B.heffingsvrijVermogenPartners)} with a fiscal partner).`),
            r.rendementsgrondslag <= r.heffingsvrijVermogen ? T('Je vermogen blijft onder het heffingsvrij vermogen. Je betaalt geen box 3-belasting.', 'Your assets stay below the tax-free allowance. You pay no box 3 tax.') : '',
          ]),
        live: T(`Box 3-belasting 2026: ${eur(r.belasting)}.`, `Box 3 tax 2026: ${eur(r.belasting)}.`),
      };
    },
  };

  // Vakantiegeld
  C.vakantiegeld = {
    id: 'vakantiegeld', title: T('Vakantiegeld', 'Holiday allowance'),
    sources: ['bd_fisin_berekening', 'bd_fisin_kortingen', 'bd_tabel_ak2026'],
    fields: [
      { name: 'bruto', type: 'money', def: 3500, max: 1e6, label: T('Brutoloon per maand', 'Gross salary per month'), help: T('Zonder vakantiegeld en zonder toeslagen.', 'Without holiday allowance and without extra allowances.') },
      { name: 'pct', type: 'pct', def: 8, max: 25, label: T('Percentage vakantiegeld', 'Holiday allowance percentage'), help: T('Wettelijk minimaal 8%. Je cao of contract kan meer geven.', 'The legal minimum is 8%. Your cao or contract can give more.') },
      { name: 'aow', type: 'toggle', def: false, label: T('Ik heb de AOW-leeftijd', 'I have reached state pension age (AOW)') },
    ],
    compute(v) {
      const r = E.vakantiegeld({ brutoMaand: v.bruto, pct: v.pct / 100, aow: aowKey(v.aow) });
      return {
        head: { label: T('Netto vakantiegeld', 'Net holiday allowance'), value: eur(r.netto), sub: [T(`Bruto ${eur(r.bruto)}. Je betaalt ${pct(r.marginaalTarief, 1)} belasting over je vakantiegeld.`, `Gross ${eur(r.bruto)}. You pay ${pct(r.marginaalTarief, 1)} tax on your holiday allowance.`)] },
        rows: [
          row(T('Brutoloon per jaar', 'Gross salary per year'), v.bruto * 12, '', 'muted', `12 × ${eur(v.bruto)}`),
          row(T(`Vakantiegeld bruto (${dec(v.pct)}%)`, `Holiday allowance gross (${dec(v.pct)}%)`), r.bruto, '', '', nlTerm('vakantiegeld')),
          row(T('Extra belasting', 'Extra tax'), r.belasting, '−', '', T('Verschil in jaarbelasting met en zonder vakantiegeld', 'Difference in annual tax with and without holiday allowance')),
          row(T('Netto vakantiegeld', 'Net holiday allowance'), r.netto, '=', 'total'),
        ],
        after: notes([
          T('Je werkgever houdt loonheffing in met het tarief voor bijzondere beloningen. Over het hele jaar komt het op dit bedrag uit.', 'Your employer withholds payroll tax at the special rate for bonuses and allowances. Over a full year, it comes to this amount.'),
          T('De meeste werkgevers betalen vakantiegeld in mei of juni.', 'Most employers pay holiday allowance in May or June.'),
          r.marginaalTarief > 0.4 ? T('Het percentage is hoger dan je schijf omdat je heffingskortingen lager worden als je meer verdient.', 'The percentage is higher than your tax bracket because your tax credits go down when you earn more.') : '',
        ]),
        live: T(`Netto vakantiegeld: ${eur(r.netto)}.`, `Net holiday allowance: ${eur(r.netto)}.`),
      };
    },
  };

  // 30% regeling
  C.expat = {
    id: 'expat', title: T('30%-regeling', '30% ruling'),
    sources: ['bd_expat', 'bd_fisin_berekening', 'bd_fisin_kortingen'],
    fields: [
      { name: 'bruto', type: 'money', def: 70000, max: 1e8, label: T('Brutojaarloon', 'Gross annual salary'), help: T('Inclusief vakantiegeld en de vergoeding zelf.', 'Including holiday allowance and the allowance itself.') },
      { name: 'master', type: 'toggle', def: false, label: T('Ik ben jonger dan 30 en heb een masterdiploma', 'I am under 30 and have a master\'s degree'), help: T(`Dan geldt een lagere salarisnorm: ${eur(P.expatregeling.salarisnormOnder30Master)} in plaats van ${eur(P.expatregeling.salarisnorm)}.`, `Then a lower salary threshold applies: ${eur(P.expatregeling.salarisnormOnder30Master)} instead of ${eur(P.expatregeling.salarisnorm)}.`) },
    ],
    compute(v) {
      const X = P.expatregeling, r = E.expat({ brutoJaar: v.bruto, onder30Master: v.master });
      const belast = v.bruto - r.vergoeding, full = Math.min(v.bruto * X.pct, X.maxVergoeding), cut = r.voldoetAanNorm && r.vergoeding < Math.round(full);
      return {
        head: { label: T('Netto voordeel per jaar', 'Net benefit per year'), value: eur(r.voordeel), sub: [r.voldoetAanNorm ? T(`Dat is ${eur(r.voordeel / 12)} per maand extra.`, `That is ${eur(r.voordeel / 12)} extra per month.`) : T('Je voldoet niet aan de salarisnorm. Dan krijg je geen 30%-regeling.', 'You do not meet the salary threshold. Then you do not get the 30% ruling.')] },
        rows: [
          row(T('Brutojaarloon', 'Gross annual salary'), v.bruto),
          row(T('Onbelaste vergoeding', 'Tax-free allowance'), r.vergoeding, '−', '', cut ? T('Verlaagd, zodat je loon boven de norm blijft', 'Reduced, so your salary stays above the threshold') : T(`Maximaal ${pct(X.pct, 0)}, tot ${eur(X.maxVergoeding)}`, `At most ${pct(X.pct, 0)}, up to ${eur(X.maxVergoeding)}`)),
          row(T('Belast loon', 'Taxable salary'), belast, '=', 'sub'),
          head(T('Netto per jaar', 'Net per year')),
          row(T('Zonder 30%-regeling', 'Without 30% ruling'), r.nettoZonder),
          row(T('Met 30%-regeling', 'With 30% ruling'), r.nettoMet),
          row(T('Voordeel', 'Benefit'), r.voordeel, '=', 'total'),
        ],
        after: `<div class="check ${r.voldoetAanNorm ? 'ok' : 'no'}"><p><strong>${T(`Salarisnorm 2026: ${r.voldoetAanNorm ? 'je voldoet' : 'je voldoet niet'}.`, `Salary threshold 2026: ${r.voldoetAanNorm ? 'you meet it' : 'you do not meet it'}.`)}</strong> ${T(`Je belaste loon (${eur(belast)}) moet hoger zijn dan ${eur(r.norm)}${v.master ? ' (norm voor jonger dan 30 met master)' : ''}.`, `Your taxable salary (${eur(belast)}) must be higher than ${eur(r.norm)}${v.master ? ' (threshold for under 30 with a master\'s degree)' : ''}.`)}</p></div>`
          + notes([
            T(`De vergoeding is maximaal ${pct(X.pct, 0)} van de WNT-norm van ${eur(X.wntNorm)}: ${eur(X.maxVergoeding)}.`, `The allowance is at most ${pct(X.pct, 0)} of the WNT salary cap of ${eur(X.wntNorm)}: ${eur(X.maxVergoeding)}.`),
            T('Er gelden meer voorwaarden. Je werkgever moet je uit het buitenland hebben aangeworven en je moet een specifieke deskundigheid hebben die in Nederland schaars is. De Belastingdienst beslist.', 'More conditions apply. Your employer must have recruited you from abroad, and you must have specific expertise that is scarce in the Netherlands. The Belastingdienst decides.'),
          ]),
        live: T(`Netto voordeel 30%-regeling: ${eur(r.voordeel)} per jaar.`, `Net benefit of the 30% ruling: ${eur(r.voordeel)} per year.`),
      };
    },
  };

  // Zorgtoeslag
  const lastBelow = tab => { let g = 0; for (const [upTo, amt] of tab) { if (amt > 0) g = upTo; } return g; };
  C.zorgtoeslag = {
    id: 'zorgtoeslag', title: T('Zorgtoeslag', 'Healthcare allowance'),
    sources: ['bd_zorgtoeslag_hoeveel', 'stcrt_2025_40022'],
    fields: [
      { name: 'inkomen', type: 'money', def: 28000, max: 1e8, label: T('Toetsingsinkomen 2026', 'Assessment income 2026'), help: T('Je verwachte verzamelinkomen over 2026. Met toeslagpartner: jullie samen.', 'Your expected aggregate income (verzamelinkomen) for 2026. With an allowance partner: combined.') },
      { name: 'partner', type: 'toggle', def: false, label: T('Ik heb een toeslagpartner', 'I have an allowance partner (toeslagpartner)') },
    ],
    compute(v) {
      const r = E.zorgtoeslag({ toetsingsinkomen: v.inkomen, partner: v.partner });
      const Z = P.toeslagen.zorgtoeslag, grens = lastBelow(v.partner ? Z.tablePartner : Z.tableSingle);
      return {
        head: { label: T('Zorgtoeslag per maand', 'Healthcare allowance per month'), value: eur(r.perMaand), sub: [r.perMaand ? T(`Dat is ${eur(r.perJaar)} per jaar.`, `That is ${eur(r.perJaar)} per year.`) : T(`Met een inkomen vanaf ${eur(grens)} ${v.partner ? '(samen) ' : ''}krijg je volgens de tabel geen zorgtoeslag.`, `With an income of ${eur(grens)} or more${v.partner ? ' (combined)' : ''}, the table gives no healthcare allowance.`)] },
        rows: [
          row(T('Toetsingsinkomen', 'Assessment income'), v.inkomen, '', 'muted', nlTerm('toetsingsinkomen')),
          row(T('Zorgtoeslag per maand', 'Healthcare allowance per month'), r.perMaand, '', '', T('Uit de tabel van Dienst Toeslagen (per € 500 afgerond)', 'From the Dienst Toeslagen table (rounded to steps of €500)')),
          row(T('Zorgtoeslag per jaar', 'Healthcare allowance per year'), r.perJaar, '=', 'total', T('12 maanden', '12 months')),
        ],
        after: notes([
          T('Je moet 18 jaar of ouder zijn en een Nederlandse zorgverzekering hebben.', 'You must be 18 or older and have Dutch health insurance.'),
          T('Er geldt ook een grens voor je vermogen. Die controleert deze calculator niet.', 'There is also a limit on your assets. This calculator does not check it.'),
          T(`De tabel is afgerond. Het precieze bedrag zie je in de <a href="${L.proef}" rel="noopener">officiële proefberekening</a>.`, `The table is rounded. For the exact amount, use the <a href="${L.proef}" rel="noopener">official trial calculation (proefberekening)</a> (in Dutch).`),
        ]),
        live: T(`Zorgtoeslag: ${eur(r.perMaand)} per maand.`, `Healthcare allowance: ${eur(r.perMaand)} per month.`),
      };
    },
  };

  // ---------- values ----------
  // Number input → number, NaN when it is not a number. nl: "4.000", "4000,50", "€ 4.000". en: "4,000", "4000.50", "€4,000".
  // On English pages Dutch-style thousands ("4.000") also work: expats often type them.
  function parseNum(s) {
    s = String(s ?? '').replace(/[€\s\u00a0%]/g, '').replace(/^\+/, '');
    if (s === '') return 0;
    if (EN) {
      if (s.includes(',') && s.includes('.')) s = s.replace(/,/g, '');
      else if (/^-?\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, '');
      else s = s.replace(',', '.');
    } else if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
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
    if (Number.isNaN(n)) return [f.def, f.type === 'pct' ? T('Vul een percentage in, bijvoorbeeld 5,5.', 'Enter a percentage, for example 5.5.') : T('Vul een bedrag in, bijvoorbeeld 4.000.', 'Enter an amount, for example 4,000.')];
    if (n < 0) return [0, T('Vul een bedrag van 0 of hoger in.', 'Enter an amount of 0 or more.')];
    if (n > f.max) return [f.max, T(`Het maximum is ${f.type === 'pct' ? dec(f.max) + '%' : eur(f.max)}.`, `The maximum is ${f.type === 'pct' ? dec(f.max) + '%' : eur(f.max)}.`)];
    return [n, ''];
  }
  const showValue = (f, x) => f.type === 'money' ? num(x) : f.type === 'pct' ? dec(x) : x;
  // Query string: only the fields that are shown, so a shared link gives the same result. Numbers in plain form ("4000.5").
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
  const renderBody = (calc, res) => ledger(res.rows, T(`Berekening ${calc.title}`, `Calculation: ${calc.title}`)) + (res.after || '');
  function render(calc, v) { const res = calc.compute(v); return { head: renderHead(res), body: renderBody(calc, res), live: res.live }; }
  const sourceLinks = calc => calc.sources.map(id => S[id]);

  return { C, lang, T, esc, num, eur, pct, dec, parseNum, defaults, fieldsOf, isShown, labelOf, clean, showValue, toQuery, renderFields, render, sourceLinks, ledger, row, head };
}
