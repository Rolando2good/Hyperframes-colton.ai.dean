// Custom music bed for "Knowledge Is The Foundation" — 120 BPM, A minor, 19.5s.
// Deterministic synth (seeded noise) → raw stereo WAV. Post-processed with ffmpeg.
import { writeFileSync } from "node:fs";

const SR = 48000;
const DUR = 19.5;
const N = Math.floor(SR * DUR);
const L = new Float32Array(N);
const R = new Float32Array(N);
const BEAT = 0.5; // 120 BPM

// mulberry32 seeded PRNG
let seed = 1337;
const rand = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const noiseBuf = new Float32Array(SR * 2).map(() => rand() * 2 - 1);
const noise = (i) => noiseBuf[i % noiseBuf.length];

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const add = (i, v, pan = 0) => {
  if (i < 0 || i >= N) return;
  L[i] += v * (1 - Math.max(0, pan));
  R[i] += v * (1 + Math.min(0, pan));
};

function kick(t, gain = 1) {
  const s = Math.floor(t * SR);
  let ph = 0;
  for (let k = 0; k < SR * 0.45; k++) {
    const x = k / SR;
    const f = 45 + 120 * Math.exp(-x * 28);
    ph += (2 * Math.PI * f) / SR;
    const env = Math.exp(-x * 7);
    const click = k < 120 ? noise(k) * 0.3 * (1 - k / 120) : 0;
    add(s + k, (Math.sin(ph) * env + click) * 0.9 * gain);
  }
}
function hat(t, open = false, gain = 1, pan = 0.2) {
  const s = Math.floor(t * SR);
  const len = open ? 0.18 : 0.05;
  let prev = 0;
  for (let k = 0; k < SR * len; k++) {
    const n = noise(s + k * 7);
    const hp = n - prev; prev = n; // crude highpass
    add(s + k, hp * Math.exp(-(k / SR) * (open ? 22 : 70)) * 0.12 * gain, pan);
  }
}
function clap(t, gain = 1) {
  const s = Math.floor(t * SR);
  for (let k = 0; k < SR * 0.25; k++) {
    const x = k / SR;
    const burst = x < 0.03 ? (Math.floor(x / 0.01) % 2 ? 0.6 : 1) : 1;
    add(s + k, noise(s + k * 3) * Math.exp(-x * 18) * 0.22 * burst * gain, -0.15);
  }
}
function bass(t, midi, len, gain = 1) {
  const s = Math.floor(t * SR);
  const f = mtof(midi);
  let lp = 0;
  for (let k = 0; k < SR * len; k++) {
    const x = k / SR;
    const saw = 2 * ((x * f) % 1) - 1;
    const sub = Math.sin(2 * Math.PI * f * x);
    lp += (saw - lp) * 0.06;
    const env = Math.min(1, x / 0.005) * Math.exp(-x * 2.2) * (x > len - 0.02 ? (len - x) / 0.02 : 1);
    add(s + k, (lp * 0.35 + sub * 0.55) * env * 0.38 * gain);
  }
}
function pluck(t, midi, gain = 1, bright = 0.25, pan = 0) {
  const s = Math.floor(t * SR);
  const f = mtof(midi);
  let lp = 0;
  for (let k = 0; k < SR * 0.4; k++) {
    const x = k / SR;
    const sq = ((x * f) % 1) < 0.5 ? 1 : -1;
    const cut = bright * Math.exp(-x * 10) + 0.02;
    lp += (sq - lp) * cut;
    add(s + k, lp * Math.exp(-x * 9) * 0.09 * gain, pan);
  }
}
function pad(t, notes, len, gain = 1) {
  const s = Math.floor(t * SR);
  for (let k = 0; k < SR * len; k++) {
    const x = k / SR;
    const env = Math.min(1, x / 0.6) * Math.min(1, (len - x) / 1.2);
    let v = 0;
    for (const m of notes) {
      const f = mtof(m);
      v += Math.sin(2 * Math.PI * f * x) + 0.4 * Math.sin(2 * Math.PI * f * 1.003 * x + 1);
    }
    add(s + k, v * env * 0.035 * gain, Math.sin(x * 0.7) * 0.3);
  }
}
function riser(t0, t1, gain = 1) {
  const s = Math.floor(t0 * SR), e = Math.floor(t1 * SR);
  let lp = 0;
  for (let i = s; i < e; i++) {
    const p = (i - s) / (e - s);
    lp += (noise(i) - lp) * (0.02 + p * 0.5);
    add(i, lp * p * p * 0.35 * gain, Math.sin(p * 20) * 0.4);
  }
}
function boom(t, gain = 1) {
  const s = Math.floor(t * SR);
  let ph = 0, lp = 0;
  for (let k = 0; k < SR * 2.5; k++) {
    const x = k / SR;
    ph += (2 * Math.PI * (38 + 60 * Math.exp(-x * 6))) / SR;
    lp += (noise(k) - lp) * 0.05;
    add(s + k, (Math.sin(ph) * 0.9 + lp * 0.5) * Math.exp(-x * 1.6) * gain);
  }
}

