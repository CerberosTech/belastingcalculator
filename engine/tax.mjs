// Dutch tax engine 2026 — pure JS, no deps. Indicative only, not tax advice.
// All parameters come from data/params-2026.json (see data/sources.json).
export function createEngine(P) {
  const floor = Math.floor, max = Math.max, min = Math.min;
  const pos = x => max(0, x);
  const r0 = x => Math.round(x);

  function bracketTax(income, brackets) {
    let tax = 0, prev = 0;
    for (const b of brackets) {
      const top = b.upTo == null ? Infinity : b.upTo;
      if (income > prev) tax += floor((min(income, top) - prev) * b.rate + 1e-9);
      prev = top;
    }
    return tax;
  }
  const box1Table = (aow = 'none') => aow === 'born<1946' ? P.box1.aowBornBefore1946 : aow === 'aow' ? P.box1.aowBornFrom1946 : P.box1.belowAOW;
  const box1Tax = (income, aow) => floor(bracketTax(pos(income), box1Table(aow)));

  function ahk(verzamelinkomen, aow) {
    const c = aow && aow !== 'none' ? P.algemeneHeffingskorting.aowWholeYear : P.algemeneHeffingskorting.belowAOW;
    if (verzamelinkomen >= c.zeroFrom) return 0;
    return floor(pos(c.max - pos(verzamelinkomen - c.phaseOutFrom) * c.phaseOutRate));
  }
  function arbeidskorting(ai, aow) {
    if (ai <= 0) return 0;
    const t = aow && aow !== 'none' ? P.arbeidskorting.aowWholeYear : P.arbeidskorting.belowAOW;
    for (const s of t) if (s.to == null || ai <= s.to) return floor(pos(s.base + s.rate * (ai - s.from)));
    return 0;
  }
  function iack(ai, aow) {
    const c = aow && aow !== 'none' ? P.inkomensafhankelijkeCombinatiekorting.aowWholeYear : P.inkomensafhankelijkeCombinatiekorting.belowAOW;
    if (ai <= c.minArbeidsinkomen) return 0;
    return floor(min(c.max, c.rate * (ai - c.minArbeidsinkomen)));
  }
  function ouderenkorting(vi) {
    const c = P.ouderenkorting; if (vi >= c.zeroFrom) return 0;
    return floor(pos(c.max - pos(vi - c.phaseOutFrom) * c.phaseOutRate));
  }

  // Income tax for a person (annual). Inputs in euros/year.
  function incomeTax({ loon = 0, winst = 0, overigBox1 = 0, aftrekposten = 0, box2 = 0, box3 = 0, aow = 'none', kindOnder12 = false, alleenstaandeAOW = false, ondernemersaftrek = 0, mkbVrijstelling = 0 } = {}) {
    const belastbaarBox1 = pos(loon + winst - ondernemersaftrek - mkbVrijstelling + overigBox1 - aftrekposten);
    let tax1 = box1Tax(belastbaarBox1, aow);
    // Limitation of deductions to the 2nd-bracket rate (ondernemersaftrek, mkb, aftrekposten) — art. 2.10a Wet IB
    const top = box1Table(aow);
    const topStart = top[1].upTo, topRate = top[2].rate, capRate = P.ondernemer.aftrekTariefBeperking;
    const limited = ondernemersaftrek + mkbVrijstelling + aftrekposten;
    const tariefsaanpassing = floor((topRate - capRate) * min(limited, pos(belastbaarBox1 - topStart)));
    tax1 += tariefsaanpassing;
    const tax2 = floor(bracketTax(pos(box2), P.box2.brackets));
    const tax3 = floor(pos(box3) * P.box3.tarief);
    const verzamelinkomen = belastbaarBox1 + pos(box2) + pos(box3);
    const arbeidsinkomen = loon + winst; // winst before ondernemersaftrek & mkb
    const k = { ahk: ahk(verzamelinkomen, aow), arbeidskorting: arbeidskorting(arbeidsinkomen, aow), iack: kindOnder12 ? iack(arbeidsinkomen, aow) : 0, ouderenkorting: aow !== 'none' ? ouderenkorting(verzamelinkomen) : 0, alleenstaandeOuderenkorting: aow !== 'none' && alleenstaandeAOW ? P.alleenstaandeOuderenkorting.amount : 0 };
    const kortingenTotaal = Object.values(k).reduce((a, b) => a + b, 0);
    // Kortingen are only offset against box 1+2+3 tax (no refund except special cases)
    const kortingenGebruikt = min(kortingenTotaal, tax1 + tax2 + tax3);
    const totaal = tax1 + tax2 + tax3 - kortingenGebruikt;
    return { belastbaarBox1, verzamelinkomen, arbeidsinkomen, box1: tax1, tariefsaanpassing, box2: tax2, box3: tax3, kortingen: k, kortingenTotaal, kortingenGebruikt, totaal };
  }

  // Bruto -> netto for an employee (annual approximation of loonheffing with loonheffingskorting applied).
  function nettoSalaris({ brutoMaand = 0, brutoJaar, vakantiegeld = true, dertiendeMaand = false, pensioenPctWerknemer = 0, aow = 'none' } = {}) {
    const jaarBasis = brutoJaar ?? brutoMaand * 12;
    const maand = jaarBasis / 12;
    const vg = vakantiegeld ? jaarBasis * 0.08 : 0; // 8% is the statutory minimum (Wet minimumloon); employer may pay more
    const dm = dertiendeMaand ? maand : 0;
    const pensioen = (jaarBasis + vg + dm) * pensioenPctWerknemer;
    const fiscaalLoon = jaarBasis + vg + dm - pensioen;
    const t = incomeTax({ loon: fiscaalLoon, aow });
    const loonheffing = t.totaal;
    const nettoJaar = jaarBasis + vg + dm - pensioen - loonheffing;
    // Net value of the holiday allowance via marginal method
    const tZonder = incomeTax({ loon: fiscaalLoon - vg * (1 - pensioenPctWerknemer), aow }).totaal;
    const nettoVakantiegeld = vg ? r0(vg * (1 - pensioenPctWerknemer) - (loonheffing - tZonder)) : 0;
    const nettoDm = dm ? r0(dm - (loonheffing - incomeTax({ loon: fiscaalLoon - dm * (1 - pensioenPctWerknemer), aow }).totaal)) : 0;
    const nettoMaandExclVg = r0((nettoJaar - nettoVakantiegeld - nettoDm) / 12);
    return { brutoJaar: jaarBasis, vakantiegeld: r0(vg), dertiendeMaand: r0(dm), pensioen: r0(pensioen), fiscaalLoon: r0(fiscaalLoon), loonheffing, nettoJaar: r0(nettoJaar), nettoVakantiegeld, nettoMaandGemiddeld: r0(nettoJaar / 12), nettoMaandExclVakantiegeld: nettoMaandExclVg, gemiddeldTarief: fiscaalLoon ? loonheffing / fiscaalLoon : 0, detail: t };
  }

  // netto -> bruto (binary search on monthly bruto, excl. holiday allowance)
  function brutoVoorNetto(nettoMaandDoel, opts = {}) {
    let lo = 0, hi = 100000;
    for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; const n = nettoSalaris({ ...opts, brutoMaand: mid, vakantiegeld: false }).nettoMaandGemiddeld; if (n < nettoMaandDoel) lo = mid; else hi = mid; }
    return r0(hi);
  }

  // ZZP / IB-ondernemer
  function zzp({ winst = 0, urencriterium = true, starter = false, aow = 'none', loon = 0, aftrekposten = 0, kindOnder12 = false } = {}) {
    const O = P.ondernemer;
    const aowStart = aow !== 'none';
    let za = urencriterium ? (aowStart ? O.zelfstandigenaftrekAOW : O.zelfstandigenaftrek) : 0;
    let sa = urencriterium && starter ? (aowStart ? O.startersaftrekAOW : O.startersaftrek) : 0;
    if (!sa) za = min(za, pos(winst));
    const ondernemersaftrek = za + sa;
    const mkb = floor(pos(winst - ondernemersaftrek) * O.mkbWinstvrijstelling);
    const belastbareWinst = winst - ondernemersaftrek - mkb;
    const t = incomeTax({ loon, winst, ondernemersaftrek, mkbVrijstelling: mkb, aftrekposten, aow, kindOnder12 });
    const zvwGrondslag = min(pos(belastbareWinst), pos(P.zvw.maxBijdrageInkomen - loon));
    const zvw = floor(zvwGrondslag * P.zvw.bijdrageZelf);
    const ibOverWinst = loon ? t.totaal - incomeTax({ loon, aow, aftrekposten, kindOnder12 }).totaal : t.totaal;
    const totaalAfdracht = ibOverWinst + zvw;
    return { winst, zelfstandigenaftrek: za, startersaftrek: sa, mkbWinstvrijstelling: mkb, belastbareWinst, ib: t, ibOverWinst, zvw, totaalAfdracht, nettoNaBelasting: winst - totaalAfdracht, reserveerPct: winst > 0 ? totaalAfdracht / winst : 0 };
  }

  function box2({ inkomen = 0 } = {}) { const tax = floor(bracketTax(pos(inkomen), P.box2.brackets)); return { inkomen, belasting: tax }; }

  // Box 3 — follows the official 6-step method (Belastingdienst, voorlopige aanslag 2026).
  function box3({ bank = 0, overig = 0, schulden = 0, partner = false, aandeelPct = null, groeneBeleggingen = 0, werkelijkRendement = null } = {}) {
    const B = P.box3, n = partner ? 2 : 1;
    const groenBelast = pos(groeneBeleggingen - B.groeneBeleggingenVrijstellingPerPersoon * n);
    const overigTot = overig + groenBelast;
    const aftrekbareSchuld = pos(schulden - B.schuldendrempelPerPersoon * n);
    const rBank = floor(bank * B.rendement.bank.rate), rOverig = floor(overigTot * B.rendement.overig.rate), rSchuld = Math.ceil(aftrekbareSchuld * B.rendement.schulden.rate - 1e-9);
    const belastbaarRendement = rBank + rOverig - rSchuld;
    const grondslag = bank + overigTot - aftrekbareSchuld;
    const hv = partner ? B.heffingsvrijVermogenPartners : B.heffingsvrijVermogen;
    const gsb = pos(grondslag - hv);
    const mijnDeel = partner ? (aandeelPct == null ? gsb / 2 : gsb * aandeelPct) : gsb;
    const pct = grondslag > 0 ? floor(mijnDeel / grondslag * 10000 + 1e-9) / 10000 : 0; // 2 decimals in %
    const voordeel = pos(floor(belastbaarRendement * pct + 1e-9));
    const belasting = floor(voordeel * B.tarief);
    let tegenbewijs = null;
    if (werkelijkRendement != null) {
      const wrDeel = partner ? (aandeelPct == null ? 0.5 : aandeelPct) : 1;
      const wr = pos(werkelijkRendement) * wrDeel; // no heffingsvrij vermogen with actual return
      const wb = floor(wr * B.tarief);
      tegenbewijs = { werkelijkVoordeel: r0(wr), belasting: wb, voordeligst: wb < belasting ? 'werkelijk' : 'forfaitair' };
    }
    return { rendementBank: rBank, rendementOverig: rOverig, rendementSchulden: rSchuld, aftrekbareSchuld, belastbaarRendement, rendementsgrondslag: grondslag, heffingsvrijVermogen: hv, grondslagSparenBeleggen: gsb, mijnGrondslag: mijnDeel, aandeelPct: pct, voordeel, belasting, tegenbewijs, provisional: true };
  }

  // 30% (expat) regeling: employer pays up to 30% of loon incl. vergoeding tax-free.
  function expat({ brutoJaar = 0, onder30Master = false, aow = 'none' } = {}) {
    const E = P.expatregeling;
    const norm = onder30Master ? E.salarisnormOnder30Master : E.salarisnorm;
    let vergoeding = min(brutoJaar * E.pct, E.maxVergoeding);
    if (brutoJaar - vergoeding <= norm) vergoeding = pos(brutoJaar - norm - 1);
    const zonder = nettoSalaris({ brutoJaar, vakantiegeld: false, aow });
    const tMet = incomeTax({ loon: brutoJaar - vergoeding, aow });
    const nettoMet = brutoJaar - tMet.totaal;
    return { vergoeding: r0(vergoeding), voldoetAanNorm: brutoJaar - vergoeding > norm, norm, nettoZonder: zonder.nettoJaar, nettoMet: r0(nettoMet), voordeel: r0(nettoMet - zonder.nettoJaar) };
  }

  function vakantiegeld({ brutoMaand = 0, pct = 0.08, aow = 'none' } = {}) {
    const jaar = brutoMaand * 12, vg = jaar * pct;
    const t1 = incomeTax({ loon: jaar + vg, aow }).totaal, t0 = incomeTax({ loon: jaar, aow }).totaal;
    return { bruto: r0(vg), belasting: t1 - t0, netto: r0(vg - (t1 - t0)), marginaalTarief: vg ? (t1 - t0) / vg : 0 };
  }

  function zorgtoeslag({ toetsingsinkomen = 0, partner = false, vermogen = 0 } = {}) {
    const Z = P.toeslagen.zorgtoeslag, tab = partner ? Z.tablePartner : Z.tableSingle;
    for (const [upTo, amt] of tab) if (toetsingsinkomen < upTo) return { perMaand: amt, perJaar: amt * 12, bron: 'tabel Dienst Toeslagen (afgerond)' };
    return { perMaand: 0, perJaar: 0, bron: 'tabel Dienst Toeslagen (afgerond)' };
  }

  // Compare employee bruto with zzp winst giving similar net (rough: no pension/AOV/vakantiegeld equivalence)
  function vergelijk({ brutoJaar = 0, winst = 0, urencriterium = true, starter = false } = {}) {
    const l = nettoSalaris({ brutoJaar, vakantiegeld: false });
    const z = zzp({ winst, urencriterium, starter });
    return { loondienstNetto: l.nettoJaar, zzpNetto: z.nettoNaBelasting, verschil: z.nettoNaBelasting - l.nettoJaar, loondienst: l, zzp: z };
  }

  return { bracketTax, box1Tax, ahk, arbeidskorting, iack, ouderenkorting, incomeTax, nettoSalaris, brutoVoorNetto, zzp, box2, box3, expat, vakantiegeld, zorgtoeslag, vergelijk, params: P };
}
