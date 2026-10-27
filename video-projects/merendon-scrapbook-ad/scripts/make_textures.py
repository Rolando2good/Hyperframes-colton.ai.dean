"""Procedural "scanned" textures -> public/textures (seeded, deterministic)."""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public/textures")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(84)


def blur_noise(h, w, scale):
    small = rng.standard_normal((max(2, h // scale), max(2, w // scale))).astype(np.float32)
    img = Image.fromarray(((small - small.min()) / (np.ptp(small) + 1e-6) * 255).astype(np.uint8))
    img = img.resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(scale / 3))
    a = np.asarray(img, dtype=np.float32) / 255.0
    return (a - a.mean()) / (a.std() + 1e-6)


def fibers(img, n, length, colors, width=(1, 2)):
    d = ImageDraw.Draw(img, "RGBA")
    W, H = img.size
    for _ in range(n):
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        ang = rng.uniform(0, np.pi)
        L = rng.uniform(*length)
        pts = []
        for i in range(6):
            t = i / 5
            ang += rng.normal(0, 0.25)
            pts.append((x + np.cos(ang) * L * t, y + np.sin(ang) * L * t))
        c = colors[rng.integers(len(colors))]
        d.line(pts, fill=c, width=int(rng.integers(width[0], width[1] + 1)))


# Kraft desk: oversized so the camera can drift and punch without showing edges.
W, H = 1240, 2200
base = np.array([0xC8, 0xA5, 0x7A], dtype=np.float32)
mott = blur_noise(H, W, 160) * 7 + blur_noise(H, W, 40) * 4 + rng.standard_normal((H, W)) * 3.2
kraft = np.clip(base[None, None, :] + mott[..., None] * np.array([1.0, 0.92, 0.8]), 0, 255).astype(np.uint8)
img = Image.fromarray(kraft, "RGB")
fibers(img, 2600, (8, 38), [(120, 88, 52, 70), (235, 210, 170, 80), (95, 70, 40, 55), (250, 230, 200, 60)])
speck = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ds = ImageDraw.Draw(speck)
for _ in range(1800):
    x, y, r = rng.uniform(0, W), rng.uniform(0, H), rng.uniform(0.6, 2.2)
    ds.ellipse([x - r, y - r, x + r, y + r], fill=(70, 50, 30, int(rng.integers(40, 120))))
img = Image.alpha_composite(img.convert("RGBA"), speck.filter(ImageFilter.GaussianBlur(0.6))).convert("RGB")
img.save(os.path.join(OUT, "kraft.jpg"), quality=92)

# Paper fiber overlay (tileable-ish, used multiply at low opacity on paper pieces)
P = 1024
pf = Image.new("RGBA", (P, P), (255, 255, 255, 0))
fibers(pf, 900, (6, 26), [(150, 130, 100, 40), (120, 110, 95, 30)])
noise = (blur_noise(P, P, 60) * 10 + rng.standard_normal((P, P)) * 6)
nimg = np.clip(235 + noise, 0, 255).astype(np.uint8)
paper = Image.fromarray(np.stack([nimg] * 3, -1), "RGB").convert("RGBA")
Image.alpha_composite(paper, pf).convert("L").save(os.path.join(OUT, "paper-fiber.png"))

# Film grain: 8 frames, chosen by a seeded hash every 2 frames (re-randomizes on twos)
for i in range(8):
    g = rng.normal(128, 52, (960, 540)).clip(0, 255).astype(np.uint8)
    Image.fromarray(g, "L").save(os.path.join(OUT, f"grain-{i}.png"))

# Halftone dot screen (multiply @ 8%)
HT = 24
ht = Image.new("L", (HT * 10, HT * 10), 255)
dh = ImageDraw.Draw(ht)
for yy in range(10):
    for xx in range(10):
        cx, cy = xx * HT + (HT / 2 if yy % 2 else 0), yy * HT
        r = 4.2
        dh.ellipse([cx - r, cy - r, cx + r, cy + r], fill=40)
ht.save(os.path.join(OUT, "halftone.png"))
print("textures ok")
