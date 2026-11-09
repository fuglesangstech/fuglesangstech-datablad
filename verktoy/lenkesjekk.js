/*
  Lenkesjekk for fuglesangstech.no – brukes av synk-datablad.js (kan også kjøres alene):
    NODE_USE_ENV_PROXY=1 node verktoy/lenkesjekk.js

  1. Henter alle sider fra sitemap.xml og sjekker at de svarer.
  2. Sjekker alle lenker (<a href>) og bilder (<img src>, srcset) i sidekoden – også i kodeblokkene.
  3. Sjekker at alle filer i dette repoet som sidene eller katalogfilene peker til, faktisk finnes
     (bilder, datablad og JSON på fuglesangstech.github.io/fuglesangstech-datablad/).
  Bare tydelige feil (HTTP 404/410/5xx, eller manglende fil i repoet) regnes som døde lenker.
  Adresser som ikke kunne nås fra skymiljøet (blokkert domene, tidsavbrudd) listes for seg og regnes ikke som feil.
*/
'use strict';
const fs = require('fs'), path = require('path');
const SITE = 'https://www.fuglesangstech.no';
const GH = 'https://fuglesangstech.github.io/fuglesangstech-datablad/';
const UA = { 'User-Agent': 'Mozilla/5.0 (Fuglesangs Tech lenkesjekk)' };
const SKIP = [/^mailto:/i, /^tel:/i, /^javascript:/i, /^#/, /^data:/i, /static1\.squarespace\.com\/static\/vta/, /\/api\//,
  /googletagmanager|google-analytics|doubleclick|facebook\.com\/tr/, /linkedin\.com|instagram\.com|facebook\.com/];   // sosiale medier avviser roboter

