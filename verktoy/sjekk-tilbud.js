#!/usr/bin/env node
/*
  Kontrollerer at tilbudslisten og skjemaet på fuglesangstech.no fortsatt henger sammen.
  Kjør fra roten av repoet:   NODE_USE_ENV_PROXY=1 node verktoy/sjekk-tilbud.js
  Avslutter med kode 1 og en forklaring hvis noe er galt.

  Sjekker:
  1. at tilbudsliste.js er publisert på GitHub Pages og er lik fila i repoet
  2. at /tilbud laster tilbudsliste.js (kodeinjeksjonen) og har et Squarespace-skjema
  3. at skjemaet har feltene det egne skjemaet trenger: navn, e-post og et tekstfelt (pluss telefon/firma/kommentar)
  4. at /produkter laster tilbudsliste-knappene
  Selve utfyllingen skjer i nettleseren. Finner den ikke feltene der, viser den Squarespace-skjemaet som før,
  så kunden kan alltid sende. Denne kontrollen fanger endringer før de blir et problem.
*/
'use strict';
const fs = require('fs'), path = require('path');
const SITE = 'https://www.fuglesangstech.no';
const GH = 'https://fuglesangstech.github.io/fuglesangstech-datablad/nett/tilbudsliste.js';
const UA = { 'User-Agent': 'Mozilla/5.0 (Fuglesangs Tech tilbudskontroll)' };

async function text(u) { const r = await fetch(u, { headers: UA, cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + u); return r.text(); }
function unesc(s) { return s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'"); }

(async () => {
  const feil = [], ok = [];
  // 1. Skriptet på GitHub Pages
  try {
    const live = await text(GH + '?t=' + Date.now());
    const lokal = fs.readFileSync(path.join(__dirname, '..', 'nett', 'tilbudsliste.js'), 'utf8');
    if (!/initOwnForm/.test(live)) feil.push('tilbudsliste.js på GitHub Pages mangler skjema-koden.');
    else if (live.trim() !== lokal.trim()) ok.push('Merk: tilbudsliste.js på GitHub Pages er ikke lik fila i repoet ennå (publisering kan pågå).');
    else ok.push('tilbudsliste.js er publisert.');
  } catch (e) { feil.push('Fikk ikke hentet tilbudsliste.js: ' + e.message); }

  // 2–3. /tilbud
  try {
    const h = await text(SITE + '/tilbud');
    if (!h.includes('nett/tilbudsliste.js')) feil.push('/tilbud laster ikke tilbudsliste.js. Er linja i Kodeinjeksjon → Bunntekst fjernet?');
    if (!h.includes('id="ft-tilbud"')) feil.push('/tilbud mangler kodeblokken med tilbudslisten (id="ft-tilbud").');
    const m = /class="sqs-form-block-context"[^>]*>([\s\S]*?)<\/script>/.exec(h);
    if (!m) feil.push('/tilbud har ikke noe Squarespace-skjema (skjemablokken er fjernet eller har endret format).');
    else {
      let ctx; try { ctx = JSON.parse(unesc(m[1]).trim()); } catch (e) { feil.push('Kunne ikke lese skjemaoppsettet på /tilbud: ' + e.message); }
      if (ctx) {
        const f = ctx.formFields || [];
        const har = t => f.some(x => x.type === t);
        const etikett = re => f.some(x => re.test(String(x.title || '')));
        if (!har('name') && !etikett(/navn/i)) feil.push('Skjemaet på /tilbud mangler navnefelt.');
        if (!har('email')) feil.push('Skjemaet på /tilbud mangler e-postfelt.');
        if (!har('textarea')) feil.push('Skjemaet på /tilbud mangler tekstfelt (Produkter).');
        if (!har('phone')) ok.push('Merk: skjemaet har ikke telefonfelt – telefonnummeret kommer ikke med.');
        if (!etikett(/firma|bedrift/i)) ok.push('Merk: skjemaet har ikke feltet «Firma».');
        if (ctx.successRedirect) ok.push('Merk: skjemaet sender kunden videre til ' + ctx.successRedirect + ' etter innsending – egen takkemelding vises ikke.');
        const req = f.filter(x => x.required && !['name', 'email', 'phone', 'textarea', 'text'].includes(x.type)).map(x => x.title);
        if (req.length) feil.push('Skjemaet har obligatoriske felt det egne skjemaet ikke fyller ut: ' + req.join(', ') + '.');
        ok.push('Skjemafelt på /tilbud: ' + f.map(x => x.type + (x.title ? ' «' + x.title + '»' : '')).join(', ') + '.');
      }
    }
  } catch (e) { feil.push('Fikk ikke hentet /tilbud: ' + e.message); }

  // 4. /produkter
  try {
    const h = await text(SITE + '/produkter');
    if (!h.includes('nett/tilbudsliste.js')) feil.push('/produkter laster ikke tilbudsliste.js.');
    if (!/quoteBox|ft-quote/.test(h)) feil.push('/produkter har ikke tilbudsliste-knappene (gammel kode i kodeblokken?).');
  } catch (e) { feil.push('Fikk ikke hentet /produkter: ' + e.message); }

  const rapport = (feil.length ? 'FEIL i tilbudsløsningen:\n' + feil.map(x => '- ' + x).join('\n') + '\n\n' : 'Tilbudsløsningen er i orden.\n\n') + ok.map(x => '- ' + x).join('\n');
  console.log(rapport);
  process.exit(feil.length ? 1 : 0);
})().catch(e => { console.error('Kontrollen feilet:', e.message); process.exit(1); });
