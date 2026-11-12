/*
  Artikler som oppdateres av seg selv på fuglesangstech.no
  Lastes fra footer-injeksjonen (alle sider):
    <script src="https://fuglesangstech.github.io/fuglesangstech-datablad/nett/artikler.js" defer></script>

  Finner publiserte artikler under /artikler/ og legger nye kort inn på
    - forsiden (#ftx-nw, de 4 nyeste)
    - /artikler (#ftx-arts, alle – søk og filter virker som før)
    - /ressurser (som «Fagartikler», via window.ftArtikler())
  Kortene som allerede står i kodeblokkene beholdes; bare artikler som mangler legges til.

  Kilder, i rekkefølge:
    1. /artikler som Squarespace-blogg: /artikler?format=json gir alle innlegg med tittel, utdrag, bilde, dato og forfatter.
    2. Ellers: /sitemap.xml (sider med adresse /artikler/<navn>). Tittel, ingress, bilde, dato og forfatter hentes fra
       artikkelens JSON-LD (Article), ellers fra delingsdataene (og:title, og:description, og:image).
  Resultatet huskes i sessionStorage i en time.
*/
(function () {
  'use strict';
  if (window.__ftArtikler) return; window.__ftArtikler = 1;
  var VERSJON = '2026-11-12a', KEY = 'ft-artikler-v1', TTL = 3600e3, MAKS = 30, FORSIDE = 4;
  var GENERISK = /delingsbilde|social-share|default-share/i;
  var MND = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function txt(h) { var d = document.createElement('div'); d.innerHTML = h || ''; return (d.textContent || '').replace(/\s+/g, ' ').trim(); }
  function sti(u) { return String(u || '').replace(/^https?:\/\/[^/]+/, '').replace(/[?#].*$/, '').replace(/\/+$/, ''); }
  function dato(ms) { if (!ms) return ''; var d = new Date(ms); return isNaN(d) ? '' : d.getDate() + '. ' + MND[d.getMonth()] + ' ' + d.getFullYear(); }
  function fraNorsk(s) { var m = /(\d{1,2})\.\s*([a-zæøå]+)\s+(\d{4})/i.exec(s || ''); if (!m) return 0; var i = MND.indexOf(m[2].toLowerCase()); return i < 0 ? 0 : new Date(+m[3], i, +m[1]).getTime(); }
  function rensTittel(t) { return String(t || '').replace(/^Artikkel:\s*/i, '').replace(/\s*[|–—-]\s*Fuglesangs Tech\s*$/i, '').replace(/\s+\|.*$/, '').trim(); }
  function bilde(u) { if (!u || GENERISK.test(u)) return ''; return String(u).replace(/^http:/, 'https:'); }

  function hentJson(u) { return fetch(u, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function hentTekst(u) { return fetch(u, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }); }

  // 1. Squarespace-blogg
  function fraBlogg(j) {
    return (j.items || []).map(function (it) {
      return {
        url: sti(it.fullUrl), tittel: it.title, ingress: txt(it.excerpt).slice(0, 260),
        bilde: it.assetUrl ? it.assetUrl + '?format=1000w' : '', dato: it.publishOn || it.addedOn || 0,
        forfatter: it.author && it.author.displayName || '', emner: (it.categories || []).concat(it.tags || [])
      };
    });
  }

  // 2. Sitemap + hver artikkelside
  function lesSide(url, lastmod) {
    return hentTekst(url).then(function (h) {
      var doc = new DOMParser().parseFromString(h, 'text/html'), a = null;
      doc.querySelectorAll('script[type="application/ld+json"]').forEach(function (s) {
        if (a) return;
        try {
          var j = JSON.parse(s.textContent), l = [].concat(j['@graph'] || j);
          l.forEach(function (x) { if (!a && /^(Article|BlogPosting|TechArticle|NewsArticle)$/.test(x['@type'])) a = x; });
        } catch (e) {}
      });
      function meta(p) { var m = doc.querySelector('meta[property="' + p + '"],meta[name="' + p + '"]'); return m ? m.getAttribute('content') : ''; }
      var h1 = doc.querySelector('#ftx h1, article h1, h1');
      var img = a && (typeof a.image === 'string' ? a.image : a.image && (a.image.url || a.image[0])) || meta('og:image');
      var au = a && a.author ? [].concat(a.author).map(function (x) { return x.name || x; }).join(', ') : '';
      var meta2 = doc.querySelector('#ftx .ftx-meta');
      var d = a && a.datePublished ? Date.parse(a.datePublished) : fraNorsk(meta2 && meta2.textContent) || (lastmod ? Date.parse(lastmod) : 0);
      return {
        url: url, tittel: rensTittel(a && a.headline || (h1 && h1.textContent) || meta('og:title') || doc.title),
        ingress: (a && a.description || meta('og:description') || meta('description') || '').slice(0, 260),
        bilde: bilde(img), dato: d || 0, forfatter: au, emner: a && a.keywords ? String(a.keywords).split(/\s*,\s*/) : []
      };
    }).catch(function () { return null; });
  }
  function fraSitemap() {
    return hentTekst('/sitemap.xml').then(function (x) {
      var l = [], re = /<url>([\s\S]*?)<\/url>/g, m;
      while ((m = re.exec(x))) {
        var loc = /<loc>([^<]+)<\/loc>/.exec(m[1]), lm = /<lastmod>([^<]+)<\/lastmod>/.exec(m[1]);
        if (loc && /^\/artikler\/[^/]+$/.test(sti(loc[1]))) l.push([sti(loc[1]), lm && lm[1]]);
      }
      return Promise.all(l.slice(0, MAKS).map(function (p) { return lesSide(p[0], p[1]); }));
    }).then(function (l) { return l.filter(Boolean); });
  }

  var lofte = null;
  window.ftArtikler = function () {
    if (lofte) return lofte;
    try { var c = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (c && c.v === VERSJON && Date.now() - c.t < TTL) return (lofte = Promise.resolve(c.l)); } catch (e) {}
    lofte = hentJson('/artikler?format=json').then(function (j) { return j && j.items && j.items.length ? fraBlogg(j) : fraSitemap(); }, fraSitemap)
      .then(function (l) {
        l = l.filter(function (x) { return x && x.url && x.tittel; }).sort(function (a, b) { return (b.dato || 0) - (a.dato || 0); });
        try { sessionStorage.setItem(KEY, JSON.stringify({ v: VERSJON, t: Date.now(), l: l })); } catch (e) {}
        return l;
      }).catch(function () { return []; });
    return lofte;
  };

  var DOK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="width:38%;height:38%;color:#fff;opacity:.85"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/></svg>';
  function bildeHtml(it) { return it.bilde ? '<img src="' + esc(it.bilde) + '" alt="" loading="lazy">' : '<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center">' + DOK + '</span>'; }
  function metaTekst(it) { return [dato(it.dato), it.forfatter].filter(Boolean).join(' · '); }

  // Setter nye kort inn i en liste med eksisterende kort, sortert på dato (nyeste først)
  function flett(box, sel, metaSel, lag, l, maks) {
    var har = {};
    box.querySelectorAll(sel).forEach(function (a) {
      har[sti(a.getAttribute('href'))] = 1;
      if (!a.getAttribute('data-ftd')) { var m = a.querySelector(metaSel); a.setAttribute('data-ftd', fraNorsk(m && m.textContent) || 0); }
    });
    var nye = 0;
    l.forEach(function (it) {
      if (har[it.url]) return; har[it.url] = 1;
      var w = document.createElement('div'); w.innerHTML = lag(it); var el = w.firstChild;
      el.setAttribute('data-ftd', it.dato || 0); el.setAttribute('data-ftny', '1');
      var etter = null;
      box.querySelectorAll(sel).forEach(function (a) { if (!etter && +a.getAttribute('data-ftd') < (it.dato || 0)) etter = a; });
      box.insertBefore(el, etter); nye++;
    });
    if (maks) { var alle = box.querySelectorAll(sel); for (var i = maks; i < alle.length; i++) alle[i].remove(); }
    return nye;
  }

  function forside(l) {
    var box = document.getElementById('ftx-nw'); if (!box) return;
    flett(box, '.ftx-nw-c', '.ftx-nw-m', function (it) {
      return '<a class="ftx-nw-c" href="' + esc(it.url) + '"><div class="ftx-nw-img">' + bildeHtml(it) + '</div><div class="ftx-nw-b"><span class="ftx-nw-m">' + esc(metaTekst(it)) +
        '</span><h3>' + esc(it.tittel) + '</h3>' + (it.ingress ? '<p>' + esc(it.ingress) + '</p>' : '') + '<span class="go">Les artikkelen →</span></div></a>';
    }, l, FORSIDE);
  }
  function artikler(l) {
    var box = document.getElementById('ftx-arts'); if (!box) return;
    var n = flett(box, '.ftx-ac', '.ftx-ac-meta', function (it) {
      var c = it.emner || [];
      return '<a class="ftx-ac" href="' + esc(it.url) + '" data-t="' + esc((it.tittel + ' ' + it.ingress + ' ' + c.join(' ')).toLowerCase()) + '" data-c="">' +
        '<div class="ftx-ac-img">' + bildeHtml(it) + '</div><div class="ftx-ac-body"><span class="ftx-ac-meta">' + esc(metaTekst(it)) + '</span><h3>' + esc(it.tittel) + '</h3>' +
        (it.ingress ? '<p>' + esc(it.ingress) + '</p>' : '') + '<span class="go">Les artikkelen →</span></div></a>';
    }, l, 0);
    var q = document.getElementById('ftx-aq');
    if (n && q) q.dispatchEvent(new Event('input'));
  }

  function start() {
    if (!document.getElementById('ftx-nw') && !document.getElementById('ftx-arts')) return; // /ressurser kaller ftArtikler() selv
    window.ftArtikler().then(function (l) { if (!l.length) return; forside(l); artikler(l); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
