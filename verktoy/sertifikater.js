/*
  Henter Chestertons sertifikater og godkjenninger (dokumenttype «Certification» på chesterton.com),
  kobler dem til produktene i Chesterton-katalogen på fuglesangstech.no, kopierer PDF-ene til
  chesterton/sertifikater/ og skriver sertifikater.json, som produktkatalogen leser.

  Brukes av synk-datablad.js, men kan også kjøres alene fra roten av repoet:
    NODE_USE_ENV_PROXY=1 node verktoy/sertifikater.js
*/
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const LIST = 'https://chesterton.com/resources/product-literature?PageSize=96&RequestType=UpdateList&Search=&DocumentType=[Certification]';
const CH = 'https://chesterton.com';
const UA = { 'User-Agent': 'Mozilla/5.0 (Fuglesangs Tech datablad-synk)' };

// Produktnavn hos Chesterton → produktnummer i Chesterton-katalogen der de ikke er like
const MAP = {
  '292': '292 PDS', '294': '294 CSD', '625': '625 CXF', '630': '630-SXCF', '650': '650 AML', '662': '662FG',
  '715': '715 Spraflex', '715G': '715 Spraflex Gold', '723': '723 Sprasolvo', '723FG': '723FG Sprasolvo',
  '787': '787 Sliding Paste', '800': '800 GoldEnd Tape', '820': 'KPC 820', '820N': 'KPC 820N', '860': '860 MPG',
  '900': '900 GoldEnd Paste', 'ARC 5': 'ARC-5-5ES', '615 #1': '615-1', '690FG': '690 FG', '785FG': '785 FG'
};
const LANG = { english: 'EN', deutsch: 'DE', 'français': 'FR', francais: 'FR', 'español': 'ES', espanol: 'ES', italiano: 'IT',
  svenska: 'SV', dansk: 'DA', finnish: 'FI', polski: 'PL', greek: 'EL', 'ceština': 'CS', cestina: 'CS', slovencina: 'SK',
  'slovenciina': 'SK', nederlands: 'NL', '中文': 'ZH' };

const key = s => String(s).toLowerCase().replace(/\(e\)/g, '').replace(/[^a-z0-9]/g, '');
const unesc = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

async function text(url) { const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url); return r.text(); }

function parseList(h) {
  const out = [], re = /<div class="g-col-6 g-col-lg-3" onclick="window\.open\('([^']+)'\)"([\s\S]*?)(?=<div class="g-col-6 g-col-lg-3" onclick|$)/g;
  let m;
  while ((m = re.exec(h))) {
    const body = m[2], t = /<h3[^>]*>([\s\S]*?)<\/h3>/.exec(body), p = /<b>Product\(s\)<\/b>:\s*<span>([\s\S]*?)<\/span>/.exec(body), l = /<b>Certification \(([^)]*)\)<\/b>/.exec(body);
    out.push({ url: unesc(m[1]), tittel: t ? unesc(t[1].replace(/\s+/g, ' ').trim()) : '', produkter: p ? unesc(p[1].replace(/\s+/g, ' ').trim()) : '', sprak: l ? l[1] : '' });
  }
  return out;
}

