// Cinematic score for "Knowledge Is The Foundation" — 21s, A minor, trailer style.
// Deterministic synth (seeded noise) → raw stereo WAV; post-processed with ffmpeg.
//   0.00 braam + sub hit · 0.55/0.70/0.85/0.95 floodlight clunks · riser into 1.55 IMPACT
//   1.6–2.9 slow-mo swell + crowd build · 2.9 GOAL drop: drums, bass, arp, crowd roar
//   9.4 braam → heartbeat + tense strings · 14.4 boom → wide chord under the voiceover
import { writeFileSync } from "node:fs";

const SR = 48000;
const DUR = 21.0;
const N = Math.floor(SR * DUR);
const L = new Float32Array(N);
const R = new Float32Array(N);

let seed = 2024;
const rand = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const noiseBuf = new Float32Array(SR * 3).map(() => rand() * 2 - 1);
const noise = (i) => noiseBuf[((i % noiseBuf.length) + noiseBuf.length) % noiseBuf.length];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const add = (i, v, pan = 0) => {
  if (i < 0 || i >= N) return;
  L[i] += v * (1 - Math.max(0, pan));
  R[i] += v * (1 + Math.min(0, pan));
};

function kick(t, g = 1, tone = 1) {
  const s = Math.floor(t * SR);
  let ph = 0;
  for (let k = 0; k < SR * 0.5; k++) {
    const x = k / SR;
    ph += (2 * Math.PI * (42 + 140 * tone * Math.exp(-x * 30))) / SR;
    add(s + k, (Math.sin(ph) * Math.exp(-x * 6.5) + (k < 140 ? noise(k) * 0.35 * (1 - k / 140) : 0)) * g);
  }
}
function tom(t, g = 1, f0 = 90) {
  const s = Math.floor(t * SR);
  let ph = 0;
  for (let k = 0; k < SR * 0.6; k++) {
    const x = k / SR;
    ph += (2 * Math.PI * (f0 + 60 * Math.exp(-x * 18))) / SR;
    add(s + k, (Math.sin(ph) * 0.9 + noise(s + k) * 0.15 * Math.exp(-x * 30)) * Math.exp(-x * 5) * g, (f0 - 90) / 120);
  }
}
function hat(t, open, g = 1, pan = 0.2) {
  const s = Math.floor(t * SR);
  let prev = 0;
  for (let k = 0; k < SR * (open ? 0.2 : 0.05); k++) {
    const n = noise(s + k * 7), hp = n - prev; prev = n;
    add(s + k, hp * Math.exp(-(k / SR) * (open ? 20 : 75)) * 0.11 * g, pan);
  }
}
function clap(t, g = 1) {
  const s = Math.floor(t * SR);
  for (let k = 0; k < SR * 0.3; k++) {
    const x = k / SR, burst = x < 0.03 ? (Math.floor(x / 0.009) % 2 ? 0.5 : 1) : 1;
    add(s + k, noise(s + k * 3) * Math.exp(-x * 14) * 0.26 * burst * g, -0.1);
  }
}
function snare(t, g = 1) {
  const s = Math.floor(t * SR);
  for (let k = 0; k < SR * 0.18; k++) {
    const x = k / SR;
    add(s + k, (noise(s + k * 5) * 0.5 + Math.sin(2 * Math.PI * 190 * x) * 0.4) * Math.exp(-x * 22) * 0.3 * g);
  }
}
function bass(t, m, len, g = 1) {
  const s = Math.floor(t * SR), f = mtof(m);
  let lp = 0;
  for (let k = 0; k < SR * len; k++) {
    const x = k / SR, saw = 2 * ((x * f) % 1) - 1;
    lp += (saw - lp) * 0.07;
    const env = Math.min(1, x / 0.004) * Math.exp(-x * 2.4) * (x > len - 0.02 ? (len - x) / 0.02 : 1);
    add(s + k, (lp * 0.4 + Math.sin(2 * Math.PI * f * x) * 0.6) * env * 0.4 * g);
  }
}
function pluck(t, m, g = 1, bright = 0.3, pan = 0) {
  const s = Math.floor(t * SR), f = mtof(m);
  let lp = 0;
  for (let k = 0; k < SR * 0.45; k++) {
    const x = k / SR, sq = (x * f) % 1 < 0.5 ? 1 : -1;
    lp += (sq - lp) * (bright * Math.exp(-x * 9) + 0.02);
    add(s + k, lp * Math.exp(-x * 8) * 0.085 * g, pan);
  }
}
// Detuned saw "braaam" — the trailer horn
function braam(t, notes, len, g = 1) {
  const s = Math.floor(t * SR);
  const lps = notes.map(() => [0, 0]);
  for (let k = 0; k < SR * len; k++) {
    const x = k / SR;
    const env = Math.min(1, x / 0.05) * Math.exp(-x * (2.2 / len)) * Math.min(1, (len - x) / 0.4);
    const cut = 0.02 + 0.12 * Math.exp(-x * 1.4);
    let vl = 0, vr = 0;
    notes.forEach((m, j) => {
      const f = mtof(m);
      const a = 2 * ((x * f * 0.997) % 1) - 1, b = 2 * ((x * f * 1.004) % 1) - 1;
      lps[j][0] += (a - lps[j][0]) * cut; lps[j][1] += (b - lps[j][1]) * cut;
      vl += lps[j][0]; vr += lps[j][1];
    });
    add(s + k, vl * env * 0.16 * g, -0.4); add(s + k, vr * env * 0.16 * g, 0.4);
  }
}
function pad(t, notes, len, g = 1) {
  const s = Math.floor(t * SR);
  for (let k = 0; k < SR * len; k++) {
    const x = k / SR, env = Math.min(1, x / 0.8) * Math.min(1, (len - x) / 1.4);
    let v = 0;
    for (const m of notes) { const f = mtof(m); v += Math.sin(2 * Math.PI * f * x) + 0.45 * Math.sin(2 * Math.PI * f * 1.004 * x + 1) + 0.2 * Math.sin(4 * Math.PI * f * x); }
    add(s + k, v * env * 0.03 * g, Math.sin(x * 0.6) * 0.35);
  }
}
function strings(t, notes, len, g = 1) {
  const s = Math.floor(t * SR);
  const lp = notes.map(() => 0);
  for (let k = 0; k < SR * len; k++) {
    const x = k / SR, env = Math.min(1, x / 1.6) * Math.min(1, (len - x) / 0.5);
    const vib = 1 + 0.004 * Math.sin(2 * Math.PI * 5.2 * x);
    let v = 0;
    notes.forEach((m, j) => { const saw = 2 * ((x * mtof(m) * vib) % 1) - 1; lp[j] += (saw - lp[j]) * 0.05; v += lp[j]; });
    add(s + k, v * env * 0.07 * g, Math.sin(x * 1.3) * 0.3);
  }
}
function riser(t0, t1, g = 1) {
  const s = Math.floor(t0 * SR), e = Math.floor(t1 * SR);
  let lp = 0, ph = 0;
  for (let i = s; i < e; i++) {
    const p = (i - s) / (e - s);
    lp += (noise(i) - lp) * (0.02 + p * 0.5);
    ph += (2 * Math.PI * (200 + 1800 * p * p)) / SR;
    add(i, (lp * 0.35 + Math.sin(ph) * 0.06) * p * p * g, Math.sin(p * 24) * 0.4);
  }
}
function boom(t, g = 1, len = 2.6) {
  const s = Math.floor(t * SR);
  let ph = 0, lp = 0;
  for (let k = 0; k < SR * len; k++) {
    const x = k / SR;
    ph += (2 * Math.PI * (34 + 70 * Math.exp(-x * 7))) / SR;
    lp += (noise(k + s) - lp) * (0.25 * Math.exp(-x * 3) + 0.02);
    add(s + k, (Math.sin(ph) * 0.95 + lp * 0.7) * Math.exp(-x * 1.5) * g);
  }
}
function clunk(t, g = 1) { // stadium floodlight switching on
  const s = Math.floor(t * SR);
  let ph = 0;
  for (let k = 0; k < SR * 0.9; k++) {
    const x = k / SR;
    ph += (2 * Math.PI * (60 + 30 * Math.exp(-x * 20))) / SR;
    add(s + k, (Math.sin(ph) * Math.exp(-x * 4) * 0.8 + noise(s + k * 2) * Math.exp(-x * 40) * 0.6) * g);
  }
}
function beep(t, g = 1) {
  const s = Math.floor(t * SR);
  for (let k = 0; k < SR * 0.12; k++) { const x = k / SR; add(s + k, Math.sin(2 * Math.PI * 1046 * x) * Math.min(1, x / 0.003) * Math.exp(-x * 25) * 0.18 * g, 0.3); }
}
// Crowd: band-limited noise, slow "roar" modulation, envelope by time
function crowd(t0, t1, envFn, g = 1) {
  const s = Math.floor(t0 * SR), e = Math.floor(t1 * SR);
  let b1 = 0, b2 = 0, c1 = 0, c2 = 0;
  for (let i = s; i < e; i++) {
    const tt = i / SR;
    const n = noise(i * 3 + 11);
    b1 += (n - b1) * 0.18; b2 += (b1 - b2) * 0.18; // lowpass
    const band = b1 - b2 * 0.9;
    const n2 = noise(i * 5 + 77); c1 += (n2 - c1) * 0.1; c2 += (c1 - c2) * 0.1;
    const mod = 0.75 + 0.25 * Math.sin(tt * 7.3) * Math.sin(tt * 3.1 + 1);
    const v = (band * 0.9 + (c1 - c2) * 0.6) * envFn(tt) * mod * 0.9 * g;
    add(i, v, -0.25); add(i, (band * 0.6 + (c2 - c1) * 0.8) * envFn(tt) * mod * 0.9 * g, 0.25);
  }
}

