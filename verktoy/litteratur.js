/*
  Henter Chestertons produktlitteratur fra chesterton.com/resources/product-literature:
  brosjyrer, kataloger, bruksanvisninger (Application Instructions) og case-studier – bare norsk og engelsk.
  Dokumentene kobles til produktene i Chesterton-katalogen på fuglesangstech.no (samme navneregler som sertifikatene).
  I tillegg tas noen generelle dokumenter med (ARC, smøremidler og MRO, kjernekatalogen og firmabrosjyren).

  Filene kopieres IKKE – vi lenker til chesterton.com, og lenkesjekken melder fra hvis noe forsvinner.
  Skriver litteratur.json, som verktoy/oversikt.js legger inn i datablad-oversikt.json (/datablad).
  Brukes av synk-datablad.js, men kan også kjøres alene fra roten av repoet:
    NODE_USE_ENV_PROXY=1 node verktoy/litteratur.js
*/
'use strict';
const fs = require('fs'), path = require('path');
const { MAP, key } = require('./sertifikater.js');
const CH = 'https://chesterton.com';
const LIST = CH + '/resources/product-literature?PageSize=96&RequestType=UpdateList&Search=&DocumentType=';
const UA = { 'User-Agent': 'Mozilla/5.0 (Fuglesangs Tech datablad-synk)' };
const TYPER = { 'Brochure': 'brosjyre', 'Catalog': 'katalog', 'Application Instructions': 'bruksanvisning', 'Case Study': 'case' };
const SPRAK = { English: 'EN', Norsk: 'NO' };
// Generelle dokumenter (uten produkt) som er relevante for det Fuglesangs Tech fører
const GENERELT = /ARC|Lubric|MRO|Core Product|Corporate|Coating/i, IKKE = /Seal|Packing|Gasket|Kaplan|Pump Cutaway/i;

const unesc = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
function parse(h, type) {
  const out = [], re = /<div class="g-col-6 g-col-lg-3" onclick="window\.open\('([^']+)'\)"([\s\S]*?)(?=<div class="g-col-6 g-col-lg-3" onclick|$)/g;
  let m;
  while ((m = re.exec(h))) {
    const b = m[2], t = /<h3[^>]*>([\s\S]*?)<\/h3>/.exec(b), p = /<b>Product\(s\)<\/b>:\s*<span>([\s\S]*?)<\/span>/.exec(b);
    out.push({ type, url: unesc(m[1]), tittel: t ? unesc(t[1].replace(/\s+/g, ' ').trim()) : '', prod: p ? unesc(p[1].replace(/\s+/g, ' ').trim()) : '' });
  }
  return out;
}
const sprak = t => { const m = /\(([^()]*)\)\s*$/.exec(t); return m ? SPRAK[m[1].trim()] : undefined; };
function etikett(d) {
  let t = d.tittel.replace(/\s*\((English|Norsk)\)\s*$/, '').replace(/\.pdf$/i, '').trim();
  t = t.replace(/^AI:\s*/i, '').replace(/^Case Study:\s*/i, '').replace(/^Catalog:\s*/i, '').replace(/^Brochure:\s*/i, '')
    .replace(/\s+Application Instructions$/i, '').replace(/\s+Brochure$/i, '').replace(/\s{2,}/g, ' ');
  return t;
}
const abs = u => /^https?:/.test(u) ? u : CH + encodeURI(u).replace(/#/g, '%23');

async function run(root, codes) {
  const all = [];
  for (const type of Object.keys(TYPER)) {
    for (let n = 1; n <= 40; n++) {
      const r = await fetch(LIST + '%5B' + encodeURIComponent(type) + '%5D&PageNum=' + n, { headers: UA });
      if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + type);
      const it = parse(await r.text(), type);
      if (!it.length) break;
      all.push(...it);
      if (it.length < 96) break;
    }
  }
  if (all.length < 300) throw new Error('fant bare ' + all.length + ' dokumenter – har chesterton.com endret siden?');
  const by = {}; codes.forEach(c => { by[key(c)] = c; });
  const produkter = {}, generelt = [], sett = new Set();
  let koblet = 0;
  all.forEach(d => {
    const lang = sprak(d.tittel); if (!lang) return;
    const url = abs(d.url); if (sett.has(url)) return;
    const rad = [etikett(d), lang, url, TYPER[d.type]];
    const treff = new Set(d.prod.split(',').map(s => s.trim()).filter(Boolean).map(s => by[key(MAP[s] || s)]).filter(Boolean));
    // dokumenter som gjelder mange produkter (kataloger, oversiktsbrosjyrer) vises én gang, ikke under hvert produkt
    if (treff.size > 3) { sett.add(url); generelt.push(rad); }
    else if (treff.size) { sett.add(url); koblet++; treff.forEach(c => (produkter[c] = produkter[c] || []).push(rad)); }
    else if ((!d.prod || /^Document Type/.test(d.prod)) && GENERELT.test(d.tittel) && !IKKE.test(d.tittel)) { sett.add(url); generelt.push(rad); }
  });
  // samme dokument i en global og en EMEA-utgave: behold EMEA (Europa)
  const uten = t => t.replace(/^EMEA\s+/i, '').replace(/\s*-\s*EMEA region$/i, '').toLowerCase(), erEmea = t => uten(t) !== t.toLowerCase();
  const emea = new Set(generelt.filter(r => erEmea(r[0])).map(r => uten(r[0])));
  for (let i = generelt.length - 1; i >= 0; i--) if (!erEmea(generelt[i][0]) && emea.has(generelt[i][0].toLowerCase())) generelt.splice(i, 1);
  // norsk først
  Object.values(produkter).forEach(l => l.sort((a, b) => (a[3] + (a[1] === 'NO' ? 0 : 1)).localeCompare(b[3] + (b[1] === 'NO' ? 0 : 1))));
  const out = { oppdatert: new Date().toISOString().slice(0, 10), kilde: 'chesterton.com – product literature (lenker, ikke kopier)', produkter, generelt };
  fs.writeFileSync(path.join(root, 'litteratur.json'), JSON.stringify(out, null, 1));
  const tell = {}; Object.values(produkter).flat().concat(generelt).forEach(r => { tell[r[3]] = (tell[r[3]] || 0) + 1; });
  return { funnet: all.length, koblet, produkter: Object.keys(produkter).length, generelt: generelt.length, typer: tell };
}

module.exports = { run };
if (require.main === module) {
  const o = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'datablad-oversikt.json'), 'utf8'));
  run(process.cwd(), o.rader.filter(r => r.lev === 'Chesterton').map(r => r.nr)).then(r => console.log(r)).catch(e => { console.error('Litteratur feilet:', e.message); process.exit(1); });
}
