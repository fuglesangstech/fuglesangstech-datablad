/*
  Søk i produkter og sider for Fuglesangs Tech – brukes på www.fuglesangstech.no (Footer-kodeinjeksjonen, blokk 2)
  og på produktsidene (produkter.fuglesangstech.no). Samme kode og samme utseende begge steder.
  Utenfor www settes window.FT_SOK før skriptet lastes (se innstillingene øverst i skriptet).
*/
(function () {
  if (window.top !== window || document.getElementById('fts-css')) return;
  var st = document.createElement('style'); st.id = 'fts-css'; st.textContent = "  /* Fuglesangs Tech – søk i produktkatalogen (forstørrelsesglasset og søkefeltet på forsiden) */\n  .fts-ov { position: fixed; inset: 0; z-index: 100000; background: rgba(3, 28, 71, .55); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); display: none; padding: 7vh 16px 16px; overflow-y: auto; }\n  .fts-ov.open { display: block; animation: fts-in .15s ease-out; }\n  @keyframes fts-in { from { opacity: 0; } to { opacity: 1; } }\n  .fts-panel { max-width: 760px; margin: 0 auto; background: #fff; border-radius: 14px; box-shadow: 0 30px 70px -20px rgba(3, 28, 71, .55); overflow: hidden; font-family: \"Barlow\", system-ui, sans-serif; color: #2a3443; }\n  .fts-top { display: flex; align-items: center; gap: 12px; padding: 16px 18px; border-bottom: 1px solid #d6dbe2; }\n  .fts-top svg { width: 22px; height: 22px; color: #052b69; flex: 0 0 22px; }\n  .fts-top input { flex: 1; min-width: 0; border: 0; outline: 0; font: 500 21px/1.3 \"Barlow\", system-ui, sans-serif; color: #111a28; background: transparent; padding: 6px 0; -webkit-appearance: none; appearance: none; }\n  .fts-top input::placeholder { color: #8a95a3; }\n  .fts-top input::-webkit-search-cancel-button { display: none; }\n  .fts-x { border: 1px solid #d6dbe2; background: #fff; color: #5f6b7a; font: 600 12px/1 \"Barlow\", sans-serif; letter-spacing: .04em; border-radius: 6px; padding: 7px 9px; cursor: pointer; }\n  .fts-x:hover { border-color: #052b69; color: #052b69; }\n  .fts-body { max-height: min(64vh, 640px); overflow-y: auto; overscroll-behavior: contain; }\n  .fts-dd { position: fixed; left: 0; top: 0; width: 320px; z-index: 99990; background: #fff; border-radius: 12px; box-shadow: 0 24px 60px -18px rgba(3, 28, 71, .5); border: 1px solid #d6dbe2; overflow: hidden; display: none; font-family: \"Barlow\", system-ui, sans-serif; color: #2a3443; text-align: left; }\n  .fts-dd.open { display: block; }\n  .fts-dd .fts-body { max-height: 420px; }\n  .fts-h { font: 700 12px/1 \"Barlow\", sans-serif; letter-spacing: .08em; text-transform: uppercase; color: #5f6b7a; padding: 16px 18px 8px; }\n  .fts-item { display: flex; align-items: center; gap: 14px; padding: 9px 18px; color: inherit; text-decoration: none; cursor: pointer; }\n  .fts-item:hover, .fts-item.act { background: #eef3fa; }\n  .fts-th { width: 48px; height: 48px; flex: 0 0 48px; border-radius: 8px; border: 1px solid #e3e7ed; background: #fff; display: grid; place-items: center; overflow: hidden; }\n  .fts-th img { width: 100%; height: 100%; object-fit: contain; padding: 3px; box-sizing: border-box; }\n  .fts-th svg { width: 22px; height: 22px; color: #052b69; }\n  .fts-th.fts-pg { background: #eef3fa; border-color: #dbe4f1; }\n  .fts-th.fts-pg.logo { background: #fff; border-color: #e3e7ed; }\n  .fts-th.fts-pg.logo img { padding: 6px; }\n  .fts-tx { min-width: 0; display: flex; flex-direction: column; gap: 2px; }\n  .fts-n { font: 600 17px/1.25 \"Barlow Semi Condensed\", \"Barlow\", sans-serif; color: #111a28; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n  .fts-n mark { background: none; color: #052b69; font-weight: 700; }\n  .fts-m { font-size: 13px; color: #5f6b7a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n  .fts-more { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 18px; border-top: 1px solid #d6dbe2; background: #f3f4f6; font-weight: 600; color: #052b69; text-decoration: none; }\n  .fts-more:hover, .fts-more.act { background: #e6ecf5; }\n  .fts-note { padding: 18px; color: #5f6b7a; font-size: 15px; }\n  .fts-note a { color: #052b69; font-weight: 600; }\n  .fts-chips { display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 18px 16px; }\n  .fts-chip { border: 1px solid #d6dbe2; background: #fff; border-radius: 999px; padding: 6px 13px; font: 500 14px/1.2 \"Barlow\", sans-serif; color: #111a28; cursor: pointer; }\n  .fts-chip:hover { border-color: #052b69; color: #052b69; }\n  .fts-load { display: inline-block; width: 14px; height: 14px; border: 2px solid #c9d3e2; border-top-color: #052b69; border-radius: 50%; animation: fts-spin .7s linear infinite; vertical-align: -2px; margin-right: 8px; }\n  @keyframes fts-spin { to { transform: rotate(360deg); } }\n  /* Søkeknappen i toppmenyen (erstatter Squarespace-knappen med ⌕) */\n  a.fts-btn, a.fts-btn:link, a.fts-btn:visited { display: inline-flex !important; align-items: center !important; justify-content: center; gap: 9px; height: 44px !important; min-height: 0 !important; padding: 0 18px 0 15px !important; margin: 0 !important; border: 1px solid #d6dbe2 !important; border-radius: 999px !important; background: #fff !important; color: #052b69 !important; font: 500 16px/1 \"Barlow\", system-ui, sans-serif !important; letter-spacing: 0 !important; text-transform: none !important; text-decoration: none !important; box-shadow: none !important; transform: none !important; opacity: 1 !important; transition: border-color .15s, background-color .15s, box-shadow .15s !important; }\n  a.fts-btn::before, a.fts-btn::after { display: none !important; }\n  a.fts-btn svg { width: 19px; height: 19px; flex: 0 0 19px; }\n  a.fts-btn .fts-k { font: 600 12px/1 \"Barlow\", sans-serif; color: #5f6b7a; border: 1px solid #d6dbe2; border-radius: 5px; padding: 3px 6px; margin-left: 4px; }\n  a.fts-btn:hover, a.fts-btn:focus-visible { border-color: #052b69 !important; background: #f3f6fb !important; color: #052b69 !important; box-shadow: 0 6px 16px -10px rgba(5, 43, 105, .45) !important; }\n  a.fts-btn:focus-visible { outline: 2px solid #052b69 !important; outline-offset: 2px !important; }\n  .header-menu a.fts-btn { width: auto !important; padding: 0 24px 0 20px !important; height: 48px !important; font-size: 17px !important; }\n  .header-menu a.fts-btn .fts-k { display: none !important; }\n  a.fts-btn.fts-mob { flex: 0 0 44px !important; width: 44px !important; min-width: 44px !important; padding: 0 !important; gap: 0 !important; margin-right: 10px !important; }\n  a.fts-btn.fts-mob .fts-t, a.fts-btn.fts-mob .fts-k { display: none !important; }\n  .header-display-mobile .header-title-nav-wrapper { flex: 1 1 auto !important; min-width: 0; }\n  @media (max-width: 1100px) { a.fts-btn .fts-k { display: none; } }\n  .fts-hwrap { display: flex; align-items: center; margin-left: 24px; flex: 0 0 auto; }\n  .header-display-desktop .header-actions--right:has(.fts-hwrap) { display: flex !important; align-items: center; }\n  @media (max-width: 640px) { .fts-ov { padding: 0; } .fts-panel { border-radius: 0; min-height: 100%; } .fts-body { max-height: none; } .fts-top input { font-size: 18px; } }\n  @media (prefers-reduced-motion: reduce) { .fts-ov.open { animation: none; } .fts-load { animation-duration: 2s; } }\n";
  (document.head || document.documentElement).appendChild(st);
})();
(function () {
  if (window.top !== window || window.__ftSok) return;   // ikke i skjult indeks-ramme, og bare én gang
  window.__ftSok = true;
  // Innstillinger når søket brukes utenfor www (produktsidene): window.FT_SOK = { www: 'https://www.fuglesangstech.no', data: '<produktliste.json>', produkt: '/{id}/' }
  var CFG = window.FT_SOK || {}, WWW = CFG.www || '';
  function abs(u) { return /^https?:/.test(u) ? u : WWW + u; }
  function prodHref(p) { return p.href ? p.href : CFG.produkt ? CFG.produkt.replace('{id}', encodeURIComponent(p.id)) : WWW + KAT + '#' + encodeURIComponent(p.id); }
  var KAT = '/produkter', KEY = 'ftSok:v4', TTL = 30 * 60 * 1000;   // produktlisten fra /produkter hentes på nytt etter 30 minutter
  // [navn, adresse, søkeord, undertekst, ikon]
  var PAGES = [
    ['Tjenester', '/tjenester', 'service prøvetaking oljeanalyse kurs', 'Service, oljeanalyse og kurs', 'i:wrench'],
    ['Prøvetaking og oljeanalyse', '/tjeneste-prvetaking', 'oljeprøve laboratorium analyse brukt olje bakterier', 'Analyse i eget oljelaboratorium', 'i:flask'],
    ['Service og vedlikehold', '/tjeneste-service', 'verksted reparasjon hydraulikk pumpe', 'Hos dere eller på verkstedet i Oslo', 'i:gear'],
    ['Kurs', '/tjeneste-kurs', 'opplæring maskinhelse tilstandskontroll mikrobiell vekst', 'Maskinhelse og smøremidler, tilstandskontroll og mikrobiell vekst i olje', 'i:cap'],
    ['Kurs i tilstandskontroll', '/tjeneste-kurs-tilstandskontroll', 'kurs opplæring tilstandsovervåking vedlikehold havari', 'Oppdag slitasje og feil før havari', 'i:cap'],
    ['Kurs i mikrobiell vekst i olje', '/tjeneste-kurs-mikrobiell-vekst', 'kurs opplæring bakterier sopp bakterievekst hydraulikk', 'Bakterier og sopp i olje – forebygging og behandling', 'i:cap'],
    ['Leverandører', '/leverandorer', 'eneleverandør merker', 'Merkene vi leverer', 'i:truck'],
    ['Chesterton', '/chesterton-1', 'arc belegg', 'Smøremidler, vedlikehold og ARC-belegg', 'i:tag'],
    ['Lubrication Engineers (LE)', '/le-about', 'le', 'Høyytelsesoljer og fett', 'i:tag'],
    ['UTB', '/utb', 'bil motorolje', 'Smøremidler og kjølevæsker', 'i:tag'],
    ['Finn olje til bilen – søk på bilskilt', '/finn-olje-til-bilen', 'bilskilt regnummer registreringsnummer bil nummersøk skiltsøk olje til bil', 'Anbefalte UTB-produkter til bilen', 'i:car'],
    ['Royal Purple Industrial', '/royal-purple-industrial', 'syntetisk', 'Syntetiske industrismøremidler', 'i:tag'],
    ['Vickers Oils', '/vickers-oils', 'miljø eal biologisk nedbrytbar', 'Miljøtilpassede smøremidler', 'i:tag'],
    ['Perma-Tec', '/perma-tec', 'automatisk smøring smørekopp', 'Automatiske smøresystemer', 'i:tag'],
    ['Chesterton ARC-belegg', '/vi-satser-p-belegg', 'belegg komposittbelegg', 'Komposittbelegg for industrien', 'i:shield'],
    ['Artikler', '/artikler', 'fagartikler', 'Fagstoff om smøring og hydraulikk', 'i:news'],
    ['Om oss', '/om-oss', 'fuglesangs tech historie', 'Smøremidler siden 1982', 'i:info'],
    ['Våre ansatte', '/vre-ansatte', 'kontaktpersoner ansatte', 'Fagfolk med direkte kontaktinfo', 'i:users'],
    ['Kontakt oss', '/kontakt-oss', 'telefon adresse e-post åpningstider', 'Telefon 22 54 20 00 · Caspar Storms vei 21', 'i:phone'],
    ['Datablad og sertifikater', '/datablad', 'sikkerhetsdatablad sds pds produktdatablad stoffkartotek hms sertifikat sertifikater godkjenning nsf h1 ce halal kosher bruksanvisning installasjonsveiledning dokumenter', 'Datablad, sertifikater og bruksanvisninger per produkt', 'i:request'],
    ['Ressurser', '/ressurser', 'ressurser brosjyre brosjyrer katalog kataloger produktkatalog case casestudie case-studier referanser teknisk veiledning techni-tip litteratur fagstoff', 'Kataloger, brosjyrer, case-studier og tekniske veiledninger', 'i:news'],
    ['LE-produkter', '/produkter?lev=le', 'lubrication engineers katalog sds', 'Hele LE-sortimentet med datablad', 'i:tag'],
    ['Chesterton-produkter', '/produkter?lev=ch', 'chesterton katalog sds arc', 'Chesterton-produkter med datablad', 'i:tag'],
    ['UTB-produkter', '/produkter?lev=utb', 'utb katalog sds', 'UTB-produktene med datablad', 'i:tag'],
    ['Vickers-produkter', '/produkter?lev=vik', 'vickers katalog ecosure biogear biogrease vickerlube eal h1 sds', 'Vickers-produkter med datablad', 'i:tag'],
    ['Perma-Tec-produkter', '/produkter?lev=perma', 'perma katalog smøresystem star vario flex classic futura', 'Automatiske smøresystemer, levert fylt med fett', 'i:tag'],
    ['Royal Purple-produkter', '/produkter?lev=rpi', 'royal purple industrial katalog synfilm synergy thermyl uni-temp barrier fluid kompressorolje sds', 'Royal Purple Industrial med norske datablad', 'i:tag'],
    ['BioMax', '/biomax', 'biomax miljø eal biologisk nedbrytbar', 'Miljøtilpassede smøremidler (EAL)', 'i:tag'],
    ['BioMax-produkter', '/produkter?lev=biomax', 'biomax katalog eal hekkrør stern tube girolje hydraulikkolje fett sds', 'BioMax-produktene med norske datablad', 'i:tag'],
    ['Personvern', '/personvern', 'personvernerklæring personvern gdpr informasjonskapsler cookies', 'Hvordan vi behandler personopplysninger', 'i:info'],
    ['Lag stoffkartotek', '/datablad?type=sds#stoffkartotek', 'stoffkartotek sikkerhetsdatablad sds msds hms zip last ned alle datablad kjemikalier', 'Last ned alle sikkerhetsdatabladene samlet i én ZIP-fil', 'i:request']
  ];
  // Søk som handler om datablad: vis «Lag stoffkartotek» øverst
  var STOFF = /^(stoff|sikkerhet|sds|msds|hms|datab|produktdatab|kjemikal|pds\b)/;
  var PICO = {"wrench": "<path d=\"M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4 2.5-2.5z\"/>", "flask": "<path d=\"M9 3h6\"/><path d=\"M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3\"/><path d=\"M7.5 15h9\"/>", "gear": "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1\"/>", "cap": "<path d=\"M22 9L12 4 2 9l10 5 10-5z\"/><path d=\"M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5\"/>", "bolt": "<path d=\"M12 2l2 3h4l1 4-3 3 1 4-5 2-5-2 1-4-3-3 1-4h4z\"/><circle cx=\"12\" cy=\"11\" r=\"2.5\"/>", "truck": "<path d=\"M3 7h11v9H3z\"/><path d=\"M14 10h4l3 3v3h-7\"/><circle cx=\"7\" cy=\"17.5\" r=\"1.8\"/><circle cx=\"17\" cy=\"17.5\" r=\"1.8\"/>", "car": "<path d=\"M5 17h14v-5l-2-5H7l-2 5z\"/><circle cx=\"7.5\" cy=\"17\" r=\"1.5\"/><circle cx=\"16.5\" cy=\"17\" r=\"1.5\"/><path d=\"M5 12h14\"/>", "shield": "<path d=\"M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z\"/><path d=\"M9 12l2 2 4-4\"/>", "news": "<path d=\"M4 5h13v14H6a2 2 0 0 1-2-2z\"/><path d=\"M17 9h3v8a2 2 0 0 1-2 2\"/><path d=\"M8 9h5M8 13h5\"/>", "info": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v5\"/><path d=\"M12 8h.01\"/>", "users": "<circle cx=\"9\" cy=\"8\" r=\"3.2\"/><path d=\"M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5\"/><path d=\"M16 5.2a3 3 0 0 1 0 5.6M18 14.8c2 .6 3 2.4 3 5.2\"/>", "phone": "<path d=\"M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z\"/>", "tag": "<path d=\"M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z\"/><circle cx=\"7.5\" cy=\"7.5\" r=\"1.5\"/>", "drop": "<path d=\"M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z\"/>", "request": "<path d=\"M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z\"/><path d=\"M14 3v5h5\"/><path d=\"M9 14l2 2 4-4\"/>"};
  // Produktveilederen og viskositetsomregningen – egne snarveier i søket
  var VEIL = ['Hjelp meg å velge produkt', '/produkter#veileder', 'veileder hjelp velge hvilket produkt trenger anbefaling anbefale usikker råd forslag', 'Svar på noen korte spørsmål, så foreslår vi produkter', 'i:compass'];
  var VISK = ['Omregning av viskositet', '/produkter#viskositet', 'viskositet omregning omregne regne om iso vg agma sae cst mm2/s sus saybolt kalkulator driftstemperatur', 'ISO VG, AGMA, SAE og viskositet ved driftstemperatur', 'i:gauge'];
  PAGES.splice(PAGES.length - 1, 0, VEIL, VISK);
  PICO.compass = '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>';
  PICO.gauge = '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-6"/><path d="M4 18h16"/>';
  var POP = ['Hydraulikkolje', 'Rustløser', 'Anti-seize', 'ARC', 'Kjølevæske', 'Girolje', 'Matvaregodkjent', 'Datablad'];
  var ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
  var PAGE_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function norm(s) { return String(s || '').toLowerCase().replace(/[®™]/g, '').replace(/[^a-z0-9æøåäöü]+/g, ' ').trim(); }

  /* ---------- Produktlisten: hentes fra /produkter i en skjult ramme og lagres i 12 timer ---------- */
  var P = null, loading = null, waiters = [];
  try { var c = JSON.parse(localStorage.getItem(KEY) || 'null'); if (c && Date.now() - c.t < TTL && c.p && c.p.length) P = prep(c.p); } catch (e) {}
  function prep(rows) {
    return rows.map(function (r) {
      var h = norm(r[1] + ' ' + r[2] + ' ' + r[3] + ' ' + r[5] + ' ' + r[0]);
      // katalogkortene har «id~søketekst» (varianter, varenumre); lenken skal bare ha id-en
      return { id: String(r[0]).split('~')[0], n: r[1], sup: r[2], kat: r[3], img: r[4], href: r[6] || '', tags: r[7] || '', d: r[8] || r[5] || '', h: h, hc: h.replace(/ /g, ''), nn: norm(r[1]), nk: norm(r[3]) };
    });
  }
  /* ---------- Flere produktkilder: kataloger med produktdata i GitHub ----------
     Nye kataloger: legg til én linje i SRC. Nye produkter i en katalog kommer med automatisk. */
  var GH = 'https://datablad.fuglesangstech.no/';
  var SRC = [
    { url: 'vickers/produkter.json', sup: 'Vickers Oils', side: '/vickers-katalog' },
    { url: 'perma/produkter.json', sup: 'Perma-Tec', side: '/perma-tec-katalog' }
  ];
  var X = null, xLoading = false, xWait = [];
  function ghUrl(p) { return GH + String(p).split('/').map(encodeURIComponent).join('/'); }
  function loadX(cb) {
    if (X) return cb();
    xWait.push(cb);
    if (xLoading) return;
    xLoading = true;
    Promise.all(SRC.map(function (s) {
      return fetch(GH + s.url, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        return ((d && d.produkter) || []).map(function (p) {
          var ord = [p.beskrivelse || '', (p.egenskaper || []).join(' '), p.info || '',
            (p.varianter || []).concat(p.emballasje || []).map(function (v) { return v.join(' '); }).join(' '),
            ((p.matrise || {}).rader || []).map(function (rw) { return rw[0] + ' ' + rw[1].join(' '); }).join(' ')].join(' ');
          return [s.sup + ':' + p.navn, p.navn, s.sup, p.kategori || '', p.bilde ? ghUrl(p.bilde) : '', ord,
            s.side + '?q=' + encodeURIComponent(String(p.navn).replace(/\s*\(S[FO]\d\d\)$/, '')), (p.egenskaper || []).join('|'), p.beskrivelse || ''];
        });
      }).catch(function () { return []; });
    })).then(function (lists) {
      X = prep([].concat.apply([], lists)); xLoading = false;
      var w = xWait; xWait = []; w.forEach(function (f) { f(); });
    });
  }
  function all() {
    var a = P || [];
    if (!X) return a;
    // Når en leverandør er lagt inn i /produkter, brukes den i stedet for katalogfila (ingen doble treff)
    var sup = {}; a.forEach(function (p) { sup[norm(p.sup)] = 1; });
    return a.concat(X.filter(function (p) { return !sup[norm(p.sup)]; }));
  }

  /* ---------- Sider: faste snarveier + Squarespace sitt eget søk, så nye sider kommer med automatisk ---------- */
  var API = {}, SKIP = ['/home-1', '/search', '/startside', '/404', '/produkter'];
  function apiPages(q, cb) {
    if (WWW) return;   // Squarespace-søket finnes bare på www
    var k = norm(q); if (!k || API[k]) return;
    API[k] = [];
    fetch('/api/search/GeneralSearch?q=' + encodeURIComponent(q) + '&p=0').then(function (r) { return r.json(); }).then(function (d) {
      var known = {}; PAGES.forEach(function (p) { known[p[1]] = 1; });
      API[k] = ((d && d.items) || []).filter(function (it) { return it.itemUrl && !known[it.itemUrl] && SKIP.indexOf(it.itemUrl) < 0 && !/-katalog$/.test(it.itemUrl) && !/^SYSTEM\b/.test(it.title || ''); })
        .slice(0, 4).map(function (it) { return [String(it.title || it.itemUrl).replace(/-/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }), it.itemUrl, '', '', 'i:request']; });
      if (API[k].length) cb();
    }).catch(function () {});
  }

  function load(cb) {
    loadX(function () { cb(P); });
    loadP(cb);
  }
  function loadP(cb) {
    if (P) return cb(P);
    waiters.push(cb);
    if (loading) return;
    loading = true;
    if (CFG.data) {   // produktsidene: ferdig produktliste i samme format som raden under
      fetch(CFG.data).then(function (r) { return r.json(); }).then(function (rows) { finish(prep(rows)); }).catch(function () { finish(null); });
      return;
    }
    function finish(res) { loading = false; if (res) P = res; var w = waiters; waiters = []; w.forEach(function (cb) { cb(P); }); }
    var f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1; f.title = 'Produktindeks';
    f.style.cssText = 'position:absolute;width:1200px;height:800px;left:-99999px;top:0;border:0;visibility:hidden;pointer-events:none';
    f.src = KAT;
    document.body.appendChild(f);
    var n = 0, last = -1, still = 0;
    var iv = setInterval(function () {
      n++;
      var d; try { d = f.contentDocument; } catch (e) { return done(null); }
      if (!d) return;
      var more = d.getElementById('ft-more');
      if (more) { more.click(); still = 0; return; }
      var cards = d.querySelectorAll('a.card');
      if (cards.length && cards.length === last) still++; else still = 0;
      last = cards.length;
      if (cards.length && still >= 3) {
        var rows = [].map.call(cards, function (a) {
          var sup = (a.querySelector('.sup') || {}).textContent || '', parts = sup.split(' · ');
          var img = a.querySelector('img:not(.ph)');
          return [decodeURIComponent((a.getAttribute('href') || '').replace(/^#/, '')), (a.querySelector('h2') || {}).textContent || '',
            parts[0] || '', parts.slice(1).join(' · '), img ? img.getAttribute('src') : '', ((a.querySelector('.desc') || {}).textContent || '').slice(0, 160), '',
            [].map.call(a.querySelectorAll('.tags .tag'), function (t) { return t.textContent.trim(); }).join('|')];
        }).filter(function (r) { return r[0] && r[1]; });
        try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), p: rows })); } catch (e) {}
        return done(prep(rows));
      }
      if (n > 250) done(null);   // ca. 25 sekunder
    }, 100);
    function done(res) {
      clearInterval(iv); f.remove(); loading = false;
      if (res) P = res;
      var w = waiters; waiters = [];
      w.forEach(function (cb) { cb(P); });
    }
  }

  /* ---------- Søk ---------- */
  // norske søkeord som også skal finne engelske produktnavn
  var SYN = { hydraulikk: ['hydraulic'], gir: ['gear'], fett: ['grease'], smørefett: ['grease'], rust: ['rust', 'penetrat'], kjølevæske: ['antifreeze', 'coolant'],
    frost: ['antifreeze'], kjede: ['chain'], kjetting: ['chain'], motorolje: ['engine'], kompressor: ['compressor'], turbin: ['turbine'], matvare: ['h1', 'food'],
    avfett: ['degreas', 'cleaner'], rengjøring: ['cleaner', 'degreas'], gjenge: ['thread', 'seize'], tape: ['tape'], pakning: ['gasket', 'packing'],
    belegg: ['arc', 'coating'], wire: ['wire rope'], penetrer: ['penetrat'], automatgir: ['atf', 'transmission'], spray: ['spray', 'aerosol'],
    smørepumpe: ['fettpresse', 'grease gun', 'xpel'], oljepumpe: ['xpel', 'oljekanne'], fatpumpe: ['xpel'], fettpistol: ['fettpresse', 'grease gun'],
    fettsprøyte: ['fettpresse', 'grease gun'], smørepistol: ['fettpresse', 'grease gun'], sentralsmøring: ['smøreapparat'], automatsmøring: ['smøreapparat'],
    antiseize: ['anti-seize', 'gjengepasta'], kobberpasta: ['anti-seize', 'gjengepasta'], rustolje: ['rustløs', 'penetrat', 'korrosjon'], wd40: ['penetrat', 'rustløs'],
    bremsevæske: ['brake fluid'], miljøolje: ['eal', 'bio'], matgodkjent: ['h1', 'food'] };
  function alts(w) {
    var a = [w];
    if (SYN[w]) return a.concat(SYN[w]);   // eget oppslag for ordet: bruk bare det (så «fettpistol» ikke blir «fett»)
    for (var k in SYN) if (w.indexOf(k) === 0 || (w.length >= 4 && k.indexOf(w) === 0)) a = a.concat(SYN[k]);
    return a;
  }
  function search(q) {
    var t = norm(q).split(' ').filter(Boolean);
    if (!t.length) return { prods: [], pages: [] };
    var nq = norm(q), ta = t.map(alts);
    function score(hay, hc, name, kat) {
      var s = 0;
      for (var i = 0; i < ta.length; i++) {
        var best = -1;
        for (var j = 0; j < ta[i].length; j++) {
          var w = ta[i][j], v = -1;
          // korte ord og rene tall (produktnumre) må stå som eget ord, så «5180» ikke treffer «5 1 80» i en annen tekst
          if (w.length <= 3 || /^\d+$/.test(w) ? (' ' + hay).indexOf(' ' + w) < 0 : (hay.indexOf(w) < 0 && hc.indexOf(w.replace(/ /g, '')) < 0)) continue;
          if ((' ' + name + ' ').indexOf(' ' + w + ' ') > -1) v = 30;
          else if ((' ' + name).indexOf(' ' + w) > -1) v = 20;
          else if (name.replace(/ /g, '').indexOf(w) > -1) v = 12;
          else if (kat && kat.indexOf(w) > -1) v = 10;
          else v = 2;
          if (j > 0) v = Math.max(1, v - 8);   // treff på synonym teller litt mindre enn treff på ordet kunden skrev
          if (v > best) best = v;
        }
        if (best < 0) return -1;
        s += best;
      }
      if (name.indexOf(nq) === 0) s += 60;
      return s;
    }
    var prods = all().map(function (p) {
      var s = score(p.h, p.hc, p.nn, p.nk); if (s >= 0 && norm(p.id) === nq) s += 80; return [s, p];
    }).filter(function (x) { return x[0] >= 0; }).sort(function (a, b) { return b[0] - a[0] || a[1].n.localeCompare(b[1].n, 'nb', { numeric: true }); });
    var pages = PAGES.map(function (pg) { var h = norm(pg[0] + ' ' + pg[2]); return [score(h, h.replace(/ /g, ''), norm(pg[0]), ''), pg]; })
      .filter(function (x) { return x[0] >= 0; }).sort(function (a, b) { return b[0] - a[0]; });
    pages = pages.map(function (x) { return x[1]; }).concat(API[nq] || []);
    return { prods: prods.map(function (x) { return x[1]; }), pages: pages };
  }
  function pageHit(q, r) {
    var nq = norm(q); if (!nq || !r.pages.length) return null;
    var best = r.pages.filter(function (pg) { var t = norm(pg[0]); return t === nq || t.indexOf(nq) === 0 || (nq.length >= 4 && t.indexOf(nq) > -1); })[0];
    return best || (!r.prods.length ? r.pages[0] : null);
  }
  function hl(name, q) {
    var t = norm(q).split(' ').filter(function (w) { return w.length > 1; }), out = esc(name);
    t.forEach(function (w) { out = out.replace(new RegExp('(^|[^a-z0-9æøå])(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '$1<mark>$2</mark>'); });
    return out;
  }
  function render(body, q) {
    q = q.trim();
    if (!q) {
      body.innerHTML = '<div class="fts-h">Populære søk</div><div class="fts-chips">' + POP.map(function (p) { return '<button type="button" class="fts-chip">' + esc(p) + '</button>'; }).join('') + '</div>' +
        '<div class="fts-h">Snarveier</div>' + [VEIL, PAGES[0], PAGES[1], PAGES[8], PAGES[16]].map(pageRow).join('') +
        '<a class="fts-more fts-item" href="' + abs(KAT) + '"><span>Se hele produktkatalogen</span><span>→</span></a>';
      return;
    }
    body._q = q;
    apiPages(q, function () { if (body._q === q) render(body, q); });
    var r = search(q), SK = PAGES[PAGES.length - 1], h = '';
    if (STOFF.test(norm(q))) { h = '<div class="fts-h">Snarvei</div>' + pageRow(SK); r.pages = r.pages.filter(function (pg) { return pg !== SK; }); }
    var ph = pageHit(q, r), pagesHtml = r.pages.length ? '<div class="fts-h">Sider</div>' + r.pages.slice(0, 3).map(pageRow).join('') : '';
    if (ph && pagesHtml) h += pagesHtml;   // søket er navnet på en side: vis sidene først
    if (!P) h += '<div class="fts-note"><span class="fts-load"></span>Henter produktene …</div>';
    if (r.prods.length) h += '<div class="fts-h">Produkter</div>' + r.prods.slice(0, 8).map(function (p) {
      return '<a class="fts-item" href="' + esc(prodHref(p)) + '"><span class="fts-th">' + (p.img ? '<img src="' + esc(p.img) + '" alt="" loading="lazy">' : ICO) + '</span>' +
        '<span class="fts-tx"><span class="fts-n">' + hl(p.n, q) + '</span><span class="fts-m">' + esc(p.sup) + (p.kat ? ' · ' + esc(p.kat) : '') + '</span></span></a>';
    }).join('');
    if (!(ph && pagesHtml)) h += pagesHtml;
    if (P && !r.prods.length && !r.pages.length) h += '<div class="fts-note">Ingen treff på «' + esc(q) + '». Prøv et annet ord, eller <a href="' + abs('/kontakt-oss') + '">spør oss</a> – vi har flere produkter enn det som ligger i katalogen.</div>' + pageRow(VEIL);
    else if (P && r.pages.indexOf(VEIL) < 0 && r.prods.length > 0 && r.prods.length < 3) h += pageRow(VEIL);
    var inKat = r.prods.filter(function (p) { return !p.href; }).length;
    if (!P || inKat) h += '<a class="fts-more fts-item" href="' + abs(KAT) + '?q=' + encodeURIComponent(q) + '"><span>' + (P && inKat > 8 ? 'Se alle ' + inKat + ' treff i produktkatalogen' : 'Søk i produktkatalogen') + '</span><span>→</span></a>';
    body.innerHTML = h;
  }
  function pageRow(pg) {
    var v = pg[4] || '', th = v.indexOf('l:') === 0 ? '<img src="' + esc(v.slice(2)) + '" alt="">' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (PICO[v.slice(2)] || PICO.request) + '</svg>';
    return '<a class="fts-item" href="' + abs(pg[1]) + '"><span class="fts-th fts-pg' + (v.indexOf('l:') === 0 ? ' logo' : '') + '">' + th + '</span><span class="fts-tx"><span class="fts-n">' + esc(pg[0]) + '</span>' + (pg[3] ? '<span class="fts-m">' + esc(pg[3]) + '</span>' : '') + '</span></a>';
  }

  /* Enter uten valgt treff: går til siden hvis søket er navnet på en side, ellers til produktkatalogen */
  function go(q) {
    if (!q) { location.href = abs(KAT); return; }
    var r = search(q), ph = pageHit(q, r);
    var only = P && r.prods.length && !r.prods.some(function (p) { return !p.href; });   // bare treff i Vickers-/Perma-katalogen
    location.href = ph ? abs(ph[1]) : only ? prodHref(r.prods[0]) : abs(KAT) + '?q=' + encodeURIComponent(q);
  }

  /* felles tastatur- og klikkoppførsel for et søkefelt med resultatliste */
  function wire(input, body, onClose) {
    var act = -1, t;
    function items() { return body.querySelectorAll('.fts-item'); }
    function setAct(i) { var it = items(); [].forEach.call(it, function (x) { x.classList.remove('act'); }); act = i; if (it[i]) { it[i].classList.add('act'); it[i].scrollIntoView({ block: 'nearest' }); } }
    function upd() { act = -1; render(body, input.value); }
    input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(upd, 60); if (!P) load(upd); });
    input.addEventListener('keydown', function (e) {
      var it = items();
      if (e.key === 'ArrowDown') { e.preventDefault(); setAct(Math.min(it.length - 1, act + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setAct(Math.max(-1, act - 1)); }
      else if (e.key === 'Enter') { e.preventDefault(); if (act > -1 && it[act]) location.href = it[act].href; else if (input.value.trim()) go(input.value.trim()); }
      else if (e.key === 'Escape' && onClose) { onClose(); }
    });
    body.addEventListener('click', function (e) {
      var c = e.target.closest('.fts-chip'); if (!c) return;
      input.value = c.textContent; input.focus(); load(upd); upd();
    });
    return upd;
  }

  /* ---------- Overlay (forstørrelsesglasset i toppmenyen) ---------- */
  var ov, ovInput, ovUpd, lastFocus;
  function buildOverlay() {
    ov = document.createElement('div');
    ov.className = 'fts-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Søk');
    ov.innerHTML = '<div class="fts-panel"><div class="fts-top">' + ICO + '<input type="search" placeholder="Søk etter produkt, produktnummer eller bruksområde" aria-label="Søk" autocomplete="off" enterkeyhint="search"><button type="button" class="fts-x" aria-label="Lukk søk">ESC</button></div><div class="fts-body"></div></div>';
    document.body.appendChild(ov);
    ovInput = ov.querySelector('input');
    ovUpd = wire(ovInput, ov.querySelector('.fts-body'), closeOv);
    ov.querySelector('.fts-x').addEventListener('click', closeOv);
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) closeOv(); });
  }
  function openOv(q) {
    if (!ov) buildOverlay();
    lastFocus = document.activeElement;
    ov.classList.add('open'); document.documentElement.style.overflow = 'hidden';
    ovInput.value = q || ''; ovUpd(); ovInput.focus();
    load(ovUpd);
  }
  function closeOv() { if (!ov) return; ov.classList.remove('open'); document.documentElement.style.overflow = ''; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey) return;
    var u; try { u = new URL(a.href, location.href); } catch (x) { return; }
    // lenke i søket til noe på samme side (f.eks. /produkter#veileder eller #viskositet): lukk søket
    if (ov && ov.classList.contains('open') && ov.contains(a) && u.origin === location.origin && u.hash && u.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '')) { closeOv(); return; }
    if (/#viskositet$/.test(a.getAttribute('href') || '') && ov && ov.contains(a)) { closeOv(); return; }
    if (u.origin === location.origin && u.pathname.replace(/\/$/, '') === '/search') {
      e.preventDefault(); e.stopPropagation();
      var burger = document.querySelector('.header--menu-open .header-burger-btn, .header-burger-btn.burger--active'); if (burger) burger.click();
      openOv(u.searchParams.get('q') || '');
    }
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ov && ov.classList.contains('open')) closeOv();
    if (e.key === '/' && !/input|textarea|select/i.test((document.activeElement || {}).tagName || '') && !document.activeElement.isContentEditable) { e.preventDefault(); openOv(''); }
  });

  /* ---------- Søkeknappen i toppmenyen: eget design, og et søkeikon ved menyknappen på mobil ---------- */
  function styleButtons() {
    [].forEach.call(document.querySelectorAll('header a[href="/search"], .header-menu a[href="/search"], header a[href$="fuglesangstech.no/search"]'), function (a) {
      if (a.classList.contains('fts-btn')) return;
      var inMenu = !!a.closest('.header-menu');
      a.classList.add('fts-btn'); a.setAttribute('aria-label', 'Søk i produkter og sider');
      a.innerHTML = ICO + '<span class="fts-t">' + (inMenu ? 'Søk i produkter' : 'Søk') + '</span>' + (inMenu ? '' : '<span class="fts-k" aria-hidden="true" title="Trykk / for å søke">/</span>');
    });
    var desk = document.querySelector('.header-display-desktop');
    if (desk && !desk.querySelector('a.fts-btn')) {
      var w = document.createElement('div'); w.className = 'fts-hwrap';
      w.innerHTML = '<a href="/search" class="fts-btn" aria-label="Søk i produkter og sider">' + ICO + '<span class="fts-t">Søk</span><span class="fts-k" aria-hidden="true" title="Trykk / for å søke">/</span></a>';
      var right = desk.querySelector('.header-actions--right');
      if (right) right.appendChild(w); else desk.appendChild(w);
    }
    var burger = document.querySelector('.header-display-mobile .header-burger');
    if (burger && !document.querySelector('.fts-mob')) {
      var m = document.createElement('a'); m.href = '/search'; m.className = 'fts-btn fts-mob'; m.setAttribute('aria-label', 'Søk i produkter og sider'); m.innerHTML = ICO;
      burger.parentNode.insertBefore(m, burger);
    }
  }
  styleButtons(); document.addEventListener('DOMContentLoaded', styleButtons); window.addEventListener('load', styleButtons);

  /* ---------- Søkefelt i sidene (f.eks. forsiden): <input data-ft-sok> ---------- */
  function inline(input) {
    if (input.__fts) return; input.__fts = true;
    var box = input.closest('form') || input.parentNode;
    var holder = input.closest('[data-ft-sok-box]') || input.closest('form') || input.parentNode;
    var anchor = input.closest('.ftx-search-row') || input;   // raden med feltet og knappen
    var dd = document.createElement('div'); dd.className = 'fts-dd'; dd.innerHTML = '<div class="fts-body"></div>';
    document.body.appendChild(dd);
    var body = dd.querySelector('.fts-body');
    function place() {
      if (!dd.classList.contains('open')) return;
      var r = anchor.getBoundingClientRect(), below = window.innerHeight - r.bottom - 16, above = r.top - 16;
      var up = below < 260 && above > below, h = Math.max(140, Math.min(420, (up ? above : below) - 8));
      dd.style.left = Math.max(8, r.left) + 'px';
      dd.style.width = Math.min(r.width, window.innerWidth - 16) + 'px';
      body.style.maxHeight = h + 'px';
      if (up) { dd.style.top = 'auto'; dd.style.bottom = (window.innerHeight - r.top + 8) + 'px'; }
      else { dd.style.bottom = 'auto'; dd.style.top = (r.bottom + 8) + 'px'; }
      if (r.bottom < 0 || r.top > window.innerHeight) close();
    }
    var obs = new MutationObserver(place); obs.observe(dd, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('scroll', function () { requestAnimationFrame(place); }, { passive: true });
    window.addEventListener('resize', place);
    function close() { dd.classList.remove('open'); }
    var upd = wire(input, body, close);
    input.setAttribute('autocomplete', 'off');
    input.addEventListener('focus', function () { if (input.value.trim()) { dd.classList.add('open'); upd(); } load(function () { if (dd.classList.contains('open')) upd(); }); });
    input.addEventListener('input', function () { dd.classList.toggle('open', !!input.value.trim()); });
    document.addEventListener('mousedown', function (e) { if (!holder.contains(e.target) && !dd.contains(e.target)) close(); });
    if (box.tagName === 'FORM') box.addEventListener('submit', function (e) { e.preventDefault(); go(input.value.trim()); });
  }
  function scan() { [].forEach.call(document.querySelectorAll('input[data-ft-sok]'), inline); }
  scan(); document.addEventListener('DOMContentLoaded', scan); window.addEventListener('load', scan);
  // på sider med søkefelt hentes produktlisten i bakgrunnen når siden er ferdig lastet
  window.addEventListener('load', function () { if (document.querySelector('input[data-ft-sok]') && !P) setTimeout(function () { load(function () {}); }, 2500); });

  /* ---------- Tall til forsiden (elementer med data-tall), regnet ut fra produktdataene ----------
     Leverandører med egen katalogfil (Vickers, Perma-Tec) telles per gradering fra fila, de andre fra /produkter. */
  function tall() {
    if (!P || !X) return null;
    var egen = {}; X.forEach(function (p) { egen[norm(p.sup)] = 1; });
    var rows = P.filter(function (p) { return !egen[norm(p.sup)]; }).concat(X);
    function n(f) { return rows.filter(f).length; }
    return {
      eal: n(function (p) { return /EAL/.test(p.tags); }),
      h1: n(function (p) { return /H1/.test(p.tags); }),
      arc: P.filter(function (p) { return /^ARC\b/i.test(p.n); }).length,
      produkter: rows.length
    };
  }
  function emit() {
    var t = tall(); if (!t) return;
    window.__ftTall = t;
    try { document.dispatchEvent(new CustomEvent('ft:tall', { detail: t })); } catch (e) {}
  }
  /* ---------- Strukturert data for Google (JSON-LD), laget fra de samme produktdataene – uten pris ----------
     Brødsmulesti på alle sider med .ftx-crumb, og produktliste på /produkter og katalogsidene.
     Nye produkter og sider kommer med automatisk. */
  var ORIGIN = 'https://www.fuglesangstech.no';
  function ld(id, obj) {
    var s = document.getElementById(id);
    if (!s) { s = document.createElement('script'); s.type = 'application/ld+json'; s.id = id; document.head.appendChild(s); }
    s.textContent = JSON.stringify(obj);
  }
  function crumbs() {
    var c = document.querySelector('.ftx-crumb'); if (!c) return;
    var items = [];
    [].forEach.call(c.querySelectorAll('a[href]'), function (a) { items.push([a.textContent.trim(), new URL(a.getAttribute('href'), location.href).href]); });
    var last = (c.textContent.split('/').pop() || '').trim();
    if (last && (!items.length || items[items.length - 1][0] !== last)) items.push([last, ORIGIN + location.pathname]);
    if (items.length < 2) return;
    ld('ft-ld-crumbs', { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(function (x, i) { return { '@type': 'ListItem', position: i + 1, name: x[0], item: x[1] }; }) });
  }
  crumbs(); window.addEventListener('load', crumbs);
  var KATSIDER = { '/produkter': '', '/le-katalog': 'le', '/chesterton-katalog': 'ch', '/utb-katalog': 'utb', '/vickers-katalog': 'Vickers Oils', '/perma-tec-katalog': 'Perma-Tec' };
  var MERKE = { ch: 'Chesterton', le: 'Lubrication Engineers', utb: 'UTB', vik: 'Vickers Oils' };
  var sti = location.pathname.replace(/\/$/, '');
  function liste(prods) {
    if (!prods.length) return;
    var h1 = document.querySelector('#ftx h1, h1');
    ld('ft-ld-produkter', { '@context': 'https://schema.org', '@type': 'ItemList', name: (h1 ? h1.textContent : document.title).trim(), numberOfItems: prods.length,
      itemListElement: prods.map(function (o, i) { return { '@type': 'ListItem', position: i + 1, item: o }; }) });
  }
  function produkt(navn, merke, url, d, img, kat, tags) {
    var o = { '@type': 'Product', name: navn, brand: { '@type': 'Brand', name: merke }, url: url };
    d = String(d || '').replace(/\s+/g, ' ').trim(); if (d) o.description = d.slice(0, 300);
    if (img && !/^data:/.test(img)) o.image = new URL(img, ORIGIN).href;
    if (kat) o.category = kat;
    if (tags) o.keywords = tags;
    return o;
  }
  // Den statiske produktlista på /produkter (#ft-static) – samme tekst som Google leser der
  function statisk(doc, sup) {
    return [].filter.call(doc.querySelectorAll('#ft-static article[data-code]'), function (a) { return !sup || a.getAttribute('data-sup') === sup; })
      .map(function (a) {
        var t = a.querySelector('h4, h3, h2'), p = a.querySelector('p');
        return produkt(t ? t.textContent : a.getAttribute('data-code'), MERKE[a.getAttribute('data-sup')] || '', ORIGIN + KAT + '#' + encodeURIComponent(a.getAttribute('data-code')), p ? p.textContent : '');
      }).filter(function (o) { return o.brand.name; });
  }
  function produktLd() {
    var sup = KATSIDER[sti];
    if (sti === KAT) return liste(statisk(document, ''));
    if (MERKE[sup]) {   // LE, Chesterton, UTB: produktene ligger i /produkter
      return fetch(KAT).then(function (r) { return r.text(); }).then(function (t) { liste(statisk(new DOMParser().parseFromString(t, 'text/html'), sup)); }).catch(function () {});
    }
    loadX(function () {   // Vickers og Perma-Tec: fra katalogfilene i GitHub, hver gradering for seg
      liste((X || []).filter(function (p) { return p.sup === sup; }).map(function (p) {
        return produkt(p.n, p.sup, ORIGIN + p.href, p.d, p.img, p.kat, p.tags.split('|').filter(Boolean).join(', '));
      }));
    });
  }
  if (sti in KATSIDER) { if (document.readyState === 'complete') produktLd(); else window.addEventListener('load', produktLd); }

  // Produktdata til kort på sidene (elementer med data-ft-prod, f.eks. «Utvalgte produkter» på forsiden)
  function emitProd() {
    if (!P || P.length < 100) return;   // bare når hele lista fra /produkter er lest
    window.__ftProd = P;
    try { document.dispatchEvent(new CustomEvent('ft:produkter', { detail: P })); } catch (e) {}
  }
  if (document.querySelector('[data-tall], [data-ft-prod]')) {
    var tallStart = function () { load(function () { emit(); emitProd(); }); };
    if (P) tallStart(); else window.addEventListener('load', function () { setTimeout(tallStart, 1200); });
  }

  /* ---------- /produkter: bruk ?q=, ?lev=, ?grp=, ?kat= og ?eg= fra lenken ---------- */
  if (location.pathname.replace(/\/$/, '') === KAT && location.search) {
    var sp = new URLSearchParams(location.search), tries = 0;
    var want = { q: sp.get('q'), lev: sp.get('lev'), f: [] };
    ['grp', 'kat', 'eg', 'emb'].forEach(function (k) { sp.getAll(k).forEach(function (v) { want.f.push([k, v]); }); });
    var wait = setInterval(function () {
      if (++tries > 150) return clearInterval(wait);
      if (!document.getElementById('ft-q') || !document.querySelector('a.card, .empty')) return;
      clearInterval(wait);
      var steps = [];
      if (want.lev) steps.push(function () { var b = document.querySelector('.line-btn[data-sup="' + want.lev + '"]'); if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); });
      // eksakt verdi først (kategorier kan inneholde komma), ellers flere verdier skilt med komma.
      // Ett steg per verdi: listen tegnes på nytt etter hvert klikk, så avkrysningsboksen hentes på nytt hver gang.
      function boks(k, v) { return [].find.call(document.querySelectorAll('input[data-k="' + k + '"]'), function (i) { return i.value === v; }); }
      function kryss(k, v) { var cb = boks(k, v); if (cb && !cb.checked) cb.click(); }
      want.f.forEach(function (kv) {
        steps.push(function () {
          if (boks(kv[0], kv[1])) return kryss(kv[0], kv[1]);
          var rest = kv[1].split(',').map(function (v) { return v.trim(); });
          (function neste(i) { if (i >= rest.length) return; kryss(kv[0], rest[i]); setTimeout(function () { neste(i + 1); }, 60); })(0);
        });
      });
      if (want.q) steps.push(function () { var q = document.getElementById('ft-q'); if (q && q.value !== want.q) { q.value = want.q; q.dispatchEvent(new Event('input', { bubbles: true })); } });
      steps.push(function () { var fl = document.getElementById('ft-filters'); if (fl) fl.classList.remove('open'); });
      (function run(i) { if (i >= steps.length) return; try { steps[i](); } catch (e) {} setTimeout(function () { run(i + 1); }, 60); })(0);
    }, 100);
  }
})();

