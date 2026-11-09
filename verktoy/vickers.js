/*
  Vickers Oils: henter datablad og sertifikater for produktene i vickers/grunnlag.json fra vickers-oil.com
  og skriver vickers/produkter.json, som Vickers-katalogen og produktkatalogen leser.

  - PDS: «Industrial Product Data Sheet» fra produktsiden, ellers «Product Data Sheet» (marine-PDS brukes ikke).
  - SDS: fra Vickers' åpne filbibliotek (krever ikke innlogging). Norsk (NO/Norway) og engelsk (GB/UK),
    høyeste revisjon. Innlogget visning hos Vickers viser bare de engelske – de ligger også i biblioteket.
  - Sertifikater: NSF-registreringen for produktet (lenket fra produktsiden).
  - Brukes av synk-datablad.js, men kan kjøres alene fra roten av repoet:
      NODE_USE_ENV_PROXY=1 node verktoy/vickers.js
  Filer som ikke kan hentes, beholder forrige kopi. Ingen priser eller lagertall.
*/
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const V = 'https://vickers-oil.com', API = V + '/wp-json/wp/v2/';
const UA = { 'User-Agent': 'Mozilla/5.0 (Fuglesangs Tech datablad-synk)' };
// SDS som har et annet filnavn enn produktnavnet
const SDS_ALIAS = { 'vickerlube-flex': 'PERMA FLEX PLUS' };

async function get(url, json) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
      return json ? await r.json() : await r.text();
    } catch (e) { if (i === 2) throw e; await new Promise(r => setTimeout(r, 2000)); }
  }
}
async function pdf(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.status === 404 || r.status === 410) return { status: r.status };
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const b = Buffer.from(await r.arrayBuffer());
      if (b.slice(0, 5).toString() !== '%PDF-') return { status: 'ikke-pdf' };
      return { status: 200, body: b };
    } catch (e) { if (i === 2) return { status: 'feil: ' + e.message }; await new Promise(r => setTimeout(r, 2000)); }
  }
}
async function pool(items, n, fn) {
  const res = new Array(items.length); let k = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (k < items.length) { const i = k++; res[i] = await fn(items[i], i); } }));
  return res;
}
const norm = s => String(s).toUpperCase().replace(/\+/g, 'PLUS').replace(/[^A-Z0-9]/g, '');
const fileOf = u => decodeURIComponent(u.split('/').pop());

function bestSds(navn, media) {
  const t = norm(navn), best = {};
  for (const u of media) {
    const m0 = /\/uploads\/(\d{4})\/(\d{2})\/([^/]+)\.pdf$/i.exec(u); if (!m0) continue;
    const f = norm(m0[3]); if (!f.startsWith(t)) continue;
    const m = /^(NORWAY|NO|GB|UK)(\d{0,2})(\d?)$/.exec(f.slice(t.length)); if (!m) continue;
    const lang = /^N/.test(m[1]) ? 'NO' : 'EN';
    const key = [+(m[2] || 0), +(m0[1] + m0[2]), +(m[3] || 0)];
    const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
    if (!best[lang] || cmp(key, best[lang].key) > 0) best[lang] = { key, url: u };
  }
  return best;
}

