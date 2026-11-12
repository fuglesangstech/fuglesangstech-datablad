"""Lager dokumenter.json: utvalgte dokumenter fra leverandører som ikke har et søkbart bibliotek som Chesterton
(Vickers Oils, Perma-Tec, Lubrication Engineers). Kjøres for hånd når utvalget skal endres:
    python3 verktoy/lag_dokumenter.py SKRAPEMAPPE
SKRAPEMAPPE inneholder nedlastede sider (perma pd-*.html, le-tt.html, le-cert.html, vik-dl.html).
Dokumentene lenkes (kopieres ikke). Lenkesjekken melder fra hvis en lenke slutter å virke.
Feltet «produkter» er et regulært uttrykk mot produktnavnet i datablad-oversikt.json – da vises dokumentet ved
de produktene. Uten «produkter» blir dokumentet en egen rad (generelt dokument)."""
import json, re, sys, html, os, datetime
D = sys.argv[1]
out = []
def add(lev, navn, url, typ, produkter=None, sprak='EN'):
    d = {'lev': lev, 'navn': navn, 'sprak': sprak, 'url': url, 'type': typ}
    if produkter: d['produkter'] = produkter
    out.append(d)

# ---------- Perma-Tec ----------
SYS = [('STAR_VARIO', 'STAR VARIO', r'^perma STAR VARIO'), ('STAR_CONTROL', 'STAR CONTROL', r'^perma STAR CONTROL'), ('FUTURA', 'FUTURA', r'^perma FUTURA'),
       ('CLASSIC', 'CLASSIC', r'^perma CLASSIC'), ('FLEX', 'FLEX', r'^perma FLEX'), ('NOVA', 'NOVA', r'^perma NOVA'), ('ULTRA', 'ULTRA', r'^perma ULTRA'),
       ('PRO_C_LINE', 'PRO C LINE', r'^perma PRO'), ('PRO_LINE', 'PRO LINE', r'^perma PRO'), ('PRO_C_MP', 'PRO C MP-6', r'^perma PRO'), ('PRO_MP', 'PRO MP-6', r'^perma PRO'),
       ('PRO', 'PRO', r'^perma PRO'), ('ECOSY', 'ECOSY', r'^perma ECOSY')]
def sysof(n):
    for k, lab, rx in SYS:
        if re.search(r'(^|_)' + k + r'(_|\d)', n): return lab, rx
    return None, None
def links(f):
    h = open(os.path.join(D, f)).read()
    return sorted(set(re.findall(r'href="(https://www\.perma-tec\.com/_Resources/Persistent/[^"]+\.pdf)"', h)))
en = lambda u: re.search(r'_en[_.]|_en_', u.rsplit('/', 1)[1])
for u in links('pd-perma-product-catalogue.html'):
    if en(u): add('Perma-Tec', 'perma produktkatalog', u, 'katalog')
for f, typ, pre in [('pd-installation-guides.html', 'bruksanvisning', 'Installasjonsveiledning'), ('pd-quick-start-guides.html', 'bruksanvisning', 'Hurtigstart'), ('pd-operating-instructions.html', 'bruksanvisning', 'Bruksanvisning')]:
    seen = set()
    for u in links(f):
        n = u.rsplit('/', 1)[1]
        if not en(u) or n in seen: continue
        seen.add(n)
        lab, rx = sysof(n)
        if 'ACCESSORY' in n: add('Perma-Tec', pre + ': tilbehør og installasjonssett perma STAR', u, typ, r'^(perma STAR|Støtteflenser perma STAR|Beskyttelseshetter perma STAR)')
        elif 'CWL' in n: continue   # CWL PLUS føres ikke
        elif lab: add('Perma-Tec', pre + ': perma ' + lab, u, typ, rx)
SEKTOR = {'Asphalt_mixing_plants': 'asfaltverk', 'Automotive': 'bilindustri', 'Chemical_Pharmaceutical': 'kjemi og farmasi', 'Elevators': 'heiser', 'Escalators_moving_walkways': 'rulletrapper og rullebånd',
          'Food_Beverage': 'næringsmiddel og drikke', 'Cement_gypsum_lime': 'sement, gips og kalk', 'Mining_Minerals_Processing': 'gruve og mineralforedling', 'Power_Generation': 'kraftproduksjon',
          'Pulp_paper': 'treforedling og papir', 'Quarrying_industry': 'pukkverk', 'Recycling': 'gjenvinning', 'Refineries': 'raffinerier', 'Stahlindustrie': 'stålindustri',
          'Wastewater_treatment': 'avløpsrensing', 'Wind_power': 'vindkraft'}
