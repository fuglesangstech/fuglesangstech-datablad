#!/usr/bin/env python3
"""
Oppskalerer produktbilder med Real-ESRGAN (x4plus) på CPU, uten basicsr.

Bruk (fra roten av repoet):
  pip install --break-system-packages torch --index-url https://download.pytorch.org/whl/cpu
  python3 verktoy/oppskaler.py --minutter 100          # behandler så mange bilder som rekkes, verste først
  python3 verktoy/oppskaler.py --liste                 # viser hva som gjenstår
  python3 verktoy/oppskaler.py --fil utb/bilder/x.webp # ett bilde

Slik virker det:
- Kandidater: bilder i mappene under MAPPER med lengste side under 1000 px, som ikke står i bilder-oppskalert.json.
- Mange bilder er små originaler som er forstørret uskarpt én gang før (f.eks. UTB Excello Classic). For hvert bilde
  finner verktøyet hvor mye ekte oppløsning det har: det krymper bildet og sjekker om noe går tapt (PSNR over 38 dB).
  Bildet krympes til den ekte størrelsen før oppskaleringen, ellers forsterker modellen uskarpheten og lager «krusedull-tekst».
- Resultatet lagres med høyst 2,5 × den ekte oppløsningen og høyst 1200 px (men aldri mindre enn før), så zoomen i /produkter ikke viser oppdiktede detaljer.
- Gjennomsiktighet beholdes (alfakanalen skaleres for seg). Samme filnavn, så katalogen trenger ingen endring.
- bilder-oppskalert.json lister hva som er gjort (med sjekksum av originalen), så verktøyet kan kjøres flere ganger og fortsette der det slapp.
  Originalene ligger i git-historikken.
"""
import argparse, hashlib, json, os, sys, time, urllib.request
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAPPER = ['le/bilder', 'utb/bilder', 'vickers/bilder', 'chesterton/produktbilder', 'chesterton/bilder', 'perma/bilder', 'rpi/bilder']
MANIFEST = os.path.join(ROOT, 'bilder-oppskalert.json')
MODELL_URL = 'https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth'
MODELL = os.path.join(os.path.expanduser('~'), '.cache', 'realesrgan', 'RealESRGAN_x4plus.pth')
GRENSE = 1000      # bilder med lengste side under dette behandles
MAKS = 1200        # største lagrede bilde
FAKTOR = 2.5       # høyst 2,5 × den ekte oppløsningen

import torch, torch.nn as nn, torch.nn.functional as F
torch.set_num_threads(os.cpu_count() or 2)

class RDB(nn.Module):
    def __init__(s, nf=64, gc=32):
        super().__init__()
        s.conv1 = nn.Conv2d(nf, gc, 3, 1, 1); s.conv2 = nn.Conv2d(nf + gc, gc, 3, 1, 1); s.conv3 = nn.Conv2d(nf + 2 * gc, gc, 3, 1, 1)
        s.conv4 = nn.Conv2d(nf + 3 * gc, gc, 3, 1, 1); s.conv5 = nn.Conv2d(nf + 4 * gc, nf, 3, 1, 1); s.l = nn.LeakyReLU(0.2, True)
    def forward(s, x):
        x1 = s.l(s.conv1(x)); x2 = s.l(s.conv2(torch.cat((x, x1), 1))); x3 = s.l(s.conv3(torch.cat((x, x1, x2), 1)))
        x4 = s.l(s.conv4(torch.cat((x, x1, x2, x3), 1))); return s.conv5(torch.cat((x, x1, x2, x3, x4), 1)) * 0.2 + x
class RRDB(nn.Module):
    def __init__(s, nf=64, gc=32):
        super().__init__(); s.rdb1 = RDB(nf, gc); s.rdb2 = RDB(nf, gc); s.rdb3 = RDB(nf, gc)
    def forward(s, x): return s.rdb3(s.rdb2(s.rdb1(x))) * 0.2 + x
class Net(nn.Module):
    def __init__(s, nf=64, nb=23, gc=32):
        super().__init__()
        s.conv_first = nn.Conv2d(3, nf, 3, 1, 1); s.body = nn.Sequential(*[RRDB(nf, gc) for _ in range(nb)]); s.conv_body = nn.Conv2d(nf, nf, 3, 1, 1)
        s.conv_up1 = nn.Conv2d(nf, nf, 3, 1, 1); s.conv_up2 = nn.Conv2d(nf, nf, 3, 1, 1); s.conv_hr = nn.Conv2d(nf, nf, 3, 1, 1)
        s.conv_last = nn.Conv2d(nf, 3, 3, 1, 1); s.l = nn.LeakyReLU(0.2, True)
    def forward(s, x):
        f = s.conv_first(x); f = f + s.conv_body(s.body(f))
        f = s.l(s.conv_up1(F.interpolate(f, scale_factor=2, mode='nearest'))); f = s.l(s.conv_up2(F.interpolate(f, scale_factor=2, mode='nearest')))
        return s.conv_last(s.l(s.conv_hr(f)))

_net = None
def net():
    global _net
    if _net is None:
        if not os.path.exists(MODELL):
            os.makedirs(os.path.dirname(MODELL), exist_ok=True)
            print('Laster ned modellen …', flush=True); urllib.request.urlretrieve(MODELL_URL, MODELL)
        m = Net(); sd = torch.load(MODELL, map_location='cpu')
        m.load_state_dict(sd.get('params_ema', sd.get('params', sd)), strict=True); m.eval(); _net = m
    return _net

