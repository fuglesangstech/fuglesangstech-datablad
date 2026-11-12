# Fuglesangs Tech – datablad og produktliste

Sikkerhetsdatablad (SDS), produktdatablad (PDS) og produktlisten som UTB-katalogen på https://www.fuglesangstech.no/utb-katalog henter.

- `utb/produkter.json` – produktlisten: kategori, navn, emballasje med varenummer og hvilke datablad produktet har
- `utb/sds/` – SDS (norsk, unntatt QualiTack 4122, 4152 og 6212 som er på engelsk)
- `utb/pds/` – PDS (engelsk)

Endringer her vises på nettsiden et par minutter etter at de er pushet. Squarespace trenger ikke endres.

## Bytte et datablad
Erstatt PDF-en med en ny fil med **samme filnavn**. Commit og push.

## Legge til et datablad som mangler
1. Legg PDF-en i `utb/sds/` eller `utb/pds/`. Bruk produktnavnet i små bokstaver med bindestrek, for eksempel `utb/pds/penetrating-oil.pdf`.
2. Åpne `utb/produkter.json`, finn produktet og bytt `null` med filnavnet, for eksempel `"pds": "pds/penetrating-oil.pdf"`.
   For SDS settes også `"sds_sprak": "NO"` (eller `"EN"` hvis databladet er på engelsk).
3. Commit og push.

## Nytt produkt, ny emballasje eller produkt som utgår
Rediger `utb/produkter.json`. Hvert produkt ser slik ut:

```json
{
  "kategori": "Motoroljer personbil",
  "navn": "Synlub Excel 10W-40",
  "emballasje": [
    {"str": "12 × 1 L", "varenr": "310551"},
    {"str": "208 L", "varenr": "31055208"}
  ],
  "sds": "sds/synlub-excel-10w-40.pdf",
  "sds_sprak": "NO",
  "pds": "pds/synlub-excel-10w-40.pdf"
}
```

Kategorien må være en av dem som står i `"kategorier"` øverst i filen. Husk komma mellom produktene. Hvis katalogen viser «Produktlisten kunne ikke lastes» etter en endring, er det som regel et komma for mye eller for lite. Lim filen inn på https://jsonlint.com for å finne feilen.

## Produktbilder
Produktkatalogen på nettstedet henter bildene herfra, ikke fra Squarespace-butikken.

- `utb/bilder/` – UTB-produkter. Filnavnet er produktnavnet i små bokstaver med bindestrek, som `.webp`, for eksempel `utb/bilder/synlub-c4-5w-30.webp`. `utb-fat.webp` brukes for oljer uten eget bilde.
- `le/bilder/` – Lubrication Engineers (LE). Kopier av LE sine egne produktbilder i full versjon (ikke de beskårne «-300x300»-miniatyrene). Filnavnet er LE sitt filnavn i små bokstaver med bindestrek, som `.webp`, for eksempel `le/bilder/bal-200-quart.webp`. Bilder som mangler her, hentes direkte fra LE.
- `chesterton/bilder/` – Chesterton-produkter som ikke har bilde hos chesterton.com (`277`, `360`, `388`, `435`, `607hts`, `660`).
- `chesterton/produktbilder/` – Kopier av Chesterton sine egne produktbilder (600 px), med Chesterton sitt filnavn, for eksempel `chesterton/produktbilder/785_1.webp`. Brukes av forsiden og Chesterton-katalogen.
- `gruppen/` – Logoer for selskapene i Fuglesangs-gruppen (Fuglesangs AS, FSubsea, Flocean), brukt på forsiden.
- `ansatte/` – Portretter av ansatte, brukt på «Våre ansatte» og «Om oss». Filnavn: fullt navn i små bokstaver med bindestrek, for eksempel `ansatte/jakob-alfstadsaether.webp`.

Bytte et bilde: last opp et nytt med **samme filnavn**. Nytt UTB-bilde for et produkt som ikke har bilde i dag krever også at filnavnet legges til i produktkatalogkoden (listen `IMG` i UTB-delen).