for u in links('pd-flyers-industry-sectors.html'):
    n = u.rsplit('/', 1)[1]
    m = re.search(r'Industryflyer_perma_(.+?)_en', n)
    if en(u) and m and m.group(1) in SEKTOR: add('Perma-Tec', 'perma for ' + SEKTOR[m.group(1)], u, 'brosjyre')
BRUK = {'Blowers_Fans': 'vifter og blåsere', 'Chains': 'kjeder', 'Conveyors_EMEA': 'transportbånd', 'Electric_motors': 'elektromotorer', 'Linear_guides': 'lineærføringer',
        'Pumps': 'pumper', 'Roller_Sliding_bearings': 'rulle- og glidelagre', 'Spindles_Open_gears': 'spindler og åpne tannhjul'}
for u in links('pd-application-flyers.html'):
    m = re.search(r'Application_flyer_perma_(.+?)_en', u.rsplit('/', 1)[1])
    if m and m.group(1) in BRUK: add('Perma-Tec', 'Automatisk smøring av ' + BRUK[m.group(1)], u, 'brosjyre')
SPES = {'Flyer_perma_Sustainability': ('perma og bærekraft', None), 'LINE_CARD_perma_Lubricants_EMEA': ('perma smøremidler – oversikt', r'\((S[FO]\d\d)\)$'),
        'perma_Flyer_STAR_PRODUCT_LINE': ('perma STAR-serien', r'^perma STAR'), 'perma_STAR_VARIO_Sets_Flyer_EMEA': ('perma STAR VARIO-sett', r'^perma STAR VARIO')}
for u in links('pd-special-flyers.html'):
    n = u.rsplit('/', 1)[1]
    for k, (lab, rx) in SPES.items():
        if n.startswith(k): add('Perma-Tec', lab, u, 'brosjyre', rx)

# ---------- Vickers Oils (bare produkter for land) ----------
VB = 'https://vickers-oil.com/wp-content/uploads/'
vik = open(os.path.join(D, 'vik-dl.html')).read()
def vurl(fil):
    m = re.search(r'href="(' + re.escape(VB) + r'\d{4}/\d{2}/' + re.escape(fil) + r')"', vik)
    if not m: raise SystemExit('fant ikke ' + fil + ' på vickers-oil.com/downloads')
    return m.group(1)