// ── 0 – 1.55 · cold open ──
boom(0.0, 0.9, 1.6);
braam(0.0, [33, 45, 52], 1.4, 1.1);
[0.55, 0.7, 0.85, 0.95].forEach((t, i) => clunk(t, 0.75 + i * 0.05));
for (let t = 0.55; t < 1.55; t += 0.125) hat(t, false, 0.6 + (t - 0.55) * 0.6);
kick(1.0, 0.6); kick(1.25, 0.7); kick(1.4, 0.8);
riser(0.9, 1.55, 1.2);
// ── 1.55 · IMPACT ──
boom(1.55, 1.25, 2.2); kick(1.55, 1.2); clap(1.55, 1.3);
// slow-mo swell 1.6–2.9
pad(1.6, [57, 60, 64, 69], 1.6, 1.1);
riser(2.1, 2.9, 1.0);
crowd(1.6, 6.2, (x) => (x < 2.9 ? 0.15 + 0.35 * ((x - 1.6) / 1.3) : x < 3.9 ? 1.0 : Math.max(0, 1 - (x - 3.9) / 2.2) * 0.8 + 0.05), 1.0);
// ── 2.9 · GOAL drop → groove until 9.4 (120 BPM) ──
boom(2.9, 1.0, 1.8); braam(2.9, [45, 52, 57], 1.2, 0.8);
const prog = [{ root: 45, notes: [57, 60, 64] }, { root: 41, notes: [53, 57, 60] }, { root: 48, notes: [55, 60, 64] }, { root: 43, notes: [55, 59, 62] }];
const chordAt = (t) => prog[Math.floor((t - 2.9) / 2) % 4];
for (let t = 2.9; t < 9.4 - 1e-6; t += 0.5) {
  const bi = Math.round((t - 2.9) / 0.5);
  kick(t, 1);
  if (bi % 2 === 1) clap(t, 0.9);
  hat(t + 0.25, true, 0.8);
  hat(t + 0.125, false, 0.5, -0.3); hat(t + 0.375, false, 0.5, 0.3);
  if (bi % 4 === 3) { tom(t + 0.25, 0.7, 120); tom(t + 0.375, 0.7, 90); }
}
for (let t = 2.9; t < 9.4 - 1e-6; t += 0.25) {
  const c = chordAt(t), st = Math.round((t - 2.9) / 0.25);
  bass(t, c.root + (st % 4 === 3 ? 12 : 0), 0.2);
}
const arp = [0, 1, 2, 1, 2, 0, 2, 1];
for (let t = 2.9; t < 9.4 - 1e-6; t += 0.125) {
  const c = chordAt(t), st = Math.round((t - 2.9) / 0.125);
  pluck(t, c.notes[arp[st % 8]] + 12, 0.9, t > 6.9 ? 0.45 : 0.25, st % 2 ? 0.35 : -0.35);
}
for (let b = 0; b < 4; b++) pad(2.9 + b * 2, chordAt(2.9 + b * 2).notes, 2.1, 0.6);
// snare roll build into the surgeon cut
for (let k = 0; k < 16; k++) snare(8.4 + k * 0.0625, 0.4 + k * 0.05);
riser(8.2, 9.4, 1.1);
// ── 9.4 · operating room: braam, heartbeat, tense strings, monitor beeps ──
braam(9.4, [33, 40, 45], 2.8, 1.0); boom(9.4, 0.8, 1.6);
strings(9.6, [57, 60, 64, 69], 4.8, 1.0);
strings(11.8, [58, 62, 65], 2.6, 0.6);
for (let t = 9.6; t < 14.4; t += 0.8333) { kick(t, 0.75, 0.6); kick(t + 0.2, 0.5, 0.6); beep(t + 0.05, 1); }
for (let t = 9.6; t < 14.4; t += 0.4167) hat(t, false, 0.35, 0.5);
riser(13.3, 14.4, 1.3);
// ── 14.4 · foundation: boom + wide chord, sparse plucks under the voice ──
boom(14.4, 1.3, 3); kick(14.4, 1.1); braam(14.4, [36, 43, 48], 3.0, 0.7);
pad(14.4, [48, 55, 60, 64, 67, 74], 6.6, 1.5);
strings(14.6, [60, 64, 67, 72], 6.2, 0.55);
[14.5, 14.62, 14.74, 14.86].forEach((t) => tom(t, 0.5, 70));
[15.3, 16.5, 17.7, 18.9].forEach((t, i) => pluck(t, [72, 76, 79, 84][i], 0.7, 0.15, i % 2 ? 0.4 : -0.4));
for (let t = 15.0; t < 20.2; t += 1.2) kick(t, 0.25, 0.5);

// Normalize + write 16-bit stereo WAV
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const gn = 0.95 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVE", 8);
buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const fade = i > N - SR * 1.2 ? (N - i) / (SR * 1.2) : 1;
  buf.writeInt16LE(Math.round(Math.tanh(L[i] * gn * 1.3 * fade) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.tanh(R[i] * gn * 1.3 * fade) * 32767), 46 + i * 4);
}
writeFileSync(process.argv[2] || "music-raw.wav", buf);
console.log("wrote", DUR, "s");
