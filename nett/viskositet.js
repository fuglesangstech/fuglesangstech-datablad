/*
  Omregning av viskositet – fuglesangstech.no
  Lastes på alle sider fra Footer-kodeinjeksjonen (blokk 5c):
    <script src="https://datablad.fuglesangstech.no/nett/viskositet.js" defer></script>

  Åpnes med lenker til «#viskositet», elementer med data-viskositet (ev. data-viskositet="68" for ISO VG 68,
  og data-v40 / data-v100 for viskositeten ved 40 og 100 °C fra databladet),
  eller window.FTViskositet.apne({ vg: 68 }).

  To faner:
  1. ISO VG og AGMA – ISO 3448-klassene (midtverdi ±10 % ved 40 °C) og AGMA-graderingene etter ANSI/AGMA 9005.
  2. Ved driftstemperatur – fra viskositet ved 40 og 100 °C (produktdatabladet) regnes viskositeten ved en valgfri
     temperatur ut med Walther-likningen (ASTM D341). Gir også ISO VG-klasse, SAE-gradering for motorolje (SAE J300,
     kinematisk viskositet ved 100 °C) og girolje (SAE J306, ved 100 °C) og Saybolt-sekunder (ASTM D2161).
  Bare viskositet – ikke kvalitet, godkjenninger eller kuldeegenskaper.
*/
(function () {
  'use strict';
  if (window.FTViskositet) return;
  var NAVY = '#052b69';

  /* ---------- data ---------- */
  var ISO = [2, 3, 5, 7, 10, 15, 22, 32, 46, 68, 100, 150, 220, 320, 460, 680, 1000, 1500, 2200, 3200];
  var AGMA = { 32: '0', 46: '1', 68: '2', 100: '3', 150: '4', 220: '5', 320: '6', 460: '7', 680: '8', 1000: '8A', 1500: '9', 2200: '10', 3200: '11' };
  // SAE J300 – kinematisk viskositet ved 100 °C, mm²/s (min, maks – maks er «under»)
  var J300 = [['SAE 8', 4.0, 6.1], ['SAE 12', 5.0, 7.1], ['SAE 16', 6.1, 8.2], ['SAE 20', 6.9, 9.3], ['SAE 30', 9.3, 12.5], ['SAE 40', 12.5, 16.3], ['SAE 50', 16.3, 21.9], ['SAE 60', 21.9, 26.1]];
  // SAE J306 – girolje, kinematisk viskositet ved 100 °C, mm²/s
  var J306 = [['SAE 80', 7.0, 11.0], ['SAE 85', 11.0, 13.5], ['SAE 90', 13.5, 18.5], ['SAE 110', 18.5, 24.0], ['SAE 140', 24.0, 32.5], ['SAE 190', 32.5, 41.0], ['SAE 250', 41.0, Infinity]];

  /* ---------- beregning ---------- */
  function lglg(v) { return Math.log10(Math.log10(v + 0.7)); }
  function walther(v40, v100) {   // ASTM D341: log log (v + 0,7) = A − B · log T
    var t1 = Math.log10(313.15), t2 = Math.log10(373.15);
    var B = (lglg(v40) - lglg(v100)) / (t2 - t1), A = lglg(v40) + B * t1;
    return function (tc) { return Math.pow(10, Math.pow(10, A - B * Math.log10(tc + 273.15))) - 0.7; };
  }
  function sus(v, tf) {   // ASTM D2161, Saybolt Universal Seconds ved 100 °F, korrigert til tf °F
    var s = 4.6324 * v + (1.0 + 0.03264 * v) / ((3930.2 + 262.7 * v + 23.97 * v * v + 1.646 * v * v * v) * 1e-5);
    return s * (1 + 0.000061 * (tf - 100));
  }
  function isoKlasse(v) {
    for (var i = 0; i < ISO.length; i++) if (v >= ISO[i] * 0.9 && v <= ISO[i] * 1.1) return { vg: ISO[i] };
    for (var j = 0; j < ISO.length - 1; j++) if (v > ISO[j] * 1.1 && v < ISO[j + 1] * 0.9) return { mellom: [ISO[j], ISO[j + 1]] };
    return null;
  }
  function sae(tab, v) { return tab.filter(function (g) { return v >= g[1] && v < g[2]; }).map(function (g) { return g[0]; }); }

  /* ---------- formatering ---------- */
  function tall(x, d) {
    if (!isFinite(x)) return '–';
    if (d == null) d = x >= 100 ? 0 : x >= 10 ? 1 : 2;
    return x.toFixed(d).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  function les(s) { var v = parseFloat(String(s || '').replace(/\s/g, '').replace(',', '.')); return isFinite(v) ? v : NaN; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function katLenke(vg) { return '/produkter?q=' + encodeURIComponent('ISO VG ' + vg); }

  /* ---------- stil ---------- */
  var CSS = [
    '.ftvk-bg{position:fixed;inset:0;z-index:100004;background:rgba(3,28,71,.55);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}',
    '.ftvk{position:fixed;z-index:100005;left:50%;top:50%;transform:translate(-50%,-50%);width:min(720px,calc(100vw - 32px));max-height:calc(100vh - 48px);overflow:auto;background:#fff;border-radius:14px;box-shadow:0 30px 70px -20px rgba(3,28,71,.55);font-family:"Barlow",system-ui,sans-serif;color:#1a2332;font-size:16px;line-height:1.5}',
    '.ftvk *{box-sizing:border-box}',
    '.ftvk header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 22px 0}',
    '.ftvk h2{margin:0;font-size:22px;color:' + NAVY + ';font-weight:700;letter-spacing:0;line-height:1.25}',
    '.ftvk .x{border:0;background:#eef1f5;color:' + NAVY + ';width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:20px;line-height:1;flex:0 0 36px}',
    '.ftvk .x:hover{background:#e1e8f2}',
    '.ftvk .tabs{display:flex;gap:6px;padding:14px 22px 0;border-bottom:1px solid #e3e8f0}',
    '.ftvk .tabs button{font:inherit;font-size:15px;font-weight:600;border:0;background:none;color:#4a5568;padding:8px 12px 10px;border-bottom:3px solid transparent;cursor:pointer;margin-bottom:-1px}',
    '.ftvk .tabs button[aria-selected=true]{color:' + NAVY + ';border-bottom-color:' + NAVY + '}',
    '.ftvk .pane{padding:18px 22px 22px}',
    '.ftvk .lead{margin:0 0 14px;color:#4a5568;font-size:15px}',
    '.ftvk .row{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end}',
    '.ftvk label{display:flex;flex-direction:column;gap:4px;font-size:14px;font-weight:600;color:#1a2332;flex:1 1 150px;min-width:0}',
    '.ftvk input,.ftvk select{font:inherit;font-size:16px;font-weight:400;padding:10px 12px;border:1px solid #c9d5e8;border-radius:8px;background:#fff;color:#1a2332;width:100%}',
    '.ftvk input:focus,.ftvk select:focus{outline:2px solid ' + NAVY + ';outline-offset:1px;border-color:' + NAVY + '}',
    '.ftvk .res{margin-top:16px;background:#f5f8fc;border-radius:10px;padding:14px 16px}',
    '.ftvk .res table{width:100%;border-collapse:collapse;font-size:15px}',
    '.ftvk .res th{text-align:left;font-weight:600;color:#4a5568;padding:6px 12px 6px 0;width:48%;vertical-align:top}',
    '.ftvk .res td{padding:6px 0;font-weight:600;color:' + NAVY + '}',
    '.ftvk .res tr+tr th,.ftvk .res tr+tr td{border-top:1px solid #e3e8f0}',
    '.ftvk .res td small{display:block;font-weight:400;color:#6b7686;font-size:13px}',
    '.ftvk .big{font-size:26px;font-weight:700;color:' + NAVY + ';line-height:1.2}',
    '.ftvk .note{font-size:13px;color:#6b7686;margin:12px 0 0}',
    '.ftvk .err{color:#b42318;font-size:14px;margin:10px 0 0}',
    '.ftvk a.kat{display:inline-flex;align-items:center;gap:6px;margin-top:12px;color:' + NAVY + ';font-weight:600;text-decoration:none;border-bottom:1px solid rgba(5,43,105,.3)}',
    '.ftvk a.kat:hover{border-color:' + NAVY + '}',
    '.ftvk svg.kurve{width:100%;height:auto;display:block;margin-top:12px}',
    '.ftvk .ref{width:100%;border-collapse:collapse;font-size:14px;margin-top:16px}',
    '.ftvk .ref th,.ftvk .ref td{padding:5px 8px;border-bottom:1px solid #eef1f5;text-align:left}',
    '.ftvk .ref thead th{color:#4a5568;font-weight:600;border-bottom:1px solid #c9d5e8}',
    '.ftvk .ref tr.on td{background:#eef3fb;font-weight:600;color:' + NAVY + '}',
    '@media (max-width:600px){.ftvk{left:0;top:0;transform:none;width:100vw;max-height:none;height:100%;border-radius:0}.ftvk header{padding:14px 16px 0}.ftvk .tabs{padding:10px 16px 0}.ftvk .pane{padding:16px}.ftvk .res th{width:52%}}'
  ].join('\n');

  /* ---------- dialog ---------- */
  var bg, dlg, prev, fane = 'iso';
  function lukk() {
    if (!dlg) return;
    bg.remove(); dlg.remove(); bg = dlg = null;
    document.removeEventListener('keydown', tast, true);
    if (/^#viskositet/.test(location.hash)) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }
    if (prev && prev.focus) try { prev.focus({ preventScroll: true }); } catch (e) {}
  }
  function tast(e) {   // fanges før andre dialoger på siden (f.eks. produktveilederen) får tastetrykket
    if (e.key === 'Escape') { e.stopPropagation(); lukk(); return; }
    if (e.key === 'Tab') e.stopPropagation();
    if (e.key === 'Tab' && dlg) {
      var f = [].slice.call(dlg.querySelectorAll('button, input, select, a[href]')).filter(function (x) { return !x.disabled && x.offsetParent; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  }
  function apne(o) {
    o = o || {};
    if (!document.getElementById('ftvk-css')) { var st = document.createElement('style'); st.id = 'ftvk-css'; st.textContent = CSS; document.head.appendChild(st); }
    if (dlg) lukk();
    prev = document.activeElement;
    bg = document.createElement('div'); bg.className = 'ftvk-bg';
    dlg = document.createElement('div'); dlg.className = 'ftvk'; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-labelledby', 'ftvk-h');
    fane = o.v40 || o.v100 ? 'temp' : 'iso';
    dlg.innerHTML = '<header><h2 id="ftvk-h">Omregning av viskositet</h2><button type="button" class="x" aria-label="Lukk">×</button></header>' +
      '<div class="tabs" role="tablist"><button type="button" role="tab" data-f="iso">ISO VG og AGMA</button><button type="button" role="tab" data-f="temp">Ved driftstemperatur</button></div>' +
      '<div class="pane" data-p="iso" role="tabpanel">' +
        '<p class="lead">ISO VG er viskositeten ved 40 °C i mm²/s (cSt), med ±10 % slingringsmonn. AGMA-graderingene for giroljer følger de samme klassene.</p>' +
        '<div class="row"><label>Jeg har<select id="ftvk-sys"><option value="iso">ISO VG</option><option value="agma">AGMA-gradering</option><option value="cst">Viskositet ved 40 °C (cSt)</option></select></label>' +
        '<label id="ftvk-vl">Verdi<select id="ftvk-vs"></select><input id="ftvk-vi" type="text" inputmode="decimal" placeholder="F.eks. 72" hidden></label></div>' +
        '<div class="res" id="ftvk-r1" aria-live="polite"></div>' +
        '<p class="note">SAE-graderinger for motor- og girolje måles ved 100 °C (og i kulde for W-graderinger), så de kan ikke regnes om fra ISO VG alene. Bruk fanen «Ved driftstemperatur» med verdiene fra produktdatabladet.</p>' +
      '</div>' +
      '<div class="pane" data-p="temp" role="tabpanel" hidden>' +
        '<p class="lead">Fyll inn viskositeten ved 40 og 100 °C fra produktdatabladet, og velg temperaturen oljen arbeider ved.</p>' +
        '<div class="row"><label>Viskositet ved 40 °C (cSt)<input id="ftvk-a" type="text" inputmode="decimal" placeholder="F.eks. 68"></label>' +
        '<label>Viskositet ved 100 °C (cSt)<input id="ftvk-b" type="text" inputmode="decimal" placeholder="F.eks. 8,7"></label>' +
        '<label>Driftstemperatur (°C)<input id="ftvk-t" type="text" inputmode="decimal" value="60"></label></div>' +
        '<div class="res" id="ftvk-r2" aria-live="polite"></div>' +
        '<p class="note">Beregnet med Walther-likningen (ASTM D341), som gjelder for mineralske og de fleste syntetiske oljer i normalt temperaturområde – ikke under stivnepunktet eller for oljer med uvanlig viskositetskurve. SAE-graderingene bygger bare på viskositeten ved 100 °C; motoroljer må i tillegg oppfylle krav til HTHS-viskositet, og W-graderinger krav i kulde.</p>' +
      '</div>';
    document.body.appendChild(bg); document.body.appendChild(dlg);
    bg.addEventListener('click', lukk); dlg.querySelector('.x').addEventListener('click', lukk);
    document.addEventListener('keydown', tast, true);
    [].forEach.call(dlg.querySelectorAll('[role=tab]'), function (b) { b.addEventListener('click', function () { visFane(b.getAttribute('data-f')); }); });

    var sys = dlg.querySelector('#ftvk-sys'), vs = dlg.querySelector('#ftvk-vs'), vi = dlg.querySelector('#ftvk-vi');
    function fyllValg() {
      var s = sys.value;
      vs.hidden = s === 'cst'; vi.hidden = s !== 'cst';
      if (s === 'iso') vs.innerHTML = ISO.map(function (g) { return '<option value="' + g + '">ISO VG ' + g + '</option>'; }).join('');
      if (s === 'agma') vs.innerHTML = Object.keys(AGMA).sort(function (a, b) { return a - b; }).map(function (g) { return '<option value="' + g + '">AGMA ' + AGMA[g] + '</option>'; }).join('');
    }
    function r1() {
      var s = sys.value, vg = null, v = NaN, out = dlg.querySelector('#ftvk-r1');
      if (s === 'cst') {
        v = les(vi.value);
        if (!vi.value.trim()) { out.innerHTML = '<span class="note" style="margin:0">Skriv inn viskositeten ved 40 °C.</span>'; return; }
        if (!(v > 0)) { out.innerHTML = '<p class="err" style="margin:0">Skriv inn et tall, f.eks. 72.</p>'; return; }
        var k = isoKlasse(v);
        if (k && k.vg) vg = k.vg;
        else {
          out.innerHTML = '<table><tr><th>ISO VG</th><td>' + (k ? 'Ingen klasse – mellom ISO VG ' + k.mellom[0] + ' og ' + k.mellom[1] + '<small>' + tall(v) + ' cSt ligger utenfor ±10 % av begge.</small>' : 'Utenfor ISO VG-skalaen (2–3200)') + '</td></tr></table>';
          return;
        }
      } else vg = +vs.value;
      var ag = AGMA[vg];
      out.innerHTML = '<div class="big">ISO VG ' + vg + '</div><table style="margin-top:8px">' +
        '<tr><th>Viskositet ved 40 °C</th><td>' + tall(vg * 0.9) + '–' + tall(vg * 1.1) + ' cSt<small>Midtverdi ' + vg + ' cSt</small></td></tr>' +
        '<tr><th>AGMA-gradering</th><td>' + (ag ? 'AGMA ' + ag + '<small>Med EP-tilsetning: AGMA ' + ag + ' EP</small>' : 'Ingen tilsvarende') + '</td></tr>' +
        (s === 'cst' ? '<tr><th>Din verdi</th><td>' + tall(v) + ' cSt</td></tr>' : '') +
        '</table>' + (vg >= 10 ? '<a class="kat" href="' + katLenke(vg) + '">Vis produkter med ISO VG ' + vg + ' i katalogen →</a>' : '');
      var kl = out.querySelector('a.kat'); if (kl) kl.addEventListener('click', function () { if (location.pathname.replace(/\/$/, '') === '/produkter') lukk(); });
    }
    sys.addEventListener('change', function () { fyllValg(); r1(); (sys.value === 'cst' ? vi : vs).focus(); });
    vs.addEventListener('change', r1); vi.addEventListener('input', r1);

    var a = dlg.querySelector('#ftvk-a'), b = dlg.querySelector('#ftvk-b'), t = dlg.querySelector('#ftvk-t');
    function r2() {
      var out = dlg.querySelector('#ftvk-r2'), v40 = les(a.value), v100 = les(b.value), tc = les(t.value);
      if (!a.value.trim() || !b.value.trim()) { out.innerHTML = '<span class="note" style="margin:0">Fyll inn begge viskositetene for å regne ut.</span>'; return; }
      if (!(v40 > 0) || !(v100 > 0)) { out.innerHTML = '<p class="err" style="margin:0">Skriv inn tall, f.eks. 68 og 8,7.</p>'; return; }
      if (v100 >= v40) { out.innerHTML = '<p class="err" style="margin:0">Viskositeten ved 100 °C må være lavere enn ved 40 °C. Sjekk at verdiene ikke er byttet om.</p>'; return; }
      if (v100 < 1.5) { out.innerHTML = '<p class="err" style="margin:0">Beregningen gjelder for viskositet over 1,5 cSt ved 100 °C.</p>'; return; }
      var f = walther(v40, v100), k = isoKlasse(v40), m = sae(J300, v100), g = sae(J306, v100);
      var h = '<table>';
      if (isFinite(tc)) {
        if (tc < -40 || tc > 200) h += '<tr><th>Ved ' + tall(tc, 0) + ' °C</th><td>Utenfor området beregningen gjelder for (−40 til 200 °C)</td></tr>';
        else h += '<tr><th>Ved ' + tall(tc, tc % 1 ? 1 : 0) + ' °C</th><td><span class="big">' + tall(f(tc)) + ' cSt</span></td></tr>';
      }
      h += '<tr><th>ISO VG (ved 40 °C)</th><td>' + (k && k.vg ? 'ISO VG ' + k.vg + (AGMA[k.vg] ? '<small>AGMA ' + AGMA[k.vg] + '</small>' : '') : k ? 'Mellom ISO VG ' + k.mellom[0] + ' og ' + k.mellom[1] : 'Utenfor skalaen') + '</td></tr>' +
        '<tr><th>SAE motorolje (SAE J300, 100 °C)</th><td>' + (m.length ? m.join(' / ') : v100 < 4 ? 'Under SAE 8' : 'Over SAE 60') + '<small>Ved flergradsolje: tallet etter W</small></td></tr>' +
        '<tr><th>SAE girolje (SAE J306, 100 °C)</th><td>' + (g.length ? g.join(' / ') : 'Under SAE 80') + '</td></tr>' +
        '<tr><th>Saybolt (SUS)</th><td>' + tall(sus(f(37.78), 100), 0) + ' SUS ved 100 °F<small>' + tall(sus(v100 > 0 ? f(98.89) : NaN, 210), 1) + ' SUS ved 210 °F</small></td></tr>' +
        '</table>' + kurve(f, v40, v100, isFinite(tc) && tc >= -40 && tc <= 200 ? tc : null) +
        (k && k.vg && k.vg >= 10 ? '<a class="kat" href="' + katLenke(k.vg) + '">Vis produkter med ISO VG ' + k.vg + ' i katalogen →</a>' : '');
      out.innerHTML = h;
      var kl = out.querySelector('a.kat'); if (kl) kl.addEventListener('click', function () { if (location.pathname.replace(/\/$/, '') === '/produkter') lukk(); });
    }
    [a, b, t].forEach(function (x) { x.addEventListener('input', r2); });

    fyllValg();
    if (o.vg && ISO.indexOf(+o.vg) > -1) { sys.value = 'iso'; vs.value = String(o.vg); } else vs.value = '68';
    if (o.v40) a.value = String(o.v40).replace('.', ',');
    if (o.v100) b.value = String(o.v100).replace('.', ',');
    r1(); r2();
    visFane(fane);
  }
  function visFane(f) {
    fane = f;
    [].forEach.call(dlg.querySelectorAll('[role=tab]'), function (b) { b.setAttribute('aria-selected', b.getAttribute('data-f') === f ? 'true' : 'false'); });
    [].forEach.call(dlg.querySelectorAll('.pane'), function (p) { p.hidden = p.getAttribute('data-p') !== f; });
    setTimeout(function () { var x = dlg && dlg.querySelector('.pane:not([hidden]) select:not([hidden]), .pane:not([hidden]) input:not([hidden])'); if (x) x.focus(); }, 30);
  }
  function kurve(f, v40, v100, tc) {   // viskositet mot temperatur, logaritmisk akse
    var W = 640, H = 200, L = 52, R = 26, T = 12, B = 30, t0 = 0, t1 = 150;
    var vals = []; for (var x = t0; x <= t1; x += 5) vals.push(f(x));
    var lo = Math.log10(Math.max(1, Math.min.apply(null, vals))), hi = Math.log10(Math.max.apply(null, vals));
    lo = Math.floor(lo); hi = Math.ceil(hi); if (hi === lo) hi++;
    var X = function (t) { return L + (t - t0) / (t1 - t0) * (W - L - R); }, Y = function (v) { return T + (hi - Math.log10(Math.max(v, 1e-3))) / (hi - lo) * (H - T - B); };
    var s = '<svg class="kurve" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Viskositet fra 0 til 150 °C"><g font-family="Barlow,system-ui,sans-serif" font-size="12" fill="#6b7686">';
    for (var e = lo; e <= hi; e++) { var yy = Y(Math.pow(10, e)); s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '" stroke="#e3e8f0"/><text x="' + (L - 8) + '" y="' + (yy + 4) + '" text-anchor="end">' + tall(Math.pow(10, e), 0) + '</text>'; }
    for (var tt = 0; tt <= 150; tt += 25) s += '<text x="' + X(tt) + '" y="' + (H - 10) + '" text-anchor="' + (tt === 150 ? 'end' : 'middle') + '">' + tt + ' °C</text>';
    var d = ''; for (var q = t0; q <= t1; q += 2) d += (q === t0 ? 'M' : 'L') + X(q).toFixed(1) + ' ' + Y(f(q)).toFixed(1);
    s += '<path d="' + d + '" fill="none" stroke="' + NAVY + '" stroke-width="2.5"/>';
    [[40, v40], [100, v100]].forEach(function (p) { s += '<circle cx="' + X(p[0]) + '" cy="' + Y(p[1]) + '" r="4" fill="#fff" stroke="' + NAVY + '" stroke-width="2"/>'; });
    if (tc != null && tc >= t0 && tc <= t1) s += '<line x1="' + X(tc) + '" x2="' + X(tc) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="#e8772e" stroke-dasharray="4 3"/><circle cx="' + X(tc) + '" cy="' + Y(f(tc)) + '" r="5" fill="#e8772e"/>';
    s += '<text x="' + L + '" y="' + (T + 2) + '" dy="-2" font-size="11">cSt</text></g></svg>';
    return s;
  }

  /* ---------- koble til lenker ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-viskositet], a[href$="#viskositet"]');
    if (!el) return;
    e.preventDefault();
    var vg = el.getAttribute('data-viskositet'), a = el.getAttribute('data-v40'), b = el.getAttribute('data-v100');
    apne({ vg: vg ? +vg : null, v40: a || null, v100: b || null });
  });
  function fraHash() { if (/^#viskositet/.test(location.hash) && !dlg) apne(); }
  window.addEventListener('hashchange', fraHash);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fraHash); else fraHash();

  window.FTViskositet = { apne: apne, lukk: lukk, beregn: { walther: walther, sus: sus, isoKlasse: isoKlasse, saeMotor: function (v) { return sae(J300, v); }, saeGir: function (v) { return sae(J306, v); } } };
})();