async function req(url, method) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(url, { method, headers: UA, redirect: 'follow', signal: ctl.signal });
    if (method === 'GET') { try { await r.arrayBuffer(); } catch (e) {} }
    return r.status;
  } catch (e) { return 'nett: ' + (e.cause && e.cause.code || e.name || e.message); }
  finally { clearTimeout(t); }
}
async function status(url) {
  let s = await req(url, 'HEAD');
  if (typeof s !== 'number' || s === 405 || s === 403 || s === 501 || s >= 500) s = await req(url, 'GET');   // noen servere støtter ikke HEAD
  return s;
}
async function pool(items, n, fn) {
  let k = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (k < items.length) { const i = k++; await fn(items[i]); } }));
}
const unesc = s => s.replace(/&amp;/g, '&').replace(/&#x2F;/g, '/').replace(/&quot;/g, '"');

async function run(root) {
  const xml = await (await fetch(SITE + '/sitemap.xml', { headers: UA })).text();
  const pages = [...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => unesc(m[1]).replace(/\/$/, '') || SITE))];
  if (!pages.length) throw new Error('fant ingen sider i sitemap.xml');
  const links = new Map();       // url -> Set(sider)
  const repoRefs = new Map();    // fil i repoet -> Set(sider/kilder)
  const sideFeil = [];
  const add = (map, k, from) => { if (!map.has(k)) map.set(k, new Set()); map.get(k).add(from); };

  await pool(pages, 4, async pg => {
    let h;
    try {
      const r = await fetch(pg, { headers: UA });
      if (!r.ok) { sideFeil.push(pg + ' (HTTP ' + r.status + ')'); return; }
      h = await r.text();
    } catch (e) { sideFeil.push(pg + ' (' + e.message + ')'); return; }
    const short = pg.replace(SITE, '') || '/';
    const refs = [];
    for (const m of h.matchAll(/<a\b[^>]*\shref="([^"]+)"/gi)) refs.push(m[1]);
    for (const m of h.matchAll(/<img\b[^>]*\ssrc="([^"]+)"/gi)) refs.push(m[1]);
    for (const m of h.matchAll(/\ssrcset="([^"]+)"/gi)) m[1].split(',').forEach(x => refs.push(x.trim().split(/\s+/)[0]));
    refs.forEach(raw => {
      const v = unesc(raw.trim());
      if (!v || SKIP.some(rx => rx.test(v)) || /['"]\s*\+|\+\s*['"]/.test(v)) return;   // biter av JavaScript-kode, ikke ekte lenker
      let u; try { u = new URL(v, pg); } catch (e) { return; }
      if (!/^https?:$/.test(u.protocol)) return;
      u.hash = '';
      if (u.href.startsWith(GH)) return add(repoRefs, decodeURIComponent(u.href.slice(GH.length).split('?')[0]), short);
      if (u.hostname === 'images.squarespace-cdn.com') { u.search = ''; }   // samme bilde i flere størrelser
      add(links, u.href, short);
    });
    // Filer i repoet som koden peker til (også i JavaScript-data)
    for (const m of h.matchAll(/https:\/\/fuglesangstech\.github\.io\/fuglesangstech-datablad\/([^"'\s)<>\\]+\.(?:webp|png|jpe?g|svg|pdf|json))/gi)) {
      let f = m[1]; try { f = decodeURIComponent(f); } catch (e) {}
      add(repoRefs, f, short);
    }
  });

  // Filer som katalogfilene i repoet peker til
  const json = f => { const p = path.join(root, f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
  const ov = json('datablad-oversikt.json');
  (ov ? ov.rader : []).forEach(r => r.sds.concat(r.pds).forEach(d => {
    if (/^https?:/.test(d[2])) add(links, d[2], '/datablad (' + r.lev + ')'); else add(repoRefs, d[2], '/datablad');
  }));
  const vik = json('vickers/produkter.json');
  (vik ? vik.produkter : []).forEach(p => { if (p.bilde) add(repoRefs, p.bilde, '/vickers-katalog'); });

  const borte = [], nett = [], mangler = [];
  await pool([...links.keys()], 8, async u => {
    const s = await status(u);
    if (typeof s !== 'number') nett.push(u + ' (' + s + ')');
    else if (s === 404 || s === 410 || s >= 500) borte.push(u + ' – HTTP ' + s + ' – brukt på: ' + [...links.get(u)].slice(0, 4).join(', '));
  });
  for (const [f, from] of repoRefs) {
    if (!f || f.endsWith('/')) continue;
    if (!fs.existsSync(path.join(root, f))) mangler.push(f + ' – brukt på: ' + [...from].slice(0, 4).join(', '));
  }
  return { sider: pages.length, lenker: links.size, repoFiler: repoRefs.size, sideFeil, borte: borte.sort(), mangler: mangler.sort(), nett: nett.sort() };
}

function rapport(r, err) {
  const sec = (t, a) => a && a.length ? '\n### ' + t + ' (' + a.length + ')\n' + a.map(x => '- ' + x).join('\n') + '\n' : '';
  if (!r) return '\n## Lenkesjekk av fuglesangstech.no\nKunne ikke kjøres denne gangen: ' + err + '\n';
  const feil = r.sideFeil.length + r.borte.length + r.mangler.length;
  return '\n## Lenkesjekk av fuglesangstech.no\nSider: ' + r.sider + '. Lenker og bilder sjekket: ' + r.lenker + '. Filer i GitHub sjekket: ' + r.repoFiler +
    '. Døde lenker: ' + r.borte.length + '. Manglende filer i GitHub: ' + r.mangler.length + '. Sider som ikke svarer: ' + r.sideFeil.length + '.' +
    (feil ? '' : ' Alt OK.') + '\n' +
    sec('Sider som ikke svarer', r.sideFeil) + sec('Døde lenker og bilder (må rettes)', r.borte) + sec('Filer som mangler i GitHub (må rettes)', r.mangler) +
    (r.nett.length ? '\nKunne ikke sjekkes herfra (blokkert domene eller tidsavbrudd – ikke nødvendigvis feil): ' + Object.entries(r.nett.reduce((o, x) => { const d = x.split('/')[2]; o[d] = (o[d] || 0) + 1; return o; }, {})).map(e => e[0] + ' (' + e[1] + ')').join(', ') + '.\n' : '');
}

module.exports = { run, rapport };
if (require.main === module) run(process.cwd()).then(r => console.log(rapport(r))).catch(e => { console.error('Lenkesjekk feilet:', e.message); process.exit(1); });
