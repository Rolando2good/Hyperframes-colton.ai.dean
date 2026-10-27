"""Original synthesized foley -> public/sfx/*.wav (48kHz mono, seeded).

Each sound is levelled so its loudest 100ms sits ~-24 dBFS, i.e. roughly 10 dB
under the -16 LUFS voice once mixed at volume 1.0.
pop_sticker is rendered at 7 pitches (-3..+3 semitones); the composition picks
one per landing with a seeded RNG so no two pops repeat exactly.
"""
import math, os
import numpy as np
import soundfile as sf

SR = 48000
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public/sfx")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(1984)


def t_(d):
    return np.arange(int(d * SR)) / SR


def biquad(x, kind, f, q=0.707):
    w = 2 * math.pi * f / SR
    a = math.sin(w) / (2 * q)
    c = math.cos(w)
    if kind == "lp":
        b = [(1 - c) / 2, 1 - c, (1 - c) / 2]
    elif kind == "hp":
        b = [(1 + c) / 2, -(1 + c), (1 + c) / 2]
    else:  # band-pass (constant peak)
        b = [a, 0, -a]
    A = [1 + a, -2 * c, 1 - a]
    b0, b1, b2 = (v / A[0] for v in b)
    a1, a2 = A[1] / A[0], A[2] / A[0]
    y = np.zeros_like(x)
    x1 = x2 = y1 = y2 = 0.0
    for i, xi in enumerate(x):
        yi = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1, y2, y1 = x1, xi, y1, yi
        y[i] = yi
    return y


def noise(d):
    return rng.standard_normal(int(d * SR))


def env(d, attack, decay):
    t = t_(d)
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / decay)


def impulses(d, rate_fn, width=30):
    n = int(d * SR)
    x = np.zeros(n)
    t = 0.0
    while t < d:
        i = int(t * SR)
        amp = rng.uniform(0.3, 1.0)
        w = int(rng.uniform(0.5, 1.5) * width)
        seg = rng.standard_normal(w) * amp * np.exp(-np.arange(w) / (w / 4))
        x[i:i + w] += seg[: max(0, min(w, n - i))]
        t += rng.exponential(1 / max(rate_fn(t / d), 1))
    return x