// Chords (A minor): Am – F – C – G, one bar (2s) each
const prog = [
  { root: 45, notes: [57, 60, 64] },
  { root: 41, notes: [53, 57, 60] },
  { root: 48, notes: [55, 60, 64] },
  { root: 43, notes: [55, 59, 62] },
];
const chordAt = (t) => prog[Math.floor(t / 2) % 4];

// ── Intro 0–3: pulse + hats + kick impact on the ball strike (0.6s) ──
kick(0.6, 1.3);
for (let t = 0.6; t < 3; t += BEAT / 2) hat(t, false, 0.7);
for (let t = 1.0; t < 3; t += BEAT) bass(t, 45, 0.24, 0.7);
pad(0, [57, 60, 64, 69], 3.2, 0.8);
riser(1.4, 3.0, 1.1);

// ── Groove 3–13 ──
for (let t = 3; t < 13 - 1e-6; t += BEAT) {
  const inStutter = t >= 7.5 && t < 8; // breath right before the surgeon cut
  if (!inStutter) kick(t);
  hat(t + BEAT / 2, true, 0.9);
  hat(t + BEAT / 4, false, 0.6, -0.3);
  hat(t + (3 * BEAT) / 4, false, 0.6, 0.3);
  const beatIdx = Math.round((t - 3) / BEAT);
  if (beatIdx % 2 === 1 && !inStutter) clap(t);
}
for (let t = 3; t < 13 - 1e-6; t += BEAT / 2) {
  const c = chordAt(t - 3);
  const step = Math.round((t - 3) / (BEAT / 2));
  bass(t, c.root + (step % 4 === 3 ? 12 : 0), 0.22);
}
// Arp — brighter after the surgeon cut (8s)
const arpPat = [0, 1, 2, 1, 2, 0, 2, 1];
for (let t = 3; t < 13 - 1e-6; t += BEAT / 4) {
  const c = chordAt(t - 3);
  const step = Math.round((t - 3) / (BEAT / 4));
  const m = c.notes[arpPat[step % 8]] + 12;
  const bright = t >= 8 ? 0.45 : 0.22;
  pluck(t, m, t >= 8 ? 1.15 : 0.9, bright, step % 2 ? 0.35 : -0.35);
}
for (let b = 0; b < 5; b++) pad(3 + b * 2, chordAt(b * 2).notes, 2.1, 0.7);
riser(6.0, 8.0, 0.8);
riser(11.4, 13.0, 1.2);
kick(8, 1.2);

// ── Outro 13–19.5: boom, sustained chord, heartbeat pulse, sparse pluck ──
boom(13, 1.0);
pad(13, [45, 57, 60, 64, 69], 6.5, 1.6);
for (let t = 13.5; t < 18.5; t += 1.0) { kick(t, 0.35); kick(t + 0.22, 0.22); }
[13.0, 14.0, 15.0, 16.0, 17.0].forEach((t, i) => pluck(t, [69, 72, 76, 72, 81][i], 0.8, 0.15, i % 2 ? 0.4 : -0.4));

// Normalize + write 16-bit stereo WAV
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = 0.89 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVE", 8);
buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const fade = i > N - SR * 1.5 ? (N - i) / (SR * 1.5) : 1;
  buf.writeInt16LE(Math.round(Math.tanh(L[i] * g * fade) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.tanh(R[i] * g * fade) * 32767), 46 + i * 4);
}
writeFileSync(process.argv[2] || "music-raw.wav", buf);
console.log("wrote", DUR, "s");
