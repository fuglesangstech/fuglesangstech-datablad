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
