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
  function load() { try { var a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return mem; } }
  var mem = [];
  function save(a) { mem = a; try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} changed(); }
  function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, 200); }
  function keyOf(x) { return [x.lev, x.nr || x.navn, x.variant, x.emb].map(clean).join('|').toLowerCase(); }
  function items() { return load(); }
  function count() { return load().length; }
  function add(it, opt) {
    it = it || {};
    var x = { lev: clean(it.lev), navn: clean(it.navn), nr: clean(it.nr), variant: clean(it.variant), emb: clean(it.emb), varenr: clean(it.varenr),
      antall: Math.max(1, Math.min(9999, parseInt(it.antall, 10) || 1)), url: clean(it.url || (location.pathname + location.hash)) };
    if (!x.navn && !x.nr) return false;
    x.key = keyOf(x);
    var a = load(), o = a.filter(function (y) { return y.key === x.key; })[0];
    if (o) o.antall = Math.min(9999, o.antall + x.antall); else a.push(x);
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
      '<p>Du fyller inn kontaktopplysninger på neste side. Vi svarer normalt innen én arbeidsdag.</p><button type="button" class="ftq-clear">Tøm lista</button></div>';
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
        if (box) box.innerHTML = '<div class="ftq-sent"><b>Takk! Forespørselen er sendt.</b><br>Vi tar kontakt så snart vi kan, normalt innen én arbeidsdag. Tilbudslisten er tømt.</div>';
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
      ? listHtml(a) + '<div class="ftq-sum"><span>' + a.length + (a.length === 1 ? ' produkt' : ' produkter') + ' i lista. Lista legges automatisk inn i skjemaet under.</span><button type="button" class="ftq-clear">Tøm lista</button></div>'
      : '<p class="ftq-empty">Tilbudslisten er tom. Finn produktene i <a href="/produkter">produktkatalogen</a> og trykk «Legg i tilbudslisten», eller skriv hva du trenger i skjemaet under.</p>';
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

  window.FTTilbud = { add: add, remove: remove, setAntall: setQty, items: items, count: count, clear: clear, open: open, close: close, text: text, side: SIDE };

  function start() {
    injectCss(); buildUi(); renderFab(); initPage();
    try { window.dispatchEvent(new CustomEvent('fttilbud:klar')); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
