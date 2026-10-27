"""Placeholder VO + words.json (until the real ElevenLabs "Jess" files land).

Synthesizes the exact script one whole sentence at a time with local Kokoro
TTS (natural flow), then places each word by syllable weight on a
"speech-only" clock that skips the pauses detected in the audio, so word
times snap to where the voice actually breathes. Output:
  public/vo/voiceover.mp3   (-16 LUFS)
  public/vo/words.json      [{word, start, end}] in seconds
Replace both with the real files and re-render; nothing else changes.
"""
import json, os, re, subprocess
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CACHE = os.path.expanduser("~/.cache/hyperframes/tts")
SR = 24000
SPEED = 1.12
LEAD_IN = 0.12
SENTENCE_GAP = 0.18

# Split only at sentence ends so Kokoro keeps the intonation of a real read.
SENTENCES = [
    "Students do you ever see those people who are completely overloaded one moment and had the academic comeback of the century the next?",
    "Well it's not from rereading your notes right before your test or burning themselves out, it's actually by making their classes manageable taking in information has never been easier because you can select what format you learn best in and best of all you can quiz yourself, accurately on what's really on YOUR exam.",
    "Stop rereading start doing what works for you!",
]
PHRASES = [(s, SENTENCE_GAP) for s in SENTENCES]

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


def pauses(x, win=0.01, thr_db=-38, min_len=0.07):
    """(start, end) seconds of quiet stretches inside the clip."""
    n = int(win * SR)
    rms = np.array([np.sqrt(np.mean(x[i:i + n] ** 2)) + 1e-9 for i in range(0, len(x) - n, n)])
    quiet = 20 * np.log10(rms / rms.max()) < thr_db
    out, i = [], 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]:
                j += 1
            if (j - i) * win >= min_len and i > 0 and j < len(quiet):
                out.append((i * win, j * win))
            i = j
        else:
            i += 1
    return out


k = Kokoro(os.path.join(CACHE, "models/kokoro-v1.0.onnx"), os.path.join(CACHE, "voices/voices-v1.0.bin"))
out = [np.zeros(int(LEAD_IN * SR), dtype=np.float32)]
words = []
t = LEAD_IN
for text, pause in PHRASES:
    audio, sr = k.create(text.replace("YOUR", "your"), voice="af_heart", speed=SPEED, lang="en-us")
    assert sr == SR
    audio = trim(audio.astype(np.float32))
    dur = len(audio) / SR
    gaps = pauses(audio)
    speech = dur - sum(b - a for a, b in gaps)

    def real(st):  # speech-only clock -> real clock
        r = st
        for a, b in gaps:
            if r >= a - 1e-6:
                r += b - a
        return r

    toks = text.split()
    weights = np.array([syllables(w) + 0.35 for w in toks])
    edges = np.concatenate([[0], np.cumsum(weights)]) / weights.sum() * speech
    for i, w in enumerate(toks):
        st, en = real(edges[i]), real(edges[i + 1])
        # a word never starts inside a pause: push it to the pause end
        for a, b in gaps:
            if a <= st < b:
                st = b
        words.append({"word": w, "start": round(t + st, 3), "end": round(t + max(st + 0.06, en - 0.02), 3)})
    out += [audio, np.zeros(int(pause * SR), dtype=np.float32)]
    t += dur + pause
    print(f"{len(toks)} words, {dur:.2f}s, {len(gaps)} pauses")

wav = os.path.join(HERE, ".vo_tmp.wav")
sf.write(wav, np.concatenate(out), SR)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", wav, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000",
                "-ac", "1", "-c:a", "libmp3lame", "-b:a", "192k", os.path.join(ROOT, "public/vo/voiceover.mp3")], check=True)
os.remove(wav)
json.dump(words, open(os.path.join(ROOT, "public/vo/words.json"), "w"), indent=1)
print(f"{len(words)} words, VO ends at {words[-1]['end']:.2f}s")
