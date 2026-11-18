/*
  Royal Purple Industrial og BioMax: holder de norske sikkerhetsdatabladene (EU-format) i rpi/sds/ og
  produktdatabladene (PDS) i rpi/pds/ oppdatert med egne kopier fra royalpurpleind.com. Brukes av synk-datablad.js,
  kan også kjøres alene:
    NODE_USE_ENV_PROXY=1 node verktoy/rpi.js

  Kilde for SDS: SDS-søket på royalpurpleind.com (samme database som LE). Alle produktkoder som starter med «RP»
  hentes, og bare norske SDS i EU-format brukes: RP-<kode>-NO-EGHS.pdf.
  - Nye koder hos Royal Purple som ikke er i rpi/produkter.json meldes i rapporten («nye produkter») – de må legges inn
    i rpi/produkter.json (gi Claude beskjed).
  - Koder i rpi/produkter.json som ikke lenger har norsk SDS meldes («borte»). Gammel kopi beholdes.
  - PDS: i rpi/produkter.json er hver PDS [etikett, språk, fil, kilde]. «kilde» er adressen hos Royal Purple, «fil» er
    kopien vår (rpi/pds/…). Kopien lastes ned på nytt hver gang og byttes ut hvis Royal Purple har endret den.
    Ny PDS: legg inn [etikett, språk, kilde-URL] – skriptet laster den ned og setter inn filen selv.
    Forsvinner en PDS hos Royal Purple, beholdes kopien vår og det meldes i rapporten.
*/
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const UA = { 'User-Agent': 'Mozilla/5.0 (Fuglesangs Tech datablad-synk)' };
const AJAX = 'https://www.royalpurpleind.com/wp-admin/admin-ajax.php';
const SDS = kode => 'https://www.royalpurpleind.com/wp-content/uploads/LE-MSDS/RP-' + kode + '-NO-EGHS.pdf';

async function hent(url, pdf) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: UA, redirect: 'follow' });
      if (r.status === 404 || r.status === 410) return { status: r.status };
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const b = Buffer.from(await r.arrayBuffer());
      if (pdf && b.slice(0, 5).toString() !== '%PDF-') return { status: 'ikke-pdf' };
      return { status: 200, body: b };
    } catch (e) { if (i === 2) return { status: 'feil: ' + e.message }; await new Promise(r => setTimeout(r, 2000)); }
  }
}

