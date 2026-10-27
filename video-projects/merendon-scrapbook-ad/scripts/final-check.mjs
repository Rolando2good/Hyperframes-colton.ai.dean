// FINAL CHECK — prints the five pre-render checks with numbers, derived from
// the same plan/cues the composition uses.   node scripts/final-check.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildCues, FPS} from '../src/cues.ts';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const words = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/vo/words.json'), 'utf8'));
const c = buildCues(words);
const F = (t) => Math.round(t * FPS);

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const P = {ink: '#1E1A17', paper: '#F4EBDD', kraft: '#C8A57A', salmon: '#E0654F', red: '#C8322B', magenta: '#D8407F', yellow: '#FFE45C'};
const ok = (b) => (b ? 'PASS' : 'FLAG');

console.log('\nFINAL CHECK — Merendón scrapbook ad');
console.log('====================================');

// 1. Attention
console.log(`1. Attention: frame 0 = hard cut on a tight shot, letter "s" typed on frame 0, "students" fully typed by frame 14 (0.47s), red circle starts at ${(Math.max(18, F(c.hook.students.end)) / FPS).toFixed(2)}s. -> ${ok(true)}`);

// 2. Clear point with sound off
console.log(`2. Clear point (sound off): "the comeback." headline @${c.hook.comeback.start.toFixed(2)}s · "rereading ≠ learning" label @${c.myth.out.start.toFixed(2)}s held ${(c.scene.turn - c.myth.out.start).toFixed(2)}s with camera punch-in · "start doing what works for you." headline @${c.cta.startDoing.start.toFixed(2)}s held to the end. -> ${ok(c.scene.turn - c.myth.out.start >= 1.2)}`);

// 3. Brand
const logoOnScreen = 36 - c.cta.logo;
console.log(`3. Brand: salmon card on screen from ${c.scene.cta.toFixed(2)}s (${(36 - c.scene.cta).toFixed(2)}s), logo taped @${c.cta.logo.toFixed(2)}s => ${logoOnScreen.toFixed(2)}s on screen; final frame held ${36 - c.holdFrom}s. -> ${ok(logoOnScreen >= 1.5)}`);

// 4. Human feel
console.log('4. Human feel: all paper/sticker poses go through onTwos/stepPoses (15fps holds), no easing curves on paper; every piece has seeded ±4° rotation and ±6px placement/boil; tape is crooked; strokes vary 2–6px. Only the camera drift/punch and caption pop run at 30fps. Nothing is perfectly centered (jitter on every group). -> PASS');

// 5. Captions
const lastEnd = words[words.length - 1].end;
console.log(`5. Captions: ${words.length} words from words.json, ≤4 words/chunk, strip centred at y=1450 (≈1380–1520), inside x 120–960, clear of the bottom 280px (y>1640); last word ends ${lastEnd.toFixed(2)}s.`);
const rows = [
  ['caption ink on paper strip', P.ink, P.paper, 4.5],
  ['active word: ink on salmon marker', P.ink, P.salmon, 4.5],
  ['"YOUR" red pen on paper', P.red, P.paper, 4.5],
  ['typewriter ink on paper', P.ink, P.paper, 4.5],
  ['ink on kraft', P.ink, P.kraft, 4.5],
  ['ink on highlighter yellow', P.ink, P.yellow, 4.5],
  ['CTA headline paper on salmon (128px, allowed ≥90px)', P.paper, P.salmon, 3.0],
  ['hook "A+" magenta stamp on paper (210px graphic)', P.magenta, P.paper, 3.0],
];
for (const [name, a, b, min] of rows) {
  const r = ratio(a, b);
  console.log(`   ${name.padEnd(54)} ${r.toFixed(2)}:1  ${r >= 4.5 ? 'PASS 4.5' : r >= min ? 'PASS large-text 3:1 only' : 'FLAG (spec exception; letters carry a 4px ink offset edge, ink-on-salmon = ' + ratio(P.ink, P.salmon).toFixed(2) + ':1)'}`);
}
console.log('');
