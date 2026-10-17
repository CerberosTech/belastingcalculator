// Dutch page copy. site/copy-en.mjs has the same shape; build.mjs stops when a key is missing in one of them.
// Every figure comes from the params (P), an engine example (ex) or a helper: never type a number by hand.
export default function copy({ P, ex, zGrens, eur, pct, num, esc, url, BRAND, OFFICIAL, AFFILIATE, srcLink, tbl, longDate, UPDATED }) {
  const b1 = P.box1.belowAOW, ahk = P.algemeneHeffingskorting.belowAOW, ak = P.arbeidskorting.belowAOW, O = P.ondernemer, B3 = P.box3, X = P.expatregeling, Z = P.toeslagen.zorgtoeslag;
  const eur2 = n => '€ ' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const tag = t => ` <span class="tag">${t}</span>`;

  const ui = {
    updated: 'Bijgewerkt', skip: 'Naar de inhoud', mainNav: 'Hoofdmenu', language: 'Taal', otherLangIndex: 'Gidsen in het Nederlands', crumbs: 'Kruimelpad',
    nav: [['home', 'Calculators', '#calculators'], ['gidsen', 'Gidsen'], ['methode', 'Methode']],
    ogAlt: 'Belastingcalculator: belasting berekenen 2026',
    footer: { calcs: 'Calculators', guides: 'Gidsen', allGuides: 'Alle gidsen', site: 'Over deze site', method: 'Methode en bronnen', about: `Over ${BRAND}`, privacy: 'Privacy', affiliate: 'Affiliate-disclosure',
      note: `Indicatieve berekening, geen belastingadvies. ${BRAND} is onafhankelijk en niet verbonden aan de Belastingdienst of Dienst Toeslagen. Cijfers 2026, bijgewerkt op ${esc(longDate(UPDATED))}.` },
    disclaimerLabel: 'Disclaimer',
    disclaimer: '<p><strong>Indicatieve berekening — geen belastingadvies.</strong> Controleer altijd bij de Belastingdienst.</p><p>De uitkomst is een schatting met de cijfers van 2026. Aan deze berekening kun je geen rechten ontlenen.</p>',
    yourData: 'Jouw gegevens', noscript: 'Zet JavaScript aan om met je eigen bedragen te rekenen. Hiernaast zie je een voorbeeld.', result: 'Uitkomst',
    copyLink: 'Kopieer link', sources: 'Bronnen', seeAlso: 'Zie ook', methodLower: 'methode en bronnen',
    faq: 'Veelgestelde vragen', otherCalcs: 'Andere calculators', how: 'Hoe werkt dit?', howMethod: 'Methode en bronnen: alle cijfers en afrondingsregels', example: 'Voorbeeld',
  };

  // match: which guides are "related" (tested on slug + title), so new guides link up without code changes.
  const calcs = [
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
      desc: `Bereken het netto voordeel van de 30%-regeling in 2026. Met de salarisnorm van ${eur(X.salarisnorm)}, de norm voor jonge masters en de maximale vergoeding.`,
      lead: 'Bereken wat de 30%-regeling je netto oplevert in 2026, en of je loon hoog genoeg is voor de salarisnorm.',
      match: /30-?procent|30%|expat|ruling/ },
    { key: 'zorgtoeslag', calc: 'zorgtoeslag', name: 'Zorgtoeslag', h1: 'Zorgtoeslag berekenen 2026',
      title: 'Zorgtoeslag berekenen 2026 – indicatie per maand', short: 'Een indicatie van je zorgtoeslag per maand, met de tabel van 2026.',
      desc: 'Bereken een indicatie van je zorgtoeslag voor 2026 met de tabel van Dienst Toeslagen. Met de inkomensgrens en links naar de officiële proefberekening.',
      lead: 'Vul je verwachte inkomen voor 2026 in. Je ziet een indicatie van je zorgtoeslag per maand, op basis van de tabel van Dienst Toeslagen.',
      match: /toeslag/ },
  ];

  const faq = {
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
  const how = {
    netto: `<p>De calculator rekent je jaarloon om naar fiscaal loon: brutoloon plus vakantiegeld, min jouw pensioenpremie. Daarover gelden de schijven van box 1. Daarna gaan de algemene heffingskorting en de arbeidskorting eraf. Wat overblijft is je loonheffing.</p>
<p>Netto per maand is zonder vakantiegeld en zonder 13e maand. Die rekenen we apart, met het verschil in belasting met en zonder.</p>`,
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

  // Readable names for data/sources.json ids (the URL is the source of truth).
  const sourceNames = {
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

  const affiliate = {
    heading: 'Boekhouding en zakelijke rekening',
    note: `Advertentie / affiliate — zie <a href="${url('affiliate')}">disclosure</a>`,
    intro: 'Als ondernemer houd je een administratie bij. Een aparte zakelijke rekening maakt dat makkelijker. Deze diensten staan op alfabetische volgorde. We hebben ze niet getest of vergeleken.',
    software: 'Boekhoudprogramma\'s', bank: 'Zakelijke rekening',
  };

  // Zorgtoeslag page: the other allowances as information only (not calculated).
  const toeslagInfo = () => {
    const H = P.toeslagen.huurtoeslag, KO = P.toeslagen.kinderopvangtoeslag, KB = P.toeslagen.kindgebondenBudget;
    const proef = `<p class="more"><a href="${OFFICIAL.proef}" rel="noopener">Maak de officiële proefberekening</a></p>`;
    const tr = (l, v) => `<tr><th scope="row">${l}</th><td class="amt">${v}</td></tr>`;
    return `<section class="info" aria-labelledby="ot-h"><h2 id="ot-h">Andere toeslagen in 2026</h2>
<p>Deze toeslagen berekenen we niet. De regels hebben te veel uitzonderingen voor een betrouwbare indicatie. Hieronder staan de belangrijkste bedragen. Voor je eigen bedrag maak je de proefberekening van Dienst Toeslagen.</p>
<h3>Huurtoeslag <span class="tag">Voorlopig</span></h3>
<div class="table-wrap"><table class="params"><tbody>${tr('Huurgrens (maximale huur)', eur2(H.huurgrens))}${tr('Kwaliteitskortingsgrens', eur2(H.kwaliteitskortingsgrens))}${tr('Aftoppingsgrens (1 of 2 personen)', eur2(H.aftoppingsgrensLaag))}${tr('Aftoppingsgrens (3 of meer personen)', eur2(H.aftoppingsgrensHoog))}</tbody></table></div>
<p class="src">Bron: ${srcLink('ro_huurtoeslag2026')}. Nog vast te stellen in de Staatscourant.</p>${proef}
<h3>Kinderopvangtoeslag</h3>
<div class="table-wrap"><table class="params"><tbody>${tr('Maximale uurprijs dagopvang', eur2(KO.maxUurprijs.dagopvang))}${tr('Maximale uurprijs buitenschoolse opvang', eur2(KO.maxUurprijs.bso))}${tr('Maximale uurprijs gastouderopvang', eur2(KO.maxUurprijs.gastouder))}${tr('Maximaal aantal uren per maand', String(KO.maxUrenPerMaand))}</tbody></table></div>
<p class="src">Bron: ${srcLink('ro_kot2026')}.</p>${proef}
<h3>Kindgebonden budget <span class="tag">Niet geverifieerd</span></h3>
<div class="table-wrap"><table class="params"><tbody>${tr('Per kind per jaar', eur(KB.perKind))}${tr('Extra voor een kind van 12 tot 15', eur(KB.extra12tot15))}${tr('Extra voor een kind van 16 of 17', eur(KB.extra16tot17))}${tr('Extra voor een alleenstaande ouder', eur(KB.alleenstaandeOuderKop))}${tr('Lager boven (alleenstaand)', eur(KB.drempelAlleenstaand))}${tr('Lager boven (met partner)', eur(KB.drempelPartners))}</tbody></table></div>
<p class="src">Bron: ${srcLink('wetten_wkb2026')}. We hebben deze bedragen nog niet zelf in de wettekst gecontroleerd.</p>${proef}
</section>`;
  };

  const home = {
    title: 'Belasting berekenen 2026: netto, IB, zzp en box 3',
    desc: 'Bereken je belasting voor 2026: netto salaris, inkomstenbelasting, zzp, box 3, vakantiegeld, 30%-regeling en zorgtoeslag. Gratis, met officiële bronnen.',
    h1: 'Belasting berekenen 2026',
    lead: 'Reken je netto salaris, inkomstenbelasting, zzp-belasting en box 3 uit met de cijfers van 2026. Elk bedrag komt van de Belastingdienst, met bron.',
    facts: ['Gratis en zonder account', 'Geen cookies, alleen anonieme bezoekstatistiek', 'Getest met de rekenvoorbeelden van de Belastingdienst'],
    quick: 'Snel je netto salaris', allCalcs: 'Alle calculators', guides: 'Gidsen', noGuides: 'Binnenkort staan hier gidsen.',
    trustH: 'Zo rekenen we',
    trust: '<p>Alle tarieven, kortingen en grenzen komen van belastingdienst.nl, rijksoverheid.nl en officielebekendmakingen.nl. We ronden af zoals de Belastingdienst dat doet. De box 3-berekening komt bij alle 5 officiële rekenvoorbeelden op de euro uit.</p>',
    trustLink: 'Bekijk alle cijfers en bronnen',
  };

  const guidesIndex = {
    title: 'Gidsen over belasting in 2026 | Belastingcalculator',
    desc: 'Gidsen over belasting in 2026: wat er verandert voor zzp\'ers, een checklist voor je aangifte en meer. In gewone taal, met officiële bronnen.',
    h1: 'Gidsen over belasting in 2026', crumb: 'Gidsen',
    lead: 'Uitleg in gewone taal, met de cijfers van 2026 en een bron bij elk bedrag.',
    empty: 'Er staan nog geen gidsen op deze site.',
    foreignH: 'Alleen in het Engels', foreignLead: 'Deze gidsen zijn er (nog) niet in het Nederlands.',
  };
  const guide = { calcH: 'Reken het zelf uit' };

  // Methode en bronnen: rendered from params + sources
  const methode = {
    title: 'Methode en bronnen 2026 | Belastingcalculator',
    desc: 'Hoe Belastingcalculator rekent: alle tarieven en kortingen van 2026, de afrondingsregels, voorlopige cijfers en elke officiële bron met datum.',
    h1: 'Methode en bronnen 2026', crumb: 'Methode en bronnen',
    lead: 'Hoe de calculators rekenen, welke cijfers we gebruiken en waar elk cijfer vandaan komt.',
    sourcesId: 'bronnen', sourcesH: 'Alle bronnen',
    retrieved: `Opgehaald op <time datetime="${P.retrieved}">${esc(longDate(P.retrieved))}</time>.`,
    body: () => {
      const src = ids => `<p class="src">Bron: ${[].concat(ids).map(srcLink).join(', ')}.</p>`;
      const kv = rows => tbl(['Onderdeel', 'Waarde 2026'], rows);
      const brackets = (list, min = 0) => list.map((b, i) => [i === 0 ? `tot ${eur(b.upTo)}` : b.upTo == null ? `vanaf ${eur(list[i - 1].upTo)}` : `${eur(list[i - 1].upTo)} tot ${eur(b.upTo)}`, pct(b.rate, 2, min)]);
      const voorlopig = tag('Voorlopig');
      const akRow = s => [s.to == null ? `vanaf ${eur(s.from)}` : `${eur(s.from)} tot ${eur(s.to)}`, s.to == null ? '€ 0' : s.rate >= 0 ? (s.base ? `${eur(s.base)} + ${pct(s.rate, 3)} × (inkomen − ${eur(s.from)})` : `${pct(s.rate, 3)} × inkomen`) : `${eur(s.base)} − ${pct(-s.rate, 3)} × (inkomen − ${eur(s.from)})`];
      const A = P.algemeneHeffingskorting, IA = P.inkomensafhankelijkeCombinatiekorting, OK = P.ouderenkorting, ZV = P.zvw, H = P.toeslagen.huurtoeslag, KO = P.toeslagen.kinderopvangtoeslag, KB = P.toeslagen.kindgebondenBudget;
      const thetax = [['€ 30.000', '€ 27.754,21', '€ 27.754', '0'], ['€ 45.000', '€ 36.614,07', '€ 36.614', '0'], ['€ 60.000', '€ 44.093,96', '€ 44.094', '0'], ['€ 90.000', '€ 58.312,13', '€ 58.313', '+1'], ['€ 150.000', '€ 85.818,00', '€ 85.819', '+1'], ['€ 40.000, AOW-leeftijd', '€ 38.718,53', '€ 38.720', '+1,5'], ['€ 75.600 met 30%-regeling', '€ 63.267,10', '€ 63.266', '−1']];
      return `<p>Alle cijfers zijn opgehaald op <time datetime="${P.retrieved}">${esc(longDate(P.retrieved))}</time> van belastingdienst.nl, rijksoverheid.nl, wetten.overheid.nl en officielebekendmakingen.nl. Een cijfer met het label <span class="tag">Voorlopig</span> heeft de overheid zelf voorlopig genoemd.</p>
<nav aria-label="Op deze pagina" class="toc"><ul><li><a href="#zo-rekenen-we">Zo rekenen we</a></li><li><a href="#afronding">Afronding</a></li><li><a href="#controle">Controle</a></li><li><a href="#cijfers">Alle cijfers 2026</a></li><li><a href="#niet">Wat we niet berekenen</a></li><li><a href="#bronnen">Alle bronnen</a></li></ul></nav>
<h2 id="zo-rekenen-we">Zo rekenen we</h2>
<ul><li>We rekenen per jaar. Werkgevers rekenen per maand met de loonheffingstabellen. Over een heel jaar komt dat dicht bij elkaar.</li>
<li>Loonheffing is bij ons de inkomstenbelasting over je fiscale loon, min de algemene heffingskorting en de arbeidskorting.</li>
<li>Heffingskortingen gaan alleen af van de belasting die je betaalt. Je krijgt geen geld terug als de kortingen hoger zijn.</li>
<li>Aftrekposten, zelfstandigenaftrek en mkb-winstvrijstelling leveren maximaal ${pct(O.aftrekTariefBeperking)} op (tariefsaanpassing).</li>
<li>De arbeidskorting gaat uit van je arbeidsinkomen: loon plus winst vóór ondernemersaftrek en mkb-winstvrijstelling.</li>
<li>Vakantiegeld netto is het verschil in jaarbelasting met en zonder vakantiegeld. Voor een 13e maand doen we hetzelfde.</li>
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
${kv([['Huurgrens', eur2(H.huurgrens)], ['Kwaliteitskortingsgrens', eur2(H.kwaliteitskortingsgrens)], ['Aftoppingsgrens laag', eur2(H.aftoppingsgrensLaag)], ['Aftoppingsgrens hoog', eur2(H.aftoppingsgrensHoog)]])}
<p>Niet berekend: de formule voor de normhuur is niet gecontroleerd.</p>
${src(H.src)}
<h3>Kinderopvangtoeslag</h3>
${kv([['Maximale uurprijs dagopvang', eur2(KO.maxUurprijs.dagopvang)], ['Maximale uurprijs bso', eur2(KO.maxUurprijs.bso)], ['Maximale uurprijs gastouder', eur2(KO.maxUurprijs.gastouder)], ['Maximaal uren per maand', String(KO.maxUrenPerMaand)]])}
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
<li>De vermogensgrens voor zorgtoeslag.</li></ul>`;
    },
  };

  const pages = {
    privacy: { h1: 'Privacyverklaring 2026', title: 'Privacyverklaring 2026 | Belastingcalculator', desc: 'Belastingcalculator plaatst geen cookies. We tellen bezoeken anoniem met GoatCounter. Je berekening blijft in je eigen browser.', html: `
<p class="lead">Kort: we plaatsen geen cookies, we slaan je berekeningen niet op en we tellen bezoeken anoniem met GoatCounter.</p>
<h2>Je berekening blijft bij jou</h2>
<p>Alle berekeningen gebeuren in je eigen browser. De bedragen die je invult, gaan niet naar ons of naar iemand anders.</p>
<p>Je invoer staat wel in het adres van de pagina (bijvoorbeeld <code>?bruto=4000</code>). Zo kun je een berekening delen met de knop "Kopieer link". Deel je die link, dan ziet de ontvanger jouw bedragen. Je browser kan het adres in je geschiedenis bewaren.</p>
<h2>Geen cookies</h2>
<p>We plaatsen geen cookies, en GoatCounter ook niet. We gebruiken geen advertentienetwerken en geen social-media-knoppen. Daarom vragen we ook geen toestemming met een cookiebanner.</p>
<h2>Bezoekersstatistiek met GoatCounter</h2>
<p>We tellen bezoeken met <a href="${OFFICIAL.goatcounter}" rel="noopener" hreflang="en">GoatCounter</a>. Zo zien we hoe vaak een pagina wordt gelezen en hoe vaak iemand op een link naar een dienst klikt. We zien alleen totalen, geen personen.</p>
<ul>
<li>GoatCounter krijgt het adres van de pagina zonder je bedragen, de paginatitel en de site waar je vandaan komt. Het krijgt ook je schermbreedte, browser, besturingssysteem, taal en land.</li>
<li>Klik je op een link naar een dienst, dan krijgt GoatCounter de naam van die link, bijvoorbeeld <code>aff-jortt</code>.</li>
<li>GoatCounter bewaart je IP-adres niet. Het maakt geen profiel van je en volgt je niet op andere sites.</li>
<li>Om een bezoek één keer te tellen, houdt GoatCounter je IP-adres en browser maximaal 8 uur in het geheugen. Daarna zijn ze weg.</li>
<li>De gegevens staan op servers van Hetzner in Duitsland en Finland, dus in de EU.</li>
</ul>
<p>Lees de <a href="${OFFICIAL.gcPrivacy}" rel="noopener" hreflang="en">privacyverklaring van GoatCounter</a> (Engels). Blokkeert je browser GoatCounter? Dan werkt de site gewoon.</p>
<h2>Hosting</h2>
<p>De site staat op GitHub Pages. GitHub verwerkt technische gegevens, zoals je IP-adres, om de pagina's te leveren en te beveiligen. Lees de <a href="${OFFICIAL.ghPrivacy}" rel="noopener" hreflang="en">privacyverklaring van GitHub</a> (Engels).</p>
<h2>Links naar andere sites</h2>
<p>We linken naar de Belastingdienst, de Rijksoverheid en een paar commerciële diensten. Klik je daarop, dan geldt het privacybeleid van die site. Zie ook de <a href="${url('affiliate')}">affiliate-disclosure</a>.</p>
<h2>Vragen</h2>
<p>Heb je een vraag over privacy? Maak een melding op <a href="${OFFICIAL.contact}" rel="noopener">GitHub</a>.</p>` },
    affiliate: { h1: 'Affiliate-disclosure 2026', title: 'Affiliate-disclosure 2026 | Belastingcalculator', desc: 'Hoe Belastingcalculator geld kan verdienen met links naar boekhoudprogramma\'s en een zakelijke rekening, en waarom dat de berekeningen niet beïnvloedt.', html: `
<p class="lead">Op een paar pagina's staan links naar commerciële diensten. Die zijn duidelijk gemarkeerd met "Advertentie / affiliate".</p>
<h2>Wat is een affiliate-link?</h2>
<p>Als je via zo'n link een account aanmaakt of een abonnement neemt, kunnen wij een vergoeding krijgen van die dienst. Jij betaalt daar niets extra voor.</p>
<h2>Welke diensten?</h2>
<ul>${[...AFFILIATE.boekhouden, ...AFFILIATE.bank].map(a => `<li>${esc(a.name)}: ${esc(a.what.nl)}</li>`).join('')}</ul>
<p>Op dit moment zijn dit gewone links naar de websites van deze diensten. Ze kunnen later affiliate-links worden. Alle links hebben het kenmerk <code>rel="sponsored"</code>.</p>
<h2>Onze regels</h2>
<ul><li>De berekeningen zijn nooit afhankelijk van een affiliate-partij.</li><li>We zetten diensten op alfabetische volgorde. We noemen niets "de beste".</li><li>We schrijven geen reviews en tonen geen beoordelingen.</li><li>We tonen geen advertenties van advertentienetwerken.</li></ul>` },
    over: { h1: 'Over Belastingcalculator (2026)', title: 'Over Belastingcalculator: belasting rekenen in 2026', desc: 'Belastingcalculator is een onafhankelijke, gratis site om je belasting voor 2026 te berekenen. Lees hoe we werken en hoe je contact opneemt.', html: `
<p class="lead">${BRAND} is een gratis, onafhankelijke site om je belasting voor 2026 uit te rekenen. Zonder account, zonder cookies.</p>
<h2>Waarom deze site?</h2>
<p>De rekenhulpen van de overheid zijn betrouwbaar, maar leggen weinig uit. Veel andere calculators laten niet zien waar hun cijfers vandaan komen. Wij laten elke stap van de berekening zien, met de officiële bron erbij.</p>
<h2>Hoe we werken</h2>
<ul><li>Elk cijfer komt van een officiële bron. Je vindt ze allemaal op <a href="${url('methode')}">methode en bronnen</a>.</li><li>We testen de rekenregels met de rekenvoorbeelden van de Belastingdienst.</li><li>De rekenregels en teksten zijn gemaakt met hulp van AI en daarna gecontroleerd tegen de bronnen.</li><li>We geven geen belastingadvies. Twijfel je? Vraag het aan de Belastingdienst of een belastingadviseur.</li></ul>
<h2>Onafhankelijk</h2>
<p>We zijn niet verbonden aan de Belastingdienst, Dienst Toeslagen of de Rijksoverheid. Op een paar pagina's staan gemarkeerde affiliate-links. Lees de <a href="${url('affiliate')}">affiliate-disclosure</a>.</p>
<h2>Contact</h2>
<p>Zie je een fout of heb je een vraag? Maak een melding op <a href="${OFFICIAL.contact}" rel="noopener">GitHub</a>.</p>` },
  };

  const notFound = {
    title: 'Pagina niet gevonden | Belastingcalculator 2026', desc: 'Deze pagina bestaat niet. Kies een van de calculators voor 2026 of lees een van de gidsen.',
    h1: 'Deze pagina bestaat niet', lead: 'Misschien is het adres verkeerd getypt, of is de pagina verhuisd. Kies hieronder een calculator.', home: 'Naar de startpagina',
  };

  return { ui, calcs, faq, how, sourceNames, affiliate, toeslagInfo, home, guidesIndex, guide, methode, pages, notFound };
}