// Alle norske SDS i EU-format som finnes hos Royal Purple akkurat nå
async function koderHosRP() {
  const d = await hent(AJAX + '?action=ajax_get_doc_results&prodnum=RP', false);
  if (d.status !== 200) throw new Error('SDS-søket svarte ikke (' + d.status + ')');
  const html = JSON.parse(d.body.toString()).table_html || '';
  const out = new Set();
  for (const m of html.replace(/\\\//g, '/').matchAll(/<tr><td>([^<]+)<\/td><td>[^<]*<\/td><td>European Union<\/td><td>NO<\/td>/g)) out.add(m[1].trim());
  if (out.size < 50) throw new Error('SDS-søket ga bare ' + out.size + ' norske SDS – søket har trolig endret seg');
  return out;
}

async function run(root) {
  const today = new Date().toISOString().slice(0, 10);
  const P = JSON.parse(fs.readFileSync(path.join(root, 'rpi/produkter.json'), 'utf8'));
  const manPath = path.join(root, 'rpi/datablad.json');
  const man = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : { filer: [] };
  const old = new Map(man.filer.map(x => [x.fil, x]));
  const rep = { nye: [], endret: [], uendret: 0, borte: [], feil: [], nyeProdukter: [], pdsBorte: [] };
  const vare = P.produkter.flatMap(p => p.varianter.map(v => ({ p, v })));
  const hosRP = await koderHosRP();
  const vaare = new Set(vare.map(x => x.v.kode));
  for (const k of [...hosRP].sort()) if (!vaare.has(k)) rep.nyeProdukter.push(k + ' – norsk SDS finnes hos Royal Purple, men koden er ikke i rpi/produkter.json');

  const got = new Map();
  let i = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (i < vare.length) {
      const { p, v } = vare[i++], fil = v.sds, dest = path.join(root, fil), o = old.get(fil);
      if (!hosRP.has(v.kode)) { rep.borte.push(p.navn + ' (' + v.kode + ') – ikke lenger norsk SDS hos Royal Purple'); if (o) got.set(fil, o); continue; }
      const d = await hent(SDS(v.kode), true);
      if (d.status !== 200) { (d.status === 404 || d.status === 410 ? rep.borte : rep.feil).push(fil + ' (' + d.status + ')'); if (o) got.set(fil, o); continue; }
      const sha = crypto.createHash('sha256').update(d.body).digest('hex');
      const disk = fs.existsSync(dest) ? crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex') : '';
      if (sha !== disk) {
        fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, d.body);
        (disk ? rep.endret : rep.nye).push(p.navn + ' ' + (v.grad || '') + ' (' + v.kode + ')');
        got.set(fil, { fil, kilde: SDS(v.kode), sha256: sha, bytes: d.body.length, hentet: today, kontrollert: today, endret: disk ? today : (o && o.endret) });
      } else { rep.uendret++; got.set(fil, Object.assign({ fil, kilde: SDS(v.kode), sha256: sha, bytes: d.body.length, hentet: (o && o.hentet) || today, endret: o && o.endret }, { kontrollert: today })); }
    }
  }));
  // Produktdatabladene: egne kopier i rpi/pds/, hentet fra Royal Purple hver gang
  const pdsFil = url => 'rpi/pds/' + decodeURIComponent(url.split('/').pop().split('?')[0]).replace(/[^A-Za-z0-9 ._()&+-]/g, '').replace(/\s+/g, ' ').trim();
  const kilder = new Map();   // kilde-URL -> fil
  P.produkter.forEach(p => (p.pds || []).forEach(d => {
    const kilde = d[3] || (/^https?:/.test(d[2]) ? d[2] : null);
    if (kilde && !kilder.has(kilde)) kilder.set(kilde, /^https?:/.test(d[2]) ? pdsFil(kilde) : d[2]);
  }));
  for (const [kilde, fil] of kilder) {
    const dest = path.join(root, fil), o = old.get(fil), d = await hent(kilde, true);
    if (d.status !== 200) { rep.pdsBorte.push(fil.replace('rpi/pds/', '') + ' (' + d.status + (fs.existsSync(dest) ? ', vår kopi er beholdt' : ', ingen kopi ennå – lenker til Royal Purple') + ')'); if (o) got.set(fil, o); continue; }
    const sha = crypto.createHash('sha256').update(d.body).digest('hex');
    const disk = fs.existsSync(dest) ? crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex') : '';
    if (sha !== disk) {
      fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, d.body);
      (disk ? rep.endret : rep.nye).push('PDS ' + fil.replace('rpi/pds/', ''));
      got.set(fil, { fil, kilde, sha256: sha, bytes: d.body.length, hentet: today, kontrollert: today, endret: disk ? today : (o && o.endret) });
    } else { rep.uendret++; got.set(fil, { fil, kilde, sha256: sha, bytes: d.body.length, hentet: (o && o.hentet) || today, endret: o && o.endret, kontrollert: today }); }
  }
  // pek produktene til kopien vår (eller til Royal Purple hvis vi ikke har noen kopi ennå)
  let pdsEndret = false;
  P.produkter.forEach(p => (p.pds || []).forEach(d => {
    const kilde = d[3] || (/^https?:/.test(d[2]) ? d[2] : null); if (!kilde) return;
    const fil = kilder.get(kilde), ny = fs.existsSync(path.join(root, fil)) ? fil : kilde;
    if (d[2] !== ny || d[3] !== kilde) { d[2] = ny; d[3] = kilde; pdsEndret = true; }
  }));
  if (pdsEndret) fs.writeFileSync(path.join(root, 'rpi/produkter.json'), JSON.stringify(P, null, 1));
  const filer = [...got.values()].sort((a, b) => a.fil.localeCompare(b.fil));
  fs.writeFileSync(manPath, JSON.stringify({ oppdatert: today, filer }, null, 1));
  return Object.assign(rep, { kontrollert: vare.length, pds: kilder.size, filer: filer.map(x => x.fil) });
}

function rapport(r, err) {
  const sec = (t, a) => a && a.length ? '\n### ' + t + ' (' + a.length + ')\n' + a.map(x => '- ' + x).join('\n') + '\n' : '';
  if (!r) return '\n## Royal Purple Industrial og BioMax\nKunne ikke oppdateres denne gangen: ' + err + ' (forrige kopier er beholdt).\n';
  return '\n## Royal Purple Industrial og BioMax\nKontrollert: ' + r.kontrollert + ' norske SDS og ' + r.pds + ' PDS. Uendret: ' + r.uendret + '. Nye: ' + r.nye.length +
    '. Endret: ' + r.endret.length + '. Borte: ' + r.borte.length + '. Feil: ' + r.feil.length + '.\n' +
    sec('Nye', r.nye) + sec('Endret hos Royal Purple (kopien er erstattet)', r.endret) +
    sec('Borte hos Royal Purple (gammel kopi beholdt – bør sjekkes)', r.borte) + sec('Kunne ikke hentes nå', r.feil) +
    sec('Nye produkter hos Royal Purple (ikke i katalogen vår ennå)', r.nyeProdukter) + sec('Produktdatablad som ikke kunne hentes hos Royal Purple', r.pdsBorte);
}
const problemer = r => r ? r.borte.length + r.feil.length + r.nyeProdukter.length + r.pdsBorte.length : 1;

module.exports = { run, rapport, problemer };
if (require.main === module) run(process.cwd()).then(r => console.log(rapport(r))).catch(e => { console.error('RPI-synk feilet:', e.message); process.exit(1); });
