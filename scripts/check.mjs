// Serves dist/ under /belastingcalculator/ and checks every page in headless Chrome:
// no console errors, no horizontal scroll at 360 px, the calculators react to input and to the query string.
// Usage: node build.mjs && node scripts/check.mjs [--shots DIR]
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { launch } from './chrome.mjs';

const PORT = 8000 + Math.floor(Math.random() * 900), ROOT = `http://127.0.0.1:${PORT}/belastingcalculator/`;
const shotsDir = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bc-serve-'));
fs.symlinkSync(path.resolve('dist'), path.join(tmp, 'belastingcalculator'));
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: tmp, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));

const pages = [...fs.readFileSync('dist/sitemap.xml', 'utf8').matchAll(/<loc>[^<]*\/belastingcalculator\/([^<]*)<\/loc>/g)].map(m => m[1]);
pages.push('bestaat-niet/'); // 404 page via the python server is a plain 404; load 404.html directly instead
pages[pages.length - 1] = '404.html';
const problems = [];
const b = await launch();
try {
  for (const [w, h, mobile] of [[360, 740, true], [1280, 900, false]]) {
    const tab = await b.open(w, h, { mobile });
    for (const p of pages) {
      tab.errors.length = 0;
      await tab.goto(ROOT + p);
      const overflow = await tab.eval('document.documentElement.scrollWidth - window.innerWidth');
      if (overflow > 0) problems.push(`${w}px ${p}: horizontal overflow ${overflow}px`);
      const small = await tab.eval(`[...document.querySelectorAll('main a, main button, main input, main select, .site-nav a')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && e.offsetParent && !e.closest('p, li:not(.calc-index li):not(.aff-list li), td, th, .help, .r-sub, .rnote') && r.height < 44 && e.type !== 'radio' && e.type !== 'checkbox'; }).map(e => (e.id || e.textContent.trim().slice(0, 30)) + ':' + Math.round(e.getBoundingClientRect().height))`);
      if (small.length) problems.push(`${w}px ${p}: small tap targets ${small.join(', ')}`);
      if (tab.errors.length) problems.push(`${w}px ${p}: ${tab.errors.join(' | ')}`);
      if (shotsDir) { fs.mkdirSync(shotsDir, { recursive: true }); fs.writeFileSync(path.join(shotsDir, `${w}-${(p || 'home').replace(/\W+/g, '_')}.png`), await tab.shot({ fullPage: true })); }
    }
    await tab.close();
  }

  // Behaviour: typing changes the result and the URL; a shared URL restores the inputs.
  const tab = await b.open(1280, 900);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  await tab.goto(ROOT + 'netto-salaris-berekenen/');
  const before = await tab.eval(`document.querySelector('.r-value').textContent`);
  await tab.eval(`(() => { const i = document.querySelector('#netto-bruto'); i.value = '5000'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(400);
  const after = await tab.eval(`document.querySelector('.r-value').textContent`), q = await tab.eval('location.search');
  if (before === after) problems.push('netto: result did not change after input');
  if (!q.includes('bruto=5000')) problems.push(`netto: query not updated (${q})`);
  if (!(await tab.eval(`!document.querySelector('[data-copy]').hidden`))) problems.push('netto: copy button hidden');
  await tab.goto(ROOT + 'netto-salaris-berekenen/?modus=netto&periode=maand&netto=3000&pensioen=0&aow=0');
  const restored = await tab.eval(`[document.querySelector('#netto-netto').value, document.querySelector('[data-field=bruto]').hidden, document.querySelector('.r-label').textContent]`);
  if (restored[0] !== '3.000' || !restored[1] || !/Benodigd/.test(restored[2])) problems.push(`netto: query not restored ${JSON.stringify(restored)}`);
  await tab.goto(ROOT + 'box-3-berekenen/?bank=150000&overig=275000&schulden=100000&groen=0&partner=0&tegen=0');
  const b3 = await tab.eval(`document.querySelector('.r-value').textContent`);
  if (b3.replace(/\s/g, ' ') !== '€ 4.667') problems.push(`box3 official example: got ${b3}`);
  await tab.goto(ROOT + 'zzp-belasting-berekenen/');
  await tab.eval(`(() => { const i = document.querySelector('#zzp-winst'); i.value = 'abc'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(400);
  const err = await tab.eval(`document.querySelector('#zzp-winst-e').textContent`);
  if (!err) problems.push('zzp: no error message for invalid input');
  if (tab.errors.length) problems.push(`behaviour: ${tab.errors.join(' | ')}`);
  await tab.close();
} finally { await b.close(); server.kill(); fs.rmSync(tmp, { recursive: true, force: true }); }

console.log(`checked ${pages.length} pages at 360 and 1280 px`);
if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
console.log('no problems found');
