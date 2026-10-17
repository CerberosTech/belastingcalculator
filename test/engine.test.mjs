import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { createEngine } from '../engine/tax.mjs';
const P = JSON.parse(fs.readFileSync(new URL('../data/params-2026.json', import.meta.url)));
const E = createEngine(P);
// Official Belastingdienst examples (box 3: berekening-box-3-inkomen-2026)
test('box3 spaargeld 150k, geen partner => €417', () => { const r = E.box3({ bank: 150000 }); assert.equal(r.voordeel, 1160); assert.equal(r.belasting, 417); });
test('box3 spaargeld 150k, partner 50/50 => €72 each', () => { const r = E.box3({ bank: 150000, partner: true }); assert.equal(r.voordeel, 200); assert.equal(r.belasting, 72); });
test('box3 mixed, geen partner => €4.667', () => { const r = E.box3({ bank: 150000, overig: 275000, schulden: 100000 }); assert.equal(r.belastbaarRendement, 15822); assert.equal(r.aandeelPct, 0.8194); assert.equal(r.voordeel, 12964); assert.equal(r.belasting, 4667); });
test('box3 mixed, partner 50/50 => €1.842', () => { const r = E.box3({ bank: 150000, overig: 275000, schulden: 100000, partner: true }); assert.equal(r.belastbaarRendement, 15925); assert.equal(r.voordeel, 5119); assert.equal(r.belasting, 1842); });
test('box3 groen + 2e woning, partner 100% => €4.973', () => { const r = E.box3({ bank: 5000, overig: 250000, groeneBeleggingen: 150000, partner: true, aandeelPct: 1 }); assert.equal(r.belastbaarRendement, 20858); assert.equal(r.voordeel, 13814); assert.equal(r.belasting, 4973); });
// Box 2 official example: €70.000 => €17.224
test('box2 70k => €17.224', () => assert.equal(E.box2({ inkomen: 70000 }).belasting, 17224));
// Bracket and credit table checks (values from tables)
test('box1 tax at schijfgrens', () => { assert.equal(E.box1Tax(38883), Math.floor(38883 * 0.3575)); });
test('AHK table points', () => { assert.equal(E.ahk(20000), 3115); assert.equal(E.ahk(78426), 0); assert.equal(E.ahk(50000), Math.floor(3115 - 0.06398 * (50000 - 29736))); assert.equal(E.ahk(20000, 'aow'), 1556); });
test('arbeidskorting table points', () => { assert.equal(E.arbeidskorting(11965), 995); assert.equal(E.arbeidskorting(25845), 5300); assert.equal(E.arbeidskorting(45592), 5685); assert.equal(E.arbeidskorting(132920), 0); assert.equal(E.arbeidskorting(200000), 0); });
test('IACK max €3.032', () => { assert.equal(E.iack(40000), 3032); assert.equal(E.iack(6000), 0); });
test('zelfstandigenaftrek capped at winst unless starter', () => { assert.equal(E.zzp({ winst: 800 }).zelfstandigenaftrek, 800); assert.equal(E.zzp({ winst: 800, starter: true }).zelfstandigenaftrek, 1200); });
test('mkb 12,7% after ondernemersaftrek', () => { assert.equal(E.zzp({ winst: 50000 }).mkbWinstvrijstelling, Math.floor(48800 * 0.127)); });
test('no urencriterium => no ZA but mkb still applies', () => { const r = E.zzp({ winst: 50000, urencriterium: false }); assert.equal(r.zelfstandigenaftrek, 0); assert.equal(r.mkbWinstvrijstelling, Math.floor(50000 * 0.127)); });
test('zvw zzp 4,85% capped at €79.409', () => { assert.equal(E.zzp({ winst: 200000 }).zvw, Math.floor(79409 * 0.0485)); });
test('Zvw example (fisin): loon 40k + freelance => grondslag 39.409 max', () => { const r = E.zzp({ winst: 60000, urencriterium: false, loon: 40000 }); assert.ok(r.zvw <= Math.floor(39409 * 0.0485)); });
test('netto never above bruto, monotone', () => { let prev = 0; for (let b = 1000; b < 15000; b += 250) { const n = E.nettoSalaris({ brutoMaand: b, vakantiegeld: false }).nettoMaandGemiddeld; assert.ok(n <= b && n >= prev); prev = n; } });
test('brutoVoorNetto inverts', () => { const b = E.brutoVoorNetto(3000); assert.ok(Math.abs(E.nettoSalaris({ brutoMaand: b, vakantiegeld: false }).nettoMaandGemiddeld - 3000) <= 2); });
test('13th month with pension: monthly net unchanged (nettoDm subtracts pension)', () => { for (const p of [0, 0.05]) { const a = E.nettoSalaris({ brutoMaand: 4000, dertiendeMaand: true, pensioenPctWerknemer: p }); const z = E.nettoSalaris({ brutoMaand: 4000, pensioenPctWerknemer: p }); assert.ok(Math.abs(a.nettoMaandExclVakantiegeld - z.nettoMaandExclVakantiegeld) <= 1); } });
test('zorgtoeslag table', () => { assert.equal(E.zorgtoeslag({ toetsingsinkomen: 25000 }).perMaand, 129); assert.equal(E.zorgtoeslag({ toetsingsinkomen: 45000 }).perMaand, 0); assert.equal(E.zorgtoeslag({ toetsingsinkomen: 45000, partner: true }).perMaand, 66); });
test('expat norm respected', () => { const r = E.expat({ brutoJaar: 50000 }); assert.ok(r.vergoeding <= 1987 && r.voldoetAanNorm); });