def sr(rgb, tile=192, pad=10):
    x = torch.from_numpy(rgb.astype(np.float32) / 255.).permute(2, 0, 1)[None]
    _, _, h, w = x.shape; out = torch.zeros(1, 3, h * 4, w * 4)
    with torch.no_grad():
        for y0 in range(0, h, tile):
            for x0 in range(0, w, tile):
                y1, x1 = min(y0 + tile, h), min(x0 + tile, w); ya, xa = max(y0 - pad, 0), max(x0 - pad, 0); yb, xb = min(y1 + pad, h), min(x1 + pad, w)
                o = net()(x[:, :, ya:yb, xa:xb])
                out[:, :, y0 * 4:y1 * 4, x0 * 4:x1 * 4] = o[:, :, (y0 - ya) * 4:(y0 - ya) * 4 + (y1 - y0) * 4, (x0 - xa) * 4:(x0 - xa) * 4 + (x1 - x0) * 4]
    return (out[0].permute(1, 2, 0).clamp(0, 1).numpy() * 255).round().astype('uint8')

def psnr(a, b):
    d = np.mean((a.astype(np.float32) - b.astype(np.float32)) ** 2)
    return 99.0 if d == 0 else 10 * np.log10(255 ** 2 / d)

def ekte_faktor(rgb):
    """Hvor mye kan bildet krympes uten å miste noe? (1 = ingenting å hente, 0.35 = sterkt forstørret før)"""
    im = Image.fromarray(rgb); best = 1.0
    for f in (0.75, 0.6, 0.5, 0.42, 0.35):
        w, h = max(8, round(im.width * f)), max(8, round(im.height * f))
        tilbake = np.asarray(im.resize((w, h), Image.LANCZOS).resize(im.size, Image.LANCZOS))
        if psnr(rgb, tilbake) >= 38: best = f
        else: break
    return best

def sjekksum(p):
    return hashlib.sha1(open(p, 'rb').read()).hexdigest()[:16]

def les_manifest():
    try: return json.load(open(MANIFEST))
    except Exception: return {'om': 'Bilder som er oppskalert med verktoy/oppskaler.py (Real-ESRGAN). Originalene ligger i git-historikken.', 'bilder': {}}

def kandidater(man):
    out = []
    for d in MAPPER:
        full = os.path.join(ROOT, d)
        if not os.path.isdir(full): continue
        for f in sorted(os.listdir(full)):
            if not f.lower().endswith(('.webp', '.png', '.jpg', '.jpeg')): continue
            rel = d + '/' + f
            if rel in man['bilder']: continue
            try: im = Image.open(os.path.join(full, f))
            except Exception: continue
            if max(im.size) < GRENSE: out.append((max(im.size), rel))
    out.sort()
    return [r for _, r in out]

def behandle(rel):
    p = os.path.join(ROOT, rel); im = Image.open(p)
    har_alfa = im.mode in ('RGBA', 'LA', 'P') and im.convert('RGBA').getchannel('A').getextrema()[0] < 250
    rgba = np.asarray(im.convert('RGBA')); al = rgba[:, :, 3]; m = al[..., None] / 255.0
    rgb = (rgba[:, :, :3] * m + 255 * (1 - m)).astype('uint8')
    f = ekte_faktor(rgb)
    if f < 1:
        w, h = max(8, round(im.width * f)), max(8, round(im.height * f))
        rgb_s = np.asarray(Image.fromarray(rgb).resize((w, h), Image.LANCZOS))
    else: rgb_s = rgb
    up = sr(rgb_s)
    # Aldri mindre enn før (uskarpe bilder blir skarpere i samme størrelse), høyst 2,5 × ekte oppløsning og 1200 px
    mal = max(max(im.size), min(MAKS, round(FAKTOR * max(rgb_s.shape[:2]))))
    ut = Image.fromarray(up)
    if har_alfa:
        alu = Image.fromarray(al).resize(ut.size, Image.LANCZOS); ut = ut.convert('RGBA'); ut.putalpha(alu)
    ut.thumbnail((mal, mal), Image.LANCZOS)
    if f >= 1 and max(ut.size) <= max(im.size):   # skarpt og allerede stort nok: ingen gevinst
        return None, f
    if rel.lower().endswith('.webp'): ut.save(p, 'WEBP', quality=88, method=6)
    elif rel.lower().endswith('.png'): ut.save(p, 'PNG', optimize=True)
    else: ut.convert('RGB').save(p, 'JPEG', quality=90)
    return (im.size, ut.size), f

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--minutter', type=float, default=0); ap.add_argument('--liste', action='store_true'); ap.add_argument('--fil')
    a = ap.parse_args(); man = les_manifest()
    todo = [a.fil] if a.fil else kandidater(man)
    if a.liste:
        print(len(todo), 'bilder gjenstår'); [print(' ', r) for r in todo]; return
    slutt = time.time() + a.minutter * 60 if a.minutter else None; n = 0; t0 = time.time()
    for rel in todo:
        if slutt and time.time() > slutt - 240: break     # la det være tid igjen til commit
        t = time.time()
        try: res, f = behandle(rel)
        except Exception as e:
            print('FEIL', rel, e, flush=True); man['bilder'][rel] = {'feil': str(e)[:200], 'dato': time.strftime('%Y-%m-%d')}; continue
        man['bilder'][rel] = {'dato': time.strftime('%Y-%m-%d'), 'ekte': f, 'fra': list(res[0]) if res else None, 'til': list(res[1]) if res else None, 'sha': sjekksum(os.path.join(ROOT, rel))}
        json.dump(man, open(MANIFEST, 'w'), ensure_ascii=False, indent=1)
        n += 1; print(('ok  ' if res else 'lik '), rel, res, 'ekte=%.2f' % f, '%.0fs' % (time.time() - t), flush=True)
    rest = len(kandidater(man))
    print('\nBehandlet %d bilder på %.0f min. Gjenstår: %d.' % (n, (time.time() - t0) / 60, rest))

if __name__ == '__main__':
    main()