## Datablad fra Chesterton og LE
Kopier av sikkerhetsdatablad (SDS) og produktdatablad (PDS) som produktkatalogen lenker til, så lenkene virker selv om leverandørene flytter filene.

- `chesterton/datablad/` – samme mappestruktur og filnavn som under chesterton.com/Files/Product assets/
- `le/datablad/sds/` og `le/datablad/pds/` – samme filnavn som hos lelubricants.com
- `datablad.json` – liste over hver fil med kilde-URL, sjekksum og datoen den ble hentet og sist kontrollert
- `datablad-indeks.json` – kort liste over filene, som katalogen leser. Datablad som ikke står her, hentes direkte fra leverandøren.

Kopiene kontrolleres mot leverandørene én gang i måneden. Endrede datablad erstattes, nye legges til, og datablad som er borte hos leverandøren blir liggende, og de står oppført i rapporten.

## Chesterton-sertifikater og godkjenninger
- `chesterton/sertifikater/` – kopier av dokumentene Chesterton publiserer som «Certification» (NSF, WRAS, ABS, US Navy, CE-ytelseserklæringer m.m.), med samme mappestruktur som hos chesterton.com
- `sertifikater.json` – hvilke sertifikater som hører til hvilket produkt i Chesterton-katalogen. Produktkatalogen viser dem under «Sertifikater og godkjenninger».

Lista bygges på nytt fra chesterton.com ved hver månedlige synk (`verktoy/sertifikater.js`). Nye sertifikater kommer med automatisk. Sertifikater som Chesterton fjerner, eller som har en utløpsdato i navnet som er passert, vises ikke lenger. Der Chesterton har en egen europeisk (E/EMEA) NSF-registrering, vises bare den, og der samme dokument finnes på flere språk, vises den engelske utgaven.


## Ekstra produktbilder (galleri)
`bilder-ekstra.json` lister ekstra bilder per produkt (emballasje, farger, tilbehør) som produktkatalogen på /produkter viser i bildegalleriet. LE-bildene ligger i `le/bilder/`, Chesterton-bildene i `chesterton/produktbilder/`. Bildene er hentet fra leverandørenes nettsider.


## Tilbudsliste (nett/tilbudsliste.js)
Felles skript for tilbudslisten på fuglesangstech.no, lastet på alle sider via Squarespace → Kodeinjeksjon → Bunntekst:

    <script src="https://fuglesangstech.github.io/fuglesangstech-datablad/nett/tilbudsliste.js" defer></script>

Katalogsidene legger til produkter med `window.FTTilbud.add({...})` eller en knapp med `data-ft-tilbud`. Se kommentaren øverst i fila. Siden /tilbud har et Squarespace-skjema som sender forespørselen til post@fuglesangstech.no; lista fylles inn i tekstfeltet automatisk.


## Perma-Tec smøresystemer i /produkter
`perma/bilder/` har produktbilder av de 16 perma-systemene (enpunkts og flerpunkts) som vises i /produkter, hentet fra perma-tec.com. Systemdata, artikkelnumre for drivenheter og deler, og datablad leses fra `perma/produkter.json` og `perma/datablad.json`. Perma sine smøremidler og artikkelnumre for ferdigfylte patroner vises ikke – Fuglesangs Tech fyller systemene med eget fett.

## Ressurser på produktsidene (verktoy/sjekk-ressurser.js)
Produktkatalogen på /produkter viser «Case studies og fagstoff» på hver produktside. Den leser `ressurser.json` og `dokumenter.json` når siden lastes, og kobler dokumentene til produktene etter produktnavnet (Chesterton etter produktnummer, f.eks. «ARC 858» eller «630 SXCF 220 #1»).
Et dokument som nevner et produktnavn katalogen ikke har (navnebytte, skrivefeil), vises ikke på noe produkt. Den månedlige kontrollen fanger dette:
`NODE_USE_ENV_PROXY=1 node verktoy/sjekk-ressurser.js` (krever Playwright). Perma-fett (SF/SO-numre) er med vilje utenfor, fordi Fuglesangs Tech selger systemene fylt med eget fett.
Test mot en lokal versjon av kodeblokken med `FT_KATALOG_FIL=<fil>`.
