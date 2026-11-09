/*
  Perma-Tec: kopierer databladene som perma/produkter.json lenker til (SDS, PDS og produktbrosjyrer fra perma-tec.com)
  til perma/datablad/, og holder kopiene oppdatert. Brukes av synk-datablad.js, kan også kjøres alene:
    NODE_USE_ENV_PROXY=1 node verktoy/perma.js

  Lenkene i perma/produkter.json beholdes som de er (kilde). Katalogsiden og /datablad bruker kopien
  når den ligger i datablad-indeks.json, ellers perma sin lenke.
  Perma bytter adresse når et dokument får ny versjon. Da gir den gamle lenken 404, og det meldes i rapporten
  («borte hos Perma») – den gamle kopien beholdes til lenken er oppdatert i perma/produkter.json.
*/
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const UA = { 'User-Agent': 'Mozilla/5.0 (Fuglesangs Tech datablad-synk)' };
const PRE = 'https://www.perma-tec.com/_Resources/Persistent/';

async function pdf(url) {
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
const fileOf = u => { const f = u.split('/').pop(); try { return decodeURIComponent(f); } catch (e) { return f; } };
const local = u => 'perma/datablad/' + fileOf(u);

async function run(root) {
  const today = new Date().toISOString().slice(0, 10);
  const P = JSON.parse(fs.readFileSync(path.join(root, 'perma/produkter.json'), 'utf8'));
  const urls = [...new Set(P.produkter.flatMap(p => [...(p.sds || []), ...(p.pds || [])].map(d => d[1])).filter(u => u.startsWith(PRE)))];
  const manPath = path.join(root, 'perma/datablad.json');
  const man = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : { filer: [] };
  const old = new Map(man.filer.map(x => [x.fil, x]));
  const rep = { nye: [], endret: [], uendret: 0, borte: [], feil: [] };
  const got = new Map();
  let k = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (k < urls.length) {
      const u = urls[k++], fil = local(u), dest = path.join(root, fil), o = old.get(fil);
      const d = await pdf(u);
      if (d.status !== 200) {
        (d.status === 404 || d.status === 410 ? rep.borte : rep.feil).push(fil + ' (' + d.status + ')');
        if (o && fs.existsSync(dest)) got.set(fil, o);
        continue;
      }
      const sha = crypto.createHash('sha256').update(d.body).digest('hex');
      if (!o || o.sha256 !== sha || !fs.existsSync(dest)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, d.body);
        (o ? rep.endret : rep.nye).push(fil);
        got.set(fil, { fil, kilde: u, sha256: sha, bytes: d.body.length, hentet: today, kontrollert: today });
      } else { rep.uendret++; got.set(fil, Object.assign({}, o, { kilde: u, kontrollert: today })); }
    }
  }));
  // gamle kopier som ikke lenger lenkes til, beholdes i lista (merket)
  for (const [f, x] of old) if (!got.has(f) && fs.existsSync(path.join(root, f))) got.set(f, Object.assign({}, x, { ikkeIKatalogen: true }));
  const filer = [...got.values()].sort((a, b) => a.fil.localeCompare(b.fil));
  fs.writeFileSync(manPath, JSON.stringify({ oppdatert: today, filer }, null, 1));
  return Object.assign(rep, { kontrollert: urls.length, filer: filer.map(x => x.fil) });
}

function rapport(r, err) {
  const sec = (t, a) => a && a.length ? '\n### ' + t + ' (' + a.length + ')\n' + a.map(x => '- ' + x).join('\n') + '\n' : '';
  if (!r) return '\n## Perma-Tec\nKunne ikke oppdateres denne gangen: ' + err + ' (forrige kopier er beholdt).\n';
  return '\n## Perma-Tec\nKontrollert: ' + r.kontrollert + ' datablad. Uendret: ' + r.uendret + '. Nye: ' + r.nye.length + '. Endret: ' + r.endret.length +
    '. Borte hos Perma: ' + r.borte.length + '. Feil: ' + r.feil.length + '.\n' +
    sec('Nye', r.nye) + sec('Endret hos Perma (kopien er erstattet)', r.endret) +
    sec('Borte hos Perma (ny versjon har trolig fått ny adresse – oppdater lenken i perma/produkter.json; gammel kopi beholdt)', r.borte) +
    sec('Kunne ikke hentes nå', r.feil);
}

module.exports = { run, rapport, local, PRE };
if (require.main === module) run(process.cwd()).then(r => console.log(rapport(r))).catch(e => { console.error('Perma-synk feilet:', e.message); process.exit(1); });
