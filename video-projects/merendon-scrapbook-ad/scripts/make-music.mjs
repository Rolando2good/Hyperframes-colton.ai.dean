// Original lo-fi study beat, 84 BPM, composed with Tone.js and rendered offline
// (Tone.Offline inside headless Chromium) -> public/music/bed.wav (36s).
// Arrangement cues (filter sweep, drums in/out, logo bell) come from words.json.
//
//   node scripts/make-music.mjs
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {buildCues, BEAT} from '../src/cues.ts';
import {normalizeTo, measureLufs} from './loudness.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
let chromium;
try {
  ({chromium} = require('playwright'));
} catch {
  ({chromium} = require(path.join(execFileSync('npm', ['root', '-g']).toString().trim(), 'playwright')));
}

const words = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/vo/words.json'), 'utf8'));
const all = buildCues(words);
const cues = all.music;
const DURATION_S = all.duration;
console.log('music cues', cues);

const browser = await chromium.launch();
const page = await browser.newPage();
// Seed Math.random before Tone loads so noise sources render identically every time.
await page.addInitScript(() => {
  let s = 84;
  Math.random = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
});
await page.goto('about:blank');
await page.addScriptTag({path: path.join(ROOT, 'node_modules/tone/build/Tone.js')});

const b64 = await page.evaluate(
  async ({cues, BEAT, DURATION_S}) => {
    const T = window.Tone;
    const beat = (n) => n * BEAT;
    const swing = 0.055; // lazy off-beat 8ths

    const buffer = await T.Offline(async () => {
      const master = new T.Gain(0.8).toDestination();
      // Tape wobble: 0.35Hz delay-line vibrato sized for a ±8 cent pitch swing
      // (2π·0.35Hz·2.1ms ≈ 0.46% ≈ 8 cents).
      const wobble = new T.Vibrato({frequency: 0.35, depth: 0.84, maxDelay: 0.005, type: 'sine'}).connect(master);

      // --- "overloaded" muffle: chords + crackle through an 800Hz low-pass until the comeback
      const muffle = new T.Filter({type: 'lowpass', frequency: 800, rolloff: -24, Q: 0.7}).connect(wobble);
      muffle.frequency.setValueAtTime(800, cues.filterOpen);
      muffle.frequency.exponentialRampToValueAtTime(16000, cues.filterOpen + BEAT); // opens over 1 beat

      const verb = new T.Reverb({decay: 3.2, wet: 0.22});
      await verb.generate();
      verb.connect(muffle);

      // Rhodes-ish electric piano: low-index FM + tremolo
      const trem = new T.Tremolo({frequency: 3.6, depth: 0.28, spread: 120}).start().connect(verb);
      const keys = new T.PolySynth(T.FMSynth, {
        harmonicity: 1,
        modulationIndex: 3.2,
        oscillator: {type: 'sine'},
        modulation: {type: 'sine'},
        envelope: {attack: 0.006, decay: 2.6, sustain: 0.25, release: 1.8},
        modulationEnvelope: {attack: 0.002, decay: 0.45, sustain: 0.12, release: 0.8},
        volume: -13,
      }).connect(trem);

      const bass = new T.MonoSynth({
        oscillator: {type: 'sine'},
        filter: {Q: 0.5, type: 'lowpass', rolloff: -12},
        envelope: {attack: 0.01, decay: 0.5, sustain: 0.55, release: 0.4},
        filterEnvelope: {attack: 0.01, decay: 0.3, sustain: 0.4, baseFrequency: 180, octaves: 1.5},
        volume: -11,
      }).connect(muffle);

      // Vinyl crackle loop (sparse pops over faint hiss)
      const sr = T.getContext().sampleRate;
      const len = sr * 4;
      const crackle = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        crackle[i] = (Math.random() * 2 - 1) * 0.012;
        if (Math.random() < 0.0009) {
          const amp = 0.2 + Math.random() * 0.5;
          for (let k = 0; k < 40 && i + k < len; k++) crackle[i + k] += (Math.random() * 2 - 1) * amp * Math.exp(-k / 6);
        }
      }
      const vinyl = new T.Player(T.ToneAudioBuffer.fromArray(crackle)).connect(new T.Filter(5200, 'lowpass').connect(new T.Gain(0.55).connect(muffle)));
      vinyl.loop = true;
      vinyl.start(0).stop(DURATION_S);

      // Drums: dusty (band-limited, slightly crushed), not muffled
      const drumBus = new T.Filter(6500, 'lowpass').connect(new T.Distortion(0.12).connect(new T.Gain(0.9).connect(master)));
      const kick = new T.MembraneSynth({pitchDecay: 0.045, octaves: 5, envelope: {attack: 0.001, decay: 0.42, sustain: 0, release: 0.1}, volume: -4}).connect(drumBus);
      const rimNoise = new T.NoiseSynth({noise: {type: 'pink'}, envelope: {attack: 0.001, decay: 0.09, sustain: 0}, volume: -15}).connect(new T.Filter({type: 'bandpass', frequency: 2400, Q: 1.2}).connect(drumBus));
      const rimClick = new T.Synth({oscillator: {type: 'triangle'}, envelope: {attack: 0.001, decay: 0.035, sustain: 0, release: 0.02}, volume: -14}).connect(drumBus);

      // Dm9 – G13 – Cmaj9 – Am7, two bars each
      const prog = [
        {bass: 'D2', notes: ['F3', 'A3', 'C4', 'E4']},
        {bass: 'G2', notes: ['F3', 'B3', 'E4', 'A4']},
        {bass: 'C2', notes: ['E3', 'G3', 'B3', 'D4']},
        {bass: 'A2', notes: ['G3', 'C4', 'E4', 'A4']},
      ];
      const totalBeats = Math.floor(DURATION_S / BEAT);
      const drumsOutBeat = Math.round(cues.drumsOut / BEAT);
      for (let b = 0; b < drumsOutBeat; b += 8) {
        const c = prog[(b / 8) % 4];
        const t0 = beat(b);
        keys.triggerAttackRelease(c.notes, beat(5.5), t0, 0.62);
        keys.triggerAttackRelease(c.notes.slice(1), beat(1.5), beat(b + 6.5) + swing, 0.38);
        bass.triggerAttackRelease(c.bass, beat(1.4), t0, 0.8);
        bass.triggerAttackRelease(c.bass, beat(0.8), beat(b + 2.5) + swing, 0.55);
        bass.triggerAttackRelease(c.bass, beat(1.4), beat(b + 4), 0.75);
      }
      // 30s+: drums drop out, the chord rings, bell on the logo
      const ring = prog[2];
      keys.triggerAttackRelease(ring.notes, DURATION_S - cues.drumsOut, cues.drumsOut, 0.6);
      bass.triggerAttackRelease(ring.bass, 3.5, cues.drumsOut, 0.6);

      const drumsInBeat = Math.round(cues.drumsIn / BEAT);
      for (let b = drumsInBeat; b < drumsOutBeat; b++) {
        const pos = b % 4;
        const t = beat(b);
        if (pos === 0) kick.triggerAttackRelease('C1', '8n', t, 0.95);
        if (pos === 1 || pos === 3) {
          rimNoise.triggerAttackRelease(0.08, t, 0.8);
          rimClick.triggerAttackRelease('A5', 0.03, t, 0.6);
        }
        if (pos === 1 && b % 8 === 5) kick.triggerAttackRelease('C1', '16n', beat(b + 0.5) + swing, 0.55);
        if (pos === 2) kick.triggerAttackRelease('C1', '8n', beat(b + 0.5) + swing, 0.8);
      }

      const bell = new T.FMSynth({
        harmonicity: 3.01,
        modulationIndex: 9,
        envelope: {attack: 0.001, decay: 3.5, sustain: 0, release: 2},
        modulationEnvelope: {attack: 0.001, decay: 1.2, sustain: 0, release: 1},
        volume: -9,
      }).connect(verb);
      bell.triggerAttackRelease('E6', 3, cues.bell, 0.8);
      bell.triggerAttackRelease('B6', 2.5, cues.bell + 0.012, 0.35);

      master.gain.setValueAtTime(0.8, DURATION_S - 0.6);
      master.gain.linearRampToValueAtTime(0, DURATION_S);
      void totalBeats;
    }, DURATION_S, 2, 44100);

    // ToneAudioBuffer -> 16-bit PCM WAV -> base64
    const chans = [buffer.getChannelData(0), buffer.getChannelData(1)];
    const n = chans[0].length;
    const ab = new ArrayBuffer(44 + n * 4);
    const dv = new DataView(ab);
    const str = (o, s) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
    str(0, 'RIFF'); dv.setUint32(4, 36 + n * 4, true); str(8, 'WAVE'); str(12, 'fmt ');
    dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true);
    dv.setUint32(24, 44100, true); dv.setUint32(28, 44100 * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true);
    str(36, 'data'); dv.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) dv.setInt16(44 + i * 4 + c * 2, Math.max(-1, Math.min(1, chans[c][i])) * 32767, true);
    let bin = '';
    const bytes = new Uint8Array(ab);
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  },
  {cues, BEAT, DURATION_S},
);
await browser.close();

const raw = path.join(ROOT, 'public/music/.bed-raw.wav');
fs.writeFileSync(raw, Buffer.from(b64, 'base64'));
// Bed level: -28 LUFS unducked => with the 6dB duck it sits ~18 LU under the -16 LUFS voice.
const bed = path.join(ROOT, 'public/music/bed.wav');
normalizeTo(raw, bed, -28, ['-ar', '48000', '-t', String(DURATION_S)]);
console.log('bed loudness', measureLufs(bed));
fs.unlinkSync(raw);
console.log('wrote public/music/bed.wav');
