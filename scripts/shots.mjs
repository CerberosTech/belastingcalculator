// Self-review screenshots: serves dist/ under /belastingcalculator/ and saves full-page PNGs at 1366 px and 390 px.
// Usage: node build.mjs && node scripts/shots.mjs OUTDIR [page ...] [--dark]
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { launch } from './chrome.mjs';
const args = process.argv.slice(2), dark = args.includes('--dark'), [out = '_ref/shots/v2/after', ...list] = args.filter(a => a !== '--dark');
const pages = list.length ? list : ['', 'en/', 'en/net-salary-calculator/', 'zzp-belasting-berekenen/', 'en/box-3-calculator/', 'en/guides/', 'gidsen/aangifte-checklist/'];
const PORT = 8900 + Math.floor(Math.random() * 90), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bc-shots-'));
fs.symlinkSync(path.resolve('dist'), path.join(tmp, 'belastingcalculator'));
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: tmp, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 700));
fs.mkdirSync(out, { recursive: true });
const b = await launch();
try {
  for (const [w, h, mobile] of [[1366, 900, false], [390, 844, true]]) {
    const tab = await b.open(w, h, { mobile });
    for (const p of pages) {
      await tab.goto(`http://127.0.0.1:${PORT}/belastingcalculator/${p}`);
      await tab.eval(`document.documentElement.dataset.theme = '${dark ? 'dark' : 'light'}'`);
      await new Promise(r => setTimeout(r, 300));
      fs.writeFileSync(path.join(out, `${(p || 'home').replace(/\W+/g, '_')}-${w}${dark ? '-dark' : ''}.png`), await tab.shot({ fullPage: true }));
    }
    if (tab.errors.length) console.log(tab.errors.join('\n'));
    await tab.close();
  }
} finally { await b.close(); server.kill(); fs.rmSync(tmp, { recursive: true, force: true }); }
console.log(`saved to ${out}`);
