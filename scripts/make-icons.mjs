// Renders the PNG and ICO files in src/ from src/icon.svg with headless Chrome. Run by hand: node scripts/make-icons.mjs
// The output is committed, so the build and CI do not need Chrome.
import fs from 'node:fs';
import { launch } from './chrome.mjs';
import { createEngine } from '../engine/tax.mjs';

const svg = fs.readFileSync('src/icon.svg', 'utf8');
const square = svg.replace('rx="14" ', ''); // apple-touch-icon: full bleed, iOS rounds the corners itself
const P = JSON.parse(fs.readFileSync('data/params-2026.json', 'utf8')), E = createEngine(P);
const n = E.nettoSalaris({ brutoMaand: 4000 });
const fmt = x => '€ ' + String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const icon = (s, size) => `<!doctype html><html><head><style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style></head><body>${s}</body></html>`;
const row = (l, o, v, cls = '') => `<tr class="${cls}"><th>${l}</th><td class="o">${o}</td><td class="a">${v}</td></tr>`;
const og = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0}body{width:1200px;height:630px;background:#F2F4F7;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#14213D;display:grid;grid-template-columns:1fr 470px;gap:56px;padding:64px 72px;align-items:center}
.brand{display:flex;align-items:center;gap:16px;font-weight:800;font-size:34px;letter-spacing:-.02em}.brand svg{width:60px;height:60px}
h1{font-size:76px;line-height:1.02;letter-spacing:-.035em;margin:44px 0 22px;font-weight:800}
p{font-size:28px;line-height:1.35;color:#47536B;margin:0}
.slip{background:#fff;border:1px solid #D3D9E1;border-top:10px solid #14213D;border-radius:0 0 10px 10px;padding:30px 34px 26px}
.l{font-weight:700;font-size:24px;margin:0}.v{font-size:68px;font-weight:800;letter-spacing:-.03em;margin:4px 0 18px;font-variant-numeric:tabular-nums}
mark{background:linear-gradient(transparent 8%,#FFE45C 8%,#FFE45C 92%,transparent 92%);color:#14213D;padding:0 6px;margin-left:-6px}
table{width:100%;border-collapse:collapse;font-size:23px;font-variant-numeric:tabular-nums}th{text-align:left;font-weight:400;padding:7px 0}.o{width:28px;text-align:center;color:#47536B}.a{text-align:right;white-space:nowrap}
.sub .a{border-top:2px solid #14213D;font-weight:650}.tot th,.tot .a{font-weight:800}.tot .a{border-top:2px solid #14213D;border-bottom:6px double #14213D}
</style></head><body>
<div><div class="brand">${svg}Belastingcalculator</div><h1>Belasting berekenen 2026</h1><p>Netto salaris, inkomstenbelasting, zzp, box 3 en meer. Gratis, met officiële bronnen.</p></div>
<div class="slip"><p class="l">Netto per maand</p><p class="v"><mark>${fmt(n.nettoMaandExclVakantiegeld)}</mark></p>
<table>${row('Brutoloon', '', fmt(n.brutoJaar))}${row('Vakantiegeld', '+', fmt(n.vakantiegeld))}${row('Loonheffing', '−', fmt(n.loonheffing))}${row('Netto per jaar', '=', fmt(n.nettoJaar), 'tot')}</table></div>
</body></html>`;

const b = await launch();
try {
  const shot = async (html, w, h, transparent) => { const t = await b.open(w, h, { transparent }); await t.setContent(html); const png = await t.shot(); await t.close(); return png; };
  const png32 = await shot(icon(svg, 32), 32, 32, true);
  fs.writeFileSync('src/apple-touch-icon.png', await shot(icon(square, 180), 180, 180, false));
  fs.writeFileSync('src/logo-512.png', await shot(icon(svg, 512), 512, 512, true));
  fs.writeFileSync('src/og-image.png', await shot(og, 1200, 630, false));
  // favicon.ico: one 32x32 PNG inside an ICO container
  const head = Buffer.alloc(22);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(1, 4); // reserved, type icon, 1 image
  head.writeUInt8(32, 6); head.writeUInt8(32, 7); head.writeUInt8(0, 8); head.writeUInt8(0, 9);
  head.writeUInt16LE(1, 10); head.writeUInt16LE(32, 12); head.writeUInt32LE(png32.length, 14); head.writeUInt32LE(22, 18);
  fs.writeFileSync('src/favicon.ico', Buffer.concat([head, png32]));
  console.log('wrote src/favicon.ico, apple-touch-icon.png, logo-512.png, og-image.png');
} finally { await b.close(); }
