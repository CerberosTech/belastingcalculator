// Browser enhancement. Bundled by build.mjs after engine/tax.mjs and site/calcs.mjs, with P, S and L (links per language) defined.
// Without JavaScript the page still shows the example result that the build wrote into the HTML.

// GoatCounter: count.js (async, end of body) runs with no_onload, so we count here. On a calculator the query string holds
// the amounts the visitor typed. count.js sends it as "q", in the path (when the canonical is on another host) and in the
// referrer (a calculator on this site). We drop all three, so no amounts go to GoatCounter.
// Clicks: links with data-goatcounter-click (affiliate, newsletter).
function goat() {
  const gc = window.goatcounter;
  if (!gc || !gc.count || gc.started) return;
  gc.started = true;
  const data = gc.get_data;
  const noQuery = x => typeof x === 'string' ? x.split(/[?#]/)[0] : x;
  gc.get_data = vars => { const d = data(vars); delete d.q; d.p = noQuery(d.p); d.r = noQuery(d.r); return d; };
  const start = () => { gc.count(); gc.bind_events(); };
  if (document.visibilityState !== 'hidden') start();
  else document.addEventListener('visibilitychange', function f() { if (document.visibilityState === 'hidden') return; document.removeEventListener('visibilitychange', f); start(); });
}
if (window.goatcounter && window.goatcounter.count) goat();
else { const s = document.querySelector('script[data-goatcounter]'); if (s) s.addEventListener('load', goat); }
const LANG = document.documentElement.lang === 'en' ? 'en' : 'nl';
const K = createCalcs(createEngine(P), P, S, L[LANG], LANG);
const DOC = document.documentElement;
DOC.classList.add('js');
const still = matchMedia('(prefers-reduced-motion: reduce)');

// Dark mode: follows the system until the visitor picks one; the choice is kept in localStorage (no cookie).
// The inline script in <head> sets data-theme before the first paint.
const themeBtn = document.querySelector('[data-theme-toggle]');
if (themeBtn) {
  const sysDark = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => DOC.dataset.theme ? DOC.dataset.theme === 'dark' : sysDark.matches;
  const sync = () => themeBtn.setAttribute('aria-pressed', String(isDark()));
  themeBtn.hidden = false; sync();
  themeBtn.addEventListener('click', () => { const t = isDark() ? 'light' : 'dark'; DOC.dataset.theme = t; try { localStorage.setItem('theme', t); } catch { /* private mode */ } sync(); });
  sysDark.addEventListener('change', sync);
}

// Folds (<details data-fold>): on a small screen they start closed (the inline script in <head> closes them before the
// first paint) and open on a tap. On a wider screen they stay open and look like plain sections: no toggle, no tab stop.
// A link to an anchor inside a closed fold opens it. Printing opens all of them, and closes them again after.
const SMALL = matchMedia('(max-width: 47.5em)'); // the same query as in style.css and FOLD_JS in build.mjs
const folds = [...document.querySelectorAll('details[data-fold]')];
const syncFolds = () => { for (const d of folds) { const s = d.querySelector(':scope > summary'); if (SMALL.matches) s.removeAttribute('tabindex'); else { d.open = true; s.tabIndex = -1; } } };
syncFolds();
SMALL.addEventListener('change', syncFolds);
document.addEventListener('click', e => { if (!SMALL.matches && e.target.closest('details[data-fold] > summary')) e.preventDefault(); });
function openTo() {
  let t = null;
  try { t = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch { /* malformed #fragment */ }
  let opened = false;
  for (let d = t && t.closest('details[data-fold]'); d; d = d.parentElement.closest('details[data-fold]')) if (!d.open) { d.open = true; opened = true; }
  if (opened) t.scrollIntoView();
}
openTo();
addEventListener('hashchange', openTo);
let closedForPrint = [];
addEventListener('beforeprint', () => { closedForPrint = folds.filter(d => !d.open); for (const d of closedForPrint) d.open = true; });
addEventListener('afterprint', () => { for (const d of closedForPrint) d.open = false; closedForPrint = []; });

// Language switcher: keep the query string, so a shared result opens with the same inputs in the other language.
// Pages without a translation link to the guide list instead; there the query has no meaning.
const langLink = document.querySelector('a[data-lang-switch]:not([data-no-translation])');
const langBase = langLink && langLink.getAttribute('href').split('?')[0];
const syncLang = () => { if (langLink) langLink.setAttribute('href', langBase + location.search); };
syncLang();

// Copy text to the clipboard, with a fallback for browsers without the async clipboard API.
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* no clipboard access */ }
  const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.append(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; } ta.remove(); return ok;
}

// Count the main figure up or down to its new value. The real text stays in the element (screen readers, copy, tests);
// the moving number is drawn by CSS from data-anim.
function countTo(el, from, to) {
  if (el.anim) cancelAnimationFrame(el.anim);
  const text = el.textContent, m = text.match(/\d[\d.,]*/);
  if (still.matches || !m || !isFinite(from) || !isFinite(to) || from === to) { delete el.dataset.anim; return; }
  const fmt = /[.,]\d\d$/.test(m[0]) && !Number.isInteger(to) ? K.cents : K.num, t0 = performance.now(), ms = 520;
  const step = now => {
    const k = Math.min(1, (now - t0) / ms), e = 1 - (1 - k) ** 3;
    if (k >= 1) { delete el.dataset.anim; el.anim = 0; return; }
    el.dataset.anim = text.replace(m[0], fmt(from + (to - from) * e)); el.anim = requestAnimationFrame(step);
  };
  el.anim = requestAnimationFrame(step);
}
const headNumber = el => { const m = el && el.textContent.match(/\d[\d.,]*/); return m ? K.parseNum(m[0]) : NaN; };

// Bars and rate tiles: when the structure is the same, change only widths and texts, so CSS can animate the bars.
function patch(el, html) {
  const t = document.createElement('div'); t.innerHTML = html;
  const sig = n => [...n.querySelectorAll('*')].map(x => x.tagName + x.className).join();
  if (sig(t) !== sig(el)) { el.innerHTML = html; return; }
  const olds = el.querySelectorAll('*'), news = t.querySelectorAll('*');
  news.forEach((n, i) => {
    const o = olds[i];
    for (const a of n.attributes) if (o.getAttribute(a.name) !== a.value) o.setAttribute(a.name, a.value);
    if (!n.children.length && o.textContent !== n.textContent) o.textContent = n.textContent;
  });
}

for (const form of document.querySelectorAll('form[data-calc]')) {
  const calc = K.C[form.dataset.calc], fields = K.fieldsOf(calc), main = form.hasAttribute('data-main');
  const root = form.closest('[data-calc-root]') || document;
  const out = document.getElementById(form.dataset.out);
  const R = Object.fromEntries(['head', 'viz', 'chart', 'body', 'table', 'after', 'vs', 'whatif', 'inputs'].map(k => [k, root.querySelector(`[data-${k}]`)]));
  const headEl = R.head;
  const box = name => root.querySelector(`[data-field="${name}"]`);
  const input = f => f.type === 'choice' ? form.querySelector(`[name="${f.name}"]:checked`) : form.elements[f.name];
  const slider = name => root.querySelector(`input[data-range-for="${name}"]`);
  const valuesOf = qs => { const q = new URLSearchParams(qs), v = K.defaults(calc); for (const f of fields) if (q.has(f.name)) v[f.name] = K.clean(f, q.get(f.name))[0]; return v; };

  // Start values: the query string (shared link) wins over the defaults. "vs" holds scenario A.
  let A = null;
  if (main && location.search) {
    const q = new URLSearchParams(location.search), v = valuesOf(location.search);
    for (const f of fields) {
      if (!q.has(f.name)) continue;
      if (f.type === 'toggle') form.elements[f.name].checked = v[f.name];
      else if (f.type === 'choice') { const r = form.querySelector(`[name="${f.name}"][value="${CSS.escape(v[f.name])}"]`); if (r) r.checked = true; }
      else form.elements[f.name].value = K.showValue(f, v[f.name]);
    }
    if (q.get('vs')) A = valuesOf(q.get('vs'));
  }

  function read() {
    const v = {}, errors = {};
    for (const f of fields) {
      const el = input(f);
      const raw = f.type === 'toggle' ? el.checked : el ? el.value : f.def;
      const [x, err] = K.clean(f, raw); v[f.name] = x; errors[f.name] = err;
    }
    return { v, errors };
  }
  // The build wrote the default result into the page: only replace a part when it changes.
  const last = K.render(calc, K.defaults(calc));
  const pin = root.querySelector('[data-pin]'), unpin = root.querySelector('[data-unpin]'), scn = root.querySelector('[data-scn]');
  let cur = K.defaults(calc), dragging = null, peek = () => {};
  function update() {
    const { v, errors } = read();
    cur = v;
    for (const f of fields) {
      const b = box(f.name); if (!b) continue;
      b.hidden = !K.isShown(f, v);
      const lab = b.querySelector('[data-label]'), text = K.labelOf(f, v); if (lab && lab.textContent !== text) lab.textContent = text;
      const e = b.querySelector('.err'), el = input(f);
      if (e) { const msg = b.hidden ? '' : errors[f.name]; e.textContent = msg; e.hidden = !msg; if (el) { if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid'); } }
      const s = slider(f.name), rg = s && K.rangeOf(f, v);
      if (rg) {
        if (s.min !== String(rg[0])) s.min = rg[0];
        if (s.max !== String(rg[1])) s.max = rg[1];
        if (s.step !== String(rg[2])) s.step = rg[2];
        const x = Math.min(rg[1], Math.max(rg[0], v[f.name]));
        if (dragging !== s) s.value = x;
        s.style.setProperty('--p', `${((x - rg[0]) / (rg[1] - rg[0]) * 100).toFixed(1)}%`);
      }
    }
    const r = K.render(calc, v);
    for (const k of Object.keys(R)) {
      if (!R[k] || r[k] === last[k]) continue;
      if (k === 'head') {
        const before = headNumber(R.head.querySelector('.r-value')), shown = R.head.querySelector('.r-value')?.dataset.anim;
        R.head.innerHTML = r.head;
        const now = R.head.querySelector('.r-value');
        if (now) countTo(now, shown ? headNumber({ textContent: shown }) : before, headNumber(now));
      } else if (k === 'viz') patch(R.viz, r.viz);
      else R[k].innerHTML = r[k];
      last[k] = r[k];
    }
    if (scn) {
      scn.innerHTML = A ? K.scenario(calc, A, v) : '';
      unpin.hidden = !A;
      pin.textContent = A ? K.T('Vervang scenario A', 'Replace scenario A') : K.T('Bewaar als scenario A', 'Save as scenario A');
    }
    peek();
    if (main) { wantUrl = `${location.pathname}?${K.toQuery(calc, v)}${A ? `&vs=${encodeURIComponent(K.toQuery(calc, A))}` : ''}${location.hash}`; clearTimeout(urlT); urlT = setTimeout(flushUrl, Math.max(0, lastUrl + 400 - Date.now())); }
  }
  // The URL follows the inputs, but not on every slider frame: Safari allows 100 replaceState calls per 30 seconds.
  // At most one write per 400 ms (75 per 30 seconds), and the last change is always written.
  let wantUrl = '', urlT, lastUrl = 0;
  function flushUrl() {
    clearTimeout(urlT);
    if (!wantUrl || wantUrl === location.pathname + location.search + location.hash) return;
    lastUrl = Date.now();
    try { history.replaceState(null, '', wantUrl); } catch { /* rate limit: the next change writes it */ }
    syncLang();
  }
  let t, frame;
  const soon = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
  // An amount per month / year / hour keeps its meaning when you switch: 4.000 per month becomes 48.000 per year.
  let periode = cur.periode;
  root.addEventListener('input', e => {
    const s = e.target.closest('input[data-range-for]');
    if (s) {
      const f = fields.find(x => x.name === s.dataset.rangeFor), el = form.elements[f.name];
      dragging = s; el.value = K.showValue(f, Number(s.value)); clearTimeout(t); soon(); return;
    }
    if (e.target.form !== form) return;
    clearTimeout(t); t = setTimeout(soon, e.target.type === 'text' ? 120 : 0);
  });
  root.addEventListener('change', e => {
    if (e.target.closest('input[data-range-for]')) { dragging = null; update(); flushUrl(); return; }
    if (e.target.form !== form) return;
    if (e.target.name === 'periode' && periode && e.target.value !== periode) {
      const { v } = read(), was = K.perYear(periode, v), now = K.perYear(e.target.value, v);
      for (const f of fields) if (f.perPeriod) { const x = v[f.name] * was / now; form.elements[f.name].value = K.showValue(f, e.target.value === 'uur' ? Math.round(x * 100) / 100 : Math.round(x)); }
      periode = e.target.value;
    }
    clearTimeout(t); update();
  });
  form.addEventListener('submit', e => { e.preventDefault(); clearTimeout(t); update(); });
  // Show a formatted amount after leaving the field ("4000" becomes "4.000").
  root.addEventListener('focusout', e => {
    if (e.target.form !== form) return;
    const f = fields.find(x => x.name === e.target.name); if (!f || (f.type !== 'money' && f.type !== 'pct' && f.type !== 'num')) return;
    const [x, err] = K.clean(f, e.target.value); if (!err) e.target.value = K.showValue(f, x);
  });
  if (pin) {
    pin.hidden = false;
    pin.addEventListener('click', () => { A = { ...cur }; update(); });
    unpin.addEventListener('click', () => { A = null; update(); pin.focus(); });
  }
  update(); flushUrl();
  periode = cur.periode;

  // Result bar (small screens, see .peek in style.css): while you edit the form and the result card is off screen, a bar at
  // the bottom shows the main figure, live. A tap scrolls to the result. The bar shows only after the first input or focus
  // in the form, so it never covers the form on a fresh page. ZONE is the strip at the bottom that the bar can cover:
  // the result card counts as visible when it reaches above that strip, so the last field can always scroll clear of the bar.
  if (main && 'IntersectionObserver' in window) {
    const ZONE = 96, bar = document.createElement('a');
    bar.className = 'peek'; bar.href = `#${out.id}`; bar.hidden = true;
    bar.innerHTML = `<span class="peek-l"></span><strong class="peek-v"></strong><span class="vh">${K.T(' – ga naar de uitkomst', ' – go to the result')}</span><svg class="peek-go" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
    document.body.append(bar);
    const label = bar.querySelector('.peek-l'), value = bar.querySelector('.peek-v');
    let editing = false, formIn = false, outIn = false;
    peek = () => {
      const show = editing && formIn && !outIn;
      if (show) { label.textContent = headEl.querySelector('.r-label').textContent; value.textContent = headEl.querySelector('.r-value').textContent; }
      if (bar.hidden === show) { bar.hidden = !show; DOC.classList.toggle('peek-on', show); }
    };
    new IntersectionObserver(e => { formIn = e.at(-1).isIntersecting; peek(); }).observe(form);
    new IntersectionObserver(e => { outIn = e.at(-1).isIntersecting; peek(); }, { rootMargin: `0px 0px -${ZONE}px 0px` }).observe(out);
    const start = () => { if (!editing) { editing = true; peek(); } };
    for (const ev of ['input', 'change', 'focusin']) form.addEventListener(ev, start);
    // Scroll to the result card below the sticky header, and move the focus to its heading. The URL does not change.
    const heading = out.querySelector('.r-title');
    heading.tabIndex = -1;
    bar.addEventListener('click', e => {
      e.preventDefault();
      const top = out.getBoundingClientRect().top + scrollY - (document.querySelector('.site-head')?.offsetHeight || 0) - 8;
      scrollTo({ top, behavior: still.matches ? 'auto' : 'smooth' });
      heading.focus({ preventScroll: true });
    });
    // On-screen keyboard: keep the bar above it (the visual viewport is smaller than the window). Not while zoomed in.
    const vv = window.visualViewport;
    if (vv) {
      const lift = () => bar.style.setProperty('--kb', `${vv.scale > 1.01 ? 0 : Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop))}px`);
      vv.addEventListener('resize', lift); vv.addEventListener('scroll', lift); lift();
    }
  }

  // Actions: copy the link (all inputs are in the URL), copy the result as text, print or save as PDF.
  const status = out.querySelector('[data-copy-status]');
  const say = (btn, ok, done, fail) => {
    const label = btn.dataset.label || (btn.dataset.label = btn.querySelector('.btn-t').textContent);
    btn.querySelector('.btn-t').textContent = ok ? done : label; btn.classList.toggle('done', ok);
    if (status) status.textContent = ok ? K.T('Gekopieerd naar je klembord.', 'Copied to your clipboard.') : fail;
    setTimeout(() => { btn.querySelector('.btn-t').textContent = label; btn.classList.remove('done'); }, 2200);
  };
  const copy = out.querySelector('[data-copy]');
  if (copy) {
    copy.hidden = false;
    copy.addEventListener('click', async () => { update(); flushUrl(); say(copy, await copyText(location.href), K.T('Link gekopieerd', 'Link copied'), K.T('Kopiëren lukt niet. Kopieer het adres uit de adresbalk.', 'Copying did not work. Copy the address from the address bar.')); });
  }
  const copyRes = out.querySelector('[data-copy-text]');
  if (copyRes) {
    copyRes.hidden = false;
    copyRes.addEventListener('click', async () => { update(); flushUrl(); say(copyRes, await copyText(K.asText(calc, cur, location.href)), K.T('Uitkomst gekopieerd', 'Result copied'), K.T('Kopiëren lukt niet.', 'Copying did not work.')); });
  }
  const print = out.querySelector('[data-print]');
  if (print && window.print) { print.hidden = false; print.addEventListener('click', () => window.print()); }
  const printUrl = out.querySelector('[data-print-url]');
  addEventListener('beforeprint', () => { if (printUrl) printUrl.textContent = location.href; const v = headEl.querySelector('.r-value'); if (v) { cancelAnimationFrame(v.anim); delete v.dataset.anim; } });
}