async function run(root) {
  const today = new Date().toISOString().slice(0, 10);
  const G = JSON.parse(fs.readFileSync(path.join(root, 'vickers/grunnlag.json'), 'utf8'));
  const outPath = path.join(root, 'vickers/produkter.json');
  const prev = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : { produkter: [] };
  const prevBy = new Map(prev.produkter.map(p => [p.slug, p]));
  const manPath = path.join(root, 'vickers/datablad.json');
  const man = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : { filer: [] };
  const old = new Map(man.filer.map(x => [x.fil, x]));
  const rep = { nye: [], endret: [], uendret: 0, borte: [], feil: [], mangler: [], nyeProdukter: [], fjernetProdukter: [] };

  // Produktlisten hos Vickers (industri + næringsmiddel) – for å melde nye/fjernede produkter
  let all = [];
  for (let pg = 1; pg < 10; pg++) {
    let j; try { j = await get(API + 'product?per_page=100&page=' + pg + '&_fields=slug,link,title,industry', true); } catch (e) { if (pg === 1) throw e; break; }
    if (!j.length) break; all = all.concat(j);
  }
  const land = all.filter(p => p.industry.includes(680) || p.industry.includes(28));
  const known = new Set(G.produkter.map(p => p.slug));
  rep.nyeProdukter = land.filter(p => !known.has(p.slug)).map(p => p.title.rendered.replace(/&#\d+;|&amp;/g, ' ') + ' – ' + p.link);
  const liveSlugs = new Set(all.map(p => p.slug));
  rep.fjernetProdukter = G.produkter.filter(p => !liveSlugs.has(p.slug)).map(p => p.navn);

  let media = [];
  for (let pg = 1; pg < 40; pg++) {
    let j; try { j = await get(API + 'media?mime_type=application/pdf&per_page=100&page=' + pg + '&_fields=source_url', true); } catch (e) { if (pg === 1) throw e; break; }
    if (!j.length) break; media = media.concat(j.map(m => m.source_url));
  }

  // Hvilke filer hvert produkt skal ha
  const plan = await pool(G.produkter, 6, async p => {
    const docs = { pds: [], sds: [], sert: [], bruk: [] };
    if (!liveSlugs.has(p.slug)) return { p, docs, ok: false };
    let h;
    try { h = await get(V + '/product/' + p.slug + '/'); } catch (e) { rep.feil.push(p.navn + ': produktsiden kunne ikke hentes (' + e.message + ')'); return { p, docs, ok: false }; }
    const main = h.slice(h.indexOf('<main'));
    const links = [...main.matchAll(/<a[^>]+href="(https:\/\/vickers-oil\.com\/wp-content\/uploads\/[^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/g)]
      .map(m => [m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), m[1]]);
    const ind = links.find(l => /industrial product data sheet/i.test(l[0]));
    const pds = ind || links.find(l => /^product data sheet$/i.test(l[0]));
    if (pds) docs.pds.push(['PDS', 'EN', pds[1]]);
    links.filter(l => /instructions/i.test(l[0])).forEach(l => docs.bruk.push(['Bruksanvisning', 'EN', l[1]]));
    links.filter(l => !l[0] && /NSF|\/\d{6}\.pdf$/.test(l[1]) && !/ISO21469|ISO-21469/i.test(l[1])).forEach(l => docs.sert.push(['NSF-registrering', 'EN', l[1]]));
    const s = bestSds(SDS_ALIAS[p.slug] || p.navn, media);
    if (s.NO) docs.sds.push(['SDS', 'NO', s.NO.url]);
    if (s.EN) docs.sds.push(['SDS', 'EN', s.EN.url]);
    if (!docs.sds.length) rep.mangler.push(p.navn + ': ingen SDS hos Vickers');
    if (!docs.pds.length) rep.mangler.push(p.navn + ': ingen PDS hos Vickers');
    for (const k of ['pds', 'sds', 'sert', 'bruk']) docs[k] = [...new Map(docs[k].map(d => [d[2], d])).values()];
    return { p, docs, ok: true };
  });

  // Last ned (felles filer, f.eks. serie-PDS, hentes én gang)
  const dir = { pds: 'pds', sds: 'sds', sert: 'sertifikater', bruk: 'pds' };
  const want = new Map();
  plan.forEach(x => Object.keys(dir).forEach(k => x.docs[k].forEach(d => want.set(d[2], 'vickers/datablad/' + dir[k] + '/' + fileOf(d[2])))));
  const got = new Map();
  await pool([...want.entries()], 8, async ([url, fil]) => {
    const d = await pdf(url), o = old.get(fil), dest = path.join(root, fil);
    if (d.status !== 200) {
      (d.status === 404 || d.status === 410 ? rep.borte : rep.feil).push(fil + ' (' + d.status + ')');
      if (o && fs.existsSync(dest)) got.set(url, o);
      return;
    }
    const sha = crypto.createHash('sha256').update(d.body).digest('hex');
    if (!o || o.sha256 !== sha || !fs.existsSync(dest)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, d.body);
      (o ? rep.endret : rep.nye).push(fil);
      got.set(url, { fil, kilde: url, sha256: sha, bytes: d.body.length, hentet: today, kontrollert: today });
    } else { rep.uendret++; got.set(url, Object.assign({}, o, { kontrollert: today })); }
  });

  const produkter = plan.map(({ p, docs, ok }) => {
    const before = prevBy.get(p.slug) || {};
    const conv = k => docs[k].filter(d => got.has(d[2])).map(d => [d[0], d[1], got.get(d[2]).fil]);
    const r = Object.assign({}, p, {
      bilde: fs.existsSync(path.join(root, 'vickers/bilder', p.slug + '.webp')) ? 'vickers/bilder/' + p.slug + '.webp' : '',
      pds: ok ? conv('pds') : (before.pds || []), sds: ok ? conv('sds') : (before.sds || []),
      sertifikater: ok ? conv('sert') : (before.sertifikater || []), bruksanvisning: ok ? conv('bruk') : (before.bruksanvisning || [])
    });
    for (const k of ['pds', 'sds', 'sertifikater']) if (!r[k].length && (before[k] || []).length) r[k] = before[k];  // behold forrige ved feil
    return r;
  });
  fs.writeFileSync(outPath, JSON.stringify({ oppdatert: today, kilde: 'vickers-oil.com (uten priser og lagertall)', kategorier: G.kategorier, produkter }, null, 1));

  const used = new Set(produkter.flatMap(p => [...p.pds, ...p.sds, ...p.sertifikater, ...p.bruksanvisning].map(d => d[2])));
  const filer = [...new Map([...old.values(), ...got.values()].filter(x => fs.existsSync(path.join(root, x.fil))).map(x => [x.fil, Object.assign({}, x, { ikkeIKatalogen: !used.has(x.fil) || undefined })])).values()]
    .sort((a, b) => a.fil.localeCompare(b.fil));
  fs.writeFileSync(manPath, JSON.stringify({ oppdatert: today, filer }, null, 1));
  return Object.assign(rep, { produkter: produkter.length, filer: filer.map(x => x.fil) });
}

function rapport(r, err) {
  const sec = (t, a) => a && a.length ? '\n### ' + t + ' (' + a.length + ')\n' + a.map(x => '- ' + x).join('\n') + '\n' : '';
  if (!r) return '\n## Vickers Oils\nKunne ikke oppdateres denne gangen: ' + err + ' (forrige kopier er beholdt).\n';
  return '\n## Vickers Oils\nProdukter: ' + r.produkter + '. Filer: ' + r.filer.length + '. Uendret: ' + r.uendret + '. Nye: ' + r.nye.length + '. Endret: ' + r.endret.length +
    '. Borte hos Vickers: ' + r.borte.length + '. Feil: ' + r.feil.length + '.\n' +
    sec('Nye', r.nye) + sec('Endret hos Vickers (kopien er erstattet)', r.endret) + sec('Borte hos Vickers (gammel kopi beholdt – bør sjekkes)', r.borte) +
    sec('Kunne ikke hentes nå', r.feil) + sec('Mangler hos Vickers', r.mangler) +
    sec('Nye produkter hos Vickers (ikke i katalogen ennå)', r.nyeProdukter) + sec('Produkter Vickers har fjernet', r.fjernetProdukter);
}

module.exports = { run, rapport };
if (require.main === module) run(process.cwd()).then(r => console.log(rapport(r))).catch(e => { console.error('Vickers-synk feilet:', e.message); process.exit(1); });
