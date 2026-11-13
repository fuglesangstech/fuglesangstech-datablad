/*
  Dokumentutvalg fra leverandører uten søkbart bibliotek (Perma-Tec, Vickers Oils, Lubrication Engineers),
  fagartiklene på fuglesangstech.no og egne tillegg (dokumenter-egne.json). Skriver dokumenter.json, som
  oversikt.js fordeler på /datablad (produktdokumenter) og /ressurser (kataloger, brosjyrer, case, artikler …).
  Brukes av synk-datablad.js hver måned, kan også kjøres alene:
    NODE_USE_ENV_PROXY=1 node verktoy/utvalg.js

  Reglene under bestemmer hva som tas med og hva dokumentene heter på norsk:
    - Perma-Tec: nedlastingssidene på perma-tec.com. Ny versjon av et dokument plukkes opp av seg selv.
      Nye flyere for bransjer/bruksområder vi ikke har navn på tas med med et midlertidig navn og meldes.
    - Vickers Oils: bare dokumenter for land (fast liste med filnavn-mønster – ny versjon plukkes opp av seg selv).
      Nye PDF-er på vickers-oil.com/downloads tas IKKE med automatisk (kan gjelde marine produkter), men meldes.
    - Lubrication Engineers: alle Techni-Tips og firmasertifikatene.
    - Royal Purple Industrial og BioMax: brosjyrer, sertifikater, Techni-Tips og fagartikler fra ressurssidene (regler i RPD).
      Nye dokumenter tas med med engelsk navn og meldes.
    - Fuglesangs Tech: alle sider under /artikler/ (Squarespace-blogg eller sitemap).
    - dokumenter-egne.json: alltid med (f.eks. norske brosjyrer vi har fått). «erstatter» fjerner leverandørens utgave.
  Feiler en kilde, beholdes forrige måneds dokumenter fra den kilden.
  «sett» i dokumenter.json husker hvilke PDF-er som er meldt, så hvert nytt funn meldes bare én gang.
*/
'use strict';
const fs = require('fs'), path = require('path');
const UA = { 'User-Agent': 'Mozilla/5.0 (Fuglesangs Tech datablad-synk)' };
const S = 'https://www.fuglesangstech.no';

