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
  // With cents: "€ 23,41" / "€23.41" (hourly and daily amounts).
  const cents = n => { const c = Math.round(Math.abs(n) * 100); return num(Math.floor(c / 100)) + T(',', '.') + String(c % 100).padStart(2, '0'); };
  const eurc = n => (n < 0 && Math.round(n * 100) !== 0 ? T('− ', '−') : '') + T('€ ', '€') + cents(n);
  // Short axis labels: "€ 40k" / "€40k".
  const keur = n => n >= 1000 ? `${T('€ ', '€')}${dec(Math.round(n / 100) / 10, 1)}k` : eur(n);
  const pos = x => Math.max(0, x);
  const tag = t => ` <span class="tag">${t}</span>`;
  const src = (id, text) => `<a href="${esc(S[id])}" rel="noopener">${text}</a>`;
  const aowKey = on => on ? 'aow' : 'none';
  // Dutch term next to an English label (English pages only), marked lang="nl" for screen readers.
  const nlTerm = t => EN ? `<span lang="nl">${t}</span>` : '';
  const PERIOD = { maand: T('maand', 'month'), jaar: T('jaar', 'year'), uur: T('uur', 'hour') };
  // Periods per year for an amount "per maand / jaar / uur" (an hour uses the working hours per week).
  const perYear = (p, v) => p === 'jaar' ? 1 : p === 'uur' ? 52 * (v.weekuren || 40) : 12;
  const VOORLOPIG = T('Voorlopig', 'Provisional');
  // Round up to a "nice" axis maximum: 1, 2, 2.5 or 5 × 10^n.
  const nice = n => { if (!(n > 0)) return 1; const p = 10 ** Math.floor(Math.log10(n)), f = n / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; };

  // ---------- result building blocks ----------
  // Ledger rows: {h} = section heading; {l, v, o, c, n} = label, value, operator (+ − =), class (sub|total|muted), note.
  const row = (l, v, o = '', c = '', n = '') => ({ l, v, o, c, n });
  const head = (h) => ({ h });
  // Collapsible section: <details data-fold> with the heading in the summary. Open in the HTML (no JavaScript, wide screens,
  // print); on small screens the inline script in <head> closes it before the first paint. The chevron shows only there.
  // o.sum: class of the summary; o.top: more phrasing content in the summary, after the heading.
  const CHEVRON = '<span class="fold-i" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" focusable="false" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>';
  const fold = (h, body, cls = '', o = {}) => `<details class="fold${cls ? ` ${cls}` : ''}" data-fold open><summary${o.sum ? ` class="${o.sum}"` : ''}>${h.replace(/<\/h([2-6])>$/, `${CHEVRON}</h$1>`)}${o.top || ''}</summary>${body}</details>`;
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

  // Employee, gross → net per year, with every option. Without the 30% ruling these are the engine's own figures.
  // With the 30% ruling: E.expat gives the tax-free allowance on the taxable salary, E.incomeTax the tax on the rest
  // (the same two steps as the 30% ruling calculator). Net holiday allowance and net 13th month: the difference in net
  // per year with and without them, as the engine does for the holiday allowance.
  function emp(jaar, v) {
    const aow = aowKey(v.aow), o = { brutoJaar: jaar, vakantiegeld: !!v.vakantiegeld, dertiendeMaand: !!v.dertiende, pensioenPctWerknemer: v.pensioen / 100, aow };
    const r = E.nettoSalaris(o), total = r.brutoJaar + r.vakantiegeld + r.dertiendeMaand;
    if (!v.regeling) {
      const nettoDm = v.dertiende ? r.nettoJaar - E.nettoSalaris({ ...o, dertiendeMaand: false }).nettoJaar : 0;
      return { r, total, pensioen: r.pensioen, tax: r.loonheffing, net: r.nettoJaar, nettoVg: r.nettoVakantiegeld, nettoDm, maand: v.vakantiegeld || v.dertiende ? r.nettoMaandExclVakantiegeld : r.nettoMaandGemiddeld, detail: r.detail, vergoeding: 0 };
    }
    const ruled = x => { const b = E.nettoSalaris(x), e = E.expat({ brutoJaar: b.fiscaalLoon, onder30Master: !!v.master, aow }), t = E.incomeTax({ loon: b.fiscaalLoon - e.vergoeding, aow });
      return { e, t, net: b.brutoJaar + b.vakantiegeld + b.dertiendeMaand - b.pensioen - t.totaal }; };
    const a = ruled(o);
    const nettoVg = v.vakantiegeld ? a.net - ruled({ ...o, vakantiegeld: false }).net : 0;
    const nettoDm = v.dertiende ? a.net - ruled({ ...o, dertiendeMaand: false }).net : 0;
    return { r, total, pensioen: r.pensioen, tax: a.t.totaal, net: a.net, nettoVg, nettoDm, maand: Math.round((a.net - nettoVg - nettoDm) / 12), detail: a.t, vergoeding: a.e.vergoeding, voldoet: a.e.voldoetAanNorm, norm: a.e.norm };
  }
  // Rates: effective = tax / gross; marginal = extra tax on €1,000 more base salary (with holiday allowance and 13th month on it).
  function empStats(e, v, jaar) {
    const e2 = emp(jaar + 1000, v), d = e2.total - e.total;
    return [
      { l: T('Gemiddeld tarief', 'Effective tax rate'), v: pct(e.total ? e.tax / e.total : 0, 1), n: T('Loonheffing gedeeld door je bruto', 'Payroll tax divided by your gross pay') },
      { l: T('Marginaal tarief', 'Marginal tax rate'), v: pct(d ? (e2.tax - e.tax) / d : 0, 1), n: T('Belasting over je volgende euro', 'Tax on your next euro') },
      { l: T('Van € 100 extra houd je', 'Of €100 extra you keep'), v: eur(d ? (e2.net - e.net) / d * 100 : 0), n: T('Na belasting en pensioen', 'After tax and pension') },
    ];
  }
  const empViz = (e, v, jaar) => ({
    bars: [
      { id: 'gross', cap: T('Waar je bruto heen gaat', 'Where your gross pay goes'), total: e.total, parts: [
        { k: 'net', l: T('Netto', 'Net'), v: e.net }, { k: 'tax', l: T('Loonheffing', 'Payroll tax'), v: e.tax }, { k: 'pension', l: T('Pensioen', 'Pension'), v: e.pensioen }] },
      { id: 'credits', cap: T('Belasting vóór heffingskortingen', 'Tax before tax credits'), total: e.detail.box1, parts: [
        { k: 'tax', l: T('Je betaalt', 'You pay'), v: e.tax }, { k: 'credit', l: T('Heffingskortingen', 'Tax credits'), v: e.detail.kortingenGebruikt }] },
    ],
    stats: empStats(e, v, jaar),
  });
  // Net against gross over the income range, per month (or per year), with "you are here".
  function empChart(v, jaar) {
    const yr = v.periode === 'jaar', unit = yr ? 1 : 12, cur = emp(jaar, v);
    const top = nice(Math.max(yr ? 100000 : 8000, jaar / unit * 1.5)), pts = [];
    for (let i = 0; i <= 48; i++) { const x = top * i / 48, e = emp(x * unit, v); pts.push(yr ? [e.total, e.net] : [x, e.maand]); }
    const xMax = pts.at(-1)[0], mx = yr ? cur.total : jaar / 12, my = yr ? cur.net : cur.maand;
    return { xMax, yMax: xMax, diag: T('Bruto', 'Gross'), gap: T('Belasting en pensioen', 'Tax and pension'),
      title: yr ? T('Netto tegen bruto, per jaar', 'Net against gross, per year') : T('Netto tegen bruto, per maand', 'Net against gross, per month'),
      xl: yr ? T('Bruto per jaar, alles inbegrepen', 'Gross per year, everything included') : T('Brutoloon per maand', 'Gross salary per month'),
      series: [{ k: 'net', l: T('Netto', 'Net'), pts }],
      marker: { x: mx, y: my, l: `${T('Jij', 'You')}: ${eur(my)}` },
      aria: T(`Grafiek: netto tegen bruto ${yr ? 'per jaar' : 'per maand'}, van € 0 tot ${eur(xMax)} bruto. Bij ${eur(mx)} bruto houd je ${eur(my)} netto over.`,
        `Chart: net against gross ${yr ? 'per year' : 'per month'}, from €0 to ${eur(xMax)} gross. At ${eur(mx)} gross you take home ${eur(my)} net.`) };
  }
  // The same result per period: year, month, 4 weeks, week, day (260 per year) and hour.
  function empPeriods(e, v) {
    const wk = v.weekuren, rows = [[T('Jaar', 'Year'), 1], [T('Maand', 'Month'), 12], [T('4 weken', '4 weeks'), 13], [T('Week', 'Week'), 52], [T('Dag', 'Day'), 260], [T('Uur', 'Hour'), 52 * wk]];
    const pens = e.pensioen > 0, incl = [e.r.vakantiegeld ? T('vakantiegeld', 'holiday allowance') : '', e.r.dertiendeMaand ? T('13e maand', '13th month') : ''].filter(Boolean).join(T(' en ', ' and '));
    const f = (x, d, small) => small ? eurc(x / d) : eur(x / d);
    return `<div class="table-wrap"><table class="periods"><caption class="vh">${T('Bruto, loonheffing en netto per periode', 'Gross, payroll tax and net per period')}</caption>
<thead><tr><th scope="col">${T('Periode', 'Period')}</th><th scope="col">${T('Bruto', 'Gross')}</th><th scope="col">${T('Loonheffing', 'Payroll tax')}</th>${pens ? `<th scope="col">${T('Pensioen', 'Pension')}</th>` : ''}<th scope="col">${T('Netto', 'Net')}</th></tr></thead>
<tbody>${rows.map(([l, d], i) => `<tr><th scope="row">${l}</th><td>${f(e.total, d, i > 3)}</td><td>${f(e.tax, d, i > 3)}</td>${pens ? `<td>${f(e.pensioen, d, i > 3)}</td>` : ''}<td>${f(e.net, d, i > 3)}</td></tr>`).join('')}</tbody></table></div>
<p class="rnote">${T(`Gemiddelden${incl ? `, inclusief ${incl}` : ''}. Een dag is 1/260 jaar. Een uur rekent met ${dec(wk)} uur per week.`, `Averages${incl ? `, including ${incl}` : ''}. A day is 1/260 of a year. An hour uses ${dec(wk)} hours a week.`)}</p>`;
  }
  // Side by side: net per year as an employee, as a freelancer with the same amount as profit, and the DGA (not calculated).
  function vsCards(cards) {
    const best = Math.max(...cards.filter(c => c.v != null).map(c => c.v));
    return `<ul class="vs3">${cards.map(c => `<li class="vs${c.v == null ? ' na' : c.v === best ? ' best' : ''}"><span class="vs-k">${c.l}</span><strong class="vs-v">${c.v == null ? T('Niet berekend', 'Not calculated') : eur(c.v)}</strong><span class="vs-s">${c.s}</span>${c.v != null && c.v === best ? `<span class="badge">${T('Hoogste netto', 'Highest net')}</span>` : ''}</li>`).join('')}</ul>`;
  }
  const DGA = () => ({ l: T('Dga met een eigen bv', 'DGA with your own bv'), v: null,
    s: T('Hiervoor zijn de vennootschapsbelasting en het gebruikelijk loon nodig. Die staan nog niet in deze calculator.', `This needs the corporate income tax (${EN ? '<span lang="nl">vennootschapsbelasting</span>' : ''}) and the customary salary (${EN ? '<span lang="nl">gebruikelijk loon</span>' : ''}). These figures are not in this calculator yet.`) });
  function empVs(e, v) {
    const z = E.zzp({ winst: e.total, urencriterium: true, aow: aowKey(v.aow) });
    const q = `?winst=${Math.round(e.total)}&uren=1&starter=0&loon=0&aow=${v.aow ? 1 : 0}&bruto=${Math.round(e.total)}`;
    return vsCards([
      { l: T('Werknemer', 'Employee'), v: e.net, s: T('Netto per jaar, met je opties hierboven', 'Net per year, with your options above') },
      { l: T('Zzp\'er', 'Freelancer (zzp)'), v: z.nettoNaBelasting, s: T(`Netto per jaar bij ${eur(e.total)} winst, na inkomstenbelasting en Zvw-bijdrage`, `Net per year with ${eur(e.total)} profit, after income tax and Zvw contribution`) },
      DGA(),
    ]) + `<p class="rnote">${T(`De zzp'er haalt het urencriterium en is geen starter. Een zzp'er heeft geen vakantiegeld, pensioen via een werkgever of loon bij ziekte. <a href="${L.zzp}${q}">Reken het na in de zzp-calculator</a>.`, `The freelancer meets the hours criterion and is not a starter. A freelancer has no holiday allowance, employer pension or sick pay. <a href="${L.zzp}${q}">Check it in the freelancer tax calculator</a>.`)}</p>`;
  }
  // "What if I earn more?": the extra net from extra gross, in the period the visitor chose.
  function empWhatif(e, v, jaar) {
    const f = perYear(v.periode, v), add = v.extra * f;
    if (!(add > 0)) return `<p class="rnote">${T('Vul een extra bedrag in.', 'Enter an extra amount.')}</p>`;
    const e2 = emp(jaar + add, v), dNet = e2.net - e.net, dTot = e2.total - e.total;
    const per = v.periode === 'jaar' ? dNet : v.periode === 'uur' ? (e2.maand - e.maand) * 12 / f : e2.maand - e.maand;
    const fmt = v.periode === 'uur' ? eurc : eur, on = [v.vakantiegeld ? T('vakantiegeld', 'holiday allowance') : '', v.dertiende ? T('13e maand', '13th month') : ''].filter(Boolean).join(T(' en ', ' and '));
    return `<p class="wi-v"><strong>+${fmt(per)}</strong> ${T(`netto per ${PERIOD[v.periode]}`, `net per ${PERIOD[v.periode]}`)}</p>
<p class="rnote">${T(`Dat is ${eur(dNet)} netto per jaar extra. Je houdt ${pct(dTot ? dNet / dTot : 0, 0)} over van het extra bruto${on ? ` (met ${on} erover)` : ''}.`, `That is ${eur(dNet)} more net per year. You keep ${pct(dTot ? dNet / dTot : 0, 0)} of the extra gross${on ? ` (with ${on} on it)` : ''}.`)}</p>`;
  }

  // Bruto → netto and netto → bruto for an employee
  const nettoRange = (y, m, h) => v => v.periode === 'jaar' ? y : v.periode === 'uur' ? h : m;
  C.netto = {
    id: 'netto', title: T('Netto salaris', 'Net salary'), vs: T('Werknemer, zzp\'er of dga?', 'Employee, freelancer or DGA?'),
    sources: ['bd_fisin_berekening', 'bd_fisin_kortingen', 'bd_tabel_ak2026', 'bd_va2026', 'bd_expat'],
    fields: [
      { type: 'group', label: T('Je salaris', 'Your salary') },
      { name: 'modus', type: 'choice', label: T('Wat wil je berekenen?', 'What do you want to calculate?'), def: 'bruto', options: [['bruto', T('Bruto naar netto', 'Gross to net')], ['netto', T('Netto naar bruto', 'Net to gross')]] },
      { name: 'periode', type: 'choice', label: T('Bedrag per', 'Amount per'), def: 'maand', options: [['maand', T('Maand', 'Month')], ['jaar', T('Jaar', 'Year')], ['uur', T('Uur', 'Hour')]] },
      { name: 'bruto', type: 'money', def: 4000, max: 1e7, perPeriod: true, range: nettoRange([0, 200000, 500], [0, 16000, 50], [0, 100, 0.5]), label: v => T(`Brutoloon per ${PERIOD[v.periode]}`, `Gross salary per ${PERIOD[v.periode]}`), help: T('Zonder vakantiegeld. Kijk op je loonstrook of in je contract.', 'Without holiday allowance. Check your payslip or your contract.'), show: v => v.modus === 'bruto' },
      { name: 'netto', type: 'money', def: 3000, max: 60000 * 12, perPeriod: true, range: nettoRange([0, 120000, 500], [0, 10000, 50], [0, 60, 0.5]), label: v => T(`Gewenst nettoloon per ${PERIOD[v.periode]}`, `Net salary you want per ${PERIOD[v.periode]}`), help: T('Wat je op je rekening wilt zien, zonder vakantiegeld.', 'What you want in your bank account, without holiday allowance.'), show: v => v.modus === 'netto' },
      { name: 'weekuren', type: 'num', def: 40, min: 1, max: 80, range: [1, 60, 1], unit: T('uur', 'hrs'), label: T('Werkuren per week', 'Working hours per week'), help: T('Voor de bedragen per uur.', 'Used for the hourly amounts.') },
      { type: 'group', label: T('Opties', 'Options') },
      { name: 'vakantiegeld', type: 'toggle', def: true, label: T('Ik krijg 8% vakantiegeld', 'I get 8% holiday allowance (vakantiegeld)'), help: T('8% is het wettelijke minimum. Een cao kan meer geven.', '8% is the legal minimum. A collective agreement (cao) can give more.'), show: v => v.modus === 'bruto' },
      { name: 'dertiende', type: 'toggle', def: false, label: T('Ik krijg een 13e maand', 'I get a 13th month'), help: T('Een extra maandsalaris per jaar, vaak in december. Staat in je cao of contract.', 'One extra month\'s salary per year, often paid in December. Check your cao or contract.'), show: v => v.modus === 'bruto' },
      { name: 'pensioen', type: 'pct', def: 0, max: 30, range: [0, 15, 0.5], label: T('Pensioenpremie die jij betaalt', 'Pension contribution you pay'), help: T('Het werknemersdeel. Dit staat op je loonstrook, vaak tussen 0 en 8%.', 'The employee part. It is on your payslip, often between 0 and 8%.') },
      { name: 'aow', type: 'toggle', def: false, label: T('Ik heb de AOW-leeftijd', 'I have reached state pension age (AOW)'), help: T('Dan betaal je geen AOW-premie in de eerste schijf.', 'Then you pay no state pension contribution in the first bracket.') },
      { name: 'regeling', type: 'toggle', def: false, label: T('Ik heb de 30%-regeling', 'I have the 30% ruling'), help: T(`Tot 30% van je loon is dan onbelast. Je belaste loon moet boven ${eur(P.expatregeling.salarisnorm)} blijven.`, `Up to 30% of your salary is then tax-free. Your taxable salary must stay above ${eur(P.expatregeling.salarisnorm)}.`), show: v => v.modus === 'bruto' },
      { name: 'master', type: 'toggle', def: false, label: T('Ik ben jonger dan 30 en heb een masterdiploma', 'I am under 30 and have a master\'s degree'), help: T(`Dan is de salarisnorm ${eur(P.expatregeling.salarisnormOnder30Master)}.`, `Then the salary threshold is ${eur(P.expatregeling.salarisnormOnder30Master)}.`), show: v => v.modus === 'bruto' && v.regeling },
      { type: 'info', label: T('Belastingjaar', 'Tax year'), value: '2026', help: T('Alle bedragen zijn van 2026, uit officiële bronnen.', 'All figures are for 2026, from official sources.') },
      { name: 'extra', type: 'money', place: 'compare', def: 250, max: 1e7, perPeriod: true, range: nettoRange([0, 25000, 250], [0, 2500, 50], [0, 20, 0.5]), label: v => T(`Extra bruto per ${PERIOD[v.periode]}`, `Extra gross per ${PERIOD[v.periode]}`) },
    ],
    compute(v) {
      const f = perYear(v.periode, v), money = v.periode === 'uur' ? eurc : eur;
      if (v.modus === 'netto') {
        const pens = v.pensioen / 100, aow = aowKey(v.aow), o = { ...v, vakantiegeld: false, dertiende: false, regeling: false, master: false };
        const b = E.brutoVoorNetto(v.netto * f / 12, { pensioenPctWerknemer: pens, aow });
        const e = emp(b * 12, o);
        const maxed = b >= 100000, need = money(b * 12 / f);
        return {
          head: { label: T(`Benodigd brutoloon per ${PERIOD[v.periode]}`, `Gross salary needed per ${PERIOD[v.periode]}`), value: need,
            sub: [T(`Dat is ${eur(b * 12)} per jaar, zonder vakantiegeld.`, `That is ${eur(b * 12)} per year, without holiday allowance.`), T(`Netto houd je dan ${eur(e.maand)} per maand over.`, `You then take home ${eur(e.maand)} net per month.`)] },
          rows: nettoRows(e, o, `12 × ${eur(b)}`),
          viz: empViz(e, o, b * 12), chart: empChart(o, b * 12), table: empPeriods(e, o), vs: empVs(e, o), whatif: empWhatif(e, o, b * 12),
          after: (maxed ? note(T('Dit bedrag valt buiten het bereik van de calculator (maximaal € 100.000 bruto per maand).', 'This amount is outside the range of the calculator (maximum €100,000 gross per month).')) : '')
            + notes([T('Krijg je vakantiegeld? Dan komt dat bovenop dit brutoloon.', 'Do you get holiday allowance? It comes on top of this gross salary.'), monthlyTables]),
          live: T(`Benodigd brutoloon: ${need} per ${PERIOD[v.periode]}.`, `Gross salary needed: ${need} per ${PERIOD[v.periode]}.`),
        };
      }
      const jaar = v.bruto * f, e = emp(jaar, v);
      const incl = [v.vakantiegeld ? T('vakantiegeld', 'holiday allowance') : '', v.dertiende ? T('13e maand', '13th month') : ''].filter(Boolean).join(T(' en ', ' and '));
      const plus = [v.vakantiegeld ? T(`${eur(e.nettoVg)} netto vakantiegeld`, `${eur(e.nettoVg)} net holiday allowance`) : '', v.dertiende ? T(`${eur(e.nettoDm)} netto 13e maand`, `${eur(e.nettoDm)} net 13th month`) : ''].filter(Boolean).join(T(' en ', ' and '));
      const perUur = e.maand * 12 / f;
      const primary = v.periode === 'maand' ? { label: T('Netto per maand', 'Net per month'), value: eur(e.maand) }
        : v.periode === 'uur' ? { label: T('Netto per uur', 'Net per hour'), value: eurc(perUur) } : { label: T('Netto per jaar', 'Net per year'), value: eur(e.net) };
      const sub = v.periode === 'jaar'
        ? [T(`Dat is ${eur(e.maand)} netto per maand${plus ? `, plus ${plus}` : ''}.`, `That is ${eur(e.maand)} net per month${plus ? `, plus ${plus}` : ''}.`)]
        : [v.periode === 'uur' ? T(`Dat is ${eur(e.maand)} netto per maand, bij ${dec(v.weekuren)} uur per week.`, `That is ${eur(e.maand)} net per month, at ${dec(v.weekuren)} hours a week.`) : '',
          T(`Dat is ${eur(e.net)} netto per jaar${incl ? `, inclusief ${incl}` : ''}.`, `That is ${eur(e.net)} net per year${incl ? `, including ${incl}` : ''}.`),
          v.vakantiegeld ? T(`Je vakantiegeld is netto ${eur(e.nettoVg)}. Meestal krijg je dat in mei of juni.`, `Your holiday allowance is ${eur(e.nettoVg)} net. Most employers pay it in May or June.`) : '',
          v.dertiende ? T(`Je 13e maand is netto ongeveer ${eur(e.nettoDm)}.`, `Your 13th month is about ${eur(e.nettoDm)} net.`) : ''];
      return {
        head: { ...primary, sub },
        rows: nettoRows(e, v, v.periode === 'maand' ? `12 × ${eur(v.bruto)}` : v.periode === 'uur' ? `52 × ${dec(v.weekuren)} × ${eurc(v.bruto)}` : ''),
        viz: empViz(e, v, jaar), chart: empChart(v, jaar), table: empPeriods(e, v), vs: empVs(e, v), whatif: empWhatif(e, v, jaar),
        after: (v.regeling ? note(e.voldoet
          ? T(`30%-regeling: ${eur(e.vergoeding)} van je loon is onbelast. Je werkgever moet de regeling wel bij de Belastingdienst aanvragen.`, `30% ruling: ${eur(e.vergoeding)} of your salary is tax-free. Your employer must apply for the ruling at the Belastingdienst.`)
          : T(`30%-regeling: je loon blijft niet boven de salarisnorm van ${eur(e.norm)}. Dan krijg je geen onbelaste vergoeding.`, `30% ruling: your salary does not stay above the threshold of ${eur(e.norm)}. Then you get no tax-free allowance.`)) : '')
          + notes([monthlyTables, v.regeling ? T(`Met de 30%-regeling rekenen we de vergoeding over je fiscale loon, zoals in de <a href="${L.expat}">30%-regeling-calculator</a>.`, `With the 30% ruling we take the allowance over your taxable salary, as in the <a href="${L.expat}">30% ruling calculator</a>.`) : '']) + unusedNote(e.detail),
        live: `${primary.label}: ${primary.value}.`,
      };
    },
  };
  function nettoRows(e, v, brutoNote) {
    const r = e.r, d = e.detail;
    return [
      head(T('Bedragen per jaar', 'Amounts per year')),
      row(T('Brutoloon', 'Gross salary'), r.brutoJaar, '', '', brutoNote),
      r.vakantiegeld ? row(T('Vakantiegeld (8%)', 'Holiday allowance (8%)'), r.vakantiegeld, '+', '', nlTerm('vakantiegeld')) : null,
      r.dertiendeMaand ? row(T('13e maand', '13th month'), r.dertiendeMaand, '+', '', nlTerm('dertiende maand')) : null,
      r.pensioen ? row(T(`Pensioenpremie (${dec(v.pensioen)}%)`, `Pension contribution (${dec(v.pensioen)}%)`), r.pensioen, '−') : null,
      row(T('Fiscaal loon', 'Taxable salary'), r.fiscaalLoon, '=', 'sub', nlTerm('fiscaal loon')),
      e.vergoeding ? row(T('Onbelaste vergoeding (30%-regeling)', 'Tax-free allowance (30% ruling)'), e.vergoeding, '−', '', nlTerm('30%-regeling')) : null,
      e.vergoeding ? row(T('Belast loon', 'Taxed salary'), r.fiscaalLoon - e.vergoeding, '=', 'sub') : null,
      row(T('Belasting en premies box 1', 'Tax and contributions box 1'), d.box1, '', '', T('Volgens de schijven van 2026', 'Using the 2026 tax brackets')),
      ...kortingRows(d.kortingen, v.aow),
      row(T('Loonheffing', 'Payroll tax'), e.tax, '=', 'sub', nlTerm('loonheffing')),
      row(T('Netto per jaar', 'Net per year'), e.net, '=', 'total', T('Fiscaal loon min loonheffing', 'Taxable salary minus payroll tax')),
    ];
  }

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
      const t2 = E.incomeTax({ loon: v.loon + 1000, winst: v.winst, overigBox1: v.overig, aftrekposten: v.aftrek, box2: v.box2, box3: v.box3, aow, kindOnder12: v.kind, alleenstaandeAOW: v.alleen, ondernemersaftrek: za, mkbVrijstelling: mkb });
      return {
        head: { label: T('Inkomstenbelasting 2026', 'Income tax 2026'), value: eur(t.totaal), sub: [t.verzamelinkomen > 0 ? T(`Dat is ${pct(t.totaal / t.verzamelinkomen, 1)} van je verzamelinkomen van ${eur(t.verzamelinkomen)}.`, `That is ${pct(t.totaal / t.verzamelinkomen, 1)} of your aggregate income (verzamelinkomen) of ${eur(t.verzamelinkomen)}.`) : ''] },
        viz: {
          bars: [
            { id: 'inc', cap: T('Je verzamelinkomen', 'Your aggregate income'), total: t.verzamelinkomen, parts: [{ k: 'net', l: T('Na belasting', 'After tax'), v: t.verzamelinkomen - t.totaal }, { k: 'tax', l: T('Inkomstenbelasting', 'Income tax'), v: t.totaal }] },
            { id: 'credits', cap: T('Belasting vóór heffingskortingen', 'Tax before tax credits'), total: voor, parts: [{ k: 'tax', l: T('Je betaalt', 'You pay'), v: t.totaal }, { k: 'credit', l: T('Heffingskortingen', 'Tax credits'), v: t.kortingenGebruikt }] },
          ],
          stats: [
            { l: T('Gemiddeld tarief', 'Effective tax rate'), v: pct(t.verzamelinkomen > 0 ? t.totaal / t.verzamelinkomen : 0, 1), n: T('Belasting gedeeld door je verzamelinkomen', 'Tax divided by your aggregate income') },
            { l: T('Marginaal tarief box 1', 'Marginal rate box 1'), v: pct((t2.totaal - t.totaal) / 1000, 1), n: T('Belasting over je volgende euro loon', 'Tax on your next euro of salary') },
            { l: T('Heffingskortingen', 'Tax credits'), v: eur(t.kortingenGebruikt), n: T('Al van je belasting af', 'Already taken off your tax') },
          ],
        },
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
    id: 'zzp', title: T('Zzp-belasting', 'Freelancer tax'), vs: T('Zzp\'er, werknemer of dga?', 'Freelancer, employee or DGA?'),
    sources: ['bd_zelfstandigenaftrek2026', 'bd_mkb2026', 'bd_urencriterium', 'bd_fisin_zvw', 'bd_zvw_pct', 'bd_fisin_berekening', 'bd_fisin_kortingen', 'ro_sleuteltabel2026'],
    fields: [
      { type: 'group', label: T('Je onderneming', 'Your business') },
      { name: 'winst', type: 'money', def: 50000, max: 1e8, range: [0, 250000, 500], label: T('Verwachte winst in 2026', 'Expected profit in 2026'), help: T('Omzet min kosten, zonder btw. Vóór zelfstandigenaftrek.', 'Revenue minus costs, without VAT (btw). Before the self-employed deduction.') },
      { name: 'uren', type: 'toggle', def: true, label: T(`Ik werk minstens ${num(P.ondernemer.urencriteriumUren)} uur aan mijn onderneming`, `I work at least ${num(P.ondernemer.urencriteriumUren)} hours on my business`), help: T('Dit is het urencriterium. Ook reistijd en administratie tellen mee.', 'This is the hours criterion (urencriterium). Travel time and admin count too.') },
      { name: 'starter', type: 'toggle', def: false, label: T('Ik ben starter', 'I am a starter'), help: T('Je was in 1 of meer van de vorige 5 jaren geen ondernemer, en je kreeg in die jaren maximaal 2 keer zelfstandigenaftrek.', 'You were not self-employed in 1 or more of the previous 5 years, and you got the self-employed deduction no more than 2 times in those years.'), show: v => v.uren },
      { name: 'loon', type: 'money', def: 0, max: 1e8, range: [0, 120000, 500], label: T('Loon uit een baan ernaast (per jaar)', 'Salary from a job on the side (per year)'), help: T('Laat leeg als je alleen zzp\'er bent.', 'Leave empty if you are only self-employed.') },
      { name: 'aow', type: 'toggle', def: false, label: T('Ik heb de AOW-leeftijd', 'I have reached state pension age (AOW)') },
      { type: 'group', label: T('Vergelijk met loondienst', 'Compare with employment') },
      { name: 'bruto', type: 'money', def: 50000, max: 1e8, range: [0, 200000, 500], label: T('Brutojaarloon van een vergelijkbare baan', 'Gross annual salary of a similar job'), help: T('Alles inbegrepen, ook vakantiegeld.', 'Everything included, also holiday allowance.') },
      { name: 'extra', type: 'money', place: 'compare', def: 5000, max: 1e8, range: [0, 50000, 500], label: T('Extra winst per jaar', 'Extra profit per year') },
    ],
    compute(v) {
      const aow = aowKey(v.aow);
      const z = E.zzp({ winst: v.winst, urencriterium: v.uren, starter: v.starter && v.uren, aow, loon: v.loon });
      const t = z.ib, perMaand = z.totaalAfdracht / 12;
      const c = E.vergelijk({ brutoJaar: v.bruto, winst: v.winst, urencriterium: v.uren, starter: v.starter && v.uren });
      const zvwPct = pct(P.zvw.bijdrageZelf);
      const zz = w => E.zzp({ winst: w, urencriterium: v.uren, starter: v.starter && v.uren, aow, loon: v.loon });
      const z1 = zz(v.winst + 1000), zx = zz(v.winst + v.extra);
      // Chart: net after tax against profit, next to an employee with the same gross salary (as E.vergelijk does).
      const top = nice(Math.max(150000, v.winst * 1.5)), pts = [], emp0 = [];
      for (let i = 0; i <= 48; i++) { const w = top * i / 48; pts.push([w, zz(w).nettoNaBelasting]); emp0.push([w, E.nettoSalaris({ brutoJaar: w, vakantiegeld: false }).nettoJaar]); }
      return {
        head: { label: T('Zet apart van je winst', 'Set aside from your profit'), value: pct(z.reserveerPct, 0),
          sub: [T(`Dat is ${eur(z.totaalAfdracht)} per jaar, of ${eur(perMaand)} per maand.`, `That is ${eur(z.totaalAfdracht)} per year, or ${eur(perMaand)} per month.`), T(`Na belasting houd je ${eur(z.nettoNaBelasting)} over (${eur(z.nettoNaBelasting / 12)} per maand).`, `After tax you keep ${eur(z.nettoNaBelasting)} (${eur(z.nettoNaBelasting / 12)} per month).`)] },
        viz: {
          bars: [{ id: 'profit', cap: T('Waar je winst heen gaat', 'Where your profit goes'), total: v.winst, parts: [
            { k: 'net', l: T('Houd je over', 'You keep'), v: z.nettoNaBelasting }, { k: 'tax', l: T('Inkomstenbelasting', 'Income tax'), v: z.ibOverWinst }, { k: 'zvw', l: T('Zvw-bijdrage', 'Zvw contribution'), v: z.zvw }] }],
          stats: [
            { l: T('Apart zetten per maand', 'Set aside per month'), v: eur(perMaand), n: T('Inkomstenbelasting en Zvw', 'Income tax and Zvw') },
            { l: T('Marginaal tarief', 'Marginal rate'), v: pct((z1.totaalAfdracht - z.totaalAfdracht) / 1000, 1), n: T('Belasting en Zvw over je volgende euro winst', 'Tax and Zvw on your next euro of profit') },
            { l: T('Netto per maand', 'Net per month'), v: eur(z.nettoNaBelasting / 12), n: T('Winst na belasting, gedeeld door 12', 'Profit after tax, divided by 12') },
          ],
        },
        chart: { xMax: top, yMax: top, diag: T('Winst', 'Profit'), gap: T('Belasting en Zvw', 'Tax and Zvw'),
          title: T('Netto tegen winst, per jaar', 'Net against profit, per year'), xl: T('Winst per jaar', 'Profit per year'),
          series: [{ k: 'net', l: T('Netto als zzp\'er', 'Net as a freelancer'), pts }, { k: 'alt', l: T('Netto als werknemer met hetzelfde bruto', 'Net as an employee with the same gross'), pts: emp0, dash: true }],
          marker: { x: v.winst, y: z.nettoNaBelasting, l: `${T('Jij', 'You')}: ${eur(z.nettoNaBelasting)}` },
          aria: T(`Grafiek: netto per jaar tegen winst, van € 0 tot ${eur(top)}. Bij ${eur(v.winst)} winst houd je ${eur(z.nettoNaBelasting)} over.`, `Chart: net per year against profit, from €0 to ${eur(top)}. With ${eur(v.winst)} profit you keep ${eur(z.nettoNaBelasting)}.`) },
        vs: zzpVs(c, v),
        whatif: v.extra > 0 ? `<p class="wi-v"><strong>+${eur(zx.nettoNaBelasting - z.nettoNaBelasting)}</strong> ${T('netto per jaar', 'net per year')}</p><p class="rnote">${T(`Van ${eur(v.extra)} extra winst houd je ${pct((zx.nettoNaBelasting - z.nettoNaBelasting) / v.extra, 0)} over. Zet ${eur(zx.totaalAfdracht - z.totaalAfdracht)} extra apart.`, `Of ${eur(v.extra)} extra profit you keep ${pct((zx.nettoNaBelasting - z.nettoNaBelasting) / v.extra, 0)}. Set aside ${eur(zx.totaalAfdracht - z.totaalAfdracht)} more.`)}</p>` : `<p class="rnote">${T('Vul een extra bedrag in.', 'Enter an extra amount.')}</p>`,
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
        ]),
        live: T(`Zet ${pct(z.reserveerPct, 0)} apart: ${eur(z.totaalAfdracht)} per jaar.`, `Set aside ${pct(z.reserveerPct, 0)}: ${eur(z.totaalAfdracht)} per year.`),
      };
    },
  };
  function zzpVs(c, v) {
    const diff = c.verschil;
    return `<p class="rnote">${T(`Netto per jaar, met een brutoloon van ${eur(v.bruto)} en een winst van ${eur(v.winst)}.`, `Net per year, with a gross salary of ${eur(v.bruto)} and a profit of ${eur(v.winst)}.`)}${v.aow || v.loon ? T(' Deze vergelijking gaat uit van iemand onder de AOW-leeftijd zonder loon uit een baan ernaast.', ' This comparison assumes someone below state pension age with no salary from a job on the side.') : ''}</p>
${vsCards([
    { l: T('Zzp\'er', 'Freelancer (zzp)'), v: c.zzpNetto, s: T('Na inkomstenbelasting en Zvw-bijdrage', 'After income tax and Zvw contribution') },
    { l: T('Werknemer', 'Employee'), v: c.loondienstNetto, s: T('Zonder vakantiegeld en zonder pensioenpremie', 'Without holiday allowance and without pension contribution') },
    DGA(),
  ])}
<p class="vs-diff">${diff >= 0 ? T('Zzp levert netto meer op', 'Freelancing pays more net') : T('Loondienst levert netto meer op', 'Employment pays more net')}: <strong>${eur(Math.abs(diff))}</strong> ${T('per jaar', 'per year')}</p>
<p><strong>${T('Dit verschil is niet het hele verhaal.', 'This difference is not the whole story.')}</strong> ${T('Als zzp\'er betaal je zelf voor zaken die een werkgever regelt:', 'As a freelancer you pay yourself for things an employer arranges:')}</p>
<ul class="caveats">
<li>${T('Geen pensioen via je werkgever. Je bouwt zelf pensioen op.', 'No pension through an employer. You build up your own pension.')}</li>
<li>${T('Geen verzekering bij ziekte of arbeidsongeschiktheid. Een AOV of broodfonds kost geld.', 'No insurance for illness or disability. Disability insurance (AOV) or a broodfonds costs money.')}</li>
<li>${T('Geen vakantiegeld en geen doorbetaalde vakantiedagen.', 'No holiday allowance and no paid holidays.')}</li>
<li>${T('Geen loon bij ziekte. Een werknemer krijgt bij ziekte tot twee jaar (een deel van het) loon.', 'No pay when you are ill. An employee gets (part of) their salary for up to two years of illness.')}</li>
<li>${T('Geen WW als je opdrachten wegvallen.', 'No unemployment benefit (WW) when your clients stop.')}</li>
<li>${T(`Een werkgever betaalt bovenop het brutoloon nog premies, zoals de Zvw-werkgeversheffing van ${pct(P.zvw.werkgeversheffing, 1)}.`, `An employer pays contributions on top of the gross salary, such as the ${pct(P.zvw.werkgeversheffing, 1)} employer Zvw levy.`)}</li>
</ul>`;
  }

  // Box 3
  C.box3 = {
    id: 'box3', title: 'Box 3',
    sources: ['bd_box3_2026', 'bd_werkelijk_rendement', 'bd_va2026'],
    fields: [
      { type: 'group', label: T('Je vermogen op 1 januari 2026', 'Your assets on 1 January 2026') },
      { name: 'bank', type: 'money', def: 60000, max: 1e9, range: [0, 1000000, 1000], label: T('Banktegoeden', 'Bank balances'), help: T('Spaargeld en betaalrekeningen.', 'Savings and current accounts.') },
      { name: 'overig', type: 'money', def: 40000, max: 1e9, range: [0, 1000000, 1000], label: T('Overige bezittingen', 'Other assets'), help: T('Beleggingen, crypto, een tweede woning of uitgeleend geld.', 'Investments, crypto, a second home or money you lent out.') },
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
      const Tb = r.tegenbewijs, g = r.rendementsgrondslag;
      return {
        head: { label: v.partner ? T('Jouw box 3-belasting 2026', 'Your box 3 tax 2026') : T('Box 3-belasting 2026', 'Box 3 tax 2026'), value: eur(r.belasting),
          sub: [T(`Voordeel uit sparen en beleggen: ${eur(r.voordeel)}.`, `Income from savings and investments: ${eur(r.voordeel)}.`), T('Voorlopig: de percentages voor banktegoeden en schulden staan pas na 2026 vast.', 'Provisional: the rates for bank balances and debts are only final after 2026.')] },
        viz: {
          bars: [{ id: 'base', cap: T('Je rendementsgrondslag', 'Your return base'), total: g, parts: [
            { k: 'free', l: T('Heffingsvrij', 'Tax-free'), v: Math.min(r.heffingsvrijVermogen, pos(g)) }, { k: 'tax', l: T('Belast', 'Taxed'), v: r.grondslagSparenBeleggen }] }],
          stats: [
            { l: T('Forfaitair rendement', 'Deemed return'), v: pct(g > 0 ? r.belastbaarRendement / g : 0, 2), n: T('Belastbaar rendement gedeeld door je grondslag', 'Taxable return divided by your base') },
            { l: T('Belasting op je vermogen', 'Tax on your assets'), v: pct(g > 0 ? r.belasting / g : 0, 2), n: T('Box 3-belasting gedeeld door je grondslag', 'Box 3 tax divided by your base') },
            { l: T('Per maand', 'Per month'), v: eur(r.belasting / 12), n: T('Box 3-belasting gedeeld door 12', 'Box 3 tax divided by 12') },
          ],
        },
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
      { name: 'bruto', type: 'money', def: 3500, max: 1e6, range: [0, 15000, 50], label: T('Brutoloon per maand', 'Gross salary per month'), help: T('Zonder vakantiegeld en zonder toeslagen.', 'Without holiday allowance and without extra allowances.') },
      { name: 'pct', type: 'pct', def: 8, max: 25, range: [0, 15, 0.5], label: T('Percentage vakantiegeld', 'Holiday allowance percentage'), help: T('Wettelijk minimaal 8%. Je cao of contract kan meer geven.', 'The legal minimum is 8%. Your cao or contract can give more.') },
      { name: 'aow', type: 'toggle', def: false, label: T('Ik heb de AOW-leeftijd', 'I have reached state pension age (AOW)') },
    ],
    compute(v) {
      const r = E.vakantiegeld({ brutoMaand: v.bruto, pct: v.pct / 100, aow: aowKey(v.aow) });
      return {
        head: { label: T('Netto vakantiegeld', 'Net holiday allowance'), value: eur(r.netto), sub: [T(`Bruto ${eur(r.bruto)}. Je betaalt ${pct(r.marginaalTarief, 1)} belasting over je vakantiegeld.`, `Gross ${eur(r.bruto)}. You pay ${pct(r.marginaalTarief, 1)} tax on your holiday allowance.`)] },
        viz: {
          bars: [{ id: 'vg', cap: T('Je bruto vakantiegeld', 'Your gross holiday allowance'), total: r.bruto, parts: [{ k: 'net', l: T('Netto', 'Net'), v: r.netto }, { k: 'tax', l: T('Belasting', 'Tax'), v: r.belasting }] }],
          stats: [
            { l: T('Belasting over vakantiegeld', 'Tax on holiday allowance'), v: pct(r.marginaalTarief, 1), n: T('Je marginale tarief', 'Your marginal rate') },
            { l: T('Netto per maand gespaard', 'Net per month saved up'), v: eur(r.netto / 12), n: T('Je werkgever spaart het per maand op', 'Your employer saves it up every month') },
          ],
        },
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
      { name: 'bruto', type: 'money', def: 70000, max: 1e8, range: [30000, 300000, 1000], label: T('Brutojaarloon', 'Gross annual salary'), help: T('Inclusief vakantiegeld en de vergoeding zelf.', 'Including holiday allowance and the allowance itself.') },
      { name: 'master', type: 'toggle', def: false, label: T('Ik ben jonger dan 30 en heb een masterdiploma', 'I am under 30 and have a master\'s degree'), help: T(`Dan geldt een lagere salarisnorm: ${eur(P.expatregeling.salarisnormOnder30Master)} in plaats van ${eur(P.expatregeling.salarisnorm)}.`, `Then a lower salary threshold applies: ${eur(P.expatregeling.salarisnormOnder30Master)} instead of ${eur(P.expatregeling.salarisnorm)}.`) },
    ],
    compute(v) {
      const X = P.expatregeling, r = E.expat({ brutoJaar: v.bruto, onder30Master: v.master });
      const belast = v.bruto - r.vergoeding, full = Math.min(v.bruto * X.pct, X.maxVergoeding), cut = r.voldoetAanNorm && r.vergoeding < Math.round(full);
      const top = nice(Math.max(250000, v.bruto * 1.3)), pts = [];
      for (let i = 0; i <= 60; i++) { const b = top * i / 60; pts.push([b, E.expat({ brutoJaar: b, onder30Master: v.master }).voordeel]); }
      const yTop = nice(Math.max(...pts.map(p => p[1]), r.voordeel, 1));
      return {
        viz: {
          bars: [
            { id: 'zonder', cap: T('Zonder 30%-regeling', 'Without 30% ruling'), total: v.bruto, parts: [{ k: 'net', l: T('Netto', 'Net'), v: r.nettoZonder }, { k: 'tax', l: T('Loonheffing', 'Payroll tax'), v: v.bruto - r.nettoZonder }] },
            { id: 'met', cap: T('Met 30%-regeling', 'With 30% ruling'), total: v.bruto, parts: [{ k: 'net', l: T('Netto', 'Net'), v: r.nettoMet }, { k: 'tax', l: T('Loonheffing', 'Payroll tax'), v: v.bruto - r.nettoMet }] },
          ],
          stats: [
            { l: T('Extra netto per maand', 'Extra net per month'), v: eur(r.voordeel / 12), n: T('Voordeel gedeeld door 12', 'Benefit divided by 12') },
            { l: T('Meer netto', 'More net'), v: pct(r.nettoZonder ? r.voordeel / r.nettoZonder : 0, 1), n: T('Ten opzichte van zonder regeling', 'Compared with no ruling') },
          ],
        },
        chart: { xMax: top, yMax: yTop, title: T('Voordeel tegen brutoloon, per jaar', 'Benefit against gross salary, per year'), xl: T('Brutojaarloon', 'Gross annual salary'),
          series: [{ k: 'net', l: T('Netto voordeel', 'Net benefit'), pts }], marker: { x: v.bruto, y: r.voordeel, l: `${T('Jij', 'You')}: ${eur(r.voordeel)}` },
          aria: T(`Grafiek: netto voordeel van de 30%-regeling tegen brutojaarloon, van € 0 tot ${eur(top)}. Bij ${eur(v.bruto)} is het voordeel ${eur(r.voordeel)}.`, `Chart: net benefit of the 30% ruling against gross annual salary, from €0 to ${eur(top)}. At ${eur(v.bruto)} the benefit is ${eur(r.voordeel)}.`) },
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
      { name: 'inkomen', type: 'money', def: 28000, max: 1e8, range: [0, 60000, 250], label: T('Toetsingsinkomen 2026', 'Assessment income 2026'), help: T('Je verwachte verzamelinkomen over 2026. Met toeslagpartner: jullie samen.', 'Your expected aggregate income (verzamelinkomen) for 2026. With an allowance partner: combined.') },
      { name: 'partner', type: 'toggle', def: false, label: T('Ik heb een toeslagpartner', 'I have an allowance partner (toeslagpartner)') },
    ],
    compute(v) {
      const r = E.zorgtoeslag({ toetsingsinkomen: v.inkomen, partner: v.partner });
      const Z = P.toeslagen.zorgtoeslag, tab = v.partner ? Z.tablePartner : Z.tableSingle, grens = lastBelow(tab);
      // Step chart straight from the table: the amount per month up to each income limit.
      const top = nice(Math.max(grens * 1.15, v.inkomen * 1.1)), pts = []; let prev = 0;
      for (const [upTo, amt] of tab) { if (prev >= top) break; pts.push([prev, amt], [Math.min(upTo, top), amt]); prev = upTo; }
      if (prev < top) pts.push([prev, 0], [top, 0]);
      return {
        viz: { stats: [
          { l: T('Per jaar', 'Per year'), v: eur(r.perJaar), n: T('12 maanden', '12 months') },
          { l: T('Inkomensgrens', 'Income limit'), v: eur(grens), n: v.partner ? T('Samen met je toeslagpartner', 'Combined with your allowance partner') : T('Daarboven krijg je niets', 'Above it you get nothing') },
          { l: T('Ruimte tot de grens', 'Room below the limit'), v: eur(pos(grens - v.inkomen)), n: T('Verschil met je inkomen', 'Difference with your income') },
        ] },
        chart: { xMax: top, yMax: nice(tab[0][1] * 1.1), title: T('Zorgtoeslag tegen inkomen, per maand', 'Healthcare allowance against income, per month'), xl: T('Toetsingsinkomen per jaar', 'Assessment income per year'),
          series: [{ k: 'net', l: T('Zorgtoeslag per maand', 'Healthcare allowance per month'), pts }], marker: { x: Math.min(v.inkomen, top), y: r.perMaand, l: `${T('Jij', 'You')}: ${eur(r.perMaand)}` },
          aria: T(`Grafiek: zorgtoeslag per maand tegen inkomen. Tot ${eur(tab[0][0])} is het ${eur(tab[0][1])}, vanaf ${eur(grens)} is het € 0. Bij jouw inkomen: ${eur(r.perMaand)}.`, `Chart: healthcare allowance per month against income. Up to ${eur(tab[0][0])} it is ${eur(tab[0][1])}, from ${eur(grens)} it is €0. At your income: ${eur(r.perMaand)}.`) },
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
    s = String(s ?? '').replace(/[€\s %]/g, '').replace(/^\+/, '').replace(/^−/, '-');
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
  const rangeOf = (f, v) => typeof f.range === 'function' ? f.range(v) : f.range;
  // Clean one raw value (string from a form or query); returns [value, error].
  function clean(f, raw) {
    if (f.type === 'toggle') return [raw === true || raw === '1' || raw === 'on' || raw === 'true', ''];
    if (f.type === 'choice' || f.type === 'select') return [f.options.some(o => o[0] === raw) ? raw : f.def, ''];
    const n = parseNum(raw), shown = x => f.type === 'pct' ? dec(x) + '%' : f.type === 'num' ? dec(x) : eur(x);
    if (Number.isNaN(n)) return [f.def, f.type === 'pct' ? T('Vul een percentage in, bijvoorbeeld 5,5.', 'Enter a percentage, for example 5.5.') : f.type === 'num' ? T('Vul een getal in, bijvoorbeeld 40.', 'Enter a number, for example 40.') : T('Vul een bedrag in, bijvoorbeeld 4.000.', 'Enter an amount, for example 4,000.')];
    if (f.min && n < f.min) return [f.min, T(`Het minimum is ${shown(f.min)}.`, `The minimum is ${shown(f.min)}.`)];
    if (n < 0) return [0, T('Vul een bedrag van 0 of hoger in.', 'Enter an amount of 0 or more.')];
    if (n > f.max) return [f.max, T(`Het maximum is ${shown(f.max)}.`, `The maximum is ${shown(f.max)}.`)];
    return [n, ''];
  }
  const showValue = (f, x) => f.type === 'money' ? (Math.round(x * 100) % 100 ? cents(x) : num(x)) : f.type === 'pct' || f.type === 'num' ? dec(x) : x;
  // Query string: only the fields that are shown, so a shared link gives the same result. Numbers in plain form ("4000.5").
  function toQuery(calc, v) {
    const q = [];
    for (const f of fieldsOf(calc)) if (isShown(f, v)) q.push(`${f.name}=${encodeURIComponent(f.type === 'toggle' ? (v[f.name] ? 1 : 0) : f.type === 'money' || f.type === 'pct' || f.type === 'num' ? String(Math.round(v[f.name] * 100) / 100) : v[f.name])}`);
    return q.join('&');
  }

  // ---------- rendering ----------
  function renderField(f, v, prefix, form) {
    if (f.type === 'group') return `<h3 class="fgroup">${esc(f.label)}</h3>`;
    if (f.type === 'info') return `<div class="field info"><span class="info-l">${esc(f.label)}</span><span class="chip">${esc(f.value)}</span>${f.help ? `<p class="help">${f.help}</p>` : ''}</div>`;
    const id = `${prefix}-${f.name}`, shown = isShown(f, v), hid = shown ? '' : ' hidden', fa = form ? ` form="${form}"` : '';
    const help = f.help ? `<p class="help" id="${id}-h">${f.help}</p>` : '';
    const desc = `${f.help ? `${id}-h ` : ''}${id}-e`;
    const err = `<p class="err" id="${id}-e" hidden></p>`;
    if (f.type === 'toggle') return `<div class="field toggle" data-field="${f.name}"${hid}><input type="checkbox" role="switch" id="${id}" name="${f.name}"${fa}${v[f.name] ? ' checked' : ''}${f.help ? ` aria-describedby="${id}-h"` : ''}><label for="${id}" data-label>${esc(labelOf(f, v))}</label>${help}</div>`;
    if (f.type === 'choice') return `<fieldset class="field seg" data-field="${f.name}"${hid}><legend data-label>${esc(labelOf(f, v))}</legend><div class="seg-opts" style="--n:${f.options.length}">${f.options.map(([val, lab]) => `<input type="radio" id="${id}-${val}" name="${f.name}" value="${val}"${fa}${v[f.name] === val ? ' checked' : ''}><label for="${id}-${val}">${esc(lab)}</label>`).join('')}</div>${help}</fieldset>`;
    if (f.type === 'select') return `<div class="field" data-field="${f.name}"${hid}><label for="${id}" data-label>${esc(labelOf(f, v))}</label><select id="${id}" name="${f.name}"${fa}${f.help ? ` aria-describedby="${id}-h"` : ''}>${f.options.map(([val, lab]) => `<option value="${esc(val)}"${v[f.name] === val ? ' selected' : ''}>${esc(lab)}</option>`).join('')}</select>${help}</div>`;
    const money = f.type === 'money', unit = money ? '€' : f.type === 'pct' ? '%' : esc(f.unit || '');
    const rg = rangeOf(f, v);
    // Slider next to the number: same value, no name (the text field is the one the form reads).
    const slider = rg ? `<input type="range" class="range" data-range-for="${f.name}" min="${rg[0]}" max="${rg[1]}" step="${rg[2]}" value="${Math.min(rg[1], Math.max(rg[0], v[f.name]))}" style="--p:${((Math.min(rg[1], Math.max(rg[0], v[f.name])) - rg[0]) / (rg[1] - rg[0]) * 100).toFixed(1)}%" aria-labelledby="${id}-l">` : '';
    return `<div class="field num${rg ? ' has-range' : ''}" data-field="${f.name}"${hid}><label for="${id}" id="${id}-l" data-label>${esc(labelOf(f, v))}</label><div class="affix ${money ? 'pre' : 'post'}">${money ? `<span aria-hidden="true">${unit}</span>` : ''}<input id="${id}" name="${f.name}"${fa} type="text" inputmode="decimal" autocomplete="off" spellcheck="false" value="${esc(showValue(f, v[f.name]))}" aria-describedby="${desc}">${money ? '' : `<span aria-hidden="true">${unit}</span>`}</div>${slider}${help}${err}</div>`;
  }
  const renderFields = (calc, v, prefix = calc.id) => calc.fields.filter(f => f.place !== 'compare').map(f => renderField(f, v, prefix)).join('');
  function renderHead(res) {
    return `<p class="r-label">${esc(res.head.label)}</p><p class="r-value">${res.head.value}</p>${res.head.sub.filter(Boolean).map(s => `<p class="r-sub">${s}</p>`).join('')}`;
  }
  // Stacked bars (where the money goes) and rate tiles. Every leaf element holds plain text, so the browser can
  // update the numbers and widths in place and let CSS animate them.
  function renderViz(z) {
    if (!z) return '';
    const bars = (z.bars || []).map(b => ({ ...b, parts: b.parts.filter(p => p.v > 0) })).filter(b => b.parts.length).map(b => {
      const tot = b.parts.reduce((a, p) => a + p.v, 0), share = p => pct(p.v / tot, 0);
      const desc = `${b.cap}: ${b.parts.map(p => `${p.l} ${eur(p.v)} (${share(p)})`).join(', ')}`;
      return `<div class="vbar" data-bar="${b.id}"><p class="vbar-cap"><span>${b.cap}</span><span class="vbar-t">${b.total != null ? eur(b.total) : ''}</span></p>
<div class="bar" role="img" aria-label="${esc(desc)}">${b.parts.map(p => `<span class="bs k-${p.k}" style="--w:${(p.v / tot * 100).toFixed(2)}%"></span>`).join('')}</div>
<ul class="legend">${b.parts.map(p => `<li><i class="sw k-${p.k}" aria-hidden="true"></i><span class="lg-l">${p.l}</span><span class="lg-v">${eur(p.v)}</span><span class="lg-p">${share(p)}</span></li>`).join('')}</ul></div>`;
    }).join('');
    const stats = z.stats && z.stats.length ? `<dl class="stats">${z.stats.map(s => `<div class="stat"><dt>${s.l}</dt><dd>${s.v}</dd>${s.n ? `<dd class="stat-n">${s.n}</dd>` : ''}</div>`).join('')}</dl>` : '';
    return bars + stats;
  }
  // Line chart in SVG (stretched to the box) with HTML labels, so text keeps its size on every screen.
  function renderChart(c) {
    if (!c) return '';
    const W = 1000, H = 400, xm = c.xMax || 1, ym = c.yMax || 1, cl = (a, lo, hi) => Math.min(hi, Math.max(lo, a));
    const X = x => (cl(x, 0, xm) / xm * W).toFixed(1), Y = y => (H - cl(y, 0, ym) / ym * H).toFixed(1);
    const line = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0])},${Y(p[1])}`).join('');
    const main = c.series[0].pts, last = main.at(-1);
    const fill = c.diag
      ? `<path class="gap" d="M${X(main[0][0])},${Y(main[0][0])}L${X(last[0])},${Y(last[0])}${main.slice().reverse().map(p => `L${X(p[0])},${Y(p[1])}`).join('')}Z"/><path class="diag" d="M${X(0)},${Y(0)}L${X(xm)},${Y(xm)}"/>`
      : `<path class="area k-${c.series[0].k}" d="${line(main)}L${X(last[0])},${H}L${X(main[0][0])},${H}Z"/>`;
    const grid = [1, 2, 3, 4].map(i => `<path class="gl" d="M0,${Y(ym * i / 4)}H${W}"/>`).join('');
    const m = c.marker, mx = (cl(m.x, 0, xm) / xm * 100).toFixed(2), my = ((1 - cl(m.y, 0, ym) / ym) * 100).toFixed(2);
    const legend = [...c.series.map(s => `<li><i class="sw ln-${s.k}${s.dash ? ' dash' : ''}" aria-hidden="true"></i>${s.l}</li>`), c.diag ? `<li><i class="sw ln-diag" aria-hidden="true"></i>${c.diag}</li>` : '', c.gap ? `<li><i class="sw k-gap" aria-hidden="true"></i>${c.gap}</li>` : ''].join('');
    return `<figure class="chart"><figcaption class="chart-cap"><span class="chart-t">${c.title}</span><ul class="chart-legend">${legend}</ul></figcaption>
<div class="chart-plot" role="img" aria-label="${esc(c.aria)}"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false">${grid}${fill}${c.series.map(s => `<path class="ln ln-${s.k}${s.dash ? ' dash' : ''}" d="${line(s.pts)}"/>`).join('')}<path class="mk-line" d="M${X(m.x)},0V${H}"/></svg>
${[1, 2, 3, 4].map(i => `<span class="ylab" style="top:${(100 - i * 25)}%">${keur(ym * i / 4)}</span>`).join('')}<span class="mk-dot" style="left:${mx}%;top:${my}%"></span><span class="mk-tip" style="--x:${mx}%;top:${my}%">${m.l}</span></div>
<div class="chart-x" aria-hidden="true">${[0, 1, 2, 3, 4].map(i => `<span style="left:${i * 25}%">${keur(xm * i / 4)}</span>`).join('')}</div><p class="chart-xl">${c.xl}</p></figure>`;
  }
  // The inputs as a list, for the printed result (hidden on screen).
  function renderInputs(calc, v) {
    const show = f => f.type === 'toggle' ? (v[f.name] ? T('Ja', 'Yes') : T('Nee', 'No')) : f.type === 'choice' || f.type === 'select' ? f.options.find(o => o[0] === v[f.name])[1]
      : f.type === 'money' ? (Math.round(v[f.name] * 100) % 100 ? eurc(v[f.name]) : eur(v[f.name])) : f.type === 'pct' ? `${dec(v[f.name])}%` : `${dec(v[f.name])} ${f.unit || ''}`;
    return `<h3>${T('Jouw gegevens', 'Your details')}</h3><dl>${fieldsOf(calc).filter(f => isShown(f, v) && f.place !== 'compare').map(f => `<div><dt>${esc(labelOf(f, v))}</dt><dd>${esc(show(f))}</dd></div>`).join('')}</dl>`;
  }
  // The calculation (ledger and notes). With a per-period table, the notes come after the table, in their own box.
  const renderBody = (calc, res) => ledger(res.rows, T(`Berekening ${calc.title}`, `Calculation: ${calc.title}`)) + (res.table ? '' : res.after || '');
  const RESULT_FOLDS = { body: T('De berekening', 'The calculation'), table: T('Per periode', 'Per period') };
  function render(calc, v) {
    const res = calc.compute(v);
    return { head: renderHead(res), viz: renderViz(res.viz), chart: renderChart(res.chart), body: renderBody(calc, res), table: res.table || '', after: res.table ? res.after || '' : '',
      inputs: renderInputs(calc, v), vs: res.vs || '', whatif: res.whatif || '', live: res.live };
  }
  const sourceLinks = calc => calc.sources.map(id => S[id]);

  // Compare section under the calculator: side by side (if the calculator has it), "what if", and scenario A against B.
  // The inputs here belong to the calculator form (form="…"), so they are in the query string too.
  function renderCompare(calc, v, prefix, r) {
    const wi = calc.fields.find(f => f.place === 'compare');
    const cards = [
      calc.vs ? `<article class="card cmp-card cmp-vs"><h3>${calc.vs}</h3><div data-vs>${r.vs}</div></article>` : '',
      wi ? `<article class="card cmp-card"><h3>${T('Wat als je meer verdient?', 'What if you earn more?')}</h3>${renderField(wi, v, prefix, `${prefix}-form`)}<div class="wi" data-whatif aria-live="polite">${r.whatif}</div></article>` : '',
      `<article class="card cmp-card"><h3>${T('Scenario A tegen B', 'Scenario A against B')}</h3><p class="rnote">${T('Bewaar je huidige invoer als scenario A. Verander daarna wat je wilt: je ziet A en B naast elkaar.', 'Save your current inputs as scenario A. Then change anything: you see A and B side by side.')}</p>
<div class="btn-row"><button type="button" class="btn" data-pin hidden>${T('Bewaar als scenario A', 'Save as scenario A')}</button><button type="button" class="btn ghost" data-unpin hidden>${T('Wis scenario A', 'Clear scenario A')}</button></div>
<noscript><p class="rnote">${T('Hiervoor is JavaScript nodig.', 'This needs JavaScript.')}</p></noscript><div data-scn></div></article>`,
    ].filter(Boolean);
    return `<section class="cmp" aria-labelledby="${prefix}-cmp-h">${fold(`<h2 id="${prefix}-cmp-h">${T('Vergelijk', 'Compare')}</h2>`, `
<div class="cmp-grid n${cards.length}">${cards.join('')}</div>`, 'fold-card', { sum: 'cmp-top', top: `<span class="cmp-sub">${T('Zet je uitkomst naast andere keuzes. Alles rekent mee terwijl je typt.', 'Put your result next to other choices. Everything updates as you type.')}</span>` })}</section>`;
  }
  // Scenario A against B: the main figure and every amount in the calculation that both have.
  function scenario(calc, a, b) {
    const ra = calc.compute(a), rb = calc.compute(b), plain = s => String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    const rowsOf = r => r.rows.filter(x => x && !x.h && typeof x.v === 'number').map(x => [plain(x.l), x.v, x.c]);
    const A = new Map(rowsOf(ra).map(x => [x[0], x[1]])), B = rowsOf(rb), seen = new Set(B.map(x => x[0]));
    const all = [...B, ...rowsOf(ra).filter(x => !seen.has(x[0])).map(x => [x[0], null, x[2]])];
    const delta = (d, f = eur) => d == null || Math.abs(d) < (f === eur ? 0.5 : 0.005) ? `<td class="d0">—</td>` : `<td class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${f(d)}</td>`;
    const ha = parseNum(ra.head.value), hb = parseNum(rb.head.value), money = /€/.test(rb.head.value) && /€/.test(ra.head.value);
    const headRow = `<tr class="total"><th scope="row">${esc(rb.head.label)}${ra.head.label !== rb.head.label ? `<span class="ln">A: ${esc(ra.head.label)}</span>` : ''}</th><td>${ra.head.value}</td><td>${rb.head.value}</td>${money && ra.head.label === rb.head.label ? delta(hb - ha, /[.,]\d\d$/.test(rb.head.value + ra.head.value) ? eurc : eur) : '<td class="d0">—</td>'}</tr>`;
    return `<div class="table-wrap"><table class="scn"><caption class="vh">${T('Scenario A tegen B', 'Scenario A against B')}</caption><thead><tr><th scope="col"></th><th scope="col">A</th><th scope="col">B</th><th scope="col">${T('Verschil', 'Difference')}</th></tr></thead>
<tbody>${headRow}${all.map(([l, vb, c]) => { const va = A.has(l) ? A.get(l) : null; return `<tr${c === 'total' ? ' class="total"' : ''}><th scope="row">${esc(l)}</th><td>${va == null ? '—' : eur(va)}</td><td>${vb == null ? '—' : eur(vb)}</td>${va == null || vb == null ? '<td class="d0">—</td>' : delta(vb - va)}</tr>`; }).join('')}</tbody></table></div>
<p class="rnote">${T('B is je huidige invoer.', 'B is your current input.')}</p>`;
  }
  // The result as plain text, for "Kopieer uitkomst" / "Copy result".
  function asText(calc, v, href) {
    const res = calc.compute(v), plain = s => String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    const lines = [`${calc.title} 2026`, '', `${res.head.label}: ${plain(res.head.value)}`, ...res.head.sub.filter(Boolean).map(plain), ''];
    for (const r of res.rows.filter(Boolean)) lines.push(r.h ? `\n${plain(r.h)}` : `${r.o && r.o !== '' ? `${r.o} ` : ''}${plain(r.l)}: ${plain(val(r.v))}`);
    lines.push('', href, T('Indicatieve berekening — geen belastingadvies.', 'Indicative calculation — not tax advice.'));
    return lines.join('\n').replace(/\n{3,}/g, '\n\n');
  }

  return { C, lang, T, esc, num, eur, eurc, cents, pct, dec, parseNum, perYear, defaults, fieldsOf, isShown, labelOf, rangeOf, clean, showValue, toQuery, renderFields, renderField, renderCompare, render, RESULT_FOLDS, fold, scenario, asText, sourceLinks, ledger, row, head };
}
