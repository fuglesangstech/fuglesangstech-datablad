#!/usr/bin/env node
/*
  Kontrollerer at ressursdatabasen (case studies, artikler, brosjyrer) fortsatt er koblet til produktkatalogen på /produkter.
  Kjør fra roten av repoet:   NODE_USE_ENV_PROXY=1 node verktoy/sjekk-ressurser.js
  Krever Playwright (require('playwright')). Avslutter med kode 1 og en forklaring hvis noe må følges opp.

  Sjekker:
  1. at ressurser.json og dokumenter.json kan leses fra GitHub Pages
  2. at /produkter laster katalogen og kobler ressursene (window.FTKatalogStatus)
  3. hvilke dokumenter som nevner et produkt som ikke finnes i katalogen (typisk etter et navnebytte eller en skrivefeil)
  Test mot en lokal versjon av kodeblokken: FT_KATALOG_FIL=../fuglesangstech-produktkatalog.html
  Katalogsiden lastes i en ekte nettleser, men all trafikk hentes via Node, slik at proxy og sertifikater fungerer som ellers.
*/
'use strict';
const SITE = 'https://www.fuglesangstech.no';
const GH = 'https://fuglesangstech.github.io/fuglesangstech-datablad/';
const UA = { 'User-Agent': 'Mozilla/5.0 (Fuglesangs Tech ressurskontroll)' };
const TILLATT = /^https:\/\/(www\.fuglesangstech\.no|fuglesangstech\.github\.io|raw\.githubusercontent\.com)\//;

// Dokumenter som med vilje ikke har et produkt i katalogen
const FORVENTET = [
  { lev: 'Perma-Tec', produkt: /\(S[FO]\d\d\)|S\[FO\]/, grunn: 'Perma-fett – Fuglesangs Tech selger systemene fylt med eget fett' },
];

async function json(u) {
  const r = await fetch(u + (u.includes('?') ? '&' : '?') + 't=' + Date.now(), { headers: UA, cache: 'no-store' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

(async () => {
  const feil = [], info = [];

  // 1. Ressursfilene
  for (const f of ['ressurser.json', 'dokumenter.json']) {
    try {
      const d = await json(GH + f);
      const n = (d.dokumenter || []).length;
      if (!n) feil.push(f + ' har ingen dokumenter (feil format?).');
      else info.push(f + ': ' + n + ' dokumenter.');
    } catch (e) { feil.push('Fikk ikke lest ' + f + ' fra GitHub Pages: ' + e.message); }
  }

  // 2–3. Katalogen
  let chromium;
  try { ({ chromium } = require('playwright')); } catch (e) { feil.push('Playwright mangler, så katalogen ble ikke kontrollert.'); }
  if (chromium) {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.route('**/*', async route => {
        const req = route.request(), u = req.url();
        if (!TILLATT.test(u) || !['document', 'script', 'fetch', 'xhr'].includes(req.resourceType())) return route.abort();
        if (process.env.FT_KATALOG_FIL && req.resourceType() === 'document')   // test: bruk en lokal versjon av kodeblokken
          return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: '<!doctype html><html><body>' + require('fs').readFileSync(process.env.FT_KATALOG_FIL, 'utf8') + '</body></html>' });
        try {
          const r = await fetch(u, { headers: UA });
          const body = Buffer.from(await r.arrayBuffer());
          const h = {}; r.headers.forEach((v, k) => { if (!/^(content-encoding|content-length|transfer-encoding|content-security-policy)$/i.test(k)) h[k] = v; });
          h['access-control-allow-origin'] = '*';
          await route.fulfill({ status: r.status, headers: h, body });
        } catch (e) { await route.abort(); }
      });
      await page.goto(SITE + '/produkter', { waitUntil: 'domcontentloaded', timeout: 60000 });
      const html = await page.content();
      let st = null;
      try {
        await page.waitForFunction(() => window.FTKatalogStatus, null, { timeout: 60000 });
        st = await page.evaluate(() => window.FTKatalogStatus);
      } catch (e) { /* vurderes under */ }

      if (!st) {
        if (!/FTKatalogStatus/.test(html)) feil.push('Koden på /produkter er eldre enn ressurskoblingen. Lim inn siste versjon av produktkatalogen i kodeblokken.');
        else feil.push('Katalogen på /produkter ble ikke ferdig lastet innen ett minutt.');
      } else if (st.feil) {
        feil.push('Katalogen klarte ikke å koble ressursene: ' + st.feil);
      } else {
        info.push('Katalogen: ' + st.produkter + ' produkter, ' + st.ressurser + ' ressurser lest, ' + st.medRessurser + ' produkter har egne dokumenter.');
        if (!st.ressurser) feil.push('Katalogen fikk ikke lest noen ressurser.');
        const forventet = [], avvik = {};
        (st.umatchet || []).forEach(m => {
          const f = FORVENTET.find(x => x.lev === m.lev && x.produkt.test(String(m.produkt)));
          if (f) { forventet.push(m); return; }
          const k = m.lev + ': «' + m.produkt + '»';
          (avvik[k] = avvik[k] || []).push(m.dokument);
        });
        const keys = Object.keys(avvik).sort();
        if (keys.length) {
          feil.push(keys.length + ' produktnavn i ressursdatabasen finnes ikke i katalogen, så dokumentene vises ikke på noe produkt. Rett navnet i ressursdatabasen, eller si fra om produktet har byttet navn:\n' +
            keys.map(k => '    ' + k + ' (' + avvik[k].length + ' dok.: ' + avvik[k].slice(0, 3).join('; ') + (avvik[k].length > 3 ? '; …' : '') + ')').join('\n'));
        } else info.push('Alle produktnavn i ressursdatabasen finnes i katalogen.');
        if (forventet.length) info.push(forventet.length + ' dokumenter er med vilje uten produkt (' + [...new Set(FORVENTET.map(f => f.grunn))].join('; ') + ').');
      }
    } finally { await browser.close(); }
  }

  const rapport = (feil.length ? 'Ressurskoblingen må følges opp:\n' + feil.map(x => '- ' + x).join('\n') + '\n\n' : 'Ressurskoblingen er i orden.\n\n') + info.map(x => '- ' + x).join('\n');
  console.log(rapport);
  process.exit(feil.length ? 1 : 0);
})().catch(e => { console.error('Kontrollen feilet:', e.message); process.exit(1); });
