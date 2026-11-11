/*
  Kontaktskjema for fuglesangstech.no/kontakt-oss
  Lastes fra kodeblokken på kontaktsiden:
    <script src="https://fuglesangstech.github.io/fuglesangstech-datablad/nett/kontaktskjema.js" defer></script>

  Samme prinsipp som skjemaet på /tilbud (tilbudsliste.js):
  Squarespace-skjemaet på siden blir liggende skjult og sender fortsatt e-posten (til adressen i skjemaets
  innstillinger) og lagrer innsendingen. Vårt skjema fyller det ut og trykker «Send».
  Feltene finnes etter type og etikett, ikke etter ID. Finner vi dem ikke, eller sendingen feiler,
  vises Squarespace-skjemaet som før, ferdig utfylt.

  Emne kan forhåndsvelges med lenker som /kontakt-oss?emne=analyse (se EMNER under).
*/
(function () {
  'use strict';
  if (window.__ftKontakt) return; window.__ftKontakt = 1;
  var SIDE = '/kontakt-oss', VERSJON = '2026-11-11a';
  if (location.pathname.replace(/\/+$/, '') !== SIDE && !document.getElementById('ft-kontaktskjema')) return;

  var EMNER = [
    ['produkter', 'Produkter og pris'],
    ['rad', 'Teknisk rådgivning'],
    ['analyse', 'Oljeanalyse og prøvetaking'],
    ['service', 'Service og vedlikehold'],
    ['kurs', 'Kurs'],
    ['belegg', 'ARC-belegg'],
    ['annet', 'Annet']
  ];
  var HINT = {
    produkter: 'Skriv gjerne produktnavn, emballasje og omtrentlig mengde.',
    rad: 'Beskriv utstyret, driftsforholdene og hva som er problemet i dag.',
    analyse: 'Hva slags maskin eller system, og hvilken olje brukes i dag?',
    service: 'Hva slags utstyr gjelder det, og hvor står det?',
    kurs: 'Hvilket kurs, omtrent hvor mange deltakere og ønsket tidspunkt.',
    belegg: 'Hva skal beskyttes eller repareres, og omtrent hvor stor flate?',
    annet: ''
  };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function fmtOrg(n) { n = digits(n); return n.length === 9 ? n.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') : n; }
  function title(s) { return String(s || '').toLowerCase().replace(/(^|[\s\-\/(])([a-zæøå])/g, function (m, a, b) { return a + b.toUpperCase(); }).replace(/\bAs\b/g, 'AS').replace(/\bAsa\b/g, 'ASA').replace(/\bSa\b/g, 'SA').replace(/\bDa\b/g, 'DA').replace(/\bAns\b/g, 'ANS'); }
  function tilbudAntall() { try { return window.FTTilbud ? window.FTTilbud.count() : (JSON.parse(localStorage.getItem('ft-tilbudsliste-v1') || '[]') || []).length; } catch (e) { return 0; } }

  var CSS = [

    '.ftc{--n:#052b69;--nd:#031c47;--sky:#9cc2ff;--tint:#e9eff8;--ink:#111a28;--tx:#2a3443;--mu:#5f6b7a;--ln:#d6dbe2;font-family:"Barlow",system-ui,sans-serif;color:var(--tx);font-size:16px;line-height:1.5;margin-bottom:24px}',
    '.ftc *,.ftc *::before,.ftc *::after{box-sizing:border-box}',
    '.ftc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:18px 20px;align-items:start}',
    '.ftc-f{display:grid;gap:6px;min-width:0;position:relative}.ftc-f.full{grid-column:1/-1}',
    '.ftc-f>label,.ftc-f>.ftc-l{font-weight:600;font-size:15px;color:var(--ink)}.ftc-f label i,.ftc-f .ftc-l i{font-style:normal;color:var(--mu);font-weight:500}',
    '.ftc input,.ftc select,.ftc textarea{font:inherit;font-size:16px;color:var(--ink);background:#fff;border:1px solid var(--ln);border-radius:8px;padding:13px 14px;width:100%;min-width:0;transition:border-color .15s,box-shadow .15s;-webkit-appearance:none;appearance:none}',
    '.ftc select{background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%278%27%3E%3Cpath d=%27M1 1l5 5 5-5%27 fill=%27none%27 stroke=%27%235f6b7a%27 stroke-width=%271.6%27/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;padding-right:38px}',
    '.ftc textarea{min-height:120px;resize:vertical}',
    '.ftc input:focus,.ftc select:focus,.ftc textarea:focus{outline:0;border-color:var(--n);box-shadow:0 0 0 3px rgba(5,43,105,.12)}',
    '.ftc .bad input,.ftc .bad textarea{border-color:#b3261e}.ftc-err{font-size:13.5px;color:#b3261e;min-height:0}.ftc-err:empty{display:none}',
    '.ftc-pair{display:grid;grid-template-columns:96px minmax(0,1fr);gap:10px}',
    '.ftc-hint{font-size:13.5px;color:var(--mu)}.ftc-hint b{color:var(--n);font-weight:600}',
    '.ftc-sug{position:absolute;left:0;right:0;top:100%;margin-top:4px;background:#fff;border:1px solid var(--ln);border-radius:10px;box-shadow:0 10px 30px rgba(17,26,40,.12);z-index:20;overflow:hidden;list-style:none;padding:4px;margin-left:0}',
    '.ftc-sug li{padding:9px 12px;border-radius:7px;cursor:pointer;display:flex;justify-content:space-between;gap:12px;font-size:15px}.ftc-sug li small{color:var(--mu);white-space:nowrap}',
    '.ftc-sug li:hover,.ftc-sug li.on{background:var(--tint)}',
    '.ftc-foot{display:flex;flex-wrap:wrap;align-items:center;gap:14px 20px;margin-top:22px}',
    '.ftc-send{display:inline-flex;align-items:center;gap:10px;background:var(--n);color:#fff;border:1.5px solid var(--n);border-radius:6px;padding:14px 26px;font:inherit;font-weight:600;font-size:16px;cursor:pointer;transition:background .15s,transform .15s}',
    '.ftc-send:hover{background:var(--nd);transform:translateY(-1px)}.ftc-send[disabled]{opacity:.75;cursor:progress;transform:none}',
    '.ftc-spin{width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;animation:ftcspin .8s linear infinite;display:none}.ftc-send[disabled] .ftc-spin{display:inline-block}',
    '@keyframes ftcspin{to{transform:rotate(360deg)}}',
    '.ftc-priv{font-size:13.5px;color:var(--mu);flex:1 1 260px;margin:0}',
    '.ftc-alert{margin-top:16px;padding:14px 16px;border-radius:10px;background:#fdecea;border:1px solid #f5c2bd;color:#7a1c14;font-size:15px}',
    '.ftc-alert:empty{display:none}',
    '.ftc-hp{position:absolute!important;left:-10000px!important;width:1px;height:1px;overflow:hidden}',
    '.ftc-sqhide{position:absolute!important;left:-10000px!important;top:0!important;width:600px!important;height:1px!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important}',
    '.ftck{--navy:#052b69;--navy-d:#031c47;--sky:#9cc2ff;--tint:#e9eff8;--ink:#111a28;--muted:#5f6b7a;--line:#d6dbe2;font-family:"Barlow",system-ui,sans-serif;color:#2a3443;line-height:1.55;border:1px solid var(--line);border-radius:16px;overflow:hidden;background:#fff;max-width:680px;animation:ftck-in .5s cubic-bezier(.2,.7,.2,1) both;margin-bottom:24px}',
    '.ftck *{box-sizing:border-box}.ftck :where(h2,h3,p,ol){margin:0;padding:0}',
    '.ftck-top{position:relative;padding:32px 32px 28px;background:linear-gradient(135deg,var(--navy-d) 0%,var(--navy) 60%,#0b4aa8 100%);color:#fff;overflow:hidden}',
    '.ftck-top::after{content:"";position:absolute;right:-60px;top:-60px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(156,194,255,.35) 0%,rgba(156,194,255,0) 70%)}',
    '.ftck-check{width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.12);display:grid;place-items:center;margin-bottom:18px;animation:ftck-pulse 1.6s .5s ease-out 1}',
    '.ftck-check svg{width:34px;height:34px}.ftck-check circle{stroke:var(--sky);stroke-dasharray:76;stroke-dashoffset:76;animation:ftck-draw .6s .15s ease-out forwards}.ftck-check path{stroke:#fff;stroke-dasharray:24;stroke-dashoffset:24;animation:ftck-draw .4s .6s ease-out forwards}',
    '.ftck-top h2{font-family:"Barlow Semi Condensed","Barlow",sans-serif;font-size:clamp(26px,3vw,34px);font-weight:700;line-height:1.1;color:#fff;text-transform:none;letter-spacing:0}',
    '.ftck-top p{margin-top:8px;color:rgba(255,255,255,.85);font-size:17px;max-width:46ch}',
    '.ftck-body{padding:26px 32px 30px;display:grid;gap:22px}',
    '.ftck-body h3{font-family:"Barlow Semi Condensed","Barlow",sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:14px}',
    '.ftck-steps{list-style:none;display:grid;position:relative}',
    '.ftck-steps li{position:relative;display:grid;grid-template-columns:28px 1fr;gap:14px;padding-bottom:16px;opacity:0;animation:ftck-in .45s ease-out forwards}',
    '.ftck-steps li:nth-child(1){animation-delay:.7s}.ftck-steps li:nth-child(2){animation-delay:.85s}.ftck-steps li:nth-child(3){animation-delay:1s;padding-bottom:0}',
    '.ftck-steps li:not(:last-child)::after{content:"";position:absolute;left:13px;top:28px;bottom:0;width:2px;background:var(--tint)}',
    '.ftck-dot{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:14px;font-weight:700;background:var(--tint);color:var(--navy)}.ftck-steps li.done .ftck-dot{background:var(--navy);color:#fff}',
    '.ftck-steps b{display:block;color:var(--ink);font-weight:600;font-size:16px}.ftck-steps div span{display:block;color:var(--muted);font-size:15px}',
    '.ftck-btns{display:flex;flex-wrap:wrap;gap:10px}.ftck-btns a{display:inline-flex;align-items:center;padding:12px 20px;border-radius:6px;font-weight:600;font-size:15.5px;text-decoration:none!important;border:1.5px solid var(--navy)}',
    '.ftck-btns a.p{background:var(--navy);color:#fff!important}.ftck-btns a.p:hover{background:var(--navy-d)}.ftck-btns a.s{color:var(--navy)!important}.ftck-btns a.s:hover{background:var(--tint)}',
    '.ftck-foot{border-top:1px solid var(--line);padding:14px 32px;background:#f6f8fb;font-size:14.5px;color:var(--muted)}.ftck-foot a{color:var(--navy)!important;font-weight:600;text-decoration:none;white-space:nowrap}',
    '@keyframes ftck-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@keyframes ftck-draw{to{stroke-dashoffset:0}}@keyframes ftck-pulse{from{box-shadow:0 0 0 0 rgba(156,194,255,.5)}to{box-shadow:0 0 0 18px rgba(156,194,255,0)}}',
    '@media (max-width:640px){.ftc-grid{grid-template-columns:1fr}.ftck-top,.ftck-body{padding-left:20px;padding-right:20px}.ftck-foot{padding:14px 20px}.ftck-btns a{flex:1 1 100%;justify-content:center}}',
    '@media (prefers-reduced-motion:reduce){.ftck,.ftck *,.ftck *::after{animation:none!important;opacity:1!important}.ftck-check circle,.ftck-check path{stroke-dashoffset:0!important}}'
  ,
    '.ftc-chips{display:flex;flex-wrap:wrap;gap:8px;border:0;padding:0;margin:0;min-width:0}',
    '.ftc-chips legend{font-weight:600;font-size:15px;color:var(--ink);padding:0;margin-bottom:8px;float:left;width:100%}',
    '.ftc-chips label{position:relative;cursor:pointer}',
    '.ftc-chips input{position:absolute;opacity:0;width:1px;height:1px;pointer-events:none}',
    '.ftc-chips span{display:inline-flex;align-items:center;padding:9px 15px;border:1px solid var(--ln);border-radius:999px;font-size:15px;font-weight:500;color:var(--tx);background:#fff;transition:background .15s,border-color .15s,color .15s;user-select:none}',
    '.ftc-chips label:hover span{border-color:var(--n);color:var(--n)}',
    '.ftc-chips input:checked+span{background:var(--n);border-color:var(--n);color:#fff}',
    '.ftc-chips input:focus-visible+span{box-shadow:0 0 0 3px rgba(5,43,105,.25)}',
    '.ftc-note{display:flex;gap:12px;align-items:flex-start;background:var(--tint);border-radius:10px;padding:13px 16px;font-size:15px;color:var(--ink);margin-bottom:20px}',
    '.ftc-note svg{width:20px;height:20px;flex:0 0 20px;color:var(--n);margin-top:1px}.ftc-note a{color:var(--n)!important;font-weight:600;text-decoration:underline;text-underline-offset:3px}',
    '.ftc-note[hidden]{display:none}'
  ].join('\n');

  function formHtml() {
    return '<form class="ftc" novalidate autocomplete="on" aria-label="Kontakt oss">' +
      '<div class="ftc-note" id="ftc-tilbud" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></svg><span></span></div>' +
      '<div class="ftc-grid">' +
      '<div class="ftc-f full" data-f="emne"><fieldset class="ftc-chips"><legend>Hva gjelder det?</legend>' +
      EMNER.map(function (e) { return '<label><input type="radio" name="ftc-emne" value="' + e[0] + '"><span>' + esc(e[1]) + '</span></label>'; }).join('') +
      '</fieldset></div>' +
      '<div class="ftc-f" data-f="navn"><label for="ftc-navn">Navn</label><input id="ftc-navn" name="name" autocomplete="name" required><span class="ftc-err"></span></div>' +
      '<div class="ftc-f" data-f="firma"><label for="ftc-firma">Firma <i>(valgfritt)</i></label><input id="ftc-firma" name="organization" autocomplete="organization" aria-autocomplete="list" aria-controls="ftc-sug"><ul class="ftc-sug" id="ftc-sug" role="listbox" hidden></ul><span class="ftc-hint" id="ftc-org"></span></div>' +
      '<div class="ftc-f" data-f="epost"><label for="ftc-epost">E-post</label><input id="ftc-epost" type="email" name="email" autocomplete="email" inputmode="email" required><span class="ftc-err"></span></div>' +
      '<div class="ftc-f" data-f="tlf"><label for="ftc-tlf">Telefon <i>(valgfritt)</i></label><input id="ftc-tlf" type="tel" name="tel" autocomplete="tel" inputmode="tel"><span class="ftc-err"></span></div>' +
      '<div class="ftc-f full" data-f="melding"><label for="ftc-melding">Melding</label><textarea id="ftc-melding" rows="6" required placeholder="Hva kan vi hjelpe deg med?"></textarea><span class="ftc-hint" id="ftc-melding-hint"></span><span class="ftc-err"></span></div>' +
      '</div>' +
      '<div class="ftc-hp" aria-hidden="true"><label>La stå tomt <input id="ftc-hp" tabindex="-1" autocomplete="off"></label></div>' +
      '<div class="ftc-foot"><button class="ftc-send" type="submit"><span class="ftc-spin" aria-hidden="true"></span><span class="ftc-sendt">Send henvendelse</span></button>' +
      '<p class="ftc-priv">Vi bruker opplysningene bare til å svare deg. De deles ikke med andre.</p></div>' +
      '<div class="ftc-alert" role="alert"></div></form>';
  }
  function successHtml(fornavn, ring) {
    return '<div class="ftck" role="status" tabindex="-1"><div class="ftck-top"><div class="ftck-check" aria-hidden="true"><svg viewBox="0 0 30 30" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="15" cy="15" r="12"/><path d="M9.5 15.5l3.7 3.7 7.3-7.7"/></svg></div>' +
      '<h2>Takk' + (fornavn ? ', ' + esc(fornavn) : '') + '! Vi har fått meldingen</h2><p>Vi svarer så snart vi kan.</p></div>' +
      '<div class="ftck-body"><div><h3>Hva skjer nå</h3><ol class="ftck-steps">' +
      '<li class="done"><span class="ftck-dot">✓</span><div><b>Meldingen er sendt</b><span>Den har kommet fram til oss.</span></div></li>' +
      '<li><span class="ftck-dot">2</span><div><b>Riktig fagperson får den</b><span>Vi sender den videre til den som kan mest om saken.</span></div></li>' +
      '<li><span class="ftck-dot">3</span><div><b>Vi tar kontakt</b><span>' + (ring ? 'På telefon eller e-post' : 'På e-post') + ', med svar, tilbud eller forslag til løsning.</span></div></li></ol></div>' +
      '<div class="ftck-btns"><a class="p" href="/produkter">Se produktene</a><a class="s" href="/">Til forsiden</a></div></div>' +
      '<div class="ftck-foot">Haster det? Ring <a href="tel:22542000">22 54 20 00</a> (man–fre 08–16) eller døgnvakt <a href="tel:+4791542002">915 42 002</a>.</div></div>';
  }

  /* ---------- Squarespace-skjemaet ---------- */
  function lbl(el) {
    var l = el.labels && el.labels[0] ? el.labels[0].textContent : '';
    if (!l) { var box = el.closest('.form-item, .field, fieldset'); l = box ? (box.querySelector('label, legend, .title') || box).textContent : ''; }
    return (l + ' ' + (el.getAttribute('aria-label') || '') + ' ' + (el.placeholder || '')).toLowerCase();
  }
  function sqMap() {
    var blocks = [].slice.call(document.querySelectorAll('.sqs-block-form')), block = null, f = null;
    for (var i = 0; i < blocks.length; i++) { f = blocks[i].querySelector('form'); if (f) { block = blocks[i]; break; } }
    if (!f) return null;
    var ins = [].slice.call(f.querySelectorAll('input, textarea, select')).filter(function (e) { return e.type !== 'hidden' && e.id !== 'message-field' && e.autocomplete !== 'new-password'; });
    function find(test) { return ins.filter(test)[0] || null; }
    var m = {
      block: block, form: f,
      fname: find(function (e) { return e.name === 'fname' || e.autocomplete === 'given-name'; }),
      lname: find(function (e) { return e.name === 'lname' || e.autocomplete === 'family-name'; }),
      email: find(function (e) { return e.type === 'email' || /e-?post|email/.test(lbl(e)); }),
      tel: find(function (e) { return /^tel/.test(e.autocomplete || '') || e.type === 'tel' || (/telefon|phone/.test(lbl(e)) && e.tagName === 'INPUT'); }),
      firma: find(function (e) { return e.tagName === 'INPUT' && /firma|bedrift|selskap|company/.test(lbl(e)); }),
      melding: find(function (e) { return e.tagName === 'TEXTAREA' && /forespørsel|melding|henvendelse|beskjed|message/.test(lbl(e)); }) || find(function (e) { return e.tagName === 'TEXTAREA'; }),
      btn: f.querySelector('button[type="submit"], input[type="submit"]')
    };
    m.name = m.fname ? null : find(function (e) { return e.tagName === 'INPUT' && /navn|name/.test(lbl(e)) && e !== m.firma; });
    m.ok = !!(m.email && m.melding && m.btn && (m.fname || m.name));
    return m;
  }
  function setAny(el, v) {
    if (!el) return;
    var proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    ['input', 'change', 'blur'].forEach(function (t) { el.dispatchEvent(new Event(t, { bubbles: true })); });
  }
  // Squarespace sender skjemaet med POST til /api/form/SaveFormSubmission: vi lytter på svaret
  var NET = { status: 0 };
  function watchNet() {
    if (window.__ftcNet) return; window.__ftcNet = 1;
    var hit = function (u) { return /\/api\/form\/SaveFormSubmission/i.test(String(u || '')); };
    var XO = XMLHttpRequest.prototype.open, XS = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (meth, url) { this.__ftcUrl = url; return XO.apply(this, arguments); };
    XMLHttpRequest.prototype.send = function () {
      var x = this;
      if (hit(x.__ftcUrl)) x.addEventListener('loadend', function () { NET.status = x.status || -1; });
      return XS.apply(this, arguments);
    };
    if (window.fetch) {
      var F = window.fetch;
      window.fetch = function (input) {
        var u = typeof input === 'string' ? input : (input && input.url);
        var p = F.apply(this, arguments);
        if (hit(u)) p.then(function (r) { NET.status = r.status; }, function () { NET.status = -1; });
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
  function sqErrors(m) {
    if (NET.status >= 400 || NET.status === -1) return ['serveren svarte med feil (' + NET.status + ')'];
    return [].slice.call(m.block.querySelectorAll('[class*="error"], [role="alert"]')).filter(function (e) { return e.offsetParent !== null || e.getClientRects().length; })
      .map(function (e) { return e.textContent.trim(); }).filter(Boolean);
  }

  /* ---------- Brønnøysund-oppslag på firma ---------- */
  function wireBrreg(root, st) {
    var inp = root.querySelector('#ftc-firma'), ul = root.querySelector('#ftc-sug'), hint = root.querySelector('#ftc-org'), t, seq = 0, hits = [], cur = -1;
    function pick(e) {
      st.org = e.organisasjonsnummer; inp.value = title(e.navn);
      hint.innerHTML = 'Org.nr. <b>' + fmtOrg(e.organisasjonsnummer) + '</b> fra Brønnøysundregistrene';
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

  /* ---------- skjemaet ---------- */
  function emne(root) { var r = root.querySelector('input[name="ftc-emne"]:checked'); return r ? r.value : ''; }
  function emneTekst(k) { for (var i = 0; i < EMNER.length; i++) if (EMNER[i][0] === k) return EMNER[i][1]; return ''; }
  function errSet(root, f, msg) { var b = root.querySelector('[data-f="' + f + '"]'); if (!b) return; b.classList.toggle('bad', !!msg); var e = b.querySelector('.ftc-err'); if (e) e.textContent = msg || ''; }
  function validate(root) {
    var ok = true, g = function (id) { return root.querySelector(id).value.trim(); };
    function chk(f, cond, msg) { errSet(root, f, cond ? '' : msg); if (!cond) ok = false; }
    chk('navn', g('#ftc-navn').length > 1, 'Skriv inn navnet ditt.');
    chk('epost', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(g('#ftc-epost')), 'Skriv inn en gyldig e-postadresse.');
    chk('tlf', !g('#ftc-tlf') || digits(g('#ftc-tlf')).length >= 8, 'Telefonnummeret må ha minst 8 sifre.');
    chk('melding', g('#ftc-melding').length > 5, 'Skriv kort hva henvendelsen gjelder.');
    if (!ok) { var b = root.querySelector('.bad input, .bad textarea'); if (b) b.focus(); }
    return ok;
  }
  function compose(root, st, m) {
    var g = function (id) { return root.querySelector(id).value.trim(); }, lines = [];
    var e = emne(root);
    if (e) lines.push('Gjelder: ' + emneTekst(e));
    if (g('#ftc-tlf') && !m.tel) lines.push('Telefon: ' + g('#ftc-tlf'));
    if (st.org && !m.firma) lines.push('Firma: ' + g('#ftc-firma') + ' (org.nr. ' + fmtOrg(st.org) + ')');
    else if (g('#ftc-firma') && !m.firma) lines.push('Firma: ' + g('#ftc-firma'));
    if (lines.length) lines.push('');
    lines.push(g('#ftc-melding'));
    return lines.join('\n');
  }
  function fillSq(m, root, st) {
    var g = function (id) { return root.querySelector(id).value.trim(); };
    var navn = g('#ftc-navn').split(/\s+/), fn = navn.shift(), ln = navn.join(' ');
    if (m.fname) { setAny(m.fname, fn); setAny(m.lname, ln || '-'); } else setAny(m.name, g('#ftc-navn'));
    setAny(m.email, g('#ftc-epost'));
    if (m.tel && g('#ftc-tlf')) setAny(m.tel, g('#ftc-tlf').replace(/^\+?47\s*/, '').replace(/^0047\s*/, ''));
    if (m.firma) setAny(m.firma, g('#ftc-firma') + (st.org ? ' (org.nr. ' + fmtOrg(st.org) + ')' : ''));
    setAny(m.melding, compose(root, st, m));
  }
  function revealSq(m, root, msg) {
    m.block.classList.remove('ftc-sqhide'); m.block.removeAttribute('aria-hidden');
    root.querySelector('.ftc-alert').innerHTML = esc(msg) + ' Skjemaet under er fylt ut med det du skrev. Kontroller og trykk «' + esc(((m.btn && (m.btn.querySelector('.form-submit-button-label') || m.btn).textContent) || 'Send').trim()) + '».';
    root.querySelector('.ftc-grid').style.display = 'none'; root.querySelector('.ftc-foot').style.display = 'none';
    m.block.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function tilbudNote(root) {
    var n = tilbudAntall(), box = root.querySelector('#ftc-tilbud');
    if (!box) return;
    box.hidden = !n;
    if (n) box.querySelector('span').innerHTML = 'Du har ' + n + (n === 1 ? ' produkt' : ' produkter') + ' i tilbudslisten. Vil du ha pris, <a href="/tilbud">send tilbudslisten</a> i stedet – da følger produktene med.';
  }
  function velgEmne(root, k) {
    var r = root.querySelector('input[name="ftc-emne"][value="' + k + '"]'); if (!r) return;
    r.checked = true;
    var h = root.querySelector('#ftc-melding-hint'); h.textContent = HINT[k] || '';
  }

  function start() {
    var tries = 0, iv = setInterval(function () {
      var m = sqMap();
      if (!m && ++tries < 60) return;                      // Squarespace tegner skjemaet etter sideinnlasting
      clearInterval(iv);
      if (!m || !m.ok) {                                   // Fant ikke feltene: behold Squarespace-skjemaet
        if (window.console) console.warn('Kontaktskjema: fant ikke feltene i Squarespace-skjemaet – viser det vanlige skjemaet.', m);
        document.documentElement.setAttribute('data-ftc', 'reserve');
        return;
      }
      watchNet();
      document.documentElement.setAttribute('data-ftc', 'aktiv');
      var s = document.createElement('style'); s.id = 'ftc-css'; s.textContent = CSS; document.head.appendChild(s);
      var host = document.getElementById('ft-kontaktskjema'), wrap = document.createElement('div');
      wrap.id = 'ftc-host'; wrap.innerHTML = formHtml();
      if (host) host.appendChild(wrap);
      else { var fe = m.block.closest('.fe-block') || m.block.parentNode; fe.insertBefore(wrap, fe.firstChild); }
      m.block.classList.add('ftc-sqhide'); m.block.setAttribute('aria-hidden', 'true');
      var root = wrap.querySelector('.ftc'), st = { org: '' };
      wireBrreg(root, st);
      tilbudNote(root);
      window.addEventListener('fttilbud:endret', function () { tilbudNote(root); });
      window.addEventListener('fttilbud:klar', function () { tilbudNote(root); });
      var q = new URLSearchParams(location.search).get('emne');
      if (q) velgEmne(root, q.toLowerCase());
      root.querySelectorAll('input[name="ftc-emne"]').forEach(function (r) { r.addEventListener('change', function () { velgEmne(root, r.value); }); });
      ['navn', 'epost', 'tlf', 'melding'].forEach(function (f) { var el = root.querySelector('[data-f="' + f + '"] input, [data-f="' + f + '"] textarea'); el.addEventListener('input', function () { if (el.closest('.bad')) errSet(root, f, ''); }); });
      root.addEventListener('submit', function (e) {
        e.preventDefault();
        if (root.querySelector('#ftc-hp').value) return;     // fanget av spamfellen
        if (!validate(root)) return;
        var btn = root.querySelector('.ftc-send'), al = root.querySelector('.ftc-alert');
        al.textContent = ''; btn.disabled = true; btn.querySelector('.ftc-sendt').textContent = 'Sender …';
        var mm = sqMap(); if (!mm || !mm.ok) { revealSq(m, root, 'Noe gikk galt med skjemaet.'); return; }
        try { fillSq(mm, root, st); } catch (err) { revealSq(mm, root, 'Noe gikk galt med skjemaet.'); return; }
        var fornavn = root.querySelector('#ftc-navn').value.trim().split(/\s+/)[0], ring = !!root.querySelector('#ftc-tlf').value.trim();
        var t0 = Date.now(); NET.status = 0;
        setTimeout(function () { mm.btn.click(); }, 150);
        var iv2 = setInterval(function () {
          if (sqSucceeded(mm)) {
            clearInterval(iv2);
            wrap.innerHTML = successHtml(fornavn, ring);
            var card = wrap.querySelector('.ftck'); card.scrollIntoView({ behavior: 'smooth', block: 'center' }); card.focus({ preventScroll: true });
            return;
          }
          var errs = Date.now() - t0 > 1200 ? sqErrors(mm) : [];
          if (errs.length) { clearInterval(iv2); revealSq(mm, root, 'Meldingen ble ikke sendt: ' + errs[0] + '.'); return; }
          if (Date.now() - t0 > 30000) { clearInterval(iv2); revealSq(mm, root, 'Vi fikk ikke bekreftet at meldingen ble sendt.'); }
        }, 300);
      });
    }, 250);
  }
  window.FTKontakt = { versjon: VERSJON, skjema: function () { var m = sqMap(); return { funnet: !!m, ok: !!(m && m.ok) }; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
