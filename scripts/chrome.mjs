// Minimal Chrome DevTools Protocol client over --remote-debugging-pipe. No npm dependencies.
// Used by make-icons.mjs (PNG renders) and check.mjs (console errors, layout checks). Not used by the build.
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';

export const CHROME = process.env.CHROME || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find(p => fs.existsSync(p));

export async function launch() {
  if (!CHROME) throw new Error('Chrome not found. Set CHROME=/path/to/chrome.');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bc-chrome-'));
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-pipe', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--mute-audio', `--user-data-dir=${profile}`, 'about:blank'],
  { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });
  const input = proc.stdio[3], output = proc.stdio[4];
  const calls = new Map(), waiters = [], listeners = [];
  let seq = 0, buf = '';
  output.setEncoding('utf8');
  output.on('data', chunk => {
    buf += chunk;
    for (let i; (i = buf.indexOf('\0')) >= 0; buf = buf.slice(i + 1)) {
      const msg = JSON.parse(buf.slice(0, i));
      if (msg.id && calls.has(msg.id)) {
        const call = calls.get(msg.id); calls.delete(msg.id);
        if (msg.error) call.reject(new Error(`${call.method}: ${msg.error.message}`)); else call.resolve(msg.result);
      } else if (msg.method) {
        for (const w of [...waiters]) if (w.method === msg.method && w.sessionId === msg.sessionId) { waiters.splice(waiters.indexOf(w), 1); w.resolve(msg.params); }
        for (const l of listeners) if (l.sessionId === msg.sessionId) l.fn(msg.method, msg.params);
      }
    }
  });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++seq; calls.set(id, { resolve, reject, method });
    input.write(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0');
  });
  const once = (method, sessionId) => new Promise(resolve => waiters.push({ method, sessionId, resolve }));

  // A tab with a fixed viewport. transparent: no white page background (icons). Collects console errors in tab.errors.
  async function open(width, height, { transparent = false, mobile = false, scale = 1 } = {}) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const s = (method, params) => send(method, params, sessionId);
    const size = { w: width, h: height }, errors = [];
    listeners.push({ sessionId, fn: (m, p) => {
      if (m === 'Runtime.exceptionThrown') errors.push(p.exceptionDetails.exception?.description || p.exceptionDetails.text);
      if (m === 'Runtime.consoleAPICalled' && (p.type === 'error' || p.type === 'warning')) errors.push(`console.${p.type}: ${p.args.map(a => a.value ?? a.description).join(' ')}`);
      if (m === 'Log.entryAdded' && p.entry.level === 'error') errors.push(`${p.entry.source}: ${p.entry.text} ${p.entry.url || ''}`);
    } });
    const metrics = () => s('Emulation.setDeviceMetricsOverride', { width: size.w, height: size.h, deviceScaleFactor: scale, mobile });
    await s('Page.enable'); await s('Runtime.enable'); await s('Log.enable'); await metrics();
    if (transparent) await s('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
    const tab = {
      errors,
      async eval(expression) {
        const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
        return r.result.value;
      },
      async goto(url) {
        const loaded = once('Page.loadEventFired', sessionId);
        await s('Page.navigate', { url }); await loaded;
        await tab.eval('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
      },
      async setContent(html) { const { frameTree } = await s('Page.getFrameTree'); await s('Page.setDocumentContent', { frameId: frameTree.frame.id, html }); await tab.eval('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))'); },
      // Answer requests that match the URL patterns (Fetch domain, * wildcards) with respond(request) → { status, type, body }.
      async intercept(patterns, respond) {
        listeners.push({ sessionId, fn: (m, p) => {
          if (m !== 'Fetch.requestPaused') return;
          const r = respond(p.request) || {};
          s('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: r.status ?? 200, responseHeaders: [{ name: 'Content-Type', value: r.type ?? 'text/plain' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: Buffer.from(r.body ?? '').toString('base64') }).catch(() => {});
        } });
        await s('Fetch.enable', { patterns: patterns.map(urlPattern => ({ urlPattern })) });
      },
      async resize(w, h) { size.w = w; size.h = h; await metrics(); },
      async shot({ fullPage = false } = {}) {
        const h = fullPage ? Math.ceil(await tab.eval('document.documentElement.scrollHeight')) : size.h;
        const y = fullPage ? 0 : await tab.eval('window.scrollY'); // viewport shots show what is on screen now
        const { data } = await s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: fullPage, clip: { x: 0, y, width: size.w, height: h, scale: 1 } });
        return Buffer.from(data, 'base64');
      },
      close: () => send('Target.closeTarget', { targetId }),
    };
    return tab;
  }
  async function close() {
    const exited = new Promise(r => proc.once('exit', r)), wait = ms => new Promise(r => setTimeout(r, ms));
    try { await Promise.race([send('Browser.close'), wait(3000)]); } catch { /* already gone */ }
    await Promise.race([exited, wait(5000)]);
    if (proc.exitCode === null && proc.signalCode === null) proc.kill();
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
  return { open, close };
}
