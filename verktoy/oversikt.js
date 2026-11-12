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

  Hver rad: { lev, nr, navn, sds: [[etikett, språk, fil]], pds: [...], dok: [[etikett, språk, fil, type]], lenke, generelt? }
  generelt: true = et dokument som ikke hører til ett produkt (katalog, brosjyre o.l.); raden er selve dokumentet.
  «dok» er andre dokumenter enn SDS/PDS. Typer: sertifikat, bruksanvisning (flere kan komme: brosjyre, katalog, case).
    Chesterton – sertifikater.json (verktoy/sertifikater.js, utløpte er allerede tatt ut)
    Chesterton – litteratur.json (verktoy/litteratur.js): brosjyrer, kataloger, bruksanvisninger og case-studier
                 (lenker til chesterton.com). Dokumenter som gjelder mange produkter, blir egne rader.
    Vickers    – sertifikater og bruksanvisning i vickers/produkter.json
    Alle       – dokumenter.json (verktoy/lag_dokumenter.py): utvalgte brosjyrer, kataloger, bruksanvisninger,
                 tekniske veiledninger og firmasertifikater fra Vickers, Perma-Tec og LE (lenker).
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
  const lit = read(root, 'litteratur.json') || { produkter: {}, generelt: [] };
  const dok = (list, type) => (list || []).filter(d => Array.isArray(d) && d[2]).map(d => [String(d[0] || ''), String(d[1] || 'EN'), String(d[2]), type]);

  // Chesterton
  const chFile = p => /^https?:/.test(p) ? p : (have.has('chesterton/datablad/' + p) ? 'chesterton/datablad/' + p : CH_PDF + encodeURI(p).replace(/#/g, '%23'));
  (CD || []).forEach(r => {
    const docs = l => (l || []).filter(d => Array.isArray(d) && d[2]).map(d => [String(d[0] || ''), String(d[1] || 'EN'), chFile(String(d[2]))]);
    const sds = docs(r[7]), pds = docs(r[8]), d = dok(cert[String(r[2])], 'sertifikat').concat((lit.produkter || {})[String(r[2])] || []);
    if (sds.length || pds.length || d.length) rows.push({ lev: 'Chesterton', nr: String(r[2]), navn: String(r[3]), sds, pds, dok: d, lenke: S + '/produkter#' + pid(r[2]) });
  });

  // Chesterton – generelle dokumenter (kataloger og brosjyrer for hele sortimentet)
  (lit.generelt || []).forEach(d => rows.push({ lev: 'Chesterton', nr: '', navn: d[0], sds: [], pds: [], dok: [d], lenke: d[2], generelt: true }));

  // LE
  const first = {};
  (LD || []).forEach(r => { const n = String(r[1]); if (!(n in first)) first[n] = String(r[0]); });   // hele produktnummeret, f.eks. «6312 / 6315» → #le-6312-6315 som i /produkter
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
    const vnr = (p.emballasje || []).map(e => e.varenr).filter(Boolean); // varenumre gjør produktet søkbart på /datablad
    if (sds.length || pds.length) rows.push(Object.assign({ lev: 'UTB', nr: '', navn: p.navn, sds, pds, lenke: S + '/produkter#utb-' + pid(p.navn) }, vnr.length ? { vnr } : {}));
  });

  // Samme slug som /produkter bruker for produkt-ID-er
  const pslug = t => String(t).toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  // Perma-Tec (kopi i perma/datablad/ når den finnes, ellers perma sin lenke)
  const PERMA_SYS = ['star vario long range', 'star vario bluetooth', 'star vario ex', 'star vario', 'star control', 'futura plus', 'futura', 'classic', 'flex plus', 'flex', 'nova', 'ultra', 'pro', 'ecosy'];
  const permaId = navn => {
    const n = navn.toLowerCase();
    if (!/^perma /.test(n) || /\blc\b|\(s[fo]\d\d\)/.test(n)) return '';
    const k = PERMA_SYS.find(x => n.startsWith('perma ' + x));
    if (!k) return '';
    return 'perma-' + ({ 'star vario ex': 'star vario', pro: 'pro line' }[k] || k).replace(/\s+/g, '-');
  };
  const perma = read(root, 'perma/produkter.json'), pm = require('./perma.js');
  const pf = u => (u.startsWith(pm.PRE) && have.has(pm.local(u))) ? pm.local(u) : u;
  (perma ? perma.produkter : []).forEach(p => {
    const sds = (p.sds || []).map(d => [d[0], 'EN', pf(d[1])]), pds = (p.pds || []).map(d => [d[0], 'EN', pf(d[1])]);
    // Fuglesangs Tech selger bare smøresystemene (fylt med eget fett) – ikke perma-fett, LC-patroner eller tilbehør.
    // Systemene lenkes til produktet i /produkter (katalogsiden er skjult).
    const sid = permaId(p.navn);
    if (!sid) return;
    if (sds.length || pds.length) rows.push({ lev: 'Perma-Tec', nr: '', navn: p.navn, sds, pds, lenke: S + '/produkter#' + sid });
  });

  // Vickers Oils
  const vik = read(root, 'vickers/produkter.json');
  (vik ? vik.produkter : []).forEach(p => {
    const sds = (p.sds || []).map(d => [d[0], d[1], d[2]]), pds = (p.pds || []).map(d => [d[0], d[1], d[2]]);
    const d = dok(p.sertifikater, 'sertifikat').concat(dok(p.bruksanvisning, 'bruksanvisning'));
    if (sds.length || pds.length || d.length) rows.push({ lev: 'Vickers Oils', nr: '', navn: p.navn, sds, pds, dok: d, lenke: S + '/produkter#vik-' + pslug(p.navn) });   // aliaset til produktkortet i /produkter
  });

  rows.forEach(r => { if (!r.dok) r.dok = []; });

  // Utvalgte dokumenter (dokumenter.json): ved produktene «produkter» peker på, ellers som egen rad
  const utvalg = (read(root, 'dokumenter.json') || { dokumenter: [] }).dokumenter || [];
  utvalg.forEach(d => {
    const rad = [d.navn, d.sprak || 'EN', d.url, d.type];
    let treff = [];
    if (d.produkter) { const rx = new RegExp(d.produkter); treff = rows.filter(r => r.lev === d.lev && !r.generelt && rx.test(r.navn)); }
    if (treff.length) treff.forEach(r => { if (!r.dok.some(x => x[2] === d.url)) r.dok.push(rad); });
    else rows.push({ lev: d.lev, nr: '', navn: d.navn, sds: [], pds: [], dok: [rad], lenke: d.url, generelt: true });
  });
  // radene samlet per leverandør (generelle dokumenter sist innen leverandøren)
  const levRek = ['Chesterton', 'Lubrication Engineers', 'UTB', 'Perma-Tec', 'Vickers Oils', 'Fuglesangs Tech'];
  const pos = new Map(rows.map((r, i) => [r, i]));
  rows.sort((a, b) => (levRek.indexOf(a.lev) - levRek.indexOf(b.lev)) || (pos.get(a) - pos.get(b)));
  // Delingen mellom sidene:
  //   /datablad  (datablad-oversikt.json) – det som hører til ett produkt: SDS, PDS, produktsertifikater, bruksanvisninger
  //   /ressurser (ressurser.json)         – alt annet: kataloger, brosjyrer, case-studier, tekniske veiledninger, fagartikler
  //                                         og generelle dokumenter (f.eks. firmasertifikater). Produktene beholdes som stikkord.
  // Produktnavnet som stikkord: produktnummeret foran bare når det ikke allerede står først i navnet (samme regel på sidene)
  const flat = x => String(x).toLowerCase().replace(/\(e\)/g, '').replace(/[^a-z0-9]/g, '');
  const produktTagg = r => (r.nr && flat(r.navn).indexOf(flat(r.nr)) !== 0 ? r.nr + ' ' : '') + r.navn;
  const RESSURS = new Set(['katalog', 'brosjyre', 'case', 'teknisk', 'artikkel']);
  const res = new Map();
  const tilRessurs = (lev, d, produkt) => {
    let x = res.get(d[2]);
    if (!x) { x = { lev, navn: d[0], type: d[3], sprak: d[1], url: d[2], produkter: [] }; res.set(d[2], x); }
    if (produkt && x.produkter.indexOf(produkt) < 0) x.produkter.push(produkt);
  };
  const produktRader = [];
  rows.forEach(r => {
    if (r.generelt) { r.dok.forEach(d => tilRessurs(r.lev, d, '')); return; }
    const navn = produktTagg(r);
    r.dok = r.dok.filter(d => { if (RESSURS.has(d[3])) { tilRessurs(r.lev, d, navn); return false; } return true; });
    if (r.sds.length || r.pds.length || r.dok.length) produktRader.push(r);
  });
  const levs = ['Chesterton', 'Lubrication Engineers', 'UTB', 'Vickers Oils', 'Perma-Tec'];
  const out = { oppdatert: new Date().toISOString().slice(0, 10), leverandorer: levs, rader: produktRader };
  fs.writeFileSync(path.join(root, 'datablad-oversikt.json'), JSON.stringify(out));
  const ressurser = [...res.values()];
  fs.writeFileSync(path.join(root, 'ressurser.json'), JSON.stringify({ oppdatert: out.oppdatert, leverandorer: levs.concat('Fuglesangs Tech'), dokumenter: ressurser }));
  return { rader: produktRader.length, sds: produktRader.reduce((n, r) => n + r.sds.length, 0), pds: produktRader.reduce((n, r) => n + r.pds.length, 0),
    dok: produktRader.reduce((n, r) => n + r.dok.length, 0), ressurser: ressurser.length };
}

module.exports = { build };
