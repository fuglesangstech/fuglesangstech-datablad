/*
  Stoffkartotek-pakke for fuglesangstech.no/datablad
  Lastes fra kodeblokken på /datablad:
    <script src="https://fuglesangstech.github.io/fuglesangstech-datablad/nett/stoffkartotek.js" defer></script>

  Kunden krysser av produktene sine (enkeltvis, Shift+klikk for flere, «Velg alle treff»,
  «Lim inn liste» med varenumre/produktnavn, eller «Hent fra tilbudslisten»), og laster ned én ZIP med
  sikkerhetsdatabladene (og ev. produktdatabladene) i én mappe per leverandør, pluss innholdsfortegnelse
  som PDF og CSV. Alt skjer i nettleseren: filene hentes fra dette repoet (GitHub Pages).
  Valget lagres i nettleseren (localStorage «ft-stoffkartotek-v1»), så listen kan oppdateres senere.

  Datablad-siden gir oss dataene via window.ftDatablad og hendelsen «ftdb:render».
*/
(function () {
  'use strict';
  if (window.__ftSK) return; window.__ftSK = 1;
  var VERSJON = '2026-11-12d';
  var GH = 'https://fuglesangstech.github.io/fuglesangstech-datablad/';
  var KEY = 'ft-stoffkartotek-v1', TKEY = 'ft-tilbudsliste-v1', NAVY = '#052b69';
  var JSZIP = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  var PDFLIB = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';

  /* ---------- hjelpere ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s || '').toLowerCase().replace(/[®™]/g, '').replace(/[‐–—−]/g, '-').replace(/\s+/g, ' ').trim(); }
  function flat(s) { return norm(s).replace(/[^a-z0-9æøå³]/g, ''); }
  function url(p) { return /^https?:/.test(p) ? p : GH + p.split('/').map(encodeURIComponent).join('/'); }
  function key(r) { return r.lev + '|' + r.name; }
  function lsGet(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function idag() { return new Date().toISOString().slice(0, 10); }
  function datoNo(iso) { var d = String(iso || '').split('-'); return d.length === 3 ? d[2] + '.' + d[1] + '.' + d[0] : iso; }
  function filnavn(s) { return String(s).replace(/[\\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 120); }
  function script(src) {
    var ready = function () { return /jszip/.test(src) ? window.JSZip : window.PDFLib; };
    if (ready()) return Promise.resolve();
    return new Promise(function (ok, fail) {
      var s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = function () { ready() ? ok() : fail(new Error('kunne ikke laste ' + src)); };
      s.onerror = function () { s.remove(); fail(new Error('kunne ikke laste ' + src)); };
      document.head.appendChild(s);
    });
  }
  var ICON = {
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7l8-4 8 4v10l-8 4-8-4z"/><path d="M4 7l8 4 8-4M12 11v10"/></svg>',
    dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    paste: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M9 10h6M9 14h6M9 18h3"/></svg>',
    all: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12.5l3 3 5-6"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  /* ---------- stil ---------- */
  var CSS = [
    '#ftsk-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;background:#eef3fb;border:1px solid #d6e0ef;border-radius:12px;padding:14px 16px;margin:4px 0 16px}',
    '#ftsk-bar .ftsk-intro{display:flex;gap:12px;align-items:center;flex:1 1 300px;min-width:0}',
    '#ftsk-bar .ftsk-intro svg{width:26px;height:26px;flex:0 0 26px;color:' + NAVY + '}',
    '#ftsk-bar .ftsk-intro b{display:block;color:' + NAVY + ';font-size:16px}',
    '#ftsk-bar .ftsk-intro span{display:block;font-size:14px;color:#4a5568;line-height:1.4}',
    '#ftsk-bar .ftsk-acts{display:flex;flex-wrap:wrap;gap:8px}',
    '.ftsk-b{font:inherit;font-size:14px;font-weight:600;display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border-radius:8px;border:1px solid #c9d5e8;background:#fff;color:' + NAVY + ';cursor:pointer;line-height:1.2;text-decoration:none}',
    '.ftsk-b:hover{border-color:' + NAVY + '}.ftsk-b:disabled{opacity:.5;cursor:default}',
    '.ftsk-b[hidden]{display:none!important}',
    '#ftsk-bar,.ftsk-dock,.ftsk-b{font-family:"Barlow",system-ui,sans-serif}',
    '.ftsk-b svg{width:17px;height:17px;flex:0 0 17px}',
    '.ftsk-b.p{background:' + NAVY + ';border-color:' + NAVY + ';color:#fff}.ftsk-b.p:hover{background:#0a3a8a}',
    '.ftsk-b.w{background:#fff;color:' + NAVY + ';border-color:#fff}',
    /* avkrysning i tabellen */
    '#ftx td.c-no.ftsk-td{position:relative;padding-left:44px!important}',
    '.ftsk-cb{position:absolute;left:8px;top:50%;transform:translateY(-50%);width:28px;height:28px;display:grid;place-items:center;cursor:pointer;margin:0}',
    '#ftx tr:not(.grp) td.c-no.ftsk-td .ftsk-cb{top:14px;transform:none}',
    '.ftsk-cb input{position:absolute;opacity:0;width:1px;height:1px}',
    '.ftsk-cb i{width:20px;height:20px;border-radius:5px;border:2px solid #9fb0c8;background:#fff;display:grid;place-items:center;transition:background .12s,border-color .12s}',
    '.ftsk-cb:hover i{border-color:' + NAVY + '}',
    '.ftsk-cb input:checked+i{background:' + NAVY + ';border-color:' + NAVY + '}',
    '.ftsk-cb input:checked+i::after{content:"";width:10px;height:5px;border:2.5px solid #fff;border-top:0;border-right:0;transform:translateY(-2px) rotate(-45deg)}',
    '.ftsk-cb input:focus-visible+i{box-shadow:0 0 0 3px rgba(5,43,105,.3)}',
    '#ftx tr.ftsk-on td{background:#f3f7fd}',
    /* dokk nederst */
    '.ftsk-dock{position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom,0px));transform:translate(-50%,140%);z-index:9989;display:flex;align-items:center;gap:14px;background:' + NAVY + ';color:#fff;border-radius:14px;padding:10px 10px 10px 18px;box-shadow:0 10px 30px rgba(5,43,105,.35);transition:transform .25s ease;max-width:calc(100vw - 32px);font-family:inherit}',
    '.ftsk-dock.on{transform:translate(-50%,0)}',
    '.ftsk-dock .t{font-size:15px;line-height:1.3;white-space:nowrap}.ftsk-dock .t b{font-size:16px}.ftsk-dock .t small{display:block;opacity:.8;font-size:13px}',
    '.ftsk-dock .ftsk-b{border-color:rgba(255,255,255,.35);background:transparent;color:#fff}.ftsk-dock .ftsk-b:hover{border-color:#fff}',
    '.ftsk-dock .ftsk-b.w{background:#fff;color:' + NAVY + ';border-color:#fff}',
    '@media (max-width:600px){.ftsk-dock{left:16px;right:84px;transform:translateY(140%);max-width:none;padding:8px 8px 8px 14px;gap:8px}.ftsk-dock.on{transform:none}.ftsk-dock .t small{display:none}.ftsk-dock .ftsk-b.vis{display:none}#ftx td.c-no.ftsk-td{padding-left:40px!important}}',
    /* dialoger */
    '.ftsk-bg{position:fixed;inset:0;background:rgba(10,20,40,.45);z-index:100001;opacity:0;transition:opacity .2s}.ftsk-bg.on{opacity:1}',
    '.ftsk-dlg{position:fixed;z-index:100002;top:50%;left:50%;transform:translate(-50%,-48%);opacity:0;transition:opacity .2s,transform .2s;width:min(640px,calc(100vw - 24px));max-height:calc(100vh - 40px);display:flex;flex-direction:column;background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.3);font-family:"Barlow",system-ui,sans-serif;color:#1a2332}',
    '.ftsk-dlg.on{opacity:1;transform:translate(-50%,-50%)}',
    '.ftsk-dlg header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 22px;border-bottom:1px solid #e3e8f0}',
    '.ftsk-dlg h2{margin:0;font-family:"Barlow Semi Condensed","Barlow",sans-serif;font-size:22px;font-weight:700;color:' + NAVY + ';line-height:1.2}',
    '.ftsk-x{border:0;background:none;cursor:pointer;color:#4a5568;padding:6px;border-radius:8px;display:grid}.ftsk-x:hover{background:#eef3fb;color:' + NAVY + '}.ftsk-x svg{width:20px;height:20px}',
    '.ftsk-body{padding:18px 22px;overflow:auto;flex:1 1 auto}',
    '.ftsk-foot{padding:14px 22px;border-top:1px solid #e3e8f0;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:flex-end}',
    '.ftsk-foot .sp{flex:1}',
    '.ftsk-dlg p.lead{margin:0 0 12px;font-size:15px;color:#4a5568;line-height:1.5}',
    '.ftsk-dlg textarea{width:100%;box-sizing:border-box;min-height:180px;font:inherit;font-size:15px;padding:12px 14px;border:1px solid #c9d5e8;border-radius:10px;resize:vertical}',
    '.ftsk-dlg textarea:focus,.ftsk-dlg input[type=text]:focus{outline:none;border-color:' + NAVY + ';box-shadow:0 0 0 3px rgba(5,43,105,.15)}',
    '.ftsk-grp{margin:0 0 14px}.ftsk-grp h3{margin:0 0 6px;font-size:13px;letter-spacing:.05em;text-transform:uppercase;color:#4a5568}',
    '.ftsk-it{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #eef1f5;font-size:15px}',
    '.ftsk-it .n{flex:1;min-width:0}.ftsk-it .n small{display:block;color:#6b7686;font-size:13px}',
    '.ftsk-it .rm{border:0;background:none;color:#6b7686;cursor:pointer;padding:4px;border-radius:6px;display:grid}.ftsk-it .rm:hover{color:#b42318;background:#fdecea}.ftsk-it .rm svg{width:16px;height:16px}',
    '.ftsk-opt{display:flex;flex-direction:column;gap:10px;background:#f5f8fc;border-radius:10px;padding:14px 16px;margin-top:6px}',
    '.ftsk-opt label{display:flex;gap:10px;align-items:flex-start;font-size:15px;cursor:pointer}.ftsk-opt label small{display:block;color:#6b7686;font-size:13px}',
    '.ftsk-opt input[type=checkbox]{width:18px;height:18px;accent-color:' + NAVY + ';margin-top:2px;flex:0 0 18px}',
    '.ftsk-opt input[type=text]{font:inherit;font-size:15px;padding:9px 12px;border:1px solid #c9d5e8;border-radius:8px;width:100%;box-sizing:border-box;margin-top:4px}',
    '.ftsk-res{margin-top:14px;font-size:15px}.ftsk-res h3{font-size:15px;margin:12px 0 6px;color:' + NAVY + '}',
    '.ftsk-res ul{margin:0;padding:0;list-style:none}.ftsk-res li{padding:5px 0;border-bottom:1px solid #eef1f5}',
    '.ftsk-res li small{color:#6b7686}.ftsk-res .miss{color:#b42318}',
    '.ftsk-res .alt{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.ftsk-res .alt button{font:inherit;font-size:13px;padding:4px 10px;border-radius:999px;border:1px solid #c9d5e8;background:#fff;color:' + NAVY + ';cursor:pointer}.ftsk-res .alt button:hover{border-color:' + NAVY + '}.ftsk-res .alt button.ok{background:' + NAVY + ';color:#fff;border-color:' + NAVY + '}',
    '.ftsk-prog{height:8px;border-radius:99px;background:#e3e8f0;overflow:hidden;margin:6px 0 8px}.ftsk-prog i{display:block;height:100%;width:0;background:' + NAVY + ';transition:width .2s}',
    '.ftsk-msg{font-size:14px;color:#4a5568}.ftsk-msg.err{color:#b42318}',
    '.ftsk-empty{color:#6b7686;font-size:15px;padding:12px 0}',
    '@media (prefers-reduced-motion:reduce){.ftsk-dock,.ftsk-dlg,.ftsk-bg{transition:none}}'
  ].join('\n');

  /* ---------- tilstand ---------- */
  var DB = null, R = [], BYKEY = {}, sel = lsGet(KEY, { valgt: [], pds: false, toc: true, firma: '' });
  if (!sel || !Array.isArray(sel.valgt)) sel = { valgt: [], pds: false, toc: true, firma: '' };
  var VALGT = {}; sel.valgt.forEach(function (k) { VALGT[k] = 1; });
  function save() { sel.valgt = Object.keys(VALGT); lsSet(KEY, sel); }
  function valgte() { return R.filter(function (r) { return VALGT[key(r)]; }); }
  function antDocs(list, medPds) { return list.reduce(function (n, r) { return n + r.sds.length + (medPds ? r.pds.length : 0); }, 0); }

  /* ---------- varenummer-indeks (lastes ved behov) ---------- */
  var VNR = null;
  function vnrIndex() {
    if (VNR) return Promise.resolve(VNR);
    var idx = {};
    function add(nr, lev, navn) {
      nr = flat(nr); if (!nr || nr.length < 3) return;
      var r = BYKEY[lev + '|' + navn]; if (!r) return;
      (idx[nr] = idx[nr] || []).indexOf(r) < 0 && idx[nr].push(r);
    }
    function get(p) { return fetch(GH + p, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
    return Promise.all([get('utb/produkter.json'), get('perma/produkter.json'), get('vickers/produkter.json')]).then(function (a) {
      var utb = a[0], perma = a[1], vik = a[2];
      (utb && utb.produkter || []).forEach(function (p) { (p.emballasje || []).forEach(function (e) { add(e.varenr, 'UTB', p.navn); }); });
      (vik && vik.produkter || []).forEach(function (p) { (p.emballasje || []).forEach(function (e) { add(Array.isArray(e) ? e[1] : e.varenr, 'Vickers Oils', p.navn); }); });
      // Perma: varenummeret er en kombinasjon av smøresystem og smøremiddel (SF01 osv.) – begge databladene tas med
      var smor = {}; R.forEach(function (r) { if (r.lev === 'Perma-Tec') { var m = /\((S[FO]\d\d)\)\s*$/.exec(r.name); if (m) smor[m[1]] = r; } });
      (perma && perma.produkter || []).forEach(function (p) {
        var m = p.matrise; if (!m) return;
        (m.rader || []).forEach(function (row) {
          (row[1] || []).forEach(function (nr) {
            if (!nr) return;
            add(nr, 'Perma-Tec', p.navn);
            if (smor[row[0]]) { var k = flat(nr); (idx[k] = idx[k] || []).indexOf(smor[row[0]]) < 0 && idx[k].push(smor[row[0]]); }
          });
        });
      });
      R.forEach(function (r) { if (r.nr) r.nr.split(' / ').forEach(function (n) { var k = flat(n); if (k.length >= 2) (idx['#' + k] = idx['#' + k] || []).push(r); }); });
      VNR = idx; return idx;
    });
  }

  /* ---------- finn produkter fra en tekstlinje ---------- */
  function finn(linje) {
    var q = norm(linje).replace(/^(?:[-•*]\s*|\d{1,3}[.)]\s+)/, '');
    var f = flat(q);
    if (!f) return { treff: [] };
    var v = VNR[f] || VNR[flat(linje)];
    if (v) return { treff: v, hvordan: 'varenummer' };
    if (VNR['#' + f]) return { treff: VNR['#' + f], hvordan: 'produktnummer' };
    var eksakt = R.filter(function (r) { return flat(r.name) === f; });
    if (eksakt.length) return { treff: eksakt };
    var ord = q.split(/\s+/).filter(Boolean);
    // «5w30» skal finne «5W-30», men «synlub» skal ikke finne «Ultra-Syn Lubricant»
    var hit = R.filter(function (r) { return ord.every(function (w) { return r.hay.indexOf(w) > -1 || (/\d/.test(w) && r.hayFlat.indexOf(flat(w)) > -1); }); });
    if (hit.length === 1) return { treff: hit };
    if (hit.length > 1) {
      var start = hit.filter(function (r) { return flat(r.name).indexOf(f) === 0; });
      if (start.length === 1) return { treff: start };
      return { flere: hit.slice(0, 8), antall: hit.length };
    }
    return { treff: [] };
  }

  /* ---------- tabellen ---------- */
  var lastClick = -1;
  function decorate() {
    var rows = [].slice.call(document.querySelectorAll('#ftx-tbody tr[data-i]'));
    rows.forEach(function (tr, pos) {
      var td = tr.querySelector('td.c-no'); if (!td) return;
      var r = R[+tr.getAttribute('data-i')]; if (!r) return;
      if (!r.sds.length && !r.pds.length) return;   // rene dokumenter (brosjyrer, kataloger osv.) hører ikke hjemme i stoffkartoteket
      var on = !!VALGT[key(r)];
      var cb = td.querySelector('.ftsk-cb input');
      if (!cb) {
        td.classList.add('ftsk-td');
        var l = document.createElement('label'); l.className = 'ftsk-cb'; l.title = 'Ta med i stoffkartoteket';
        l.innerHTML = '<input type="checkbox" aria-label="Ta med ' + esc(r.name) + ' (' + esc(r.lev) + ') i stoffkartoteket"><i></i>';
        td.insertBefore(l, td.firstChild);
        cb = l.querySelector('input');
        cb.addEventListener('click', function (e) {
          var all = [].slice.call(document.querySelectorAll('#ftx-tbody tr[data-i]')), me = all.indexOf(tr), want = cb.checked;
          if (e.shiftKey && lastClick > -1 && lastClick !== me) {
            var a = Math.min(lastClick, me), b = Math.max(lastClick, me);
            for (var i = a; i <= b; i++) { var rr = R[+all[i].getAttribute('data-i')]; if (rr) { if (want) VALGT[key(rr)] = 1; else delete VALGT[key(rr)]; } }
          } else { if (want) VALGT[key(r)] = 1; else delete VALGT[key(r)]; }
          lastClick = me; save(); refresh();
        });
      }
      if (!r.sds.length && !r.pds.length) cb.disabled = true;
      cb.checked = on; tr.classList.toggle('ftsk-on', on);
    });
  }

  /* ---------- verktøylinje over tabellen ---------- */
  var bar, dock;
  function tilbudAntall() { var t = lsGet(TKEY, []); return Array.isArray(t) ? t.length : 0; }
  function buildBar() {
    bar = document.createElement('div'); bar.id = 'ftsk-bar'; bar.setAttribute('data-anker', 'stoffkartotek');
    bar.innerHTML = '<div class="ftsk-intro">' + ICON.box + '<div><b>Lag stoffkartotek</b><span>Kryss av produktene dere bruker, og last ned alle databladene samlet i én ZIP-fil.</span></div></div>' +
      '<div class="ftsk-acts"><button type="button" class="ftsk-b" data-a="alle">' + ICON.all + '<span>Velg alle treff</span></button>' +
      '<button type="button" class="ftsk-b" data-a="lim">' + ICON.paste + '<span>Lim inn liste</span></button>' +
      '<button type="button" class="ftsk-b" data-a="tilbud" hidden>' + ICON.list + '<span>Hent fra tilbudslisten</span></button></div>';
    var cnt = document.getElementById('ftx-count');
    cnt.parentNode.insertBefore(bar, cnt);
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      var a = b.getAttribute('data-a');
      if (a === 'alle') velgAlle();
      else if (a === 'lim') limInn();
      else if (a === 'tilbud') fraTilbud();
    });
    dock = document.createElement('div'); dock.className = 'ftsk-dock'; dock.setAttribute('role', 'region'); dock.setAttribute('aria-label', 'Stoffkartotek');
    dock.innerHTML = '<div class="t"></div><button type="button" class="ftsk-b vis">' + ICON.list + '<span>Se listen</span></button><button type="button" class="ftsk-b w last">' + ICON.dl + '<span>Last ned</span></button>';
    document.body.appendChild(dock);
    dock.querySelector('.vis').addEventListener('click', visListe);
    dock.querySelector('.last').addEventListener('click', visListe);
  }
  function refresh() {
    decorate();
    var treff = DB.treff().filter(function (r) { return r.sds.length || r.pds.length; });
    var alleValgt = treff.length && treff.every(function (r) { return VALGT[key(r)]; });
    var ba = bar.querySelector('[data-a="alle"]');
    ba.querySelector('span').textContent = alleValgt ? 'Fjern alle ' + treff.length + ' treff' : 'Velg alle ' + treff.length + ' treff';
    ba.setAttribute('data-av', alleValgt ? '1' : '');
    ba.disabled = !treff.length;
    var tb = bar.querySelector('[data-a="tilbud"]'), nt = tilbudsliste().length;
    tb.hidden = !nt; tb.querySelector('span').textContent = 'Hent fra tilbudslisten (' + nt + ')';
    var v = valgte(), n = v.length;
    dock.classList.toggle('on', n > 0);
    dock.querySelector('.t').innerHTML = '<b>' + n + '</b> ' + (n === 1 ? 'produkt' : 'produkter') + ' valgt<small>' + antDocs(v, false) + ' sikkerhetsdatablad' + (sel.pds ? ' + ' + v.reduce(function (s, r) { return s + r.pds.length; }, 0) + ' PDS' : '') + '</small>';
  }
  function velgAlle() {
    var treff = DB.treff().filter(function (r) { return r.sds.length || r.pds.length; });
    var av = bar.querySelector('[data-a="alle"]').getAttribute('data-av');
    treff.forEach(function (r) { if (av) delete VALGT[key(r)]; else VALGT[key(r)] = 1; });
    save(); refresh();
    if (!av) toast(treff.length + ' produkter lagt til i stoffkartoteket');
  }

  /* ---------- dialoger ---------- */
  var openDlg = null;
  function dialog(title, body, foot) {
    lukk();
    var bg = document.createElement('div'); bg.className = 'ftsk-bg';
    var d = document.createElement('div'); d.className = 'ftsk-dlg'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', title);
    d.innerHTML = '<header><h2>' + esc(title) + '</h2><button type="button" class="ftsk-x" aria-label="Lukk">' + ICON.x + '</button></header><div class="ftsk-body">' + body + '</div>' + (foot ? '<div class="ftsk-foot">' + foot + '</div>' : '');
    document.body.appendChild(bg); document.body.appendChild(d);
    requestAnimationFrame(function () { bg.classList.add('on'); d.classList.add('on'); });
    bg.addEventListener('click', lukk); d.querySelector('.ftsk-x').addEventListener('click', lukk);
    openDlg = { bg: bg, d: d, prev: document.activeElement };
    setTimeout(function () { var f = d.querySelector('textarea, input[type=text], .ftsk-b.p, button'); if (f) f.focus(); }, 60);
    return d;
  }
  function lukk() {
    if (!openDlg) return;
    var o = openDlg; openDlg = null;
    o.bg.remove(); o.d.remove();
    if (o.prev && o.prev.focus) try { o.prev.focus({ preventScroll: true }); } catch (e) {}
  }
  document.addEventListener('keydown', function (e) {
    if (!openDlg) return;
    if (e.key === 'Escape') { if (!openDlg.d.__busy) lukk(); return; }
    if (e.key === 'Tab') {   // hold fokus i dialogen
      var f = [].slice.call(openDlg.d.querySelectorAll('button, input, textarea, a[href]')).filter(function (x) { return !x.disabled && x.offsetParent; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  var toastEl, toastT;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.setAttribute('role', 'status'); toastEl.style.cssText = 'position:fixed;left:50%;top:90px;transform:translateX(-50%);z-index:100003;background:#1a2332;color:#fff;padding:10px 16px;border-radius:10px;font:500 15px "Barlow",system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.25);transition:opacity .2s;max-width:calc(100vw - 32px)'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.style.opacity = '1';
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.style.opacity = '0'; }, 2600);
  }

  /* ---------- lim inn liste ---------- */
  function limInn() {
    var d = dialog('Lim inn produktliste',
      '<p class="lead">Lim inn varenumre eller produktnavn – ett per linje. Du kan kopiere en kolonne rett fra Excel eller innkjøpssystemet.</p>' +
      '<textarea id="ftsk-txt" placeholder="785 FG&#10;Monolec 6401&#10;310521&#10;Ecosure EAF 46&#10;113919"></textarea><div class="ftsk-res" id="ftsk-res"></div>',
      '<span class="sp ftsk-msg" id="ftsk-m"></span><button type="button" class="ftsk-b" data-c="1">Lukk</button><button type="button" class="ftsk-b p" id="ftsk-go">Finn produktene</button>');
    d.querySelector('[data-c]').addEventListener('click', lukk);
    var res = d.querySelector('#ftsk-res'), go = d.querySelector('#ftsk-go'), m = d.querySelector('#ftsk-m');
    go.addEventListener('click', function () {
      var lines = d.querySelector('#ftsk-txt').value.split(/[\r\n;\t]+/).map(function (s) { return s.trim(); }).filter(Boolean);
      if (!lines.length) { m.textContent = 'Lim inn minst én linje.'; return; }
      go.disabled = true; m.textContent = 'Søker …';
      vnrIndex().then(function () {
        var ok = [], flere = [], ingen = [], seen = {};
        lines.forEach(function (l) {
          if (seen[l.toLowerCase()]) return; seen[l.toLowerCase()] = 1;
          var f = finn(l);
          if (f.treff && f.treff.length) { f.treff.forEach(function (r) { VALGT[key(r)] = 1; }); ok.push({ l: l, r: f.treff, h: f.hvordan }); }
          else if (f.flere) flere.push({ l: l, r: f.flere, n: f.antall });
          else ingen.push(l);
        });
        save(); refresh();
        var h = '';
        if (ok.length) h += '<h3>Lagt til (' + ok.length + ')</h3><ul>' + ok.map(function (o) { return '<li><b>' + esc(o.l) + '</b> → ' + o.r.map(function (r) { return esc(r.name) + ' <small>(' + esc(r.lev) + ')</small>'; }).join(', ') + '</li>'; }).join('') + '</ul>';
        if (flere.length) h += '<h3>Flere mulige – velg riktig (' + flere.length + ')</h3><ul>' + flere.map(function (o, i) { return '<li><b>' + esc(o.l) + '</b>' + (o.n > o.r.length ? ' <small>(' + o.n + ' treff, viser ' + o.r.length + ')</small>' : '') + '<div class="alt">' + o.r.map(function (r, j) { return '<button type="button" data-f="' + i + '" data-j="' + j + '"' + (VALGT[key(r)] ? ' class="ok"' : '') + '>' + esc(r.name) + ' · ' + esc(r.lev) + '</button>'; }).join('') + '</div></li>'; }).join('') + '</ul>';
        if (ingen.length) h += '<h3 class="miss">Fant ikke (' + ingen.length + ')</h3><ul>' + ingen.map(function (l) { return '<li class="miss">' + esc(l) + '</li>'; }).join('') + '</ul><p class="ftsk-msg">Prøv produktnavnet i stedet, eller <a href="/kontakt-oss">spør oss</a> om databladet.</p>';
        res.innerHTML = h;
        res.onclick = function (e) {
          var b = e.target.closest('button[data-f]'); if (!b) return;
          var r = flere[+b.getAttribute('data-f')].r[+b.getAttribute('data-j')], k = key(r);
          if (VALGT[k]) delete VALGT[k]; else VALGT[k] = 1;
          b.classList.toggle('ok', !!VALGT[k]); save(); refresh();
        };
        m.textContent = ok.length ? 'Ferdig – ' + valgte().length + ' produkter i stoffkartoteket.' : '';
        go.disabled = false; go.textContent = 'Søk på nytt';
        var lb = d.querySelector('[data-c]'); lb.textContent = 'Se listen'; lb.className = 'ftsk-b p'; go.className = 'ftsk-b';
        lb.onclick = function () { setTimeout(visListe, 0); };
      });
    });
  }

  /* ---------- hent fra tilbudslisten ---------- */
  function tilbudsliste() {
    var t = lsGet(TKEY, []);
    if (Array.isArray(t) && t.length) return t;
    // etter innsending er tilbudslisten tømt – Footer-koden har tatt vare på en kopi i økten
    try { t = JSON.parse(sessionStorage.getItem('ft-sk-tilbud-kopi') || '[]'); } catch (e) { t = []; }
    return Array.isArray(t) ? t : [];
  }
  function fraTilbud() {
    var t = tilbudsliste(); if (!t.length) return Promise.resolve(0);
    return vnrIndex().then(function () {
      var lagt = 0, ikke = [];
      t.forEach(function (it) {
        var levR = R.filter(function (r) { return r.lev === it.lev; });
        var hits = [];
        if (it.varenr && VNR[flat(it.varenr)]) hits = VNR[flat(it.varenr)];
        if (!hits.length && it.nr) hits = levR.filter(function (r) { return r.nr && r.nr.split(' / ').some(function (n) { return flat(n) === flat(it.nr); }); });
        if (!hits.length) {
          var q = norm((it.navn || '') + ' ' + (it.variant || '')), f = flat(q);
          hits = levR.filter(function (r) { return flat(r.name) === f; });
          if (!hits.length) {
            var ord = q.split(/\s+/).filter(function (w) { return w.length > 1; });
            hits = levR.filter(function (r) { return ord.every(function (w) { return r.hay.indexOf(w) > -1; }); });
            if (hits.length > 8) hits = [];
          }
        }
        if (hits.length) hits.forEach(function (r) { if (!VALGT[key(r)]) { VALGT[key(r)] = 1; lagt++; } });
        else ikke.push(it.navn);
      });
      save(); refresh();
      toast(lagt + ' produkter hentet fra tilbudslisten' + (ikke.length ? ' – fant ikke datablad for ' + ikke.length : ''));
      return lagt;
    });
  }

  /* ---------- listen og nedlasting ---------- */
  function visListe() {
    var v = valgte();
    var levs = []; v.forEach(function (r) { if (levs.indexOf(r.lev) < 0) levs.push(r.lev); });
    var body = v.length ? levs.map(function (l) {
      return '<div class="ftsk-grp"><h3>' + esc(l) + '</h3>' + v.filter(function (r) { return r.lev === l; }).map(function (r) {
        var sds = r.sds.length ? r.sds.map(function (d) { return d[1]; }).join(', ') : 'ingen';
        return '<div class="ftsk-it"><div class="n">' + esc(r.name) + '<small>SDS: ' + esc(sds) + (r.pds.length ? ' · PDS: ' + r.pds.length : '') + '</small></div><button type="button" class="rm" data-k="' + esc(key(r)) + '" aria-label="Fjern ' + esc(r.name) + '">' + ICON.x + '</button></div>';
      }).join('') + '</div>';
    }).join('') : '<p class="ftsk-empty">Listen er tom. Kryss av produkter i tabellen, eller bruk «Lim inn liste».</p>';
    body += '<div class="ftsk-opt">' +
      '<label><input type="checkbox" id="ftsk-pds"' + (sel.pds ? ' checked' : '') + '><span>Ta med produktdatablad (PDS)<small>Sikkerhetsdatabladene er alltid med.</small></span></label>' +
      '<label><input type="checkbox" id="ftsk-toc"' + (sel.toc !== false ? ' checked' : '') + '><span>Innholdsfortegnelse (PDF og CSV)<small>CSV-filen kan leses inn i Excel eller stoffkartotek-systemer.</small></span></label>' +
      '<label style="display:block">Firma eller avdeling <small style="display:inline">(valgfritt – vises på innholdsfortegnelsen)</small><input type="text" id="ftsk-firma" value="' + esc(sel.firma || '') + '" autocomplete="organization"></label>' +
      '</div><div id="ftsk-p" hidden><div class="ftsk-prog"><i></i></div><div class="ftsk-msg" id="ftsk-pm"></div></div>';
    var d = dialog('Mitt stoffkartotek (' + v.length + ')', body,
      (v.length ? '<button type="button" class="ftsk-b" id="ftsk-tom">Tøm listen</button>' : '') + '<span class="sp"></span><button type="button" class="ftsk-b" data-c="1">Lukk</button>' +
      (v.length ? '<button type="button" class="ftsk-b p" id="ftsk-dl">' + ICON.dl + '<span>Last ned ZIP</span></button>' : ''));
    d.querySelector('[data-c]').addEventListener('click', lukk);
    d.querySelector('.ftsk-body').addEventListener('click', function (e) {
      var b = e.target.closest('.rm'); if (!b) return;
      delete VALGT[b.getAttribute('data-k')]; save(); refresh(); visListe();
    });
    var pds = d.querySelector('#ftsk-pds'), toc = d.querySelector('#ftsk-toc'), firma = d.querySelector('#ftsk-firma');
    pds.addEventListener('change', function () { sel.pds = pds.checked; save(); refresh(); });
    toc.addEventListener('change', function () { sel.toc = toc.checked; save(); });
    firma.addEventListener('input', function () { sel.firma = firma.value.trim(); save(); });
    var tom = d.querySelector('#ftsk-tom');
    if (tom) tom.addEventListener('click', function () {
      if (tom.getAttribute('data-sikker')) { VALGT = {}; save(); refresh(); lukk(); toast('Stoffkartoteket er tømt'); }
      else { tom.setAttribute('data-sikker', '1'); tom.textContent = 'Trykk igjen for å tømme'; }
    });
    var dl = d.querySelector('#ftsk-dl');
    if (dl) dl.addEventListener('click', function () { lastNed(d, dl); });
  }

  function lastNed(d, btn) {
    var v = valgte(); if (!v.length) return;
    var medPds = sel.pds, medToc = sel.toc !== false;
    var box = d.querySelector('#ftsk-p'), bar = box.querySelector('i'), pm = box.querySelector('#ftsk-pm');
    box.hidden = false; btn.disabled = true; d.__busy = true; pm.className = 'ftsk-msg'; pm.textContent = 'Gjør klart …';
    // én oppføring per dokument; samme fil brukes bare én gang i ZIP-en
    var jobs = [], byPath = {}, rader = [];
    v.forEach(function (r) {
      var docs = r.sds.map(function (x) { return ['SDS', x]; }).concat(medPds ? r.pds.map(function (x) { return ['PDS', x]; }) : []);
      if (!docs.length) rader.push({ r: r, type: 'SDS', lang: '', label: '', fil: '', status: 'mangler' });
      docs.forEach(function (dd) {
        var path = dd[1][2], j = byPath[path];
        if (!j) {
          var lab = dd[1][0] && dd[1][0] !== dd[0] ? ' - ' + dd[1][0] : '';
          var base = filnavn(r.lev) + '/' + (dd[0] === 'PDS' ? 'Produktdatablad/' : '') + filnavn(r.name + lab + ' - ' + dd[0] + ' (' + dd[1][1] + ')') + '.pdf';
          j = byPath[path] = { path: path, fil: base, ok: false };
          jobs.push(j);
        }
        rader.push({ r: r, type: dd[0], lang: dd[1][1], label: dd[1][0], job: j });
      });
    });
    // unike filnavn
    var brukt = {};
    jobs.forEach(function (j) { var f = j.fil, n = 2; while (brukt[f.toLowerCase()]) f = j.fil.replace(/\.pdf$/, ' (' + (n++) + ').pdf'); brukt[f.toLowerCase()] = 1; j.fil = f; });
    // pdf-lib er bare til innholdsfortegnelsen i PDF – feiler den, lages ZIP-en likevel (med CSV)
    var pdfOk = medToc ? script(PDFLIB).then(function () { return true; }, function () { return false; }) : Promise.resolve(false);
    Promise.all([window.JSZip ? 1 : script(JSZIP), pdfOk]).then(function (libs) {
      var harPdf = libs[1];
      var zip = new window.JSZip(), done = 0, i = 0;
      function one() {
        if (i >= jobs.length) return Promise.resolve();
        var j = jobs[i++];
        return fetch(url(j.path)).then(function (res) { if (!res.ok) throw new Error(res.status); return res.arrayBuffer(); })
          .then(function (buf) { zip.file(j.fil, buf); j.ok = true; j.bytes = buf.byteLength; }, function () { j.ok = false; })
          .then(function () { done++; bar.style.width = Math.round(done / jobs.length * 90) + '%'; pm.textContent = 'Henter datablad ' + done + ' av ' + jobs.length + ' …'; return one(); });
      }
      return Promise.all([one(), one(), one(), one()]).then(function () {
        if (!medToc) return null;
        pm.textContent = 'Lager innholdsfortegnelse …';
        zip.file('Innholdsfortegnelse.csv', csv(rader));
        if (!harPdf || !window.PDFLib) return null;
        return tocPdf(rader).then(function (bytes) { zip.file('Innholdsfortegnelse.pdf', bytes); }).catch(function (e) { if (window.console) console.warn('Stoffkartotek: PDF-innholdsfortegnelsen feilet', e); });
      }).then(function () {
        pm.textContent = 'Pakker ZIP-filen …';
        return zip.generateAsync({ type: 'blob', compression: 'STORE' }, function (m) { bar.style.width = (90 + m.percent / 10) + '%'; });
      }).then(function (blob) {
        var a = document.createElement('a'), navn = 'Stoffkartotek' + (sel.firma ? ' ' + filnavn(sel.firma) : '') + ' - Fuglesangs Tech - ' + idag() + '.zip';
        a.href = URL.createObjectURL(blob); a.download = navn; document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
        bar.style.width = '100%';
        var feil = jobs.filter(function (j) { return !j.ok; });
        pm.innerHTML = 'Ferdig: <b>' + esc(navn) + '</b> (' + (blob.size / 1048576).toFixed(1).replace('.', ',') + ' MB, ' + (jobs.length - feil.length) + ' datablad).' +
          (feil.length ? '<br><span class="err">' + feil.length + ' datablad kunne ikke hentes – de står i innholdsfortegnelsen med lenke.</span>' : '');
        if (feil.length) pm.querySelector('.err').className = 'ftsk-msg err';
        btn.disabled = false; d.__busy = false; btn.querySelector('span').textContent = 'Last ned på nytt';
        try { if (window.gtag) window.gtag('event', 'stoffkartotek_nedlasting', { produkter: v.length, filer: jobs.length }); } catch (e) {}
      });
    }).catch(function (e) {
      pm.className = 'ftsk-msg err'; pm.textContent = 'Nedlastingen feilet (' + (e && e.message || e) + '). Prøv igjen, eller kontakt oss.';
      btn.disabled = false; d.__busy = false;
    });
  }

  function status(x) { return x.status === 'mangler' ? 'Ingen SDS her – spør oss' : x.job && x.job.ok ? x.job.fil : 'Kunne ikke hentes – ' + url(x.job.path); }
  function csv(rader) {
    var q = function (s) { s = String(s == null ? '' : s); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    var lines = [['Produkt', 'Produktnr.', 'Leverandør', 'Dokument', 'Variant', 'Språk', 'Fil i ZIP', 'Nettadresse'].join(';')];
    rader.forEach(function (x) {
      lines.push([x.r.name, x.r.nr, x.r.lev, x.type === 'SDS' ? 'Sikkerhetsdatablad' : 'Produktdatablad', x.label && x.label !== x.type ? x.label : '', x.lang === 'NO' ? 'Norsk' : x.lang === 'EN' ? 'Engelsk' : '', x.job && x.job.ok ? x.job.fil : (x.status === 'mangler' ? 'Ingen SDS her – spør oss' : 'Kunne ikke hentes'), x.job ? url(x.job.path) : ''].map(q).join(';'));
    });
    return '﻿' + lines.join('\r\n') + '\r\n';
  }

  function tocPdf(rader) {
    var L = window.PDFLib, doc;
    return L.PDFDocument.create().then(function (d) {
      doc = d;
      return Promise.all([doc.embedFont(L.StandardFonts.Helvetica), doc.embedFont(L.StandardFonts.HelveticaBold)]);
    }).then(function (f) {
      var F = f[0], B = f[1], navy = L.rgb(0.02, 0.17, 0.41), grey = L.rgb(0.35, 0.39, 0.45), line = L.rgb(0.86, 0.89, 0.93), red = L.rgb(0.7, 0.14, 0.09);
      var W = 595.28, H = 841.89, M = 44, page, y, pno = 0;
      function safe(s, font) {   // Helvetica kan bare WinAnsi-tegn
        s = String(s == null ? '' : s).replace(/³/g, '3').replace(/²/g, '2').replace(/[‐–—−]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
        var out = '';
        for (var i = 0; i < s.length; i++) { var c = s[i]; try { font.encodeText(c); out += c; } catch (e) { out += '?'; } }
        return out;
      }
      function fit(s, font, size, w) { s = safe(s, font); if (font.widthOfTextAtSize(s, size) <= w) return s; while (s.length > 1 && font.widthOfTextAtSize(s + '…', size) > w) s = s.slice(0, -1); return s + '…'; }
      function text(s, x, yy, size, font, color, w) { page.drawText(w ? fit(s, font, size, w) : safe(s, font), { x: x, y: yy, size: size, font: font, color: color || L.rgb(0.1, 0.14, 0.2) }); }
      var COLS = [[M, 236, 'Produkt'], [M + 244, 54, 'Dokument'], [M + 302, 46, 'Språk'], [M + 352, W - M - (M + 352), 'Fil i ZIP-filen (mappe: leverandør)']];
      function head() {
        y -= 6;
        COLS.forEach(function (c) { text(c[2], c[0], y, 8.5, B, grey); });
        y -= 6; page.drawLine({ start: { x: M, y: y }, end: { x: W - M, y: y }, thickness: 0.8, color: navy }); y -= 13;
      }
      function nyside(first) {
        page = doc.addPage([W, H]); pno++; y = H - M;
        if (first) {
          text('Stoffkartotek', M, y - 22, 24, B, navy); y -= 46;
          text('Sikkerhetsdatablad' + (rader.some(function (x) { return x.type === 'PDS'; }) ? ' og produktdatablad' : ''), M, y, 12, F, grey); y -= 26;
          var info = [];
          if (sel.firma) info.push(['Firma / avdeling', sel.firma]);
          info.push(['Satt sammen', datoNo(idag())]);
          info.push(['Datablad kontrollert mot leverandør', datoNo(DB.oppdatert)]);
          info.push(['Kilde', 'Fuglesangs Tech AS – www.fuglesangstech.no/datablad']);
          info.push(['Kontakt', 'post@fuglesangstech.no · 22 54 20 00']);
          info.forEach(function (p) { text(p[0], M, y, 9.5, B, grey); text(p[1], M + 190, y, 9.5, F); y -= 15; });
          y -= 8;
          var n = {}; rader.forEach(function (x) { n[x.r.lev] = 1; });
          var prods = {}; rader.forEach(function (x) { prods[key(x.r)] = 1; });
          text(Object.keys(prods).length + ' produkter · ' + rader.filter(function (x) { return x.job; }).length + ' dokumenter · ' + Object.keys(n).length + ' leverandører', M, y, 10, F, navy); y -= 14;
          text('Sjekk at dere har siste versjon minst én gang i året – last ned på nytt fra samme side.', M, y, 9, F, grey); y -= 24;
        } else { text('Stoffkartotek – innholdsfortegnelse (forts.)', M, y - 4, 10, B, navy); y -= 22; }
        head();
      }
      nyside(true);
      var lastLev = null;
      rader.forEach(function (x) {
        if (y < M + 30) { nyside(false); lastLev = null; }
        if (x.r.lev !== lastLev) {
          if (y < M + 50) { nyside(false); }
          y -= 4; text(x.r.lev, M, y, 10.5, B, navy); y -= 15; lastLev = x.r.lev;
        }
        var prod = (x.r.nr && x.r.name.indexOf(x.r.nr) !== 0 ? x.r.nr + ' ' : '') + x.r.name + (x.label && x.label !== x.type ? ' (' + x.label + ')' : '');
        text(prod, COLS[0][0], y, 9, F, null, COLS[0][1]);
        text(x.type, COLS[1][0], y, 9, F, null, COLS[1][1]);
        text(x.lang === 'NO' ? 'Norsk' : x.lang === 'EN' ? 'Engelsk' : '-', COLS[2][0], y, 9, F, null, COLS[2][1]);
        var st = x.status === 'mangler' ? 'Ingen SDS i oversikten – spør oss ved behov' : x.job.ok ? x.job.fil.replace(/^[^\/]+\//, '') : 'Kunne ikke hentes – se nettsiden';
        text(st, COLS[3][0], y, 8, F, x.job && !x.job.ok ? red : grey, COLS[3][1]);
        y -= 5; page.drawLine({ start: { x: M, y: y }, end: { x: W - M, y: y }, thickness: 0.4, color: line }); y -= 11;
      });
      var pages = doc.getPages();
      pages.forEach(function (p, i) { p.drawText(safe('Side ' + (i + 1) + ' av ' + pages.length + '   ·   Fuglesangs Tech AS   ·   ' + datoNo(idag()), F), { x: M, y: 24, size: 8, font: F, color: grey }); });
      doc.setTitle('Stoffkartotek' + (sel.firma ? ' – ' + sel.firma : '')); doc.setAuthor('Fuglesangs Tech AS'); doc.setCreator('fuglesangstech.no/datablad');
      return doc.save();
    });
  }

  /* ---------- oppstart ---------- */
  function init() {
    if (bar) return;
    DB = window.ftDatablad; if (!DB) return;
    R = DB.rader;
    R.forEach(function (r) { BYKEY[key(r)] = r; r.hayFlat = r.hayFlat || flat(r.hay); });
    var s = document.createElement('style'); s.id = 'ftsk-css'; s.textContent = CSS; document.head.appendChild(s);
    // fjern valg som ikke lenger finnes
    Object.keys(VALGT).forEach(function (k) { if (!BYKEY[k]) delete VALGT[k]; }); save();
    buildBar(); refresh();
    document.addEventListener('ftdb:render', refresh);
    window.addEventListener('fttilbud:endret', refresh);
    window.addEventListener('storage', function (e) { if (e.key === TKEY) refresh(); });
    var mode = new URLSearchParams(location.search).get('stoffkartotek');
    if (mode === 'tilbud') fraTilbud().then(function () { if (valgte().length) visListe(); });
    else if (mode === '1' && valgte().length) visListe();
    if (mode || location.hash === '#stoffkartotek') setTimeout(function () { bar.scrollIntoView({ block: 'center' }); }, 150);
  }
  window.FTStoffkartotek = { versjon: VERSJON, vis: function () { visListe(); }, antall: function () { return valgte().length; } };
  if (window.ftDatablad) init(); else document.addEventListener('ftdb:klar', init);
})();