function langOf(c) {
  const m = /\(([^()]+)\)\s*(?:available.*)?$/i.exec(c.tittel.replace(/\s*available in emea.*$/i, '').trim()) || /\((English|Deutsch|Fran[cç]ais|Espa[nñ]ol|Italiano|Svenska|Dansk|Finnish|Polski|Greek|Ce[sš]tina|Slovenc?i?ina|Nederlands)\b/i.exec(c.tittel);
  const w = (m ? m[1] : c.sprak).toLowerCase().trim();
  return LANG[w] || LANG[(c.sprak || '').toLowerCase()] || 'EN';
}
// Utløpsdato i filnavn/tittel, f.eks. «exp 03012027» eller «exp_02282027» (MMDDÅÅÅÅ), eller «...-2024» i ISO-titler
function expired(c, today) {
  const s = decodeURIComponent(c.url) + ' ' + c.tittel;
  const m = /exp[\s_-]*(\d{2})(\d{2})(\d{4})/i.exec(s);
  if (m) { const d = new Date(+m[3], +m[1] - 1, +m[2]); return !isNaN(d) && d < today; }
  return false;
}
function label(c) {
  let t = c.tittel
    .replace(/\s*-?\s*(?:Available\s+)?in EMEA\s+only.*$/i, '').replace(/\s*Available in EMEA.*$/i, '')
    .replace(/\s*\((English|Deutsch|Fran[cç]ais|Espa[nñ]ol|Italiano|Svenska|Dansk|Finnish|Polski|Greek|Ce[sš]tina|Slovenc?i?ina|Nederlands)\)?/ig, '')
    .replace(/\.pdf$/i, '').replace(/^Certifi?cation:\s*/i, '').replace(/^Certifcation:\s*/i, '').trim();
  t = t.replace(/^NSF Certification:\s*/i, 'NSF: ').replace(/^CE Declaration Of Performance:\s*/i, 'CE-ytelseserklæring (DoP): ')
    .replace(/^ABS PDA Approval\s*-\s*/i, 'ABS PDA-godkjenning: ').replace(/^US Navy Approvals?\s*-\s*/i, 'US Navy-godkjenning: ')
    .replace(/\s+-\s*$/, '').replace(/\s{2,}/g, ' ');
  return t;
}

async function run(root, codes, log) {
  const all = new Map();
  for (let n = 1; n <= 10; n++) {
    const items = parseList(await text(LIST + '&PageNum=' + n));
    if (!items.length) break;
    items.forEach(x => all.set(x.url, x));
  }
  if (all.size < 50) throw new Error('fant bare ' + all.size + ' sertifikater – har chesterton.com endret siden?');
  const byKey = {}; codes.forEach(c => { byKey[key(c)] = c; });
  const per = {};
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const utlopt = [];
  for (const c of all.values()) {
    if (expired(c, now)) { utlopt.push(c.tittel); continue; }
    const toks = c.produkter.split(',').map(s => s.trim()).filter(s => s && !/^Document Type/i.test(s));
    for (const t of new Set(toks)) {
      const code = MAP[t] || byKey[key(t)];
      if (!code) continue;
      (per[code] = per[code] || []).push(c);
    }
  }
  const prods = {}, files = [];
  for (const code of Object.keys(per).sort()) {
    let list = per[code];
    // NSF: finnes en europeisk (E)/EMEA-versjon, vis bare den (Fuglesangs Tech selger EMEA-utgavene)
    const nsf = list.filter(c => /^NSF/i.test(c.tittel)), nsfE = nsf.filter(c => /\(E\)|EMEA/i.test(c.tittel));
    if (nsfE.length) list = list.filter(c => !/^NSF/i.test(c.tittel) || nsfE.includes(c));
    // Samme dokument på flere språk: behold engelsk (ellers første)
    const groups = new Map();
    list.forEach(c => { const g = label(c).toLowerCase(); (groups.get(g) || groups.set(g, []).get(g)).push(c); });
    const picked = [...groups.values()].map(g => g.find(c => langOf(c) === 'EN') || g[0]);
    prods[code] = picked.map(c => {
      const rel = decodeURIComponent(c.url).replace(/^\/Files\/Product assets\//, '').replace(/^\/+/, '');
      const fil = 'chesterton/sertifikater/' + rel;
      files.push({ fil, kilde: CH + encodeURI(c.url).replace(/#/g, '%23') });
      return [label(c), langOf(c), fil];
    }).sort((a, b) => a[0].localeCompare(b[0], 'nb', { numeric: true }));
  }
  // Last ned
  const rep = { nye: [], endret: [], feil: [] };
  const uniq = [...new Map(files.map(f => [f.fil, f])).values()];
  let k = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (k < uniq.length) {
      const f = uniq[k++];
      try {
        const r = await fetch(f.kilde, { headers: UA });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const b = Buffer.from(await r.arrayBuffer());
        const pdf = b.slice(0, 5).toString() === '%PDF-', jpg = b[0] === 0xFF && b[1] === 0xD8, png = b.slice(1, 4).toString() === 'PNG';
        if (!pdf && !jpg && !png) throw new Error('ikke PDF eller bilde');
        const dest = path.join(root, f.fil), had = fs.existsSync(dest);
        if (!had || crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex') !== crypto.createHash('sha256').update(b).digest('hex')) {
          fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, b); (had ? rep.endret : rep.nye).push(f.fil);
        }
      } catch (e) { rep.feil.push(f.fil + ' (' + e.message + ')'); }
    }
  }));
  // Ta bare med dokumenter som faktisk finnes i repoet
  for (const code of Object.keys(prods)) { prods[code] = prods[code].filter(d => fs.existsSync(path.join(root, d[2]))); if (!prods[code].length) delete prods[code]; }
  const today = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(root, 'sertifikater.json'), JSON.stringify({ oppdatert: today, kilde: 'chesterton.com – dokumenttype Certification', produkter: prods }, null, 1));
  const res = { dokumenter: all.size, produkter: Object.keys(prods).length, filer: uniq.length, utlopt, ...rep };
  if (log) log(res);
  return res;
}

module.exports = { run, MAP, key };

if (require.main === module) {
  (async () => {
    const h = await text('https://www.fuglesangstech.no/chesterton-katalog');
    const m = /(?:var|let|const)\s+CD\s*=\s*\[/.exec(h);
    let s = m.index + m[0].length - 1, d = 0, q = '', j;
    for (j = s; j < h.length; j++) { const c = h[j]; if (q) { if (c === '\\') j++; else if (c === q) q = ''; } else if (c === '"' || c === "'") q = c; else if (c === '[') d++; else if (c === ']') { d--; if (!d) break; } }
    const CD = new Function('return ' + h.slice(s, j + 1))();
    const r = await run(process.cwd(), CD.map(x => String(x[2])));
    console.log(JSON.stringify(r, null, 1));
  })().catch(e => { console.error('Sertifikater feilet:', e.message); process.exit(1); });
}
