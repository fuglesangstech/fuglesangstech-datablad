#!/usr/bin/env node
/*
  Synkroniserer kopiene av Chesterton-, LE- og Vickers-datablad i dette repoet med leverandørene.

  Kjør fra roten av repoet:   node verktoy/synk-datablad.js
  Krever Node 18+ (innebygd fetch). Endrer bare filer; commit og push gjøres etterpå.
  Bak en proxy (f.eks. i Claude sitt skymiljø):  NODE_USE_ENV_PROXY=1 node verktoy/synk-datablad.js

  1. Leser hvilke datablad produktkatalogen lenker til, fra katalogsidene på fuglesangstech.no
     (/chesterton-katalog: CD, /le-katalog: LD) – samme regler som /produkter-koden.
  2. Laster ned hvert datablad fra leverandøren og sammenligner med kopien (sha256).
  3. Nye og endrede filer skrives til chesterton/datablad/ og le/datablad/.
     Filer som ikke lenger finnes hos leverandøren blir liggende, men rapporteres.
  4. Henter Chestertons sertifikater og godkjenninger (verktoy/sertifikater.js) og oppdaterer
     chesterton/sertifikater/ og sertifikater.json.
  4b. Henter Vickers Oils sine PDS, SDS og NSF-sertifikater (verktoy/vickers.js) til vickers/.
  5. Oppdaterer datablad.json (full liste med kilde, sjekksum og datoer) og datablad-indeks.json
     (kort liste som katalogen leser), og skriver en rapport til synk-rapport.md.
*/
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const SITE = 'https://www.fuglesangstech.no';
const CH_PDF = 'https://chesterton.com/Files/Product%20assets/';
const LE_SDS = 'https://lelubricants.com/wp-content/uploads/LE-MSDS/LE-';
const LE_PDF = 'https://lelubricants.com/wp-content/uploads/pdf/';
const UA = { 'User-Agent': 'Mozilla/5.0 (Fuglesangs Tech datablad-synk)' };

function grab(html, name) {
  const m = new RegExp('(?:var|let|const)\\s+' + name + '\\s*=\\s*([\\[{])').exec(html);
  if (!m) throw new Error(name + ' mangler på katalogsiden');
  const open = m[1], close = open === '[' ? ']' : '}';
  let s = m.index + m[0].length - 1, d = 0, q = '', j;
  for (j = s; j < html.length; j++) {
    const c = html[j];
    if (q) { if (c === '\\') j++; else if (c === q) q = ''; }
    else if (c === '"' || c === "'") q = c;
    else if (c === open) d++;
    else if (c === close) { d--; if (!d) break; }
  }
  return new Function('return ' + html.slice(s, j + 1))();
}

async function text(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
  return r.text();
}

function wanted(chHtml, leHtml) {
  const out = [];
  const pdf = p => /^https?:/.test(p) ? p : CH_PDF + encodeURI(p).replace(/#/g, '%23');
  grab(chHtml, 'CD').forEach(r => [r[7], r[8]].forEach(list => (list || []).forEach(d => {
    if (Array.isArray(d) && d[2] && !/^https?:/.test(String(d[2]))) out.push({ fil: 'chesterton/datablad/' + d[2], kilde: pdf(String(d[2])) });
  })));
  grab(leHtml, 'LD').forEach(r => {
    const sds = String(r[8] || ''), p = String(r[9] || '');
    String(r[0]).split(' / ').forEach(nr => {
      if (sds.includes('N')) out.push({ fil: 'le/datablad/sds/LE-' + nr + '-NO-EGHS.pdf', kilde: LE_SDS + nr + '-NO-EGHS.pdf' });
      if (sds.includes('A')) out.push({ fil: 'le/datablad/sds/LE-' + nr + 'A-NO-EGHS.pdf', kilde: LE_SDS + nr + 'A-NO-EGHS.pdf' });
    });
    if (p) out.push({ fil: 'le/datablad/pds/' + p, kilde: LE_PDF + encodeURI(p) });
  });
  return [...new Map(out.map(x => [x.fil, x])).values()];
}

async function download(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: UA, redirect: 'follow' });
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

