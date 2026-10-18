// English page copy, written for expats (not a literal translation of site/copy-nl.mjs, but the same shape).
// Dutch terms stay in parentheses where people search for them. Every figure comes from P, ex or a helper.
export default function copy({ P, ex, zGrens, eur, pct, num, esc, url, BRAND, OFFICIAL, AFFILIATE, srcLink, tbl, longDate, UPDATED }) {
  const b1 = P.box1.belowAOW, ahk = P.algemeneHeffingskorting.belowAOW, ak = P.arbeidskorting.belowAOW, O = P.ondernemer, B3 = P.box3, X = P.expatregeling, Z = P.toeslagen.zorgtoeslag;
  const eur2 = n => '€' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const tag = t => ` <span class="tag">${t}</span>`;
  const nl = t => `<span lang="nl">${t}</span>`; // a Dutch name or term inside English text

  const ui = {
    updated: 'Updated', skip: 'Skip to content', mainNav: 'Main menu', language: 'Language', otherLangIndex: 'Guides in English', crumbs: 'Breadcrumb',
    nav: [['home', 'Calculators', '#calculators'], ['gidsen', 'Guides'], ['methode', 'Method']],
    ogAlt: 'Belastingcalculator: Dutch tax calculator 2026',
    footer: { calcs: 'Calculators', guides: 'Guides', allGuides: 'All guides', site: 'About this site', method: 'Methodology and sources', about: `About ${BRAND}`, privacy: 'Privacy', affiliate: 'Affiliate disclosure',
      note: `Indicative calculation, not tax advice. ${BRAND} is independent and not connected to the Belastingdienst (Dutch Tax Administration) or Dienst Toeslagen (Benefits Office). 2026 figures, updated on ${esc(longDate(UPDATED))}.` },
    disclaimerLabel: 'Disclaimer',
    disclaimer: '<p><strong>Indicative calculation — not tax advice.</strong> Always check with the Belastingdienst (Dutch Tax Administration).</p><p>The result is an estimate based on the 2026 figures. You cannot derive any rights from it.</p>',
    yourData: 'Your details', noscript: 'Turn on JavaScript to calculate with your own amounts. Next to this form you see an example.', result: 'Result',
    copyLink: 'Copy link', sources: 'Sources', seeAlso: 'See also', methodLower: 'methodology and sources',
    copyResult: 'Copy result', print: 'Print or PDF', theme: 'Dark mode', calcBadge: 'Live calculator', perks: ['2026 figures', 'No cookies', 'With sources'], open: 'Open', showGuides: n => `Show the ${n} guides`, fullCalc: 'Open the calculator',
    faq: 'Frequently asked questions', otherCalcs: 'Other calculators', how: 'How does it work?', howMethod: 'Methodology and sources: all figures and rounding rules', example: 'Example',
  };

  // match: which guides are "related" (tested on slug + title), so new guides link up without code changes.
  const calcs = [
    { key: 'netto', calc: 'netto', name: 'Net salary', h1: 'Dutch net salary calculator 2026',
      title: 'Net salary calculator Netherlands 2026 – gross to net', short: 'Gross to net, or the other way round. With holiday allowance, pension and AOW.',
      desc: 'Calculate your net salary in the Netherlands for 2026, per month or per year. With the 2026 tax brackets, tax credits, holiday allowance and pension.',
      lead: 'Enter your gross salary and see what you take home in 2026. Or work backwards: which gross salary do you need for the net amount you want?',
      match: /\bnet\b|gross|salary|payroll|tax-credit|tax credit|bracket|heffingskorting|arbeidskorting/ },
    { key: 'ib', calc: 'ib', name: 'Income tax', h1: 'Dutch income tax calculator 2026',
      title: 'Income tax calculator Netherlands 2026 – box 1, 2, 3', short: 'Your total Dutch income tax over box 1, 2 and 3, with every tax credit.',
      desc: 'Calculate your Dutch income tax for 2026: salary, profit, deductions, box 2 and box 3. With the general tax credit, labour tax credit and parent credit.',
      lead: 'Work out what you pay in Dutch income tax over all your income in 2026. You see the tax per box and every tax credit (heffingskorting) on its own line.',
      match: /income-tax|income tax|tax-return|tax return|aangifte|bracket|tax-credit|tax credit|box-?2|dga/ },
    { key: 'zzp', calc: 'zzp', name: 'Freelancer tax', h1: 'Freelancer (zzp) tax calculator 2026',
      title: 'Zzp tax calculator 2026 – Dutch freelancer tax', short: 'How much of your profit to set aside for income tax and the Zvw contribution.',
      desc: 'Calculate your 2026 income tax and Zvw contribution as a Dutch freelancer (zzp). With the self-employed deduction, SME exemption and what to set aside.',
      lead: 'Enter your expected profit. You see your income tax, your health insurance contribution (Zvw) and the share of your profit to set aside.',
      match: /zzp|freelanc|self-employed|entrepreneur|hours-criterion|hours criterion|starter|start-up|set-aside|set aside|bookkeeping|sole trader/ },
    { key: 'box3', calc: 'box3', name: 'Box 3', h1: 'Box 3 calculator 2026',
      title: 'Box 3 calculator 2026 – Dutch tax on savings and investments', short: 'Tax on savings and investments, and whether proving your actual return pays off.',
      desc: 'Calculate your 2026 Dutch box 3 tax with the official method: savings, investments, debts and a fiscal partner. Then compare with your actual return.',
      lead: 'Work out your 2026 tax on savings and investments with the 6 steps of the Belastingdienst. Then compare it with your actual return.',
      match: /box-?3|wealth|savings|invest|deemed return|actual return/ },
    { key: 'vakantiegeld', calc: 'vakantiegeld', name: 'Holiday allowance', h1: 'Holiday allowance calculator 2026',
      title: 'Holiday allowance calculator 2026 – vakantiegeld net', short: 'What you keep from your 2026 holiday allowance (vakantiegeld) after tax.',
      desc: 'Calculate your 2026 Dutch holiday allowance (vakantiegeld), gross and net, and the real tax rate on it. Free, in English, with official sources.',
      lead: 'Enter your gross monthly salary. You see your holiday allowance (vakantiegeld) gross and net, and the percentage of tax you pay on it.',
      match: /holiday-allowance|holiday allowance|vakantiegeld/ },
    { key: 'expat', calc: 'expat', name: '30% ruling', h1: '30% ruling calculator 2026',
      title: '30% ruling calculator 2026 – net benefit and threshold', short: 'Your net benefit from the 30% ruling and a check on the salary threshold.',
      desc: `Calculate the net benefit of the Dutch 30% ruling in 2026. With the ${eur(X.salarisnorm)} salary threshold, the lower one for young master's graduates and the cap.`,
      lead: 'Find out what the 30% ruling (30%-regeling) adds to your net pay in 2026, and whether your salary meets the threshold.',
      match: /30-?percent|30%|expat|ruling/ },
    { key: 'zorgtoeslag', calc: 'zorgtoeslag', name: 'Healthcare allowance', h1: 'Healthcare allowance calculator 2026',
      title: 'Healthcare allowance calculator 2026 – zorgtoeslag', short: 'An estimate of your monthly healthcare allowance (zorgtoeslag), from the 2026 table.',
      desc: 'Estimate your 2026 Dutch healthcare allowance (zorgtoeslag) per month with the Dienst Toeslagen table. With the income limit and the official check.',
      lead: 'Enter your expected income for 2026. You get an estimate of your healthcare allowance (zorgtoeslag) per month, from the table of Dienst Toeslagen.',
      match: /zorgtoeslag|toeslag|healthcare|benefits/ },
  ];

  const faq = {
    netto: [
      ['How much is €3,000 gross per month net?', `About ${eur(ex.n3000.nettoMaandExclVakantiegeld)} net per month in 2026. On top of that you get about ${eur(ex.n3000.nettoVakantiegeld)} net holiday allowance. This is below state pension age, with 8% holiday allowance and no pension contribution.`],
      ['How much is €4,000 gross per month net?', `About ${eur(ex.n4000.nettoMaandExclVakantiegeld)} net per month, plus about ${eur(ex.n4000.nettoVakantiegeld)} net holiday allowance per year. With a pension contribution you keep less.`],
      ['What are the Dutch tax brackets in 2026?', `Below state pension age you pay ${pct(b1[0].rate)} up to ${eur(b1[0].upTo)}, ${pct(b1[1].rate)} up to ${eur(b1[1].upTo)} and ${pct(b1[2].rate, 2, 2)} above that. The first bracket includes national insurance contributions.`],
      ['What is payroll tax (loonheffing)?', 'Payroll tax is the wage tax plus the national insurance contributions your employer withholds. Your employer subtracts the general tax credit and the labour tax credit. Together these are called the loonheffingskorting.'],
      ['Why is my payslip different?', 'Your employer uses monthly tables and special rates for payments such as holiday allowance. A company car, travel allowances or a different pension scheme also cause differences. Over a full year, your pay usually comes close to this calculation.'],
    ],
    ib: [
      ['What are the box 1 rates in 2026?', `${pct(b1[0].rate)} up to ${eur(b1[0].upTo)}, ${pct(b1[1].rate)} up to ${eur(b1[1].upTo)} and ${pct(b1[2].rate, 2, 2)} above that. If you have reached state pension age, the first bracket is ${pct(P.box1.aowBornFrom1946[0].rate)}.`],
      ['How much is the general tax credit in 2026?', `At most ${eur(ahk.max)}. Above an income of ${eur(ahk.phaseOutFrom)}, the credit drops by ${pct(ahk.phaseOutRate, 3)} per euro. From ${eur(ahk.zeroFrom)} the credit is €0.`],
      ['How much is the labour tax credit in 2026?', `At most ${eur(ak[3].base)}, at an income from work of ${eur(ak[3].from)}. Above that the credit goes down. From ${eur(ak[3].to)} the labour tax credit (arbeidskorting) is €0.`],
      ['What is the box 2 rate?', `${pct(P.box2.brackets[0].rate, 1)} on the first ${eur(P.box2.brackets[0].upTo)} and ${pct(P.box2.brackets[1].rate, 0)} above that. Box 2 is income from a substantial interest (aanmerkelijk belang), such as dividend from your own bv.`],
      ['What is the rate adjustment (tariefsaanpassing)?', `In 2026, deductions, the self-employed deduction and the SME profit exemption save you at most ${pct(O.aftrekTariefBeperking)}. If your income is in the top bracket, you pay back the difference as a rate adjustment.`],
    ],
    zzp: [
      ['How much tax do I pay as a freelancer (zzp)?', `It depends on your profit. If you meet the hours criterion and have no other income, in 2026 you pay about ${ex.z.map(([w, r]) => `${pct(r.reserveerPct, 0)} on ${eur(w)} profit`).join(', ')}. That is income tax plus the Zvw contribution.`],
      ['How much is the self-employed deduction in 2026?', `${eur(O.zelfstandigenaftrek)}. If you have reached state pension age at the start of the year, it is ${eur(O.zelfstandigenaftrekAOW)}. Starters get an extra ${eur(O.startersaftrek)} start-up deduction (startersaftrek).`],
      ['What is the hours criterion (urencriterium)?', `You work at least ${num(O.urencriteriumUren)} hours a year on your business. Then you qualify for the self-employed deduction and the start-up deduction (startersaftrek). Keep a record of your hours: the Belastingdienst can ask for it.`],
      ['How much is the SME profit exemption in 2026?', `${pct(O.mkbWinstvrijstelling, 1)} of your profit after the entrepreneur's deductions. You get the SME profit exemption (mkb-winstvrijstelling) even if you do not meet the hours criterion.`],
      ['How much Zvw contribution do I pay as a freelancer?', `${pct(P.zvw.bijdrageZelf)} of your taxable profit, on at most ${eur(P.zvw.maxBijdrageInkomen)}. If you also have a salary, it counts towards that maximum.`],
    ],
    box3: [
      ['How much is the tax-free allowance in 2026?', `${eur(B3.heffingsvrijVermogen)} per person. With a fiscal partner it is ${eur(B3.heffingsvrijVermogenPartners)} together.`],
      ['Which box 3 rates apply in 2026?', `Bank balances ${pct(B3.rendement.bank.rate)}, other assets ${pct(B3.rendement.overig.rate, 2, 2)} and debts ${pct(B3.rendement.schulden.rate)}. The tax rate is ${pct(B3.tarief)}. The rates for bank balances and debts are provisional.`],
      ['Which debts count?', `Debts above the threshold of ${eur(B3.schuldendrempelPerPersoon)} per person. The mortgage on your own home does not count in box 3; it belongs in box 1.`],
      ['What is proving your actual return (tegenbewijs)?', 'Is your real return lower than the deemed return? Then you may prove it. You then pay tax on your actual return, without the tax-free allowance. The Belastingdienst has a form for this.'],
      ['How does box 3 work with a fiscal partner?', 'You add up your assets and get the tax-free allowance twice. Then you may split the tax base between you in any way you like.'],
    ],
    vakantiegeld: [
      ['How much holiday allowance do I get?', `At least 8% of your gross salary. At ${eur(3500)} gross per month that is ${eur(ex.vg.bruto)} gross per year. Your collective agreement (cao) or contract can give a higher percentage.`],
      ['How much of my holiday allowance do I keep?', `At ${eur(3500)} gross per month, about ${eur(ex.vg.netto)} net. You then pay ${pct(ex.vg.marginaalTarief, 1)} tax on your holiday allowance.`],
      ['Why is so much tax taken off?', 'Your holiday allowance comes on top of your salary, so it falls in your highest bracket. Your tax credits also go down when you earn more. That is why the percentage is often higher than your bracket.'],
      ['When do I get my holiday allowance?', 'Most employers pay it in May or June. Your contract or cao states the month. Some employers pay it out every month.'],
    ],
    expat: [
      ['What is the 30% ruling?', 'Your employer may give you a tax-free allowance for the extra costs of coming to work in the Netherlands. The allowance is at most 30% of your salary. You then pay tax on a lower salary.'],
      ['What is the salary threshold in 2026?', `Your taxable salary must be higher than ${eur(X.salarisnorm)} (2025: €46,660). If you are under 30 and have a master's degree, the threshold is ${eur(X.salarisnormOnder30Master)}.`],
      ['Is there a maximum?', `Yes. The allowance is at most ${pct(X.pct, 0)} of the WNT salary cap of ${eur(X.wntNorm)}. That is ${eur(X.maxVergoeding)} per year.`],
      ['How do I apply for the 30% ruling?', 'You and your employer apply together to the Belastingdienst. The Belastingdienst decides whether you qualify.'],
    ],
    zorgtoeslag: [
      ['What is the income limit for healthcare allowance in 2026?', `According to the table, you get no healthcare allowance from an assessment income of ${eur(zGrens(Z.tableSingle))} (single) or ${eur(zGrens(Z.tablePartner))} (with an allowance partner). There is also a limit on your assets.`],
      ['What is the maximum healthcare allowance?', `With a low income, ${eur(Z.tableSingle[0][1])} per month if you are single, or ${eur(Z.tablePartner[0][1])} per month with an allowance partner.`],
      ['What is the standard premium in 2026?', `${eur(Z.standaardpremie)} per year. Dienst Toeslagen uses this amount to calculate the healthcare allowance.`],
      ['How do I apply for healthcare allowance?', 'Through Mijn toeslagen on the Dienst Toeslagen website, with your DigiD. First do the official trial calculation (proefberekening) to see the exact amount.'],
    ],
  };

  // "How does it work?": short method text per calculator (the full method is on the methodology page).
  const how = {
    netto: `<p>The calculator turns your annual salary into taxable salary: gross salary plus holiday allowance, minus your pension contribution. The box 1 tax brackets apply to that amount. Then the general tax credit and the labour tax credit come off. What is left is your payroll tax (loonheffing).</p>
<p>Net per month excludes holiday allowance and a 13th month. We calculate those separately, from the difference in tax with and without them.</p>`,
    ib: `<p>Box 1, box 2 and box 3 each have their own rate. The calculator adds up the tax of the three boxes and subtracts the tax credits. The general tax credit depends on your aggregate income (verzamelinkomen), the labour tax credit on your income from work (salary and profit).</p>
<p>The calculator rounds like the Belastingdienst: down per bracket, to whole euros.</p>`,
    zzp: `<p>First the self-employed deduction and, if you qualify, the start-up deduction (startersaftrek) come off your profit. Then the ${pct(O.mkbWinstvrijstelling, 1)} SME profit exemption comes off. You pay box 1 income tax on the rest, minus the tax credits.</p>
<p>On top of that you pay the income-related health insurance contribution (Zvw) of ${pct(P.zvw.bijdrageZelf)}. Employees do not pay this themselves: their employer pays the employer levy.</p>`,
    box3: `<p>The calculator follows the 6 steps of the Belastingdienst. Each type of asset gets a fixed (deemed) return. The tax-free allowance decides which part of it is taxed. You pay ${pct(B3.tarief)} on that income.</p>
<p>We tested the calculation with the 5 worked examples of the Belastingdienst. All 5 match to the euro.</p>`,
    vakantiegeld: `<p>The calculator works out your annual tax twice: with and without holiday allowance. The difference is the tax on your holiday allowance. This also shows the effect of lower tax credits.</p>`,
    expat: `<p>The calculator subtracts the tax-free allowance from your salary. Your taxable salary always stays above the salary threshold, as the rules require. Then it compares your net salary with and without the ruling.</p>`,
    zorgtoeslag: `<p>Dienst Toeslagen publishes a table with the monthly healthcare allowance for each income. The calculator looks up your income in that table. The table is rounded to steps of €500.</p>`,
  };

  // English names for data/sources.json ids. The pages themselves are in Dutch.
  const sourceNames = {
    bd_va2026: 'Belastingdienst: provisional assessment, rates and tax credits',
    bd_fisin_berekening: 'Belastingdienst: tax calculation 2026 (fiscal information)',
    bd_fisin_kortingen: 'Belastingdienst: tax credits 2026 (fiscal information)',
    bd_tabel_ak2026: 'Belastingdienst: labour tax credit table 2026',
    ro_heffingskorting: 'Rijksoverheid: what is a tax credit?',
    bd_zelfstandigenaftrek2026: 'Belastingdienst: self-employed deduction 2026',
    bd_mkb2026: 'Belastingdienst: SME profit exemption 2026',
    bd_urencriterium: 'Belastingdienst: hours criterion conditions',
    ro_sleuteltabel2026: 'Rijksoverheid: key tax figures 2026 (pdf)',
    bd_kor: 'Belastingdienst: small business scheme (KOR) conditions',
    bd_zvw_pct: 'Belastingdienst: Zvw percentages',
    bd_fisin_zvw: 'Belastingdienst: income-related Zvw contribution 2026',
    stcrt_2025_38055: 'Government Gazette (Staatscourant) 2025, 38055 (Zvw percentages)',
    bd_box2: 'Belastingdienst: box 2 rates',
    bd_box3_2026: 'Belastingdienst: box 3 income calculation 2026',
    bd_werkelijk_rendement: 'Belastingdienst: what is my actual return?',
    bd_expat: 'Belastingdienst: applying for the 30% ruling',
    bd_zorgtoeslag_hoeveel: 'Belastingdienst: how much healthcare allowance do I get?',
    stcrt_2025_40022: 'Government Gazette (Staatscourant) 2025, 40022 (healthcare allowance)',
    ro_huurtoeslag2026: 'Rijksoverheid: rent benefit parameters 2026 (news item)',
    ro_kot2026: 'Rijksoverheid: childcare benefit amounts 2026',
    wetten_wkb2026: 'Wetten.nl: Child Budget Act (Wet op het kindgebonden budget, 2026)',
    bd_oldb_cijfers2026: 'Belastingdienst: payroll tax figures annex 2026 (pdf)',
  };

  const affiliate = {
    heading: 'Bookkeeping and business bank account',
    note: `Advertisement / affiliate — see <a href="${url('affiliate')}">disclosure</a>`,
    intro: 'As a business owner you keep records. A separate business account makes that easier. These services are listed in alphabetical order. We have not tested or compared them. Their websites are mostly in Dutch.',
    homeHeading: 'For freelancers: bookkeeping &amp; business banking', homeIntro: 'Do you work as a freelancer in the Netherlands? Then you need bookkeeping and a business account. These services are listed in alphabetical order. We have not tested them. This is not tax advice. Their websites are mostly in Dutch.',
    software: 'Bookkeeping software', bank: 'Business bank account',
  };

  // Healthcare allowance page: the other allowances as information only (not calculated).
  const toeslagInfo = () => {
    const H = P.toeslagen.huurtoeslag, KO = P.toeslagen.kinderopvangtoeslag, KB = P.toeslagen.kindgebondenBudget;
    const proef = `<p class="more"><a href="${OFFICIAL.proef}" rel="noopener" hreflang="nl">Do the official trial calculation (in Dutch)</a></p>`;
    const tr = (l, v) => `<tr><th scope="row">${l}</th><td class="amt">${v}</td></tr>`;
    return `<section class="info" aria-labelledby="ot-h"><h2 id="ot-h">Other Dutch benefits in 2026</h2>
<p>We do not calculate these benefits (toeslagen). The rules have too many exceptions for a reliable estimate. Below are the main amounts. For your own amount, use the trial calculation of Dienst Toeslagen.</p>
<h3>Rent benefit (huurtoeslag) <span class="tag">Provisional</span></h3>
<div class="table-wrap"><table class="params"><tbody>${tr('Rent limit (maximum rent)', eur2(H.huurgrens))}${tr('Quality discount limit', eur2(H.kwaliteitskortingsgrens))}${tr('Capping limit (1 or 2 people)', eur2(H.aftoppingsgrensLaag))}${tr('Capping limit (3 or more people)', eur2(H.aftoppingsgrensHoog))}</tbody></table></div>
<p class="src">Source: ${srcLink('ro_huurtoeslag2026')}. Still to be confirmed in the Government Gazette.</p>${proef}
<h3>Childcare benefit (kinderopvangtoeslag)</h3>
<div class="table-wrap"><table class="params"><tbody>${tr('Maximum hourly rate, day care', eur2(KO.maxUurprijs.dagopvang))}${tr('Maximum hourly rate, out-of-school care', eur2(KO.maxUurprijs.bso))}${tr('Maximum hourly rate, childminder', eur2(KO.maxUurprijs.gastouder))}${tr('Maximum hours per month', String(KO.maxUrenPerMaand))}</tbody></table></div>
<p class="src">Source: ${srcLink('ro_kot2026')}.</p>${proef}
<h3>Child budget (kindgebonden budget) <span class="tag">Not verified</span></h3>
<div class="table-wrap"><table class="params"><tbody>${tr('Per child per year', eur(KB.perKind))}${tr('Extra for a child aged 12 to 15', eur(KB.extra12tot15))}${tr('Extra for a child aged 16 or 17', eur(KB.extra16tot17))}${tr('Extra for a single parent', eur(KB.alleenstaandeOuderKop))}${tr('Lower above (single)', eur(KB.drempelAlleenstaand))}${tr('Lower above (with partner)', eur(KB.drempelPartners))}</tbody></table></div>
<p class="src">Source: ${srcLink('wetten_wkb2026')}. We have not yet checked these amounts against the text of the law ourselves.</p>${proef}
</section>`;
  };

  const home = {
    title: 'Dutch tax calculator 2026: net salary, income tax, zzp',
    desc: 'Free Dutch tax calculators for 2026 in English: net salary, income tax, zzp freelancer tax, box 3, holiday allowance, 30% ruling and healthcare allowance.',
    h1: 'Dutch tax calculator 2026',
    lead: 'Work out your net salary, Dutch income tax, freelancer (zzp) tax and box 3 with the 2026 figures. In English, with the official Dutch source for every amount.',
    facts: ['Free, no account needed', 'No cookies, only anonymous visit counts', 'Tested against the worked examples of the Belastingdienst'],
    quick: 'Net salary: gross to net', allCalcs: 'All calculators', guides: 'Guides', noGuides: 'Guides will appear here soon.',
    trustH: 'How we calculate',
    trust: '<p>All rates, credits and limits come from belastingdienst.nl, rijksoverheid.nl and officielebekendmakingen.nl. We round like the Belastingdienst does. Our box 3 calculation matches all 5 official worked examples to the euro.</p><p>The calculators work the same as the Dutch version of this site, with the same figures.</p>',
    trustLink: 'See all figures and sources',
  };

  const guidesIndex = {
    title: 'Dutch tax guides 2026 in English | Belastingcalculator',
    desc: 'Plain-English guides to Dutch tax in 2026 for expats: changes for freelancers (zzp), a tax return checklist, box 3 and more. With official sources.',
    h1: 'Dutch tax guides for 2026', crumb: 'Guides',
    lead: 'Dutch tax explained in plain English, with the 2026 figures and a source for every amount.',
    empty: 'There are no guides on this site yet.',
    foreignH: 'Only in Dutch', foreignLead: 'These guides are not (yet) available in English. Your browser can translate them.',
  };
  const guide = { calcH: 'Work it out yourself' };

  // Methodology and sources: rendered from params + sources
  const methode = {
    title: 'Methodology and sources 2026 | Belastingcalculator',
    desc: 'How Belastingcalculator calculates: every 2026 Dutch tax rate and credit, the rounding rules, provisional figures and each official source with its date.',
    h1: 'Methodology and sources 2026', crumb: 'Methodology and sources',
    lead: 'How the calculators work, which figures we use and where each figure comes from.',
    sourcesId: 'sources', sourcesH: 'All sources',
    retrieved: `Retrieved on <time datetime="${P.retrieved}">${esc(longDate(P.retrieved))}</time>. All sources are in Dutch.`,
    body: () => {
      const src = ids => `<p class="src">Source: ${[].concat(ids).map(srcLink).join(', ')}.</p>`;
      const kv = rows => tbl(['Item', 'Value 2026'], rows);
      const brackets = (list, min = 0) => list.map((b, i) => [i === 0 ? `up to ${eur(b.upTo)}` : b.upTo == null ? `from ${eur(list[i - 1].upTo)}` : `${eur(list[i - 1].upTo)} to ${eur(b.upTo)}`, pct(b.rate, 2, min)]);
      const prov = tag('Provisional');
      const akRow = s => [s.to == null ? `from ${eur(s.from)}` : `${eur(s.from)} to ${eur(s.to)}`, s.to == null ? '€0' : s.rate >= 0 ? (s.base ? `${eur(s.base)} + ${pct(s.rate, 3)} × (income − ${eur(s.from)})` : `${pct(s.rate, 3)} × income`) : `${eur(s.base)} − ${pct(-s.rate, 3)} × (income − ${eur(s.from)})`];
      const A = P.algemeneHeffingskorting, IA = P.inkomensafhankelijkeCombinatiekorting, OK = P.ouderenkorting, ZV = P.zvw, H = P.toeslagen.huurtoeslag, KO = P.toeslagen.kinderopvangtoeslag, KB = P.toeslagen.kindgebondenBudget;
      const thetax = [['€30,000', '€27,754.21', '€27,754', '0'], ['€45,000', '€36,614.07', '€36,614', '0'], ['€60,000', '€44,093.96', '€44,094', '0'], ['€90,000', '€58,312.13', '€58,313', '+1'], ['€150,000', '€85,818.00', '€85,819', '+1'], ['€40,000, state pension age', '€38,718.53', '€38,720', '+1.5'], ['€75,600 with 30% ruling', '€63,267.10', '€63,266', '−1']];
      return `<p>We retrieved all figures on <time datetime="${P.retrieved}">${esc(longDate(P.retrieved))}</time> from belastingdienst.nl, rijksoverheid.nl, wetten.overheid.nl and officielebekendmakingen.nl. A figure labelled <span class="tag">Provisional</span> is one the government itself calls provisional (voorlopig).</p>
<nav aria-label="On this page" class="toc"><ul><li><a href="#how-we-calculate">How we calculate</a></li><li><a href="#rounding">Rounding</a></li><li><a href="#testing">Testing</a></li><li><a href="#figures">All 2026 figures</a></li><li><a href="#not-calculated">What we do not calculate</a></li><li><a href="#sources">All sources</a></li></ul></nav>
<h2 id="how-we-calculate">How we calculate</h2>
<ul><li>We calculate per year. Employers calculate per month with the payroll tax tables. Over a full year, the results come close.</li>
<li>For us, payroll tax (loonheffing) is the income tax on your taxable salary, minus the general tax credit and the labour tax credit.</li>
<li>Tax credits only reduce the tax you pay. You get no money back if the credits are higher than your tax.</li>
<li>Deductions, the self-employed deduction and the SME profit exemption save you at most ${pct(O.aftrekTariefBeperking)} (rate adjustment, tariefsaanpassing).</li>
<li>The labour tax credit uses your income from work: salary plus profit before the entrepreneur's deductions and the SME profit exemption.</li>
<li>Net holiday allowance is the difference in annual tax with and without holiday allowance. We do the same for a 13th month.</li>
<li>Box 3 follows the 6 steps of the Belastingdienst for 2026.</li>
<li>All calculations run in your own browser. We store nothing.</li></ul>
<h2 id="rounding">Rounding</h2>
<p>We round as in the official worked examples:</p>
<ul><li>Tax per bracket: rounded down to whole euros.</li><li>Tax credits: rounded down to whole euros.</li><li>Box 3: the return on assets rounded down, the return on debts rounded up, the percentage share cut off at 2 decimals, the income rounded down.</li><li>Results such as net per month: rounded to whole euros.</li></ul>
<h2 id="testing">Testing</h2>
<p>The rules are tested with 19 automated tests. They include the official worked examples of the Belastingdienst: box 3 (€417, €72, €4,667, €1,842 and €4,973) and box 2 (€70,000 gives €17,224). All examples match to the euro.</p>
<p>We also compared the net annual salary of employees with thetax.nl (17 October 2026, without holiday allowance):</p>
${tbl(['Gross annual salary', 'thetax.nl', 'Belastingcalculator', 'Difference'], thetax)}
<p>The differences are €2 at most. Thetax.nl calculates in cents. We round credits and brackets to whole euros, like the Belastingdienst.</p>
<h2 id="figures">All 2026 figures</h2>
<h3>Box 1: rates</h3>
${tbl(['Taxable income', 'Below state pension age'], brackets(P.box1.belowAOW, 2))}
${tbl(['Taxable income', 'State pension age, born 1946 or later'], brackets(P.box1.aowBornFrom1946, 2))}
${tbl(['Taxable income', 'State pension age, born before 1946'], brackets(P.box1.aowBornBefore1946, 2))}
${src(P.box1.src)}
<h3>General tax credit (algemene heffingskorting)</h3>
${kv([['Maximum (below state pension age)', eur(A.belowAOW.max)], ['Phase-out from', eur(A.belowAOW.phaseOutFrom)], ['Phase-out per euro', pct(A.belowAOW.phaseOutRate, 3)], ['€0 from', eur(A.belowAOW.zeroFrom)], ['Maximum (state pension age)', eur(A.aowWholeYear.max)], ['Phase-out per euro (state pension age)', pct(A.aowWholeYear.phaseOutRate, 3)]])}
${src(A.src)}
<h3>Labour tax credit (arbeidskorting), below state pension age</h3>
${tbl(['Income from work', 'Labour tax credit'], P.arbeidskorting.belowAOW.map(akRow))}
${src(P.arbeidskorting.src)}
<h3>Labour tax credit, state pension age</h3>
${tbl(['Income from work', 'Labour tax credit'], P.arbeidskorting.aowWholeYear.map(akRow))}
<h3>Other tax credits</h3>
${kv([['Working parent tax credit (inkomensafhankelijke combinatiekorting)', `${pct(IA.belowAOW.rate, 2)} × (income from work − ${eur(IA.belowAOW.minArbeidsinkomen)}), at most ${eur(IA.belowAOW.max)}`], ['Working parent tax credit (state pension age)', `at most ${eur(IA.aowWholeYear.max)}`], ['Senior tax credit (ouderenkorting)', `${eur(OK.max)}, lower from ${eur(OK.phaseOutFrom)} (${pct(OK.phaseOutRate, 0)} per euro), €0 from ${eur(OK.zeroFrom)}`], ['Single senior tax credit (alleenstaande ouderenkorting)', eur(P.alleenstaandeOuderenkorting.amount)], ['Young disabled persons tax credit (not in the calculators)', eur(P.jonggehandicaptenkorting.amount)]])}
${src(['bd_fisin_kortingen', 'bd_va2026'])}
<h3>Self-employed (ondernemers)</h3>
${kv([['Hours criterion (urencriterium)', `${num(O.urencriteriumUren)} hours`], ['Self-employed deduction (zelfstandigenaftrek)', eur(O.zelfstandigenaftrek)], ['Self-employed deduction (state pension age)', eur(O.zelfstandigenaftrekAOW)], ['Start-up deduction (startersaftrek)', eur(O.startersaftrek)], ['Start-up deduction (state pension age)', eur(O.startersaftrekAOW)], ['SME profit exemption (mkb-winstvrijstelling)', pct(O.mkbWinstvrijstelling, 1)], ['Maximum rate for deductions', pct(O.aftrekTariefBeperking)], ['Small business scheme (KOR) turnover limit (VAT)', eur(P.kor.omzetgrens)]])}
${src([...O.src, ...P.kor.src])}
<h3>Health Insurance Act (Zvw)</h3>
${kv([['Contribution for freelancers and other own income', pct(ZV.bijdrageZelf)], ['Employer levy', pct(ZV.werkgeversheffing, 2)], ['Maximum contribution income', eur(ZV.maxBijdrageInkomen)]])}
${src(ZV.src)}
<h3>Box 2</h3>
${tbl(['Income from a substantial interest', 'Rate'], brackets(P.box2.brackets))}
${src(P.box2.src)}
<h3>Box 3</h3>
${kv([['Tax-free allowance (heffingsvrij vermogen)', eur(B3.heffingsvrijVermogen)], ['Tax-free allowance (fiscal partners)', eur(B3.heffingsvrijVermogenPartners)], ['Return on bank balances' + prov, pct(B3.rendement.bank.rate)], ['Return on other assets', pct(B3.rendement.overig.rate, 2, 2)], ['Return on debts' + prov, pct(B3.rendement.schulden.rate)], ['Debt threshold per person', eur(B3.schuldendrempelPerPersoon)], ['Green investments exemption per person', eur(B3.groeneBeleggingenVrijstellingPerPersoon)], ['Rate', pct(B3.tarief)]])}
${src(B3.src)}
<h3>30% ruling (30%-regeling)</h3>
${kv([['Maximum allowance', pct(X.pct, 0)], ['Salary threshold', eur(X.salarisnorm)], ['Salary threshold under 30 with a master\'s degree', eur(X.salarisnormOnder30Master)], ['WNT salary cap', eur(X.wntNorm)], ['Maximum allowance in euros', eur(X.maxVergoeding)]])}
${src(X.src)}
<h3>Healthcare allowance (zorgtoeslag)</h3>
${kv([['Standard premium', eur(Z.standaardpremie)], ['Maximum per month (single)', eur(Z.tableSingle[0][1])], ['Maximum per month (with allowance partner)', eur(Z.tablePartner[0][1])], ['No allowance from (single)', eur(zGrens(Z.tableSingle))], ['No allowance from (with allowance partner)', eur(zGrens(Z.tablePartner))]])}
<details><summary>Full healthcare allowance table 2026 (rounded)</summary>
${tbl(['Assessment income below', 'Single, per month', 'With allowance partner, per month'], Z.tablePartner.map(([upTo, amt]) => { const s = Z.tableSingle.find(x => x[0] === upTo); return [eur(upTo), s ? eur(s[1]) : '€0', eur(amt)]; }))}</details>
${src(Z.src)}
<h3>Rent benefit (huurtoeslag)${prov}</h3>
${kv([['Rent limit', eur2(H.huurgrens)], ['Quality discount limit', eur2(H.kwaliteitskortingsgrens)], ['Capping limit, low', eur2(H.aftoppingsgrensLaag)], ['Capping limit, high', eur2(H.aftoppingsgrensHoog)]])}
<p>Not calculated: we have not checked the formula for the standard rent.</p>
${src(H.src)}
<h3>Childcare benefit (kinderopvangtoeslag)</h3>
${kv([['Maximum hourly rate, day care', eur2(KO.maxUurprijs.dagopvang)], ['Maximum hourly rate, out-of-school care', eur2(KO.maxUurprijs.bso)], ['Maximum hourly rate, childminder', eur2(KO.maxUurprijs.gastouder)], ['Maximum hours per month', String(KO.maxUrenPerMaand)]])}
${src(KO.src)}
<h3>Child budget (kindgebonden budget) <span class="tag">Not verified</span></h3>
${kv([['Per child', eur(KB.perKind)], ['Extra, age 12 to 15', eur(KB.extra12tot15)], ['Extra, age 16 and 17', eur(KB.extra16tot17)], ['Extra, single parent', eur(KB.alleenstaandeOuderKop)], ['Phase-out', pct(KB.afbouwRate, 1)], ['Phase-out from (single)', eur(KB.drempelAlleenstaand)], ['Phase-out from (partners)', eur(KB.drempelPartners)]])}
<p>We have not yet checked these amounts against the text of the law. We do not use them in a calculator.</p>
${src(KB.src)}
<h2 id="not-calculated">What we do not calculate</h2>
<ul><li>The monthly payroll tax tables and the special rate for bonuses and allowances.</li>
<li>The monthly rate if you reach state pension age during 2026.</li>
<li>The young disabled persons tax credit, the addition for a company car (bijtelling) and your own home in detail.</li>
<li>VAT (btw), the small business scheme (KOR) and corporate income tax.</li>
<li>Rent benefit, childcare benefit and the child budget. For those, use the ${nl(`<a href="${OFFICIAL.proef}" rel="noopener" hreflang="nl">proefberekening</a>`)} (trial calculation) of Dienst Toeslagen.</li>
<li>The asset limit for healthcare allowance.</li></ul>`;
    },
  };

  const pages = {
    privacy: { h1: 'Privacy policy 2026', title: 'Privacy policy 2026 | Belastingcalculator', desc: 'Belastingcalculator sets no cookies. We count visits anonymously with GoatCounter. Your calculation stays in your own browser.', html: `
<p class="lead">In short: we set no cookies, we do not store your calculations and we count visits anonymously with GoatCounter.</p>
<h2>Your calculation stays with you</h2>
<p>All calculations run in your own browser. The amounts you enter are not sent to us or to anyone else.</p>
<p>Your input is part of the page address (for example <code>?bruto=4000</code>). That is how you share a calculation with the "Copy link" button. If you share that link, the person who opens it sees your amounts. Your browser can keep the address in its history.</p>
<h2>No cookies</h2>
<p>We set no cookies, and neither does GoatCounter. We use no ad networks and no social media buttons. That is why there is no cookie banner either.</p>
<p>If you use the dark mode button, your browser keeps that choice (light or dark) in its own storage (localStorage). It never leaves your device.</p>
<h2>Visit statistics with GoatCounter</h2>
<p>We count visits with <a href="${OFFICIAL.goatcounter}" rel="noopener">GoatCounter</a>. This shows us how often a page is read and how often someone clicks a link to a service. We see totals only, not people.</p>
<ul>
<li>GoatCounter gets the page address without your amounts, the page title and the site you came from. It also gets your screen width, browser, operating system, language and country.</li>
<li>If you click a link to a service, GoatCounter gets the name of that link, for example <code>aff-jortt</code>.</li>
<li>GoatCounter does not store your IP address. It does not build a profile of you and does not follow you to other sites.</li>
<li>To count a visit once, GoatCounter keeps your IP address and browser in memory for 8 hours at most. Then they are gone.</li>
<li>The data is on servers of Hetzner in Germany and Finland, so in the EU.</li>
</ul>
<p>Read the <a href="${OFFICIAL.gcPrivacy}" rel="noopener">GoatCounter privacy policy</a>. If your browser blocks GoatCounter, the site still works.</p>
<h2>Hosting</h2>
<p>The site runs on GitHub Pages. GitHub processes technical data, such as your IP address, to deliver and protect the pages. Read the <a href="${OFFICIAL.ghPrivacy}" rel="noopener">GitHub privacy statement</a>.</p>
<h2>Links to other sites</h2>
<p>We link to the Belastingdienst, the Dutch government (Rijksoverheid) and a few commercial services. If you click such a link, the privacy policy of that site applies. See also the <a href="${url('affiliate')}">affiliate disclosure</a>.</p>
<h2>Questions</h2>
<p>Do you have a question about privacy? Open an issue on <a href="${OFFICIAL.contact}" rel="noopener">GitHub</a>.</p>` },
    affiliate: { h1: 'Affiliate disclosure 2026', title: 'Affiliate disclosure 2026 | Belastingcalculator', desc: 'How Belastingcalculator may earn money from links to bookkeeping software and a business bank account, and why that does not affect the calculations.', html: `
<p class="lead">A few pages have links to commercial services. They are clearly marked "Advertisement / affiliate".</p>
<h2>What is an affiliate link?</h2>
<p>If you open an account or take out a subscription through such a link, the service may pay us a fee. You pay nothing extra.</p>
<h2>Which services?</h2>
<ul>${[...AFFILIATE.boekhouden, ...AFFILIATE.bank].map(a => `<li>${esc(a.name)}: ${esc(a.what.en)}</li>`).join('')}</ul>
<p>Some of these links are affiliate links, or may become affiliate links. If you sign up through such a link, we may earn a commission. You pay nothing extra. All of them carry the attribute <code>rel="sponsored"</code>.</p>
<h2>Our rules</h2>
<ul><li>The calculations never depend on an affiliate partner.</li><li>We list services in alphabetical order. We never call anything "the best".</li><li>We write no reviews and show no ratings.</li><li>We show no ads from ad networks.</li></ul>` },
    over: { h1: 'About Belastingcalculator (2026)', title: 'About Belastingcalculator: Dutch tax for 2026', desc: 'Belastingcalculator is an independent, free site to calculate your Dutch tax for 2026, in Dutch and English. Read how we work and how to contact us.', html: `
<p class="lead">${BRAND} is a free, independent site to calculate your Dutch tax for 2026. No account, no cookies.</p>
<h2>Why this site?</h2>
<p>The government's calculators are reliable, but they explain little and are mostly in Dutch. Many other calculators do not show where their figures come from. We show every step of the calculation, with the official source next to it.</p>
<h2>Why an English version?</h2>
<p>Dutch tax is hard enough in your own language. The English pages use the same calculators and the same 2026 figures as the Dutch pages. We keep the Dutch terms in brackets, so you recognise them on your payslip and in your tax return.</p>
<h2>How we work</h2>
<ul><li>Every figure comes from an official source. You find them all on <a href="${url('methode')}">methodology and sources</a>.</li><li>We test the rules with the worked examples of the Belastingdienst.</li><li>The rules and texts were made with the help of AI and then checked against the sources.</li><li>We do not give tax advice. Not sure? Ask the Belastingdienst or a tax adviser.</li></ul>
<h2>Independent</h2>
<p>We are not connected to the Belastingdienst, Dienst Toeslagen or the Dutch government. A few pages have marked affiliate links. Read the <a href="${url('affiliate')}">affiliate disclosure</a>.</p>
<h2>Contact</h2>
<p>Found a mistake or have a question? Open an issue on <a href="${OFFICIAL.contact}" rel="noopener">GitHub</a>.</p>` },
  };

  const notFound = {
    title: 'Page not found | Belastingcalculator 2026', desc: 'This page does not exist. Choose one of the 2026 calculators or read one of the guides.',
    h1: 'This page does not exist', lead: 'Maybe the address has a typo, or the page has moved. Choose a calculator below.', home: 'Go to the English home page',
  };

  return { ui, calcs, faq, how, sourceNames, affiliate, toeslagInfo, home, guidesIndex, guide, methode, pages, notFound };
}