/* ---------- Midlertidige sidetitler (SEO) ----------
   Squarespace-sidene har fortsatt gamle titler som «About 4» og «Services 3». Til de er byttet i
   Page Settings → SEO, settes riktig tittel og beskrivelse her. Det skjer bare når siden fortsatt har
   den gamle tittelen, så når Trygve har lagt inn den nye i Squarespace, gjør dette ingenting. */
(function () {
  try {
    var SEO = {"/tjeneste-prvetaking":["About 4 — Fuglesangs Tech","Prøvetaking og oljeanalyse — Fuglesangs Tech","Vi tar oljeprøver hos dere og analyserer dem i eget oljelaboratorium. Dere får rapport med konkrete tiltak senest tre virkedager etter at vi har mottatt prøven."],"/tjeneste-kurs":["Services 3 — Fuglesangs Tech","Kurs i maskinhelse, smøring og tilstandskontroll — Fuglesangs Tech","Kurs for ansatte i maskinhelse og smøremidler, tilstandskontroll og mikrobiell vekst i olje. Holdes i våre lokaler i Oslo eller hos dere."],"/vi-satser-p-belegg":["About 1 — Fuglesangs Tech","ARC-belegg fra Chesterton — Fuglesangs Tech","ARC-belegg fra Chesterton beskytter metall og betong mot slitasje, korrosjon, kjemikalier og erosjon. Fuglesangs-gruppen er eneleverandør av Chesterton i Norge."],"/finn-olje-til-bilen":["Nummersøk-1 | Oppdag kvalitetsprodukter – Kontakt oss i dag — Fuglesangs Tech","Finn riktig olje til bilen – søk på bilskilt — Fuglesangs Tech","Skriv inn bilskiltet og finn riktig motorolje og andre smøremidler fra UTB til bilen, med datablad. Fuglesangs Tech er eneleverandør av UTB i Norge."],"/tjeneste-kurs-tilstandskontroll":["Tjeneste - Kurs - Bolttiltrekning | Få profesjonell trening – Bestill kurs nå — Fuglesangs Tech","Kurs i tilstandskontroll — Fuglesangs Tech","Lær å følge med på tilstanden til maskiner og smøremidler, så slitasje og feil oppdages før de fører til havari og stans. Ta kontakt for mer informasjon."],"/tjeneste-kurs-maskinhelse":["Tjeneste - Kurs - Maskinhelse | Optimér maskinvedlikehold – Bestill kurs nå — Fuglesangs Tech","Kurs i maskinhelse og smøremidler — Fuglesangs Tech","Kurs i maskinhelse og smøremidler med vår tribolog, utviklet i samarbeid med SINTEF. Holdes i våre lokaler i Oslo eller hos dere."],"/tjeneste-kurs-mikrobiell-vekst":["Tjeneste - Kurs - Mikrobiell vekst | Bestill kurs i dag — Fuglesangs Tech","Kurs i mikrobiell vekst i olje — Fuglesangs Tech","Kurs i mikrobiell vekst i olje og hydraulikksystemer. Lær å forebygge og behandle bakterier, sopp, filtersvikt og korrosjon."],"/tjeneste-service":["Tjeneste - Service | Effektiv maskinservice – Kontakt oss i dag — Fuglesangs Tech","Service og vedlikehold av maskiner — Fuglesangs Tech","Fuglesangs Tech utfører service, inspeksjon, reparasjon og vedlikehold av industrielt utstyr. Ta kontakt for en vurdering."],"/tilbud":["Kontakt | Kontakt oss i dag – Få ekspertråd — Fuglesangs Tech","Be om tilbud — Fuglesangs Tech","Send tilbudslisten med produktene dere trenger, så svarer Fuglesangs Tech med pris og leveringstid."],"/kontakt-oss":["Kontakt | Kontakt oss i dag – Få ekspertråd — Fuglesangs Tech","Kontakt oss — Fuglesangs Tech","Kontakt Fuglesangs Tech på telefon 22 54 20 00, på e-post eller med kontaktskjemaet. Vi holder til i Caspar Storms vei 21 i Oslo."],"/datablad":["Datablad | Finn databladene dine — Fuglesangs Tech","Datablad og sikkerhetsdatablad (SDS) — Fuglesangs Tech","Last ned sikkerhetsdatablad, produktdatablad og sertifikater for produktene våre. Lag stoffkartotek og last ned alle databladene samlet i én ZIP-fil."],"/ressurser":["Ressurser | Finn nyttige ressurser — Fuglesangs Tech","Ressurser – kataloger, brosjyrer og fagstoff — Fuglesangs Tech","Kataloger, brosjyrer, case-studier, tekniske veiledninger og fagartikler fra Fuglesangs Tech og leverandørene våre."],"/artikler":["Artikler | Les fagstoffet vårt — Fuglesangs Tech","Fagartikler om smøring og vedlikehold — Fuglesangs Tech","Fagartikler om smøring, hydraulikk, oljeanalyse og vedlikehold, skrevet av fagfolkene hos Fuglesangs Tech."],"/artikler/bakterievekst-i-hydraulikksystemer":["Artikkel: Bakterievekst i hydraulikksystemer | Les artikkelen nå — Fuglesangs Tech","Bakterievekst i hydraulikksystemer — Fuglesangs Tech","Slik oppstår bakterievekst i hydraulikksystemer, hva det kan koste, og hvordan oljeanalyse og kjemisk behandling gir stabil drift."],"/artikler/stoffkartotek-sikkerhetsdatablad":["Artikkel: Slik holder du sikkerhetsdatabladene i orden | Hold kartoteket oppdatert — Fuglesangs Tech","Stoffkartotek: slik holder du SDS i orden — Fuglesangs Tech","Slik oppretter og vedlikeholder du et stoffkartotek med oppdaterte sikkerhetsdatablad, og laster ned databladene fra Fuglesangs Tech samlet."],"/chesterton-1":["Chesterton | Oppdag industriløsninger – Kontakt oss i dag — Fuglesangs Tech","Chesterton – smøremidler, vedlikehold og belegg — Fuglesangs Tech","Chesterton-produkter for industrielt vedlikehold: smøremidler, rengjøring, gjengepasta og ARC-belegg. Fuglesangs-gruppen er eneleverandør av Chesterton i Norge."],"/le-about":["Lubrication Engineers | Oppdag pålitelige smøremidler – Kontakt oss i dag — Fuglesangs Tech","Lubrication Engineers (LE) – smøremidler — Fuglesangs Tech","Smøremidler og smøreutstyr fra Lubrication Engineers (LE) for industri og mobilt utstyr. Fuglesangs Tech er eneleverandør av LE i Norge."],"/utb":["UTB | få profesjonelle smøreløsninger i dag — Fuglesangs Tech","UTB – smøremidler for bil, industri og landbruk — Fuglesangs Tech","Smøremidler fra UTB for bil, industri og landbruk. Fuglesangs Tech er eneleverandør av UTB i Norge. Finn riktig olje til bilen med bilskiltsøket."],"/royal-purple-industrial":["Royal Purple Industrial | Oppdag kraftige smøreløsninger – kontakt oss nå — Fuglesangs Tech","Royal Purple Industrial – syntetiske smøremidler — Fuglesangs Tech","Syntetiske smøremidler fra Royal Purple Industrial for kompressorer, gir, hydraulikk og lagre. Fuglesangs Tech er eneleverandør på land i Norge."],"/biomax":["Biomax | Finn riktig smøremiddel — Fuglesangs Tech","BioMax – miljøtilpassede smøremidler — Fuglesangs Tech","Miljøtilpassede, syntetiske smøremidler fra BioMax (Royal Purple Industrial): hydraulikkolje, girolje og fett. Fuglesangs Tech er eneleverandør på land i Norge."],"/vickers-oils":["Vickers-oils | Finn riktig smøremiddel — Fuglesangs Tech","Vickers Oils – EAL- og H1-smøremidler — Fuglesangs Tech","Vickers Oils-smøremidler fra Fuglesangs Tech: miljøtilpassede EAL-oljer, hydraulikkoljer og H1-godkjente smøremidler for industri og næringsmiddelproduksjon."],"/perma-tec":["Perma-Tec | Finn riktig smøreløsning — Fuglesangs Tech","Perma-Tec – automatiske smøresystemer — Fuglesangs Tech","Automatiske smøresystemer fra Perma-Tec for én- og flerpunktssmøring, levert fylt med fett fra Fuglesangs Tech. Vi hjelper dere å velge riktig løsning."],"/leverandorer":["Leverandører | Finn pålitelige leverandører – Kontakt oss i dag — Fuglesangs Tech","Leverandører — Fuglesangs Tech","Fuglesangs Tech leverer produkter fra Chesterton, Lubrication Engineers, UTB, Royal Purple Industrial, BioMax, Vickers Oils og Perma-Tec."],"/lifeextensiongruppen":["Lifeextensiongruppen | Forleng levetiden – Kontakt oss nå — Fuglesangs Tech","Life Extension-gruppen – industribelegg — Fuglesangs Tech","Life Extension-gruppen bruker polymerbelegg med keramikk og Kevlar for å forlenge levetiden på maskiner, gulv og konstruksjoner."],"/lifeextensiongruppen-2":["Lifeextensiongruppen 2 | Få eksperthjelp – Ta kontakt nå — Fuglesangs Tech","Be om vurdering av beleggjobb — Fuglesangs Tech","Send bilder og en beskrivelse av utstyret, så vurderer Life Extension-gruppen reparasjon og belegg for stål, glassfiber og betong – også over og under vann."],"/om-oss":["Om oss | Optimaliser din industrielle drift - kontakts for løsninger — Fuglesangs Tech","Om oss — Fuglesangs Tech","Fuglesangs Tech leverer smøremidler, vedlikeholdsprodukter og industribelegg, med service, oljeanalyse og kurs. Les om hvem vi er og hvordan vi jobber."],"/vre-ansatte":["Våre ansatte | Oppdag vårt team – Kontakt oss i dag — Fuglesangs Tech","Våre ansatte — Fuglesangs Tech","Møt fagfolkene hos Fuglesangs Tech innen salg, rådgivning, tribologi og service, og finn riktig kontaktperson."],"/personvern":["personvern | Les personvernerklæringen — Fuglesangs Tech","Personvernerklæring — Fuglesangs Tech","Les Fuglesangs Techs personvernerklæring om personopplysninger, informasjonskapsler, lagring og dine rettigheter."],"/produkter":["Produktkatalog – smøremidler, belegg og vedlikehold — Fuglesangs Tech","Produktkatalog – smøremidler, belegg og vedlikehold — Fuglesangs Tech","Over 460 produkter fra Chesterton, LE, UTB, Royal Purple Industrial, BioMax, Vickers Oils og Perma-Tec, med sikkerhetsdatablad. Kontakt Fuglesangs Tech for pris."]};
    var p = location.pathname.replace(/\/+$/, '') || '/', e = SEO[p];
    if (!e || location.hostname !== "www.fuglesangstech.no" || document.title.trim() !== e[0]) return;
    function meta(sel, attr, navn, v) { var m = document.head.querySelector(sel); if (!m) { m = document.createElement('meta'); m.setAttribute(attr, navn); document.head.appendChild(m); } m.setAttribute('content', v); }
    var tittel = e[1].replace(/ — Fuglesangs Tech$/, '');
    document.title = e[1];
    meta('meta[name="description"]', 'name', 'description', e[2]);
    meta('meta[property="og:title"]', 'property', 'og:title', tittel);
    meta('meta[property="og:description"]', 'property', 'og:description', e[2]);
    meta('meta[name="twitter:title"]', 'name', 'twitter:title', tittel);
    meta('meta[name="twitter:description"]', 'name', 'twitter:description', e[2]);
  } catch (x) {}
})();
