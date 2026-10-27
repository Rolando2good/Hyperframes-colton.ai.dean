"""Placeholder VO + words.json (until the real ElevenLabs "Jess" files land).

Synthesizes the exact script phrase-by-phrase with local Kokoro TTS so phrase
boundaries are known exactly, then spreads each phrase's words across its
speech by syllable weight. Output:
  public/vo/voiceover.mp3   (-16 LUFS)
  public/vo/words.json      [{word, start, end}] in seconds
Replace both with the real files and re-render; nothing else changes.
"""
import json, os, re, subprocess, sys
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CACHE = os.path.expanduser("~/.cache/hyperframes/tts")
SR = 24000
SPEED = 0.8
LEAD_IN = 0.22

PHRASES = [
    ("Students", 0.10),
    ("do you ever see those people who are completely overloaded one moment", 0.10),
    ("and had the academic comeback of the century the next?", 0.45),
    ("Well it's not from rereading your notes right before your test", 0.08),
    ("or burning themselves out,", 0.22),
    ("it's actually by making their classes manageable", 0.12),
    ("taking in information has never been easier", 0.10),
    ("because you can select what format you learn best in", 0.22),
    ("and best of all you can quiz yourself,", 0.16),
    ("accurately on what's really on YOUR exam.", 0.45),
    ("Stop rereading", 0.10),
    ("start doing what works for you!", 0.0),
]

script = open(os.path.join(HERE, "vo_script.txt")).read().split()
assert " ".join(p for p, _ in PHRASES).split() == script, "phrases must equal the script exactly"


def syllables(w):
    w = re.sub(r"[^a-z]", "", w.lower())
    groups = re.findall(r"[aeiouy]+", w)
    n = len(groups) - (1 if w.endswith("e") and len(groups) > 1 and not w.endswith("le") else 0)
    return max(1, n)


def trim(x, thr=0.02):
    idx = np.where(np.abs(x) > thr)[0]
    return x[max(0, idx[0] - 240): idx[-1] + 480] if len(idx) else x


k = Kokoro(os.path.join(CACHE, "models/kokoro-v1.0.onnx"), os.path.join(CACHE, "voices/voices-v1.0.bin"))
out = [np.zeros(int(LEAD_IN * SR), dtype=np.float32)]
words = []
t = LEAD_IN
for text, pause in PHRASES:
    audio, sr = k.create(text.replace("YOUR", "your"), voice="af_heart", speed=SPEED, lang="en-us")
    assert sr == SR
    audio = trim(audio.astype(np.float32))
    dur = len(audio) / SR
    toks = text.split()
    weights = np.array([syllables(w) + 0.35 for w in toks])
    edges = np.concatenate([[0], np.cumsum(weights)]) / weights.sum() * dur
    for i, w in enumerate(toks):
        words.append({"word": w, "start": round(t + edges[i], 3), "end": round(t + edges[i + 1] - 0.02, 3)})
    out += [audio, np.zeros(int(pause * SR), dtype=np.float32)]
    t += dur + pause

wav = os.path.join(HERE, ".vo_tmp.wav")
sf.write(wav, np.concatenate(out), SR)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", wav, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000",
                "-ac", "1", "-c:a", "libmp3lame", "-b:a", "192k", os.path.join(ROOT, "public/vo/voiceover.mp3")], check=True)
os.remove(wav)
json.dump(words, open(os.path.join(ROOT, "public/vo/words.json"), "w"), indent=1)
print(f"{len(words)} words, VO ends at {words[-1]['end']:.2f}s")
