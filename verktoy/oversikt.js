/*
  Lager datablad-oversikt.json: én samlet liste over sikkerhetsdatablad (SDS) og produktdatablad (PDS)
  for alle leverandørene, som datablad-siden på fuglesangstech.no/datablad leser.

  Kilder (samme data som katalogene bruker – ingenting vedlikeholdes to steder):
    Chesterton  – CD-lista på /chesterton-katalog
    LE          – LD-lista på /le-katalog
    UTB         – utb/produkter.json
    Perma-Tec   – perma/produkter.json
    Vickers     – vickers/produkter.json
  Stier uten https:// er filer i dette repoet. Brukes av synk-datablad.js.

  Hver rad: { lev, nr, navn, sds: [[etikett, språk, fil]], pds: [...], dok: [[etikett, språk, fil, type]], lenke }
  «dok» er andre dokumenter enn SDS/PDS. Typer: sertifikat, bruksanvisning (flere kan komme: brosjyre, katalog, case).
    Chesterton – sertifikater.json (verktoy/sertifikater.js, utløpte er allerede tatt ut)
    Vickers    – sertifikater og bruksanvisning i vickers/produkter.json
*/
'use strict';
const fs = require('fs'), path = require('path');
const CH_PDF = 'https://chesterton.com/Files/Product%20assets/';

const pid = s => String(s).toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const read = (root, f) => { const p = path.join(root, f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };

function build(root, CD, LD) {
  const have = new Set((read(root, 'datablad-indeks.json') || { filer: [] }).filer);
  const rows = [];
  const S = 'https://www.fuglesangstech.no';

  const cert = (read(root, 'sertifikater.json') || { produkter: {} }).produkter || {};
  const dok = (list, type) => (list || []).filter(d => Array.isArray(d) && d[2]).map(d => [String(d[0] || ''), String(d[1] || 'EN'), String(d[2]), type]);

  // Chesterton
  const chFile = p => /^https?:/.test(p) ? p : (have.has('chesterton/datablad/' + p) ? 'chesterton/datablad/' + p : CH_PDF + encodeURI(p).replace(/#/g, '%23'));
  (CD || []).forEach(r => {
    const docs = l => (l || []).filter(d => Array.isArray(d) && d[2]).map(d => [String(d[0] || ''), String(d[1] || 'EN'), chFile(String(d[2]))]);
    const sds = docs(r[7]), pds = docs(r[8]), d = dok(cert[String(r[2])], 'sertifikat');
    if (sds.length || pds.length || d.length) rows.push({ lev: 'Chesterton', nr: String(r[2]), navn: String(r[3]), sds, pds, dok: d, lenke: S + '/produkter#' + pid(r[2]) });
  });

  // LE
  const first = {};
  (LD || []).forEach(r => { const n = String(r[1]); if (!(n in first)) first[n] = String(r[0]).split(' / ')[0]; });
  (LD || []).forEach(r => {
    const nrs = String(r[0]).split(' / '), flag = String(r[8] || ''), sds = [];
    nrs.forEach(nr => {
      if (flag.includes('N')) sds.push(['LE ' + nr, 'NO', 'le/datablad/sds/LE-' + nr + '-NO-EGHS.pdf']);
      if (flag.includes('A')) sds.push(['LE ' + nr + 'A', 'NO', 'le/datablad/sds/LE-' + nr + 'A-NO-EGHS.pdf']);
    });
    const pds = r[9] ? [['PDS', 'EN', 'le/datablad/pds/' + r[9]]] : [];
    const navn = String(r[1]).replace(/®/g, '') + (r[6] ? ' ' + r[6] : '');
    if (sds.length || pds.length) rows.push({ lev: 'Lubrication Engineers', nr: nrs.join(' / '), navn, sds, pds, lenke: S + '/produkter#le-' + pid(first[String(r[1])]) });
  });

  // UTB
  const utb = read(root, 'utb/produkter.json');
  (utb ? utb.produkter : []).forEach(p => {
    const sds = p.sds ? [['SDS', p.sds_sprak || 'NO', 'utb/' + p.sds]] : [], pds = p.pds ? [['PDS', 'EN', 'utb/' + p.pds]] : [];
    if (sds.length || pds.length) rows.push({ lev: 'UTB', nr: '', navn: p.navn, sds, pds, lenke: S + '/produkter#utb-' + pid(p.navn) });
  });

  // Perma-Tec (kopi i perma/datablad/ når den finnes, ellers perma sin lenke)
  const perma = read(root, 'perma/produkter.json'), pm = require('./perma.js');
  const pf = u => (u.startsWith(pm.PRE) && have.has(pm.local(u))) ? pm.local(u) : u;
  (perma ? perma.produkter : []).forEach(p => {
    const sds = (p.sds || []).map(d => [d[0], 'EN', pf(d[1])]), pds = (p.pds || []).map(d => [d[0], 'EN', pf(d[1])]);
    if (sds.length || pds.length) rows.push({ lev: 'Perma-Tec', nr: '', navn: p.navn, sds, pds, lenke: S + '/perma-tec-katalog?q=' + encodeURIComponent(p.navn.replace(/\s*\(S[FO]\d\d\)$/, '')) });
  });

  // Vickers Oils
  const vik = read(root, 'vickers/produkter.json');
  (vik ? vik.produkter : []).forEach(p => {
    const sds = (p.sds || []).map(d => [d[0], d[1], d[2]]), pds = (p.pds || []).map(d => [d[0], d[1], d[2]]);
    const d = dok(p.sertifikater, 'sertifikat').concat(dok(p.bruksanvisning, 'bruksanvisning'));
    if (sds.length || pds.length || d.length) rows.push({ lev: 'Vickers Oils', nr: '', navn: p.navn, sds, pds, dok: d, lenke: S + '/vickers-katalog?q=' + encodeURIComponent(p.navn) });
  });

  const out = { oppdatert: new Date().toISOString().slice(0, 10), leverandorer: ['Chesterton', 'Lubrication Engineers', 'UTB', 'Vickers Oils', 'Perma-Tec'], rader: rows };
  fs.writeFileSync(path.join(root, 'datablad-oversikt.json'), JSON.stringify(out));
  rows.forEach(r => { if (!r.dok) r.dok = []; });
  return { rader: rows.length, sds: rows.reduce((n, r) => n + r.sds.length, 0), pds: rows.reduce((n, r) => n + r.pds.length, 0), dok: rows.reduce((n, r) => n + r.dok.length, 0) };
}

module.exports = { build };
