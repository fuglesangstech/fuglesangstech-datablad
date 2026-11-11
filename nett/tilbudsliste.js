/*
  Tilbudsliste for fuglesangstech.no
  ----------------------------------
  Lastes på alle sider via Squarespace: Innstillinger → Avansert → Kodeinjeksjon → Bunntekst:
    <script src="https://fuglesangstech.github.io/fuglesangstech-datablad/nett/tilbudsliste.js" defer></script>

  Kunden samler produkter i en liste (lagres i nettleseren), og sender alt i ett skjema på /tilbud.
  Skjemaet er et vanlig Squarespace-skjema; lista fylles inn i tekstfeltet «Produkter» automatisk.

  For katalogsidene (bruk én av disse):
    1) JavaScript:  window.FTTilbud.add({ lev: 'LE', navn: 'Monolec Ultra Engine Oil', nr: '8800', emb: 'Fat', antall: 1 })
    2) HTML:        <button data-ft-tilbud data-lev="LE" data-navn="Monolec Ultra Engine Oil" data-nr="8800" data-emb="Fat">Legg i tilbudslisten</button>
  Felter: lev (leverandør), navn, nr (produktnr.), variant (f.eks. «SAE 15W-40»), emb (emballasje), varenr, antall, url.
  Hendelse: window 'fttilbud:endret' (detail: { antall }) når lista endres.
*/
(function () {
  'use strict';
  if (window.FTTilbud) return;
  var KEY = 'ft-tilbudsliste-v1', SIDE = '/tilbud';
  var NAVY = '#052b69', BLUE = '#1f5fbf';

  /* ---------- lagring ---------- */
  function load() { try { var a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? merge(a) : []; } catch (e) { return mem; } }
  var mem = [];
  function save(a) { mem = a; try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} changed(); }
  function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, 200); }
  // Samme produkt fra /produkter og katalogsidene skal bli én linje, selv om teksten er litt ulik
  // («SAE 15W-40» / «15W-40», «Spray (aerosol)» / «Spray», «20 L» / «20 l»).
  var LEV = { 'le': 'lubrication engineers', 'lubrication engineers (le)': 'lubrication engineers', 'vickers': 'vickers oils', 'perma': 'perma-tec', 'perma tec': 'perma-tec' };
  function norm(s) {
    return clean(s).toLowerCase().replace(/[®™©]/g, '').replace(/\s*\([^)]*\)/g, '').replace(/[×x]\s*/g, 'x ').replace(/\bliter\b|\blitre\b/g, 'l')
      .replace(/\b(sae|iso ?vg|nlgi|agma)\b/g, '').replace(/[^a-z0-9æøå,.½]+/g, ' ').replace(/(\d)\s+(l|kg|g|ml|gal|lb)\b/g, '$1$2').trim();
  }
  function keyOf(x) {
    var lev = norm(x.lev); lev = LEV[lev] || lev;
    var id = norm(x.varenr) || norm(x.nr);
    return [lev, id || norm(x.navn), id ? '' : norm(x.variant), norm(x.emb)].join('|');
  }
  // Slår sammen linjer med samme nøkkel (også lister lagret før denne regelen kom)
  function merge(a) {
    var out = [], by = {};
    a.forEach(function (y) {
      if (!y || (!y.navn && !y.nr)) return;
      y.key = keyOf(y);
      var o = by[y.key];
      if (!o) { by[y.key] = y; out.push(y); return; }
      o.antall = Math.min(9999, (o.antall || 1) + (y.antall || 1));
      ['navn', 'nr', 'variant', 'emb', 'varenr', 'url'].forEach(function (f) { if ((y[f] || '').length > (o[f] || '').length && f !== 'url') o[f] = y[f]; if (!o[f] && y[f]) o[f] = y[f]; });
    });
    return out;
  }
  function items() { return load(); }
  function count() { return load().length; }
  function add(it, opt) {
    it = it || {};
    var x = { lev: clean(it.lev), navn: clean(it.navn), nr: clean(it.nr), variant: clean(it.variant), emb: clean(it.emb), varenr: clean(it.varenr),
      antall: Math.max(1, Math.min(9999, parseInt(it.antall, 10) || 1)), url: clean(it.url || (location.pathname + location.hash)) };
    if (!x.navn && !x.nr) return false;
    var a = load(); a.push(x); a = merge(a);
    save(a);
    if (!opt || opt.toast !== false) toast(x);
    return true;
  }
  function setQty(k, n) { var a = load(); a.forEach(function (y) { if (y.key === k) y.antall = Math.max(1, Math.min(9999, parseInt(n, 10) || 1)); }); save(a); }
  function remove(k) { save(load().filter(function (y) { return y.key !== k; })); }
  function clear() { save([]); }
  function line(x, i) {
    var t = (i + 1) + '. ' + x.antall + ' × ' + (x.lev ? x.lev + ' ' : '') + x.navn;
    var d = [];
    if (x.nr) d.push('produktnr. ' + x.nr);
    if (x.variant) d.push(x.variant);
    if (x.emb) d.push('emballasje: ' + x.emb);
    if (x.varenr && x.varenr !== x.nr) d.push('varenr. ' + x.varenr);
    return t + (d.length ? ' (' + d.join(', ') + ')' : '');
  }
  function text() {
    var a = load();
    if (!a.length) return '';
    return a.length + (a.length === 1 ? ' produkt' : ' produkter') + ':\n' + a.map(line).join('\n');
  }

  /* ---------- stil ---------- */
  var css = [
    '.ftq-fab[hidden],.ftq-bg[hidden],.ftq-panel[hidden],.ftq-foot[hidden]{display:none!important}',
    '.ftq-fab{position:fixed;right:max(18px,env(safe-area-inset-right,0px));bottom:max(18px,env(safe-area-inset-bottom,0px));z-index:9990;display:flex;align-items:center;gap:10px;background:' + NAVY + ';color:#fff;border:0;border-radius:999px;padding:12px 18px 12px 16px;font-family:inherit;font-weight:600;font-size:15px;line-height:1.2;cursor:pointer;box-shadow:0 6px 20px rgba(5,43,105,.28)}',
    '.ftq-fab:hover{background:#0a3a8a}.ftq-fab svg{width:20px;height:20px;flex:none}',
    '.ftq-fab b{background:#fff;color:' + NAVY + ';border-radius:999px;min-width:24px;height:24px;display:grid;place-items:center;font-size:13px;padding:0 6px}',
    '.ftq-bg{position:fixed;inset:0;background:rgba(10,20,40,.38);z-index:9991;opacity:0;transition:opacity .2s}',
    '.ftq-bg.on{opacity:1}',
    '.ftq-panel{position:fixed;top:0;right:0;bottom:0;width:min(440px,100%);background:#fff;z-index:9992;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .25s ease;box-shadow:-8px 0 30px rgba(10,20,40,.18);font-family:inherit;color:#111a28}',
    '.ftq-panel.on{transform:none}',
    '.ftq-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:calc(18px + env(safe-area-inset-top,0px)) 20px 14px;border-bottom:1px solid #e3e7ee}',
    '.ftq-head h2{margin:0;font-size:22px;line-height:1.2;color:' + NAVY + '}',
    '.ftq-x{background:none;border:0;width:40px;height:40px;border-radius:50%;cursor:pointer;color:#3a4558;display:grid;place-items:center}.ftq-x:hover{background:#eef1f6}',
    '.ftq-body{flex:1;overflow:auto;padding:8px 20px}',
    '.ftq-empty{color:#5a6680;padding:28px 0;line-height:1.5}',
    '.ftq-list{list-style:none;margin:0;padding:0}',
    '.ftq-item{display:grid;grid-template-columns:1fr auto;gap:6px 12px;padding:14px 0;border-bottom:1px solid #eef1f6}',
    '.ftq-item .n{font-weight:600;line-height:1.35;min-width:0}.ftq-item .n a{color:inherit;text-decoration:none}.ftq-item .n a:hover{text-decoration:underline}',
    '.ftq-item .m{grid-column:1/-1;font-size:13.5px;color:#5a6680;line-height:1.45}',
    '.ftq-item .r{display:flex;align-items:center;gap:6px;grid-column:1/-1}',
    '.ftq-q{display:inline-flex;align-items:center;border:1px solid #d6dbe2;border-radius:8px;overflow:hidden}',
    '.ftq-q button{width:34px;height:34px;border:0;background:#f4f6f9;cursor:pointer;font-size:18px;color:' + NAVY + '}.ftq-q button:hover{background:#e7ecf5}',
    '.ftq-q input{width:56px;height:34px;border:0;text-align:center;font:inherit;font-size:15px;-moz-appearance:textfield}.ftq-q input::-webkit-inner-spin-button{-webkit-appearance:none}',
    '.ftq-rm{margin-left:auto;background:none;border:0;color:#5a6680;cursor:pointer;font:inherit;font-size:13.5px;text-decoration:underline;text-underline-offset:3px}.ftq-rm:hover{color:#b3261e}',
    '.ftq-foot{border-top:1px solid #e3e7ee;padding:16px 20px calc(16px + env(safe-area-inset-bottom,0px));display:grid;gap:10px}',
    '.ftq-foot p{margin:0;font-size:13.5px;color:#5a6680;line-height:1.45}',
    '.ftq-go{display:block;text-align:center;background:' + NAVY + ';color:#fff!important;border-radius:6px;padding:14px 18px;font-weight:600;text-decoration:none!important;font-size:16px}.ftq-go:hover{background:#0a3a8a}',
    '.ftq-clear{background:none;border:0;color:#5a6680;cursor:pointer;font:inherit;font-size:13.5px;justify-self:center;text-decoration:underline;text-underline-offset:3px}',
    '.ftq-toast{position:fixed;left:50%;bottom:max(84px,calc(env(safe-area-inset-bottom,0px) + 84px));transform:translate(-50%,20px);opacity:0;z-index:9993;background:#111a28;color:#fff;border-radius:10px;padding:12px 14px 12px 16px;display:flex;align-items:center;gap:14px;font-family:inherit;font-size:14.5px;box-shadow:0 8px 24px rgba(0,0,0,.25);transition:opacity .2s,transform .2s;max-width:calc(100% - 32px)}',
    '.ftq-toast.on{opacity:1;transform:translate(-50%,0)}',
    '.ftq-toast button{background:none;border:0;color:#9cc2ff;font:inherit;font-weight:600;cursor:pointer;white-space:nowrap;padding:4px}',
    '.ftq-page{font-family:inherit}',
    '.ftq-page .ftq-list{border-top:1px solid #e3e7ee}',
    '.ftq-page .ftq-item{grid-template-columns:1fr auto;padding:16px 0}',
    '.ftq-page .ftq-sum{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-top:14px;color:#5a6680;font-size:14px}',
    '.ftq-emptybox{display:grid;gap:14px;justify-items:start;padding:20px;border:1px dashed #c5cedb;border-radius:12px;background:#f7f9fc}',
    '.ftq-inline{display:inline-block;padding:12px 20px}',
    '.ftq-page .ftq-empty a{color:' + NAVY + ';font-weight:600}',
    '.ftq-sent{background:#eaf6ee;border:1px solid #bfe3cb;border-radius:10px;padding:16px 18px;color:#14532d;line-height:1.5}',
    'textarea.ftq-filled{background:#f7f9fc!important}',
    '.ftq-toast span{min-width:0;flex:1}',
    '@media (max-width:600px){.ftq-fab span{display:none}.ftq-fab{padding:13px}.ftq-toast{left:16px;right:16px;max-width:none;transform:translateY(20px)}.ftq-toast.on{transform:none}}',
    '@media print{.ftq-fab,.ftq-panel,.ftq-bg,.ftq-toast{display:none!important}}'
  ].join('\n');
  function injectCss() { if (document.getElementById('ftq-css')) return; var s = document.createElement('style'); s.id = 'ftq-css'; s.textContent = css; document.head.appendChild(s); }

  /* ---------- hjelpere ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5h11M9 12h11M9 19h11"/><path d="M4 5h.01M4 12h.01M4 19h.01" stroke-width="3"/></svg>';
  var CLOSE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  function onTilbudSide() { return location.pathname.replace(/\/+$/, '') === SIDE; }
  function meta(x) {
    var d = [];
    if (x.nr) d.push('Produktnr. ' + esc(x.nr));
    if (x.variant) d.push(esc(x.variant));
    d.push(x.emb ? 'Emballasje: ' + esc(x.emb) : 'Emballasje ikke valgt');
    if (x.varenr && x.varenr !== x.nr) d.push('Varenr. ' + esc(x.varenr));
    return (x.lev ? esc(x.lev) + ' · ' : '') + d.join(' · ');
  }
  function listHtml(a) {
    return '<ul class="ftq-list">' + a.map(function (x) {
      return '<li class="ftq-item" data-k="' + esc(x.key) + '"><div class="n">' + (x.url ? '<a href="' + esc(x.url) + '">' + esc(x.navn || x.nr) + '</a>' : esc(x.navn || x.nr)) + '</div><div></div>' +
        '<div class="m">' + meta(x) + '</div>' +
        '<div class="r"><span class="ftq-q"><button type="button" data-d="-1" aria-label="Færre">−</button><input type="number" min="1" max="9999" inputmode="numeric" value="' + x.antall + '" aria-label="Antall ' + esc(x.navn) + '"><button type="button" data-d="1" aria-label="Flere">+</button></span>' +
        '<span style="font-size:13.5px;color:#5a6680">stk.</span><button type="button" class="ftq-rm">Fjern</button></div></li>';
    }).join('') + '</ul>';
  }
  function wireList(root) {
    root.addEventListener('click', function (e) {
      var li = e.target.closest('.ftq-item'); if (!li) return;
      var k = li.getAttribute('data-k'), b = e.target.closest('button');
      if (!b) return;
      if (b.classList.contains('ftq-rm')) { remove(k); return; }
      var d = +b.getAttribute('data-d'); if (d) { var inp = li.querySelector('input'); setQty(k, (parseInt(inp.value, 10) || 1) + d); }
    });
    root.addEventListener('change', function (e) {
      if (e.target.matches('.ftq-item input')) setQty(e.target.closest('.ftq-item').getAttribute('data-k'), e.target.value);
    });
  }

  /* ---------- flytende knapp og panel ---------- */
  var fab, bg, panel, lastFocus;
  function buildUi() {
    fab = document.createElement('button');
    fab.type = 'button'; fab.className = 'ftq-fab'; fab.hidden = true;
    fab.setAttribute('aria-haspopup', 'dialog');
    fab.innerHTML = ICON + '<span>Tilbudsliste</span><b>0</b>';
    fab.onclick = open;
    bg = document.createElement('div'); bg.className = 'ftq-bg'; bg.hidden = true; bg.onclick = close;
    panel = document.createElement('aside');
    panel.className = 'ftq-panel'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'ftq-t');
    panel.innerHTML = '<div class="ftq-head"><h2 id="ftq-t">Tilbudsliste</h2><button type="button" class="ftq-x" aria-label="Lukk">' + CLOSE + '</button></div>' +
      '<div class="ftq-body"></div><div class="ftq-foot"><a class="ftq-go" href="' + SIDE + '">Be om tilbud</a>' +
      '<p>Du fyller inn kontaktopplysninger på neste side.</p><button type="button" class="ftq-clear">Tøm lista</button></div>';
    panel.querySelector('.ftq-x').onclick = close;
    panel.querySelector('.ftq-clear').onclick = function () { clear(); };
    wireList(panel.querySelector('.ftq-body'));
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) close(); });
    document.body.appendChild(fab); document.body.appendChild(bg); document.body.appendChild(panel);
  }
  function open() {
    if (!panel) return;
    lastFocus = document.activeElement;
    renderPanel();
    bg.hidden = false; panel.hidden = false;
    requestAnimationFrame(function () { bg.classList.add('on'); panel.classList.add('on'); panel.querySelector('.ftq-x').focus(); });
    document.documentElement.style.overflow = 'hidden';
  }
  function close() {
    if (!panel || panel.hidden) return;
    bg.classList.remove('on'); panel.classList.remove('on');
    document.documentElement.style.overflow = '';
    setTimeout(function () { bg.hidden = true; panel.hidden = true; }, 250);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function renderPanel() {
    if (!panel) return;
    var a = load(), body = panel.querySelector('.ftq-body');
    body.innerHTML = a.length ? listHtml(a) : '<p class="ftq-empty">Lista er tom. Legg til produkter fra <a href="/produkter">produktkatalogen</a>, så kan du be om tilbud på alt samtidig.</p>';
    panel.querySelector('.ftq-foot').hidden = !a.length;
  }
  function renderFab() {
    if (!fab) return;
    var n = count();
    fab.hidden = !n || onTilbudSide();
    fab.querySelector('b').textContent = n;
    fab.setAttribute('aria-label', 'Tilbudsliste, ' + n + (n === 1 ? ' produkt' : ' produkter'));
  }
  var tt, toastEl;
  function toast(x) {
    if (!document.body) return;
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'ftq-toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.innerHTML = '<span>Lagt i tilbudslisten: <b>' + esc(x.navn || x.nr) + '</b></span><button type="button">Vis liste</button>';
    toastEl.querySelector('button').onclick = function () { toastEl.classList.remove('on'); open(); };
    toastEl.classList.add('on');
    clearTimeout(tt); tt = setTimeout(function () { toastEl.classList.remove('on'); }, 4000);
  }

  /* ---------- /tilbud: liste + utfylling av Squarespace-skjemaet ---------- */
  var MARK_A = '--- Tilbudsliste fra fuglesangstech.no ---', MARK_B = '--- Slutt på tilbudslisten ---';
  function setVal(el, v) {
    var proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    var set = Object.getOwnPropertyDescriptor(proto, 'value').set;
    set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function labelOf(el) {
    var id = el.id, l = id && document.querySelector('label[for="' + id + '"]');
    var box = el.closest('.form-item, .field, fieldset, div');
    return ((l && l.textContent) || (box && box.textContent) || el.name || el.placeholder || '').toLowerCase();
  }
  function targetArea() {
    var form = document.querySelector('.sqs-block-form form, form.react-form-contents, .form-wrapper form') || document.querySelector('form');
    if (!form) return null;
    var tas = [].slice.call(form.querySelectorAll('textarea'));
    if (!tas.length) return null;
    return tas.filter(function (t) { return /produkt|tilbudsliste|varer/.test(labelOf(t)); })[0] || tas[0];
  }
  function fillForm() {
    var ta = targetArea(); if (!ta) return false;
    var cur = ta.value || '', t = text();
    var i = cur.indexOf(MARK_A), j = cur.indexOf(MARK_B);
    var rest = i > -1 && j > i ? (cur.slice(0, i) + cur.slice(j + MARK_B.length)).trim() : cur.trim();
    var block = t ? MARK_A + '\n' + t + '\n' + MARK_B : '';
    var v = block + (rest ? (block ? '\n\n' : '') + rest : '');
    if (v !== cur) setVal(ta, v);
    ta.classList.toggle('ftq-filled', !!t);
    if (!ta._ftq) {
      ta._ftq = 1;
      var form = ta.closest('form');
      if (form) form.addEventListener('submit', function () { sessionStorage.setItem('ftq-sendt', String(Date.now())); }, true);
    }
    return true;
  }
  function watchSuccess() {
    // Squarespace bytter ut skjemaet med takkemeldingen når innsendingen er godkjent
    var mo = new MutationObserver(function () {
      var sent = +(sessionStorage.getItem('ftq-sendt') || 0);
      if (!sent || Date.now() - sent > 120000) return;
      var ok = document.querySelector('.form-submission-text, .sqs-form-block-submission-html:not(:empty), [data-form-submission-text]');
      var formGone = !document.querySelector('.sqs-block-form form');
      if (ok && (formGone || ok.offsetParent !== null)) {
        sessionStorage.removeItem('ftq-sendt');
        clear();
        var box = document.getElementById('ft-tilbud');
        // Takkemeldingen vises i skjemaet (Squarespace: «Post-Submit HTML»); her står bare en kort bekreftelse
        if (box) box.innerHTML = '<p class="ftq-empty">Forespørselen er sendt, og tilbudslisten er tømt.</p>';
        mo.disconnect();
      }
    });
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
  }
  function renderPage() {
    var box = document.getElementById('ft-tilbud');
    if (!box) return;
    box.classList.add('ftq-page');
    var a = load();
    box.innerHTML = a.length
      ? listHtml(a) + '<div class="ftq-sum"><span>' + a.length + (a.length === 1 ? ' produkt' : ' produkter') + ' i lista. Lista sendes med forespørselen.</span><button type="button" class="ftq-clear">Tøm lista</button></div>'
      : '<div class="ftq-emptybox"><p class="ftq-empty">Tilbudslisten er tom. Finn produktene i produktkatalogen og trykk «Legg i tilbudslisten», eller beskriv hva du trenger i skjemaet under.</p><a class="ftq-go ftq-inline" href="/produkter">Gå til produktkatalogen</a></div>';
    var c = box.querySelector('.ftq-clear'); if (c) c.onclick = function () { clear(); };
  }
  var pageWired = false;
  function initPage() {
    var box = document.getElementById('ft-tilbud');
    if (!box && !onTilbudSide()) return;
    if (box && !pageWired) { pageWired = true; wireList(box); }
    renderPage();
    // Skjemaet tegnes av Squarespace etter at siden er lastet: prøv til det finnes
    var n = 0, iv = setInterval(function () { if (fillForm() || ++n > 40) clearInterval(iv); }, 250);
    watchSuccess();
    initOwnForm();
  }

  /* ---------- Eget skjema på /tilbud, med Squarespace-skjemaet skjult i bakgrunnen ----------
     Squarespace-skjemaet sender fortsatt e-posten (til adressen satt i skjemaets innstillinger) og lagrer innsendingen.
     Feltene finnes etter type og etikett, ikke etter ID, så de tåler at skjemaet endres.
     Finner vi ikke det vi trenger, eller sendingen feiler, vises Squarespace-skjemaet som før (ferdig utfylt). */
  var FORM_VERSION = '2026-11-11c';
  function lbl(el) {
    var l = el.labels && el.labels[0] ? el.labels[0].textContent : '';
    if (!l) { var box = el.closest('.form-item, .field, fieldset'); l = box ? (box.querySelector('label, legend, .title') || box).textContent : ''; }
    return (l + ' ' + (el.getAttribute('aria-label') || '') + ' ' + (el.placeholder || '')).toLowerCase();
  }
  function sqMap() {
    var block = document.querySelector('.sqs-block-form'), f = block && block.querySelector('form');
    if (!f) return null;
    var ins = [].slice.call(f.querySelectorAll('input, textarea, select')).filter(function (e) { return e.type !== 'hidden' && e.id !== 'message-field' && e.autocomplete !== 'new-password'; });
    function find(test) { return ins.filter(test)[0] || null; }
    var m = {
      block: block, form: f,
      fname: find(function (e) { return e.name === 'fname' || e.autocomplete === 'given-name'; }),
      lname: find(function (e) { return e.name === 'lname' || e.autocomplete === 'family-name'; }),
      email: find(function (e) { return e.type === 'email' || /e-?post|email/.test(lbl(e)); }),
      tel: find(function (e) { return /^tel/.test(e.autocomplete || '') || e.type === 'tel' || (/telefon|nummer|phone/.test(lbl(e)) && e.tagName === 'INPUT'); }),
      firma: find(function (e) { return e.tagName === 'INPUT' && /firma|bedrift|selskap|company/.test(lbl(e)); }),
      prod: find(function (e) { return e.tagName === 'TEXTAREA' && /produkt|tilbud|forespørsel|varer/.test(lbl(e)); }) || find(function (e) { return e.tagName === 'TEXTAREA'; }),
      komm: find(function (e) { return /kommentar|melding|beskjed/.test(lbl(e)) && e.tagName !== 'SELECT'; }),
      btn: f.querySelector('button[type="submit"], input[type="submit"]')
    };
    if (m.komm === m.prod) m.komm = null;
    m.name = m.fname ? null : find(function (e) { return e.tagName === 'INPUT' && /navn|name/.test(lbl(e)) && e !== m.firma; });
    m.ok = !!(m.email && m.prod && m.btn && (m.fname || m.name));
    return m;
  }
  function setAny(el, v) {
    if (!el) return;
    var proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    ['input', 'change', 'blur'].forEach(function (t) { el.dispatchEvent(new Event(t, { bubbles: true })); });
  }
  var FCSS = [
    '.ftf{--n:#052b69;--nd:#031c47;--sky:#9cc2ff;--tint:#e9eff8;--ink:#111a28;--tx:#2a3443;--mu:#5f6b7a;--ln:#d6dbe2;font-family:"Barlow",system-ui,sans-serif;color:var(--tx);font-size:16px;line-height:1.5;margin-bottom:24px}',
    '.ftf *,.ftf *::before,.ftf *::after{box-sizing:border-box}',
    '.ftf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:18px 20px;align-items:start}',
    '.ftf-f{display:grid;gap:6px;min-width:0;position:relative}.ftf-f.full{grid-column:1/-1}',
    '.ftf-f>label,.ftf-f>.ftf-l{font-weight:600;font-size:15px;color:var(--ink)}.ftf-f label i,.ftf-f .ftf-l i{font-style:normal;color:var(--mu);font-weight:500}',
    '.ftf input,.ftf select,.ftf textarea{font:inherit;font-size:16px;color:var(--ink);background:#fff;border:1px solid var(--ln);border-radius:8px;padding:13px 14px;width:100%;min-width:0;transition:border-color .15s,box-shadow .15s;-webkit-appearance:none;appearance:none}',
    '.ftf select{background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%278%27%3E%3Cpath d=%27M1 1l5 5 5-5%27 fill=%27none%27 stroke=%27%235f6b7a%27 stroke-width=%271.6%27/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;padding-right:38px}',
    '.ftf textarea{min-height:120px;resize:vertical}',
    '.ftf input:focus,.ftf select:focus,.ftf textarea:focus{outline:0;border-color:var(--n);box-shadow:0 0 0 3px rgba(5,43,105,.12)}',
    '.ftf .bad input,.ftf .bad textarea{border-color:#b3261e}.ftf-err{font-size:13.5px;color:#b3261e;min-height:0}.ftf-err:empty{display:none}',
    '.ftf-pair{display:grid;grid-template-columns:96px minmax(0,1fr);gap:10px}',
    '.ftf-hint{font-size:13.5px;color:var(--mu)}.ftf-hint b{color:var(--n);font-weight:600}',
    '.ftf-sug{position:absolute;left:0;right:0;top:100%;margin-top:4px;background:#fff;border:1px solid var(--ln);border-radius:10px;box-shadow:0 10px 30px rgba(17,26,40,.12);z-index:20;overflow:hidden;list-style:none;padding:4px;margin-left:0}',
    '.ftf-sug li{padding:9px 12px;border-radius:7px;cursor:pointer;display:flex;justify-content:space-between;gap:12px;font-size:15px}.ftf-sug li small{color:var(--mu);white-space:nowrap}',
    '.ftf-sug li:hover,.ftf-sug li.on{background:var(--tint)}',
    '.ftf-foot{display:flex;flex-wrap:wrap;align-items:center;gap:14px 20px;margin-top:22px}',
    '.ftf-send{display:inline-flex;align-items:center;gap:10px;background:var(--n);color:#fff;border:1.5px solid var(--n);border-radius:6px;padding:14px 26px;font:inherit;font-weight:600;font-size:16px;cursor:pointer;transition:background .15s,transform .15s}',
    '.ftf-send:hover{background:var(--nd);transform:translateY(-1px)}.ftf-send[disabled]{opacity:.75;cursor:progress;transform:none}',
    '.ftf-spin{width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;animation:ftfspin .8s linear infinite;display:none}.ftf-send[disabled] .ftf-spin{display:inline-block}',
    '@keyframes ftfspin{to{transform:rotate(360deg)}}',
    '.ftf-priv{font-size:13.5px;color:var(--mu);flex:1 1 260px;margin:0}',
    '.ftf-alert{margin-top:16px;padding:14px 16px;border-radius:10px;background:#fdecea;border:1px solid #f5c2bd;color:#7a1c14;font-size:15px}',
    '.ftf-alert:empty{display:none}',
    '.ftf-hp{position:absolute!important;left:-10000px!important;width:1px;height:1px;overflow:hidden}',
    '.ftf-sqhide{position:absolute!important;left:-10000px!important;top:0!important;width:600px!important;height:1px!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important}',
    '.ftk{--navy:#052b69;--navy-d:#031c47;--sky:#9cc2ff;--tint:#e9eff8;--ink:#111a28;--muted:#5f6b7a;--line:#d6dbe2;font-family:"Barlow",system-ui,sans-serif;color:#2a3443;line-height:1.55;border:1px solid var(--line);border-radius:16px;overflow:hidden;background:#fff;max-width:680px;animation:ftk-in .5s cubic-bezier(.2,.7,.2,1) both;margin-bottom:24px}',
    '.ftk *{box-sizing:border-box}.ftk :where(h2,h3,p,ol){margin:0;padding:0}',
    '.ftk-top{position:relative;padding:32px 32px 28px;background:linear-gradient(135deg,var(--navy-d) 0%,var(--navy) 60%,#0b4aa8 100%);color:#fff;overflow:hidden}',
    '.ftk-top::after{content:"";position:absolute;right:-60px;top:-60px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(156,194,255,.35) 0%,rgba(156,194,255,0) 70%)}',
    '.ftk-check{width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.12);display:grid;place-items:center;margin-bottom:18px;animation:ftk-pulse 1.6s .5s ease-out 1}',
    '.ftk-check svg{width:34px;height:34px}.ftk-check circle{stroke:var(--sky);stroke-dasharray:76;stroke-dashoffset:76;animation:ftk-draw .6s .15s ease-out forwards}.ftk-check path{stroke:#fff;stroke-dasharray:24;stroke-dashoffset:24;animation:ftk-draw .4s .6s ease-out forwards}',
    '.ftk-top h2{font-family:"Barlow Semi Condensed","Barlow",sans-serif;font-size:clamp(26px,3vw,34px);font-weight:700;line-height:1.1;color:#fff;text-transform:none;letter-spacing:0}',
    '.ftk-top p{margin-top:8px;color:rgba(255,255,255,.85);font-size:17px;max-width:46ch}',
    '.ftk-body{padding:26px 32px 30px;display:grid;gap:22px}',
    '.ftk-body h3{font-family:"Barlow Semi Condensed","Barlow",sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:14px}',
    '.ftk-steps{list-style:none;display:grid;position:relative}',
    '.ftk-steps li{position:relative;display:grid;grid-template-columns:28px 1fr;gap:14px;padding-bottom:16px;opacity:0;animation:ftk-in .45s ease-out forwards}',
    '.ftk-steps li:nth-child(1){animation-delay:.7s}.ftk-steps li:nth-child(2){animation-delay:.85s}.ftk-steps li:nth-child(3){animation-delay:1s;padding-bottom:0}',
    '.ftk-steps li:not(:last-child)::after{content:"";position:absolute;left:13px;top:28px;bottom:0;width:2px;background:var(--tint)}',
    '.ftk-dot{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:14px;font-weight:700;background:var(--tint);color:var(--navy)}.ftk-steps li.done .ftk-dot{background:var(--navy);color:#fff}',
    '.ftk-steps b{display:block;color:var(--ink);font-weight:600;font-size:16px}.ftk-steps div span{display:block;color:var(--muted);font-size:15px}',
    '.ftk-btns{display:flex;flex-wrap:wrap;gap:10px}.ftk-btns a{display:inline-flex;align-items:center;padding:12px 20px;border-radius:6px;font-weight:600;font-size:15.5px;text-decoration:none!important;border:1.5px solid var(--navy)}',
    '.ftk-btns a.p{background:var(--navy);color:#fff!important}.ftk-btns a.p:hover{background:var(--navy-d)}.ftk-btns a.s{color:var(--navy)!important}.ftk-btns a.s:hover{background:var(--tint)}',
    '.ftk-foot{border-top:1px solid var(--line);padding:14px 32px;background:#f6f8fb;font-size:14.5px;color:var(--muted)}.ftk-foot a{color:var(--navy)!important;font-weight:600;text-decoration:none;white-space:nowrap}',
    '@keyframes ftk-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@keyframes ftk-draw{to{stroke-dashoffset:0}}@keyframes ftk-pulse{from{box-shadow:0 0 0 0 rgba(156,194,255,.5)}to{box-shadow:0 0 0 18px rgba(156,194,255,0)}}',
    '@media (max-width:640px){.ftf-grid{grid-template-columns:1fr}.ftk-top,.ftk-body{padding-left:20px;padding-right:20px}.ftk-foot{padding:14px 20px}.ftk-btns a{flex:1 1 100%;justify-content:center}}',
    '@media (prefers-reduced-motion:reduce){.ftk,.ftk *,.ftk *::after{animation:none!important;opacity:1!important}.ftk-check circle,.ftk-check path{stroke-dashoffset:0!important}}'
  ].join('\n');
  var TIDER = ['Snarest', 'Innen 1 uke', 'Innen 2 uker', 'Innen 1 måned', 'Etter avtale'];
  function formHtml() {
    return '<form class="ftf" novalidate autocomplete="on" aria-label="Be om tilbud">' +
      '<div class="ftf-grid">' +
      '<div class="ftf-f" data-f="navn"><label for="ftf-navn">Navn</label><input id="ftf-navn" name="name" autocomplete="name" required><span class="ftf-err"></span></div>' +
      '<div class="ftf-f" data-f="firma"><label for="ftf-firma">Firma <i>(valgfritt)</i></label><input id="ftf-firma" name="organization" autocomplete="organization" aria-autocomplete="list" aria-controls="ftf-sug"><ul class="ftf-sug" id="ftf-sug" role="listbox" hidden></ul><span class="ftf-hint" id="ftf-org"></span></div>' +
      '<div class="ftf-f" data-f="epost"><label for="ftf-epost">E-post</label><input id="ftf-epost" type="email" name="email" autocomplete="email" inputmode="email" required><span class="ftf-err"></span></div>' +
      '<div class="ftf-f" data-f="tlf"><label for="ftf-tlf">Telefon</label><input id="ftf-tlf" type="tel" name="tel" autocomplete="tel" inputmode="tel" required><span class="ftf-err"></span></div>' +
      '<div class="ftf-f" data-f="sted"><span class="ftf-l" id="ftf-sted-l">Leveringssted <i>(valgfritt)</i></span><div class="ftf-pair"><input id="ftf-postnr" aria-labelledby="ftf-sted-l" aria-label="Postnummer" placeholder="Postnr." inputmode="numeric" maxlength="4" autocomplete="postal-code"><input id="ftf-poststed" aria-label="Poststed" placeholder="Poststed" autocomplete="address-level2"></div></div>' +
      '<div class="ftf-f" data-f="tid"><label for="ftf-tid">Ønsket leveringstid</label><select id="ftf-tid">' + TIDER.map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select></div>' +
      '<div class="ftf-f full" data-f="komm"><label for="ftf-komm">Kommentar <i id="ftf-komm-i">(valgfritt)</i></label><textarea id="ftf-komm" placeholder="For eksempel bruksområde, mengde per år eller spørsmål til produktene"></textarea><span class="ftf-err"></span></div>' +
      '</div>' +
      '<div class="ftf-hp" aria-hidden="true"><label>La stå tomt <input id="ftf-hp" tabindex="-1" autocomplete="off"></label></div>' +
      '<div class="ftf-foot"><button class="ftf-send" type="submit"><span class="ftf-spin" aria-hidden="true"></span><span class="ftf-sendt">Send forespørsel</span></button>' +
      '<p class="ftf-priv">Vi bruker opplysningene bare til å besvare forespørselen. De deles ikke med andre.</p></div>' +
      '<div class="ftf-alert" role="alert"></div></form>';
  }
  function successHtml() {
    return '<div class="ftk" role="status" tabindex="-1"><div class="ftk-top"><div class="ftk-check" aria-hidden="true"><svg viewBox="0 0 30 30" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="15" cy="15" r="12"/><path d="M9.5 15.5l3.7 3.7 7.3-7.7"/></svg></div>' +
      '<h2>Takk, forespørselen er mottatt</h2><p>Vi går gjennom forespørselen og kommer tilbake med pris og leveringstid så snart vi kan.</p></div>' +
      '<div class="ftk-body"><div><h3>Hva skjer nå</h3><ol class="ftk-steps">' +
      '<li class="done"><span class="ftk-dot">✓</span><div><b>Forespørselen er sendt</b><span>Tilbudslisten fulgte med.</span></div></li>' +
      '<li><span class="ftk-dot">2</span><div><b>Riktig fagperson går gjennom den</b><span>Vi ser på produktene, emballasjen og bruksområdet.</span></div></li>' +
      '<li><span class="ftk-dot">3</span><div><b>Du får tilbud</b><span>Med pris og leveringstid, eller forslag til et bedre egnet produkt.</span></div></li></ol></div>' +
      '<div class="ftk-btns"><a class="p" href="/produkter">Fortsett i produktkatalogen</a><a class="s" href="/">Til forsiden</a></div></div>' +
      '<div class="ftk-foot">Haster det? Ring <a href="tel:22542000">22 54 20 00</a> (man–fre 08–16) eller døgnvakt <a href="tel:+4791542002">915 42 002</a>.</div></div>';
  }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function fmtOrg(n) { n = digits(n); return n.length === 9 ? n.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') : n; }
  function title(s) { return String(s || '').toLowerCase().replace(/(^|[\s\-\/(])([a-zæøå])/g, function (m, a, b) { return a + b.toUpperCase(); }).replace(/\bAs\b/g, 'AS').replace(/\bAsa\b/g, 'ASA').replace(/\bSa\b/g, 'SA').replace(/\bDa\b/g, 'DA').replace(/\bAnsa\b/g, 'ANS'); }
  function wireBrreg(root, st) {
    var inp = root.querySelector('#ftf-firma'), ul = root.querySelector('#ftf-sug'), hint = root.querySelector('#ftf-org'), t, seq = 0, hits = [], cur = -1;
    function pick(e) {
      st.org = e.organisasjonsnummer; inp.value = title(e.navn);
      hint.innerHTML = 'Org.nr. <b>' + fmtOrg(e.organisasjonsnummer) + '</b> fra Brønnøysundregistrene';
      var a = e.forretningsadresse || e.postadresse;
      var pn = root.querySelector('#ftf-postnr'), ps = root.querySelector('#ftf-poststed');
      if (a && !pn.value) { pn.value = a.postnummer || ''; ps.value = title(a.poststed || ''); }
      ul.hidden = true;
    }
    function show() {
      ul.innerHTML = hits.map(function (e, i) { var a = e.forretningsadresse || e.postadresse || {}; return '<li role="option" data-i="' + i + '"' + (i === cur ? ' class="on" aria-selected="true"' : '') + '><span>' + esc(title(e.navn)) + '</span><small>' + fmtOrg(e.organisasjonsnummer) + (a.poststed ? ' · ' + esc(title(a.poststed)) : '') + '</small></li>'; }).join('');
      ul.hidden = !hits.length;
    }
    function search() {
      var q = inp.value.trim(), my = ++seq; st.org = ''; hint.textContent = '';
      if (q.length < 3) { hits = []; show(); return; }
      var u = /^\d{9}$/.test(digits(q)) && digits(q).length === q.replace(/\s/g, '').length
        ? 'https://data.brreg.no/enhetsregisteret/api/enheter/' + digits(q)
        : 'https://data.brreg.no/enhetsregisteret/api/enheter?size=5&navn=' + encodeURIComponent(q);
      fetch(u).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        if (my !== seq || !j) return;
        hits = j.organisasjonsnummer ? [j] : ((j._embedded && j._embedded.enheter) || []); cur = -1;
        if (j.organisasjonsnummer) { pick(j); hits = []; }
        show();
      }).catch(function () {});
    }
    inp.addEventListener('input', function () { clearTimeout(t); t = setTimeout(search, 250); });
    inp.addEventListener('keydown', function (e) {
      if (ul.hidden) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); cur = (cur + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length; show(); }
      else if (e.key === 'Enter' && cur > -1) { e.preventDefault(); pick(hits[cur]); }
      else if (e.key === 'Escape') ul.hidden = true;
    });
    ul.addEventListener('mousedown', function (e) { var li = e.target.closest('li'); if (li) { e.preventDefault(); pick(hits[+li.getAttribute('data-i')]); } });
    inp.addEventListener('blur', function () { setTimeout(function () { ul.hidden = true; }, 150); });
  }
  function wirePost(root) {
    var pn = root.querySelector('#ftf-postnr'), ps = root.querySelector('#ftf-poststed');
    pn.addEventListener('input', function () {
      var v = digits(pn.value).slice(0, 4); if (pn.value !== v) pn.value = v;
      if (v.length !== 4) return;
      fetch('https://ws.geonorge.no/adresser/v1/sok?treffPerSide=1&postnummer=' + v).then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { var a = j && j.adresser && j.adresser[0]; if (a && a.poststed) ps.value = title(a.poststed); }).catch(function () {});
    });
  }
  function errSet(root, f, msg) { var b = root.querySelector('[data-f="' + f + '"]'); if (!b) return; b.classList.toggle('bad', !!msg); var e = b.querySelector('.ftf-err'); if (e) e.textContent = msg || ''; }
  function validate(root) {
    var ok = true, g = function (id) { return root.querySelector(id).value.trim(); };
    function chk(f, cond, msg) { errSet(root, f, cond ? '' : msg); if (!cond) ok = false; }
    chk('navn', g('#ftf-navn').length > 1, 'Skriv inn navnet ditt.');
    chk('epost', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(g('#ftf-epost')), 'Skriv inn en gyldig e-postadresse.');
    chk('tlf', digits(g('#ftf-tlf')).length >= 8, 'Skriv inn et telefonnummer med minst 8 sifre.');
    chk('komm', count() > 0 || g('#ftf-komm').length > 5, 'Tilbudslisten er tom. Beskriv hva du trenger her.');
    if (!ok) { var b = root.querySelector('.bad input, .bad textarea'); if (b) b.focus(); }
    return ok;
  }
  function compose(root, st) {
    var g = function (id) { return root.querySelector(id).value.trim(); };
    var lines = [];
    lines.push(count() ? text() : 'Ingen produkter i tilbudslisten. Se kommentaren.');
    lines.push('');
    if (g('#ftf-postnr') || g('#ftf-poststed')) lines.push('Leveringssted: ' + (g('#ftf-postnr') + ' ' + g('#ftf-poststed')).trim());
    lines.push('Ønsket leveringstid: ' + g('#ftf-tid'));
    if (st.org) lines.push('Org.nr.: ' + fmtOrg(st.org));
    if (g('#ftf-komm')) lines.push('', 'Kommentar:', g('#ftf-komm'));
    return lines.join('\n');
  }
  function fillSq(m, root, st) {
    var g = function (id) { return root.querySelector(id).value.trim(); };
    var navn = g('#ftf-navn').split(/\s+/), fn = navn.shift(), ln = navn.join(' ');
    if (m.fname) { setAny(m.fname, fn); setAny(m.lname, ln || '-'); } else setAny(m.name, g('#ftf-navn'));
    setAny(m.email, g('#ftf-epost'));
    if (m.tel) { var t = g('#ftf-tlf').replace(/^\+?47\s*/, '').replace(/^0047\s*/, ''); setAny(m.tel, t); }
    if (m.firma) setAny(m.firma, g('#ftf-firma') + (st.org ? ' (org.nr. ' + fmtOrg(st.org) + ')' : ''));
    var body = compose(root, st);
    if (m.komm) { setAny(m.komm, g('#ftf-komm')); body = body.replace(/\n\nKommentar:\n[\s\S]*$/, ''); }
    setAny(m.prod, body);
  }
  function sqErrors(m) {
    if (sqNetError()) return ['serveren svarte med feil (' + NET.status + ')'];
    return [].slice.call(m.block.querySelectorAll('[class*="error"], [role="alert"]')).filter(function (e) { return e.offsetParent !== null || e.getClientRects().length; })
      .map(function (e) { return e.textContent.trim(); }).filter(Boolean);
  }
  // Squarespace sender skjemaet med POST til /api/form/SaveFormSubmission. Vi lytter på svaret (sikrest),
  // og ser i tillegg etter takkemeldingen i skjemaet (reserve hvis nettverkskoden endres).
  var NET = { status: 0, t: 0 };
  function watchNet() {
    if (window.__ftqNet) return; window.__ftqNet = 1;
    var hit = function (u) { return /\/api\/form\/SaveFormSubmission/i.test(String(u || '')); };
    var XO = XMLHttpRequest.prototype.open, XS = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (meth, url) { this.__ftqUrl = url; return XO.apply(this, arguments); };
    XMLHttpRequest.prototype.send = function () {
      var x = this;
      if (hit(x.__ftqUrl)) x.addEventListener('loadend', function () { NET.status = x.status || -1; NET.t = Date.now(); });
      return XS.apply(this, arguments);
    };
    if (window.fetch) {
      var F = window.fetch;
      window.fetch = function (input) {
        var u = typeof input === 'string' ? input : (input && input.url);
        var p = F.apply(this, arguments);
        if (hit(u)) p.then(function (r) { NET.status = r.status; NET.t = Date.now(); }, function () { NET.status = -1; NET.t = Date.now(); });
        return p;
      };
    }
  }
  function visible(e) { var cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && !e.classList.contains('hidden'); }
  function sqSucceeded(m) {
    if (NET.status >= 200 && NET.status < 300) return true;
    if (!document.body.contains(m.form) || !m.block.querySelector('form')) return true;
    return [].slice.call(m.block.querySelectorAll('.form-submission-text, .form-submission-html, [class*="submission-text"], [class*="submission-html"]'))
      .some(function (s) { return s.textContent.trim() && visible(s); });
  }
  function sqNetError() { return NET.status >= 400 || NET.status === -1; }
  function revealSq(m, root, msg) {
    m.block.classList.remove('ftf-sqhide');
    root.querySelector('.ftf-alert').innerHTML = esc(msg) + ' Skjemaet under er fylt ut med det du skrev. Kontroller og trykk «' + esc(((m.btn && (m.btn.querySelector('.form-submit-button-label') || m.btn).textContent) || 'Send').trim()) + '».';
    root.querySelector('.ftf-grid').style.display = 'none'; root.querySelector('.ftf-foot').style.display = 'none';
    m.block.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  var formStarted = false;
  function initOwnForm() {
    if (formStarted || !onTilbudSide()) return;
    var tries = 0, iv = setInterval(function () {
      var m = sqMap();
      if (!m && ++tries < 60) return;                       // Squarespace tegner skjemaet etter sideinnlasting
      clearInterval(iv);
      if (!m || !m.ok) {                                     // Fant ikke feltene: behold Squarespace-skjemaet (fungerer som før)
        if (window.console) console.warn('Tilbudsliste: fant ikke feltene i Squarespace-skjemaet – viser det vanlige skjemaet.', m);
        document.documentElement.setAttribute('data-ftf', 'reserve');
        return;
      }
      formStarted = true; watchNet();
      document.documentElement.setAttribute('data-ftf', 'aktiv');
      var s = document.createElement('style'); s.id = 'ftf-css'; s.textContent = FCSS; document.head.appendChild(s);
      var host = m.block.closest('.fe-block') || m.block.parentNode, wrap = document.createElement('div');
      wrap.id = 'ftf-host'; wrap.innerHTML = formHtml();
      host.insertBefore(wrap, host.firstChild);
      m.block.classList.add('ftf-sqhide'); m.block.setAttribute('aria-hidden', 'true');
      var root = wrap.querySelector('.ftf'), st = { org: '' };
      wireBrreg(root, st); wirePost(root);
      root.querySelector('#ftf-komm-i').hidden = !count();
      window.addEventListener('fttilbud:endret', function () { var i = root.querySelector('#ftf-komm-i'); if (i) i.hidden = !count(); });
      ['navn', 'epost', 'tlf', 'komm'].forEach(function (f) { var el = root.querySelector('[data-f="' + f + '"] input, [data-f="' + f + '"] textarea'); el.addEventListener('input', function () { if (el.closest('.bad')) errSet(root, f, ''); }); });
      root.addEventListener('submit', function (e) {
        e.preventDefault();
        if (root.querySelector('#ftf-hp').value) return;      // fanget av spamfellen
        if (!validate(root)) return;
        var btn = root.querySelector('.ftf-send'), al = root.querySelector('.ftf-alert');
        al.textContent = ''; btn.disabled = true; btn.querySelector('.ftf-sendt').textContent = 'Sender …';
        var mm = sqMap(); if (!mm || !mm.ok) { revealSq(m, root, 'Noe gikk galt med skjemaet.'); return; }
        try { fillSq(mm, root, st); } catch (err) { revealSq(mm, root, 'Noe gikk galt med skjemaet.'); return; }
        var t0 = Date.now(); NET.status = 0;
        setTimeout(function () { mm.btn.click(); }, 150);
        var iv2 = setInterval(function () {
          if (sqSucceeded(mm)) {
            clearInterval(iv2); clear();
            wrap.innerHTML = successHtml();
            var card = wrap.querySelector('.ftk'); card.scrollIntoView({ behavior: 'smooth', block: 'center' }); card.focus({ preventScroll: true });
            return;
          }
          var errs = Date.now() - t0 > 1200 ? sqErrors(mm) : [];
          if (errs.length) { clearInterval(iv2); revealSq(mm, root, 'Skjemaet ble ikke sendt: ' + errs[0] + '.'); return; }
          if (Date.now() - t0 > 30000) { clearInterval(iv2); revealSq(mm, root, 'Vi fikk ikke bekreftet at forespørselen ble sendt.'); }
        }, 300);
      });
    }, 250);
  }

  /* ---------- felles ---------- */
  function changed() {
    renderFab(); if (panel && !panel.hidden) renderPanel();
    if (document.getElementById('ft-tilbud')) { renderPage(); fillForm(); }
    try { window.dispatchEvent(new CustomEvent('fttilbud:endret', { detail: { antall: count() } })); } catch (e) {}
  }
  window.addEventListener('storage', function (e) { if (e.key === KEY) changed(); });
  // Knapper med data-ft-tilbud på katalogsidene
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-ft-tilbud]');
    if (!b) return;
    e.preventDefault();
    var d = b.dataset, raw = d.ftTilbud;
    var it = raw && raw.charAt(0) === '{' ? JSON.parse(raw) : { lev: d.lev, navn: d.navn, nr: d.nr, variant: d.variant, emb: d.emb, varenr: d.varenr, antall: d.antall, url: d.url };
    add(it);
  });

  window.FTTilbud = { versjon: FORM_VERSION, skjema: function () { var m = sqMap(); return { funnet: !!m, ok: !!(m && m.ok), felt: m ? Object.keys(m).filter(function (k) { return m[k] && k !== 'block' && k !== 'form' && k !== 'ok'; }) : [] }; }, add: add, remove: remove, setAntall: setQty, items: items, count: count, clear: clear, open: open, close: close, text: text, side: SIDE };

  function start() {
    injectCss(); buildUi(); renderFab(); initPage();
    try { window.dispatchEvent(new CustomEvent('fttilbud:klar')); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
