// Submits all URLs from the live sitemap to IndexNow. Runs in CI after a deploy (see .github/workflows/pages.yml).
// The key file is served at <SITE>/<key>.txt; keyLocation tells IndexNow where it is, because the site lives under a path.
import fs from 'node:fs';
const SITE = 'https://cerberostech.github.io/belastingcalculator';
const key = fs.readFileSync('indexnow.key', 'utf8').trim();
const xml = await (await fetch(`${SITE}/sitemap.xml`)).text();
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
if (!urlList.length) throw new Error('sitemap has no URLs');
const res = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(SITE).host, key, keyLocation: `${SITE}/${key}.txt`, urlList }) });
console.log(`IndexNow: ${res.status} ${res.statusText} for ${urlList.length} URLs`);
if (res.status >= 400) process.exit(1);