(async () => {
  const root = process.cwd();
  const today = new Date().toISOString().slice(0, 10);
  const manPath = path.join(root, 'datablad.json');
  const man = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : { datablad: [] };
  const old = new Map(man.datablad.map(x => [x.fil, x]));

  const [ch, le] = await Promise.all([text(SITE + '/chesterton-katalog'), text(SITE + '/le-katalog')]);
  const want = wanted(ch, le);
  const rep = { nye: [], endret: [], uendret: 0, borte: [], feil: [] };

  const rows = await pool(want, 8, async w => {
    const d = await download(w.kilde);
    const prev = old.get(w.fil);
    if (d.status !== 200) {
      (d.status === 404 || d.status === 410 ? rep.borte : rep.feil).push(w.fil + ' (' + d.status + ')');
      return prev || null;                                  // behold kopien vi har
    }
    const sha = crypto.createHash('sha256').update(d.body).digest('hex');
    const dest = path.join(root, w.fil);
    if (!prev || prev.sha256 !== sha || !fs.existsSync(dest)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, d.body);
      (prev ? rep.endret : rep.nye).push(w.fil);
      return { fil: w.fil, kilde: w.kilde, sha256: sha, bytes: d.body.length, hentet: today, kontrollert: today };
    }
    rep.uendret++;
    return Object.assign({}, prev, { kilde: w.kilde, kontrollert: today });
  });

  // Filer som ikke lenger brukes av katalogen beholdes i lista (merket), slik at gamle lenker virker.
  const now = new Map(rows.filter(Boolean).map(x => [x.fil, x]));
  const ubrukt = [];
  for (const [f, x] of old) if (!now.has(f) && fs.existsSync(path.join(root, f))) { now.set(f, Object.assign({}, x, { ikkeIKatalogen: true })); ubrukt.push(f); }

  const list = [...now.values()].sort((a, b) => a.fil.localeCompare(b.fil));
  fs.writeFileSync(manPath, JSON.stringify({ oppdatert: today, datablad: list }, null, 1));
  fs.writeFileSync(path.join(root, 'datablad-indeks.json'), JSON.stringify({ oppdatert: today, filer: list.map(x => x.fil) }));

  // Vickers Oils (verktoy/vickers.js) – egne filer under vickers/, tas med i indeksen
  let vik = null, vikErr = '';
  try { vik = await require('./vickers.js').run(root); } catch (e) { vikErr = e.message; }
  const vikFiler = vik ? vik.filer : (fs.existsSync(path.join(root, 'vickers/datablad.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'vickers/datablad.json'), 'utf8')).filer.map(x => x.fil) : []);
  fs.writeFileSync(path.join(root, 'datablad-indeks.json'), JSON.stringify({ oppdatert: today, filer: list.map(x => x.fil).concat(vikFiler).sort() }));

  let cert = null, certErr = '';
  try { cert = await require('./sertifikater.js').run(root, grab(ch, 'CD').map(r => String(r[2]))); }
  catch (e) { certErr = e.message; }

  const sec = (t, a) => a.length ? '\n## ' + t + ' (' + a.length + ')\n' + a.map(x => '- ' + x).join('\n') + '\n' : '';
  const problemer = rep.feil.length + rep.borte.length + (cert ? cert.feil.length : 1) + (vik ? vik.feil.length + vik.borte.length + vik.fjernetProdukter.length : 1);
  const md = '# Datablad-synk ' + today + '\n\n' +
    'STATUS: ' + (problemer ? 'MÅ SJEKKES – ' + problemer + ' problem(er), se under' : 'OK') + '\n\n' +
    'Kontrollert: ' + want.length + ' datablad. Uendret: ' + rep.uendret + '. Nye: ' + rep.nye.length + '. Endret: ' + rep.endret.length +
    '. Borte hos leverandør: ' + rep.borte.length + '. Feil: ' + rep.feil.length + '.\n' +
    sec('Nye', rep.nye) + sec('Endret hos leverandør (kopien er erstattet)', rep.endret) +
    sec('Borte hos leverandør (gammel kopi beholdt – bør sjekkes)', rep.borte) + sec('Kunne ikke hentes nå (prøves igjen neste gang)', rep.feil) +
    sec('Ikke lenger brukt i katalogen (beholdt)', ubrukt) +
    '\n## Chesterton-sertifikater\n' + (cert
      ? 'Dokumenter hos Chesterton: ' + cert.dokumenter + '. Koblet til ' + cert.produkter + ' produkter (' + cert.filer + ' filer). Nye: ' + cert.nye.length + '. Endret: ' + cert.endret.length + '. Feil: ' + cert.feil.length + '.\n' +
        sec('Nye sertifikater', cert.nye) + sec('Endrede sertifikater', cert.endret) + sec('Utløpte sertifikater (skjult på produktsidene)', cert.utlopt) + sec('Sertifikater som ikke kunne hentes', cert.feil) +
        'Sertifikater Chesterton har fjernet, vises ikke lenger på produktsidene.\n'
      : 'Kunne ikke oppdateres denne gangen: ' + certErr + ' (sertifikater.json er uendret).\n') +
    require('./vickers.js').rapport(vik, vikErr);
  fs.writeFileSync(path.join(root, 'synk-rapport.md'), md);
  console.log(md);
})().catch(e => { console.error('Synk feilet:', e.message); process.exit(1); });