async function text(url) {
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url); return await r.text(); }
    catch (e) { if (i === 2) throw e; await new Promise(r => setTimeout(r, 2000)); }
  }
}
const unesc = s => String(s).replace(/&amp;/g, '&').replace(/&#0?39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;|&#160;/g, ' ').replace(/&#8211;|&ndash;/g, '–').replace(/&#8217;|&rsquo;/g, '’').replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n));
const fil = u => u.split('/').pop();

// ---------- Perma-Tec ----------
const PD = 'https://www.perma-tec.com/en/apps-services/further-services/downloads/';
const SYS = [['STAR_VARIO', 'STAR VARIO', '^perma STAR VARIO'], ['STAR_CONTROL', 'STAR CONTROL', '^perma STAR CONTROL'], ['FUTURA', 'FUTURA', '^perma FUTURA'],
  ['CLASSIC', 'CLASSIC', '^perma CLASSIC'], ['FLEX', 'FLEX', '^perma FLEX'], ['NOVA', 'NOVA', '^perma NOVA'], ['ULTRA', 'ULTRA', '^perma ULTRA'],
  ['PRO_C_LINE', 'PRO C LINE', '^perma PRO'], ['PRO_LINE', 'PRO LINE', '^perma PRO'], ['PRO_C_MP', 'PRO C MP-6', '^perma PRO'], ['PRO_MP', 'PRO MP-6', '^perma PRO'],
  ['PRO', 'PRO', '^perma PRO'], ['ECOSY', 'ECOSY', '^perma ECOSY']];
const SEKTOR = { Asphalt_mixing_plants: 'asfaltverk', Automotive: 'bilindustri', Chemical_Pharmaceutical: 'kjemi og farmasi', Elevators: 'heiser', Escalators_moving_walkways: 'rulletrapper og rullebånd',
  Food_Beverage: 'næringsmiddel og drikke', Cement_gypsum_lime: 'sement, gips og kalk', Mining_Minerals_Processing: 'gruve og mineralforedling', Power_Generation: 'kraftproduksjon',
  Pulp_paper: 'treforedling og papir', Quarrying_industry: 'pukkverk', Recycling: 'gjenvinning', Refineries: 'raffinerier', Stahlindustrie: 'stålindustri',
  Wastewater_treatment: 'avløpsrensing', Wind_power: 'vindkraft' };
const BRUK = { Blowers_Fans: 'vifter og blåsere', Chains: 'kjeder', Conveyors_EMEA: 'transportbånd', Electric_motors: 'elektromotorer', Linear_guides: 'lineærføringer',
  Pumps: 'pumper', Roller_Sliding_bearings: 'rulle- og glidelagre', Spindles_Open_gears: 'spindler og åpne tannhjul' };
const SPES = [['Flyer_perma_Sustainability', 'perma og bærekraft', null], ['LINE_CARD_perma_Lubricants_EMEA', 'perma smøremidler – oversikt', '\\((S[FO]\\d\\d)\\)$'],
  ['perma_Flyer_STAR_PRODUCT_LINE', 'perma STAR-serien', '^perma STAR'], ['perma_STAR_VARIO_Sets_Flyer_EMEA', 'perma STAR VARIO-sett', '^perma STAR VARIO']];
const pent = k => k.replace(/_EMEA$/, '').replace(/_/g, ' ').toLowerCase();
const en = u => /_en[_.]/.test(fil(u));

async function perma(add, kandidat) {
  const links = async side => [...new Set([...(await text(PD + side)).matchAll(/href="(https:\/\/www\.perma-tec\.com\/_Resources\/Persistent\/[^"]+\.pdf)"/g)].map(m => unesc(m[1])))].sort();
  const sysof = n => SYS.find(([k]) => new RegExp('(^|_)' + k + '(_|\\d)').test(n)) || [];
  let n = 0;
  for (const u of await links('perma-product-catalogue')) if (en(u)) { add('Perma-Tec', 'perma produktkatalog', u, 'katalog'); n++; }
  for (const [side, pre] of [['installation-guides', 'Installasjonsveiledning'], ['quick-start-guides', 'Hurtigstart'], ['operating-instructions', 'Bruksanvisning']]) {
    const seen = new Set();
    for (const u of await links(side)) {
      const f = fil(u); if (!en(u) || seen.has(f)) continue; seen.add(f);
      const [, lab, rx] = sysof(f);
      if (/ACCESSORY/.test(f)) add('Perma-Tec', pre + ': tilbehør og installasjonssett perma STAR', u, 'bruksanvisning', '^(perma STAR|Støtteflenser perma STAR|Beskyttelseshetter perma STAR)');
      else if (/CWL/.test(f)) continue; // CWL PLUS føres ikke
      else if (lab) add('Perma-Tec', pre + ': perma ' + lab, u, 'bruksanvisning', rx);
      else { kandidat('Perma-Tec', u, pre + ' for et system vi ikke har regel for'); continue; }
      n++;
    }
  }
  for (const u of await links('flyers-industry-sectors')) {
    const m = /Industryflyer_perma_(.+?)_en/.exec(fil(u)); if (!en(u) || !m) continue;
    if (!SEKTOR[m[1]]) kandidat('Perma-Tec', u, 'ny bransjeflyer – tatt med som «perma for ' + pent(m[1]) + '», gi den gjerne et norsk navn i SEKTOR i verktoy/utvalg.js');
    add('Perma-Tec', 'perma for ' + (SEKTOR[m[1]] || pent(m[1])), u, 'brosjyre'); n++;
  }
  for (const u of await links('application-flyers')) {
    const m = /Application_flyer_perma_(.+?)_en/.exec(fil(u)); if (!m) continue;
    if (!BRUK[m[1]]) kandidat('Perma-Tec', u, 'ny bruksområde-flyer – tatt med som «Automatisk smøring av ' + pent(m[1]) + '», gi den gjerne et norsk navn i BRUK i verktoy/utvalg.js');
    add('Perma-Tec', 'Automatisk smøring av ' + (BRUK[m[1]] || pent(m[1])), u, 'brosjyre'); n++;
  }
  for (const u of await links('special-flyers')) {
    const s = SPES.find(([k]) => fil(u).startsWith(k));
    if (s) { add('Perma-Tec', s[1], u, 'brosjyre', s[2]); n++; } else kandidat('Perma-Tec', u, 'ny spesialflyer – ikke tatt med (legg til i SPES i verktoy/utvalg.js om den skal med)');
  }
  if (n < 30) throw new Error('fant bare ' + n + ' Perma-dokumenter – sidene kan være endret');
  return n;
}

// ---------- Vickers Oils (bare land) ----------
// [filnavn-mønster (uten .pdf), norsk navn, type, produkter]. «v\d+» og et ev. «-1» på slutten tillater nye versjoner.
const VIK = [
  ['A4_Lubricants-Greases_v\\d+_web', 'Vickers produktkatalog – smøremidler og fett', 'katalog'],
  ['Food-Grade-catalogue-v\\d+', 'Vickerlube FG – katalog for næringsmiddelindustrien', 'katalog'],
  ['A4_Hydraulic_Fluids_v\\d+_web', 'Vickers hydraulikkoljer', 'brosjyre'],
  ['A4_Gear_oils_v\\d+_web', 'Vickers giroljer', 'brosjyre'],
  ['A4_Grease_v\\d+_web', 'Vickers fett', 'brosjyre'],
  ['A4_Chain_oils_v\\d+_web', 'Vickers kjedeoljer', 'brosjyre'],
  ['A4_Aerosols_v\\d+_web', 'Vickers spray', 'brosjyre'],
  ['A4_Specialty_v\\d+_web', 'Vickers spesialprodukter', 'brosjyre'],
  ['Biodegradable-Lubricants_Brochure_A4_v\\d+-web', 'Biologisk nedbrytbare smøremidler (EAL)', 'brosjyre'],
  ['Corrosion-prevention-brochure', 'Korrosjonsbeskyttelse', 'brosjyre'],
  ['Bakery_brochure_4pp_v\\d+(-lr)?', 'Smøremidler for bakerier', 'brosjyre'],
  ['ECOSURE-4PP-v\\d+', 'Ecosure – miljøtilpassede hydraulikkoljer', 'brosjyre', '^Ecosure'],
  ['BIOGEAR-XP-v\\d+', 'Biogear XP – miljøtilpassede giroljer', 'brosjyre', '^Biogear XP'],
  ['BIOGREASE-EP-v\\d+', 'Biogrease EP – miljøtilpasset fett', 'brosjyre', '^Biogrease EP'],
  ['BIOGEAR-XP-Instructions-for-Use', 'Bruksanvisning Biogear XP', 'bruksanvisning', '^Biogear XP'],
  ['BIOGREASE-EP0-and-BIOGREASE-EP2-Instructions-for-use', 'Bruksanvisning Biogrease EP0 og EP2', 'bruksanvisning', '^Biogrease EP'],
  ['VICKERLUBE-FG-Range-Allergen-Statement', 'Allergenerklæring Vickerlube FG', 'sertifikat', '^Vickerlube FG'],
  ['ISO-9001-Certificate[^/]*', 'Vickers Oils ISO 9001', 'sertifikat'],
  ['Env-certificate[^/]*', 'Vickers Oils ISO 14001 (miljø)', 'sertifikat'],
  ['[^/]*Halal_Certificate', 'Vickers Oils Halal-sertifikat', 'sertifikat'],
  ['Kosher-Cert[^/]*', 'Vickers Oils Kosher-sertifikat', 'sertifikat']];

async function vickers(add, kandidat) {
  const h = await text('https://vickers-oil.com/downloads/');
  const alle = [...new Set([...h.matchAll(/href="(https:\/\/vickers-oil\.com\/wp-content\/uploads\/(\d{4})\/(\d{2})\/[^"]+\.pdf)"/g)].map(m => unesc(m[1])))];
  const brukt = new Set(); let n = 0;
  const ver = u => { const m = /[v_-]v?(\d+)(?:[_-]web)?(?:-lr)?(?:-\d)?\.pdf$/i.exec(fil(u)); return m ? +m[1] : 0; };
  const dato = u => (/uploads\/(\d{4})\/(\d{2})\//.exec(u) || []).slice(1).join('');
  for (const [mønster, navn, typ, rx] of VIK) {
    const re = new RegExp('^' + mønster + '(-\\d)?\\.pdf$', 'i');
    const treff = alle.filter(u => re.test(fil(u))).sort((a, b) => (ver(b) - ver(a)) || dato(b).localeCompare(dato(a)));
    if (!treff.length) { kandidat('Vickers Oils', 'https://vickers-oil.com/downloads/', 'fant ikke lenger «' + navn + '» (' + mønster + ') – sjekk om den er fjernet eller har fått nytt navn'); continue; }
    treff.forEach(u => brukt.add(u));
    add('Vickers Oils', navn, treff[0], typ, rx); n++;
  }
  for (const u of alle) if (!brukt.has(u)) kandidat('Vickers Oils', u, 'ikke i utvalget (bare land) – vurder om den skal med i VIK i verktoy/utvalg.js');
  if (n < 12) throw new Error('fant bare ' + n + ' Vickers-dokumenter – nedlastingssiden kan være endret');
  return n;
}

// ---------- Lubrication Engineers ----------
const LEC = { 'NSF H1 Certifications': 'LE NSF H1-sertifikater', 'H1 Allergen Certificate': 'LE allergenerklæring for H1-produkter', 'ISO 9001-2015 Certification': 'LE ISO 9001',
  'Kosher Certification Letter': 'LE Kosher-sertifikat', 'Halal Certification': 'LE Halal-sertifikat', 'Halal Certification-Aerosols': 'LE Halal-sertifikat for spray', 'ILMA Certificate': 'LE ILMA-medlemskap' };
const leUrl = u => { u = unesc(u).replace('https://www.', 'https://').replace(/ /g, '%20'); return u.startsWith('/') ? 'https://lelubricants.com' + u : u; };

async function le(add, kandidat) {
  let n = 0; const seen = new Set();
  const tt = await text('https://lelubricants.com/resources/techni-tips/');
  for (const m of tt.matchAll(/href="([^"]+techtips\/[^"]+\.pdf)"[^>]*>([\s\S]{0,300}?)<\/a>/g)) {
    const t = unesc(m[2].replace(/<[^>]+>|\s+/g, ' ')).trim().replace(/^\d+a?\s+/, ''), u = leUrl(m[1]);
    if (!t || seen.has(u)) continue; seen.add(u);
    add('Lubrication Engineers', 'Techni-Tip: ' + t, u, 'teknisk'); n++;
  }
  const cert = await text('https://lelubricants.com/resources/certifications/');
  for (const m of cert.matchAll(/href="([^"]+\/certs\/[^"]+\.pdf)"/g)) {
    const u = leUrl(m[1]), k = decodeURIComponent(fil(u)).replace(/\.pdf$/, '');
    if (seen.has(k)) continue; seen.add(k);
    if (!LEC[k]) kandidat('Lubrication Engineers', u, 'nytt sertifikat – tatt med som «LE ' + k + '», gi det gjerne et norsk navn i LEC i verktoy/utvalg.js');
    add('Lubrication Engineers', LEC[k] || 'LE ' + k, u, 'sertifikat'); n++;
  }
  if (n < 15) throw new Error('fant bare ' + n + ' LE-dokumenter – sidene kan være endret');
  return n;
}

// ---------- Royal Purple Industrial og BioMax ----------
// Ressurssidene på royalpurpleind.com: brosjyrer, sertifikater, Techni-Tips og fagartikler (blogg).
// [filnavn uten .pdf (eller adresse-slug for artikler), leverandør, norsk navn, type, produkter (regex mot produktnavn)]
// Leverandør «BioMax» = dokumentet hører til BioMax-knappen. Regex kan også treffe BioMax-produkter for RPI-dokumenter (samme familie).
const RPI = 'Royal Purple Industrial';
const H1RP = '^(Barrier Fluid FDA|Crystal-|Poly-Guard|BioMax™ Multi-Purpose)';
const RPD = [
  ['BioMax Brochure', 'BioMax', 'BioMax – miljøtilpassede smøremidler (EAL)', 'brosjyre', '^BioMax'],
  ['RP Industrial Lubrication Guide', RPI, 'Royal Purple Industrial – smøreguide og produktoversikt', 'katalog', '^(?!BioMax)'],
  ['Power Gen Industry Brochure', RPI, 'Smøremidler for kraftproduksjon', 'brosjyre', '^(Coupling|Enduro|Marine Hydraulic|Max|Syndraulic|Synergy|Synfilm|Thermyl|Ultra-Performance|VP Preservative)'],
  ['Oil Refinery Industry Brochure', RPI, 'Smøremidler for raffinerier', 'brosjyre', '^(Barrier Fluid|Coupling|Enduro|Max|Syndraulic|Synergy|Synfilm|Thermyl-Glyde|Ultra-Performance|VP Preservative)'],
  ['Pulp & Paper Industry Brochure', RPI, 'Smøremidler for treforedling og papir', 'brosjyre', '^(Barrier Fluid|Coupling|Enduro|MaxFilm|Max-Tuff|Paper Mill|Poly-Guard|Syndraulic|Synergy|Synfilm|Thermyl|Ultra-Performance|VP Preservative)'],
  ['RPI TT 001 Oil Cleanliness', RPI, 'Techni-Tip: Ny olje er ikke alltid ren olje', 'teknisk'],
  ['RPI TT 002 Gear Oils', RPI, 'Techni-Tip: Industrielle giroljer – standarder, ytelse og valg', 'teknisk', '^(Synergy|Synfilm®$|Synfilm® GT|Thermyl|BioMax™ Gear)'],
  ['RPI TT 003 Hydraulic Oils', RPI, 'Techni-Tip: Valg av hydraulikkolje og feilsøking', 'teknisk', '^(Syndraulic|Marine Hydraulic|BioMax™ Hydraulic)'],
  ['RPI TT 004 Grease Compatibility', RPI, 'Techni-Tip: Blanding av fett – hvilke fetttyper passer sammen', 'teknisk', '(Grease|Thermasil)'],
  ['RPI TT 005 Primary Metals Industry', RPI, 'Techni-Tip: Smøring i metallindustrien', 'teknisk', '^(Enduro|Thermasil|Thermax|Thermyl|Ultra-Performance)'],
  ['RPI TT 006 Dual Mechanical Seal Reliability', RPI, 'Techni-Tip: Driftssikre doble mekaniske tetninger i olje, gass og petrokjemi', 'teknisk', '^Barrier Fluid'],
  ['ISO 9001-2015 Certification', RPI, 'Royal Purple Industrial ISO 9001 (produseres av Lubrication Engineers)', 'sertifikat'],
  ['Kosher Certification', RPI, 'Kosher-sertifikat (Royal Purple Industrial og BioMax)', 'sertifikat', H1RP],
  ['Halal Certification - RPI Products', RPI, 'Halal-sertifikat', 'sertifikat', '^(Barrier Fluid FDA|Crystal-|Poly-Guard)'],
  ['Halal Certification - BioMax EAL MP EP Grease', 'BioMax', 'Halal-sertifikat BioMax Multi-Purpose EP Grease', 'sertifikat', '^BioMax™ Multi-Purpose'],
  ['EU EcoLabel Certification', 'BioMax', 'EU Ecolabel-sertifikat (BioMax)', 'sertifikat', '^BioMax'],
  ['NSF H1 Certification', null], // bare en henvisning til NSF sitt søk – tas ikke med (produktene er merket NSF H1 i katalogen)
  ['synthetic-vs-mineral-lubricants', RPI, 'Syntetisk eller mineralsk smøremiddel – en teknisk sammenligning', 'teknisk'],
  ['what-total-cost-of-ownership-really-means-for-industrial-lubricants', RPI, 'Totale eierkostnader for industrismøremidler – og hvordan de beregnes', 'teknisk'],
  ['barrier-fluid-vs-buffer-fluid-getting-dual-mechanical-seal-support-right', RPI, 'Barrierevæske eller buffervæske – riktig støtte for doble mekaniske tetninger', 'teknisk', '^Barrier Fluid'],
  ['reading-a-product-data-sheet', RPI, 'Slik leser du et produktdatablad', 'teknisk']];
async function rpi(add, kandidat) {
  const RB = 'https://www.royalpurpleind.com/resources/';
  const sider = ['resource-type/brochures/?_resource_type=brochures', 'resource-type/certifications/?_resource_type=certifications', 'resource-type/technitips/?_resource_type=technitips'];
  const pdf = new Set(), blogg = new Map();
  for (const sd of sider) for (const pg of ['', 'page/2/']) {
    let h; try { h = await text(RB + sd.replace('/?', '/' + pg + '?')); } catch (e) { if (pg) continue; throw e; }
    for (const m of h.matchAll(/href="(https:\/\/www\.royalpurpleind\.com\/wp-content\/uploads\/pdf\/(?:Literature\/(?:Brochures|Techni-Tips)|Certifications)\/[^"?]+\.pdf)/g)) pdf.add(unesc(m[1]).replace(/ /g, '%20'));
  }
  for (const pg of ['', 'page/2/']) {
    let h; try { h = await text(RB + pg + '?_resource_type=blog'); } catch (e) { if (pg) continue; throw e; }
    for (const m of h.matchAll(/href="https:\/\/www\.royalpurpleind\.com\/resources\/([a-z0-9-]+)\/"[^>]*>([^<]{10,200})</g))
      if (!/^(resource-type|page|pds|electrical-power|the-synthetic-advantage)/.test(m[1])) blogg.set(m[1], unesc(m[2]).trim());
  }
  let n = 0;
  const regel = k => RPD.find(r => r[0] === k);
  for (const u of [...pdf].sort()) {
    const k = decodeURIComponent(fil(u)).replace(/\.pdf$/i, ''), r = regel(k);
    if (r && !r[1]) continue;
    if (!r) { kandidat(RPI, u, 'nytt dokument hos Royal Purple – tatt med med engelsk navn, gi det gjerne et norsk navn i RPD i verktoy/utvalg.js');
      add(RPI, k, u, /Certification/.test(u) ? 'sertifikat' : /Techni-Tips/.test(u) ? 'teknisk' : 'brosjyre'); n++; continue; }
    add(r[1], r[2], u, r[3], r[4]); n++;
  }
  for (const [slug, tittel] of blogg) {
    const r = regel(slug), u = RB + slug + '/';
    if (!r) kandidat(RPI, u, 'ny fagartikkel hos Royal Purple – tatt med som «' + tittel + '», gi den gjerne et norsk navn i RPD i verktoy/utvalg.js');
    add(r ? r[1] : RPI, r ? r[2] : tittel, u, 'teknisk', r && r[4]); n++;
  }
  for (const r of RPD) if (r[1] && !/^[a-z0-9-]+$/.test(r[0]) && ![...pdf].some(u => decodeURIComponent(fil(u)) === r[0] + '.pdf'))
    kandidat(RPI, RB, 'fant ikke lenger «' + r[2] + '» (' + r[0] + '.pdf) – sjekk om den er fjernet eller har fått nytt navn');
  if (n < 12) throw new Error('fant bare ' + n + ' Royal Purple-dokumenter – ressurssidene kan være endret');
  return n;
}

// ---------- Fuglesangs Tech: fagartikler ----------
const rensTittel = t => unesc(t || '').replace(/^Artikkel:\s*/i, '').replace(/\s*[|–—-]\s*Fuglesangs Tech\s*$/i, '').replace(/\s+\|.*$/, '').trim();
async function artikler(add, kandidat, forrige) {
  let sider = [];
  try { // Squarespace-blogg
    const j = JSON.parse(await text(S + '/artikler?format=json'));
    if (j.items && j.items.length) sider = j.items.map(it => ({ sti: it.fullUrl, tittel: it.title }));
  } catch (e) {}
  if (!sider.length) {
    const x = await text(S + '/sitemap.xml');
    sider = [...x.matchAll(/<loc>https?:\/\/[^/]+(\/artikler\/[^<\/]+)\/?<\/loc>/g)].map(m => ({ sti: m[1] }));
  }
  // Artikler fra forrige måned som ennå ikke står i sitemap (Squarespace oppdaterer den med forsinkelse) beholdes så lenge siden finnes
  for (const d of forrige) if (d.lev === 'Fuglesangs Tech' && d.type === 'artikkel' && !d.egen) {
    const st = d.url.replace(/^https?:\/\/[^/]+/, '');
    if (!sider.some(x => x.sti.replace(/\/$/, '') === st)) sider.push({ sti: st });
  }
  let n = 0;
  for (const s of sider) {
    let t = s.tittel;
    if (!t) {
      try {
        const h = await text(S + s.sti);
        const ld = /"headline"\s*:\s*"([^"]+)"/.exec(h), og = /<meta property="og:title" content="([^"]*)"/.exec(h);
        t = rensTittel(ld ? ld[1] : og && og[1]);
      } catch (e) { continue; }
    }
    if (t) { add('Fuglesangs Tech', t, S + s.sti, 'artikkel', null, 'NO'); n++; }
  }
  return n;
}

async function run(root) {
  const fp = path.join(root, 'dokumenter.json');
  const forrige = fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, 'utf8')) : { dokumenter: [], sett: [] };
  const forsteGang = !forrige.sett; // første kjøring: noter alt som finnes uten å melde det
  const sett = new Set(forrige.sett || forrige.dokumenter.map(d => d.url));
  const egne = JSON.parse(fs.readFileSync(path.join(root, 'dokumenter-egne.json'), 'utf8')).dokumenter;
  const rep = { kilder: {}, feil: [], meldinger: [], nye: [], borte: [] };
  const out = [];

  for (const [lev, fn, kilde] of [['Perma-Tec', perma, 'perma'], ['Vickers Oils', vickers, 'vickers'], ['Lubrication Engineers', le, 'le'], [RPI, rpi, 'rpi'], ['Fuglesangs Tech', artikler, 'artikler']]) {
    const del = [];
    const add = (l, navn, url, type, produkter, sprak) => { const d = { lev: l, navn, sprak: sprak || 'EN', url, type }; if (produkter) d.produkter = produkter; del.push(d); };
    const kand = [];
    const kandidat = (l, url, hva) => kand.push({ lev: l, url, hva });
    try {
      rep.kilder[kilde] = await fn(add, kandidat, forrige.dokumenter);
      out.push(...del);
      for (const k of kand) if (/fant ikke lenger/.test(k.hva) || (!sett.has(k.url) && !forsteGang)) rep.meldinger.push(k); else sett.add(k.url);
    } catch (e) {
      rep.feil.push(lev + ': ' + e.message + ' – forrige utvalg er beholdt');
      out.push(...forrige.dokumenter.filter(d => (d.lev === lev || (lev === RPI && d.lev === 'BioMax')) && !d.egen));
    }
  }

  // Egne tillegg – og fjern leverandørens utgave når vi har en egen (f.eks. norsk)
  for (const e of egne) {
    if (e.erstatter) for (let i = out.length - 1; i >= 0; i--) if (out[i].lev === e.lev && fil(out[i].url).startsWith(e.erstatter)) out.splice(i, 1);
    const d = { lev: e.lev, navn: e.navn, sprak: e.sprak || 'NO', url: e.url, type: e.type, egen: true };
    if (e.produkter) d.produkter = e.produkter;
    out.push(d);
  }

  // Samme lenke bare én gang
  const unik = []; const sU = new Set();
  for (const d of out) if (!sU.has(d.url)) { sU.add(d.url); unik.push(d); }

  const gamle = new Set(forrige.dokumenter.map(d => d.url)), nyeU = new Set(unik.map(d => d.url));
  rep.nye = unik.filter(d => !gamle.has(d.url));
  rep.borte = forrige.dokumenter.filter(d => !nyeU.has(d.url));
  rep.antall = unik.length;
  unik.forEach(d => sett.add(d.url));

  fs.writeFileSync(fp, JSON.stringify({ oppdatert: new Date().toISOString().slice(0, 10),
    merknad: 'Bygges hver måned av verktoy/utvalg.js (regler der, egne tillegg i dokumenter-egne.json). Lenker, ikke kopier.',
    dokumenter: unik, sett: [...sett].sort() }, null, 1));
  return rep;
}

function rapport(r, err) {
  let s = '\n## Dokumentutvalg (Perma-Tec, Vickers, LE, Royal Purple/BioMax, artikler)\n';
  if (!r) return s + 'Kunne ikke kjøres: ' + err + ' (forrige dokumenter.json er beholdt).\n';
  s += 'Dokumenter: ' + r.antall + ' (Perma ' + (r.kilder.perma ?? '–') + ', Vickers ' + (r.kilder.vickers ?? '–') + ', LE ' + (r.kilder.le ?? '–') + ', Royal Purple/BioMax ' + (r.kilder.rpi ?? '–') + ', artikler ' + (r.kilder.artikler ?? '–') + ').\n';
  if (r.feil.length) s += r.feil.map(x => '- FEIL: ' + x).join('\n') + '\n';
  if (r.nye.length) s += '\nNye i utvalget (vises automatisk):\n' + r.nye.map(d => '- ' + d.lev + ': ' + d.navn + ' – ' + d.url).join('\n') + '\n';
  if (r.borte.length) s += '\nFjernet fra utvalget (finnes ikke lenger hos leverandøren, eller ny versjon):\n' + r.borte.map(d => '- ' + d.lev + ': ' + d.navn + ' – ' + d.url).join('\n') + '\n';
  if (r.meldinger.length) s += '\nTil vurdering:\n' + r.meldinger.map(m => '- ' + m.lev + ': ' + m.hva + ' – ' + m.url).join('\n') + '\n';
  return s;
}

module.exports = { run, rapport };
if (require.main === module) run(path.join(__dirname, '..')).then(r => console.log(rapport(r)), e => { console.error(e); process.exit(1); });