def level(x, target_db=-24.0):
    win = int(0.1 * SR)
    rms = max(np.sqrt(np.mean(x[i:i + win] ** 2)) for i in range(0, max(1, len(x) - win), win // 4))
    y = x * (10 ** (target_db / 20) / (rms + 1e-9))
    pk = np.max(np.abs(y))
    return y / pk * 0.89 if pk > 0.89 else y


def fade(x, ms=6):
    n = int(ms / 1000 * SR)
    x[:n] *= np.linspace(0, 1, n)
    x[-n:] *= np.linspace(1, 0, n)
    return x


def save(name, x, db=-24.0):
    sf.write(os.path.join(OUT, f"{name}.wav"), fade(level(x, db)).astype(np.float32), SR, subtype="PCM_16")


# paper_rip: accelerating micro-tears through a papery band, ends abruptly
d = 0.85
x = impulses(d, lambda p: 300 + 3200 * p, 40)
x = biquad(biquad(x, "hp", 900), "lp", 6500) + biquad(noise(d), "bp", 2600, 0.8) * 0.25 * np.linspace(0.2, 1, int(d * SR))
x *= np.concatenate([np.ones(int(0.78 * SR)), np.linspace(1, 0, int(d * SR) - int(0.78 * SR))])
save("paper_rip", x)

# tape_stick: soft palm press + tiny adhesive crackle
d = 0.35
x = biquad(noise(d), "lp", 700) * env(d, 0.004, 0.05) * 3 + biquad(impulses(d, lambda p: 900 * (1 - p), 12), "hp", 2500) * 0.35
save("tape_stick", x, -26)

# tape_tear: ratcheting peel, rate rising
d = 0.7
x = impulses(d, lambda p: 70 + 160 * p, 50)
x = biquad(biquad(x, "hp", 1800), "lp", 7000) + biquad(noise(d), "bp", 3800, 1.5) * 0.15
x *= np.minimum(1, t_(d) / 0.05)
save("tape_tear", x)

# pencil_scribble: graphite grit with back-and-forth stroke envelope (~7 strokes/s)
d = 0.9
t = t_(d)
strokes = np.abs(np.sin(2 * math.pi * 3.6 * t + 0.4 * np.sin(2 * math.pi * 1.3 * t))) ** 0.6
x = biquad(biquad(noise(d), "bp", 4200, 0.9), "hp", 1800) * strokes * (1 + 0.3 * rng.standard_normal(len(t)))
save("pencil_scribble", x, -26)

# marker_squeak: felt-tip squeal, short down-stroke then longer up-stroke (a check mark)
def squeak(d, f0, f1):
    t = t_(d)
    f = np.linspace(f0, f1, len(t)) * (1 + 0.012 * np.sin(2 * math.pi * 31 * t))
    ph = 2 * math.pi * np.cumsum(f) / SR
    tone = np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)
    e = np.minimum(1, t / 0.02) * np.minimum(1, (d - t) / 0.03)
    return (tone * 0.5 + biquad(noise(d), "bp", 3000, 1) * 0.5) * e
x = np.concatenate([squeak(0.12, 1900, 1700), np.zeros(int(0.03 * SR)), squeak(0.26, 1650, 2300)])
save("marker_squeak", x, -27)

# stamp_thud: rubber stamp slam — click + low knock + pitch-dropping thump
d = 0.5
t = t_(d)
thump = np.sin(2 * math.pi * np.cumsum(45 + 55 * np.exp(-t / 0.03)) / SR) * env(d, 0.001, 0.12)
knock = biquad(noise(d), "bp", 220, 2) * env(d, 0.001, 0.04) * 4
click = biquad(noise(d), "hp", 3000) * env(d, 0.0005, 0.004)
save("stamp_thud", thump * 1.2 + knock + click * 0.8, -20)

# page_flip: air whoosh with paper flutter, soft landing slap
d = 0.6
t = t_(d)
flutter = 1 + 0.6 * np.sin(2 * math.pi * 22 * t) * np.exp(-t / 0.3)
whoosh = biquad(noise(d), "bp", 1400, 0.6) * np.sin(np.pi * np.minimum(t / 0.45, 1)) * flutter
slap = np.zeros_like(t)
i = int(0.45 * SR)
n = len(t) - i
slap[i:] = biquad(rng.standard_normal(n), "lp", 1500) * env(n / SR, 0.002, 0.03)[:n] * 2.5
save("page_flip", whoosh + slap)

# paper_crumple: dense random crackle clusters
d = 0.9
x = impulses(d, lambda p: 1400 * (0.4 + math.sin(math.pi * p)), 60)
x = biquad(biquad(x, "hp", 700), "lp", 7500) * (0.6 + 0.4 * np.sin(2 * math.pi * 5 * t_(d)) ** 2)
save("paper_crumple", x)

# camera_shutter: two mechanical clicks with a tiny metallic ring
d = 0.3
x = np.zeros(int(d * SR))
for at, a in [(0.0, 1.0), (0.085, 0.75)]:
    i = int(at * SR)
    n = int(0.06 * SR)
    tt = np.arange(n) / SR
    clk = biquad(rng.standard_normal(n), "bp", 2800, 1.5) * np.exp(-tt / 0.006) * 3 + np.sin(2 * math.pi * 5200 * tt) * np.exp(-tt / 0.012) * 0.3
    x[i:i + n] += clk * a
save("camera_shutter", x, -24)

# typewriter_clack: type-bar strike + carriage knock
d = 0.14
t = t_(d)
x = biquad(noise(d), "hp", 2500) * env(d, 0.0003, 0.006) * 2 + biquad(noise(d), "bp", 420, 3) * env(d, 0.001, 0.025) * 4
save("typewriter_clack", x, -27)

# bell_ding: desk bell — inharmonic partials, long ring
d = 1.8
t = t_(d)
x = sum(a * np.sin(2 * math.pi * 2350 * r * t) * np.exp(-t / dec) for r, a, dec in [(1, 1, 0.9), (2.76, 0.45, 0.4), (5.4, 0.25, 0.18), (0.5, 0.15, 0.6)])
x = x * np.minimum(1, t / 0.002) + biquad(noise(d), "hp", 4000) * env(d, 0.0002, 0.003) * 0.5
save("bell_ding", x, -24)

# pop_sticker: quick downward blip + peel tick, 7 pitches
for semi in range(-3, 4):
    d = 0.18
    t = t_(d)
    f0 = 520 * 2 ** (semi / 12)
    f = f0 * (1 + 1.4 * np.exp(-t / 0.012))
    x = np.sin(2 * math.pi * np.cumsum(f) / SR) * env(d, 0.001, 0.035) + biquad(noise(d), "hp", 3500) * env(d, 0.0005, 0.003) * 0.6
    tag = f"m{-semi}" if semi < 0 else f"p{semi}"
    save(f"pop_sticker_{tag}", x, -24)

print("sfx:", sorted(os.listdir(OUT)))