for fil, navn, typ, rx in [
    ('A4_Lubricants-Greases_v10_web.pdf', 'Vickers produktkatalog – smøremidler og fett', 'katalog', None),
    ('Food-Grade-catalogue-v17.pdf', 'Vickerlube FG – katalog for næringsmiddelindustrien', 'katalog', None),
    ('A4_Hydraulic_Fluids_v5_web.pdf', 'Vickers hydraulikkoljer', 'brosjyre', None),
    ('A4_Gear_oils_v6_web.pdf', 'Vickers giroljer', 'brosjyre', None),
    ('A4_Grease_v12_web.pdf', 'Vickers fett', 'brosjyre', None),
    ('A4_Chain_oils_v6_web.pdf', 'Vickers kjedeoljer', 'brosjyre', None),
    ('A4_Aerosols_v6_web.pdf', 'Vickers spray', 'brosjyre', None),
    ('A4_Specialty_v4_web.pdf', 'Vickers spesialprodukter', 'brosjyre', None),
    ('Biodegradable-Lubricants_Brochure_A4_v12-web.pdf', 'Biologisk nedbrytbare smøremidler (EAL)', 'brosjyre', None),
    ('Corrosion-prevention-brochure.pdf', 'Korrosjonsbeskyttelse', 'brosjyre', None),
    ('Bakery_brochure_4pp_v14-lr-1.pdf', 'Smøremidler for bakerier', 'brosjyre', None),
    ('ECOSURE-4PP-v30.pdf', 'Ecosure – miljøtilpassede hydraulikkoljer', 'brosjyre', r'^Ecosure'),
    ('BIOGEAR-XP-v33.pdf', 'Biogear XP – miljøtilpassede giroljer', 'brosjyre', r'^Biogear XP'),
    ('BIOGREASE-EP-v26.pdf', 'Biogrease EP – miljøtilpasset fett', 'brosjyre', r'^Biogrease EP'),
    ('BIOGEAR-XP-Instructions-for-Use.pdf', 'Bruksanvisning Biogear XP', 'bruksanvisning', r'^Biogear XP'),
    ('BIOGREASE-EP0-and-BIOGREASE-EP2-Instructions-for-use-1.pdf', 'Bruksanvisning Biogrease EP0 og EP2', 'bruksanvisning', r'^Biogrease EP'),
    ('VICKERLUBE-FG-Range-Allergen-Statement-1.pdf', 'Allergenerklæring Vickerlube FG', 'sertifikat', r'^Vickerlube FG'),
    ('ISO-9001-Certificate-exp-2029.pdf', 'Vickers Oils ISO 9001', 'sertifikat', None),
    ('Env-certificate-2025-to-28.pdf', 'Vickers Oils ISO 14001 (miljø)', 'sertifikat', None),
    ('21971-1_Vickers_Oils_HCE_NON_GSO_Halal_Certificate.pdf', 'Vickers Oils Halal-sertifikat', 'sertifikat', None),
    ('Kosher-Cert-26-27.pdf', 'Vickers Oils Kosher-sertifikat', 'sertifikat', None)]:
    add('Vickers Oils', navn, vurl(fil), typ, rx)

# ---------- Lubrication Engineers ----------
tt = open(os.path.join(D, 'le-tt.html')).read()
for m in re.finditer(r'href="([^"]+techtips/[^"]+\.pdf)"[^>]*>([\s\S]{0,300}?)</a>', tt):
    t = html.unescape(re.sub(r'<[^>]+>|\s+', ' ', m.group(2))).strip()
    t = re.sub(r'^\d+a?\s+', '', t)
    u = html.unescape(m.group(1)).replace('https://www.', 'https://').replace(' ', '%20')
    if u.startswith('/'): u = 'https://lelubricants.com' + u
    if not any(x['url'] == u for x in out): add('Lubrication Engineers', 'Techni-Tip: ' + t, u, 'teknisk')
cert = open(os.path.join(D, 'le-cert.html')).read()
LEC = {'NSF H1 Certifications': 'LE NSF H1-sertifikater', 'H1 Allergen Certificate': 'LE allergenerklæring for H1-produkter', 'ISO 9001-2015 Certification': 'LE ISO 9001',
       'Kosher Certification Letter': 'LE Kosher-sertifikat', 'Halal Certification': 'LE Halal-sertifikat', 'Halal Certification-Aerosols': 'LE Halal-sertifikat for spray', 'ILMA Certificate': 'LE ILMA-medlemskap'}
seen = set()
for u in re.findall(r'href="([^"]+/certs/[^"]+\.pdf)"', cert):
    u = html.unescape(u).replace('https://www.', 'https://').replace(' ', '%20')
    k = re.sub(r'%20', ' ', u.rsplit('/', 1)[1])[:-4]
    if k in LEC and k not in seen: seen.add(k); add('Lubrication Engineers', LEC[k], u, 'sertifikat')

# ---------- Fuglesangs Tech: egne fagartikler (vises sammen med leverandørenes dokumenter) ----------
S = 'https://www.fuglesangstech.no'
for navn, sti in [('Bakterievekst i hydraulikksystemer', '/artikler/bakterievekst-i-hydraulikksystemer'),
                  ('Stoffkartotek: slik holder du sikkerhetsdatabladene i orden', '/artikler/stoffkartotek-sikkerhetsdatablad')]:
    add('Fuglesangs Tech', navn, S + sti, 'artikkel', sprak='NO')

json.dump({'oppdatert': datetime.date.today().isoformat(), 'merknad': 'Utvalg laget med verktoy/lag_dokumenter.py. Lenker, ikke kopier.', 'dokumenter': out}, open('dokumenter.json', 'w'), ensure_ascii=False, indent=1)
import collections
print(len(out), collections.Counter((d['lev'], d['type']) for d in out))
