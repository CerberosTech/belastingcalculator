// Browser enhancement. Bundled by build.mjs after engine/tax.mjs and site/calcs.mjs, with P, S and L defined.
// Without JavaScript the page still shows the example result that the build wrote into the HTML.
const K = createCalcs(createEngine(P), P, S, L);
document.documentElement.classList.add('js');

for (const form of document.querySelectorAll('form[data-calc]')) {
  const calc = K.C[form.dataset.calc], fields = K.fieldsOf(calc), main = form.hasAttribute('data-main');
  const out = document.getElementById(form.dataset.out);
  const headEl = out.querySelector('[data-head]'), bodyEl = out.querySelector('[data-body]');
  const box = name => form.querySelector(`[data-field="${name}"]`);
  const input = f => f.type === 'choice' ? form.querySelector(`[name="${f.name}"]:checked`) : form.elements[f.name];

  // Start values: the query string (shared link) wins over the defaults.
  if (main && location.search) {
    const q = new URLSearchParams(location.search), v = K.defaults(calc);
    for (const f of fields) if (q.has(f.name)) v[f.name] = K.clean(f, q.get(f.name))[0];
    for (const f of fields) {
      if (!q.has(f.name)) continue;
      if (f.type === 'toggle') form.elements[f.name].checked = v[f.name];
      else if (f.type === 'choice') { const r = form.querySelector(`[name="${f.name}"][value="${CSS.escape(v[f.name])}"]`); if (r) r.checked = true; }
      else form.elements[f.name].value = K.showValue(f, v[f.name]);
    }
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
  // The build wrote the default result into the page: only replace it when the result changes.
  const first = K.render(calc, K.defaults(calc));
  let lastHead = first.head, lastBody = first.body;
  function update() {
    const { v, errors } = read();
    for (const f of fields) {
      const b = box(f.name); if (!b) continue;
      b.hidden = !K.isShown(f, v);
      const lab = b.querySelector('[data-label]'), text = K.labelOf(f, v); if (lab && lab.textContent !== text) lab.textContent = text;
      const e = b.querySelector('.err'), el = input(f);
      if (e) { const msg = b.hidden ? '' : errors[f.name]; e.textContent = msg; e.hidden = !msg; if (el) el.toggleAttribute('aria-invalid', !!msg); }
    }
    const r = K.render(calc, v);
    if (r.head !== lastHead) { headEl.innerHTML = r.head; lastHead = r.head; }
    if (r.body !== lastBody) { bodyEl.innerHTML = r.body; lastBody = r.body; }
    if (main) history.replaceState(null, '', `${location.pathname}?${K.toQuery(calc, v)}${location.hash}`);
  }
  let t;
  form.addEventListener('input', e => { clearTimeout(t); t = setTimeout(update, e.target.type === 'text' ? 200 : 0); });
  form.addEventListener('change', () => { clearTimeout(t); update(); });
  form.addEventListener('submit', e => { e.preventDefault(); clearTimeout(t); update(); });
  // Show a formatted amount after leaving the field ("4000" becomes "4.000").
  form.addEventListener('focusout', e => {
    const f = fields.find(x => x.name === e.target.name); if (!f || (f.type !== 'money' && f.type !== 'pct')) return;
    const [x, err] = K.clean(f, e.target.value); if (!err) e.target.value = K.showValue(f, x);
  });
  update();

  // Result bar: while you edit the form and the result is off screen, a bar at the bottom shows the main figure.
  if (main && 'IntersectionObserver' in window) {
    const bar = document.createElement('a');
    bar.className = 'peek'; bar.href = `#${out.id}`; bar.hidden = true;
    document.body.append(bar);
    let formIn = false, headIn = true;
    const sync = () => {
      bar.hidden = !(formIn && !headIn);
      if (!bar.hidden) bar.innerHTML = `<span>${headEl.querySelector('.r-label').textContent}</span><strong>${headEl.querySelector('.r-value').textContent}</strong>`;
    };
    new IntersectionObserver(e => { formIn = e[0].isIntersecting; sync(); }).observe(form);
    new IntersectionObserver(e => { headIn = e[0].isIntersecting; sync(); }).observe(headEl);
    form.addEventListener('input', () => setTimeout(sync, 250));
    form.addEventListener('change', sync);
  }

  // "Kopieer link": copies the current URL with all inputs.
  const copy = out.querySelector('[data-copy]');
  if (copy) {
    const status = out.querySelector('[data-copy-status]'), label = copy.textContent;
    copy.hidden = false;
    copy.addEventListener('click', async () => {
      update();
      let ok = false;
      try { await navigator.clipboard.writeText(location.href); ok = true; } catch { /* no clipboard access */ }
      if (!ok) { const ta = document.createElement('textarea'); ta.value = location.href; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.append(ta); ta.select(); try { ok = document.execCommand('copy'); } catch { ok = false; } ta.remove(); }
      copy.textContent = ok ? 'Link gekopieerd' : label;
      status.textContent = ok ? 'De link naar deze berekening staat op je klembord.' : `Kopiëren lukt niet. Kopieer het adres uit de adresbalk.`;
      setTimeout(() => { copy.textContent = label; }, 2500);
    });
  }
}
