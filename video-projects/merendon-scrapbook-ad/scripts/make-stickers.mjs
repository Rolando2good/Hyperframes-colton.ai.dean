// Original die-cut sticker art -> public/stickers/*.svg
// Every sticker carries its own 10px white die-cut border (feMorphology dilate).
// Shapes are hand-wobbled with a seeded PRNG so re-running is deterministic.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'public/stickers');
fs.mkdirSync(OUT, {recursive: true});

const INK = '#1E1A17', SALMON = '#E0654F', PAPER = '#F4EBDD', RED = '#C8322B', YEL = '#FFE45C';
const GREEN = '#1F8A5B', GREEN_D = '#156B45', RULE = '#A9C1D9', KRAFT = '#C8A57A';

let seed = 1;
const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const j = (a) => (rnd() * 2 - 1) * a;

// closed wobbly blob through points, smoothed with quadratic midpoints
function blob(pts, wob = 3) {
  const p = pts.map(([x, y]) => [x + j(wob), y + j(wob)]);
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = `M${mid(p[p.length - 1], p[0]).map((v) => v.toFixed(1)).join(' ')}`;
  for (let i = 0; i < p.length; i++) {
    const m = mid(p[i], p[(i + 1) % p.length]);
    d += ` Q${p[i][0].toFixed(1)} ${p[i][1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
  }
  return d + 'Z';
}
const ellipse = (cx, cy, rx, ry, n = 14, wob = 2.5, rot = 0) =>
  blob(Array.from({length: n}, (_, i) => { const a = (i / n) * Math.PI * 2 + rot; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; }), wob);
// open stroke with a little wobble
const line = (pts, wob = 1.5) => 'M' + pts.map(([x, y]) => `${(x + j(wob)).toFixed(1)} ${(y + j(wob)).toFixed(1)}`).join(' L');
const curve = (pts, wob = 1.5) => {
  const p = pts.map(([x, y]) => [x + j(wob), y + j(wob)]);
  let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for (let i = 1; i < p.length - 1; i++) { const m = [(p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2]; d += ` Q${p[i][0].toFixed(1)} ${p[i][1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`; }
  const l = p[p.length - 1]; return d + ` L${l[0].toFixed(1)} ${l[1].toFixed(1)}`;
};

const fill = (d, c, sw = 5) => `<path d="${d}" fill="${c}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
const stroke = (d, sw = 5, c = INK) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;

const fontFace = (file, family) => `<style>@font-face{font-family:'${family}';src:url(data:font/ttf;base64,${fs.readFileSync(path.join(ROOT, 'public/fonts', file)).toString('base64')}) format('truetype');}</style>`;

function sticker(name, body, {extraDefs = ''} = {}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
<defs>${extraDefs}<filter id="diecut" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
<feMorphology in="SourceAlpha" operator="dilate" radius="10" result="grow"/>
<feFlood flood-color="#FFFDF7"/><feComposite in2="grow" operator="in" result="border"/>
<feMerge><feMergeNode in="border"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<g filter="url(#diecut)">${body}</g></svg>`;
  fs.writeFileSync(path.join(OUT, `${name}.svg`), svg);
}

// ---------- Quetzal (Merendón mascot) ----------
function quetzal(variant) {
  seed = 7; // same bird skeleton for all variants
  const tail = [
    fill(curve([[150, 270], [110, 320], [70, 372], [96, 380], [130, 330], [170, 285]], 2) + 'Z', GREEN),
    fill(curve([[165, 280], [150, 330], [140, 385], [166, 384], [172, 330], [190, 285]], 2) + 'Z', GREEN_D),
  ];
  const body = fill(ellipse(200, 222, 78, 92, 16, 3, 0.3), GREEN);
  const chest = fill(blob([[232, 170], [268, 210], [268, 262], [240, 300], [205, 305], [214, 250]], 3), RED);
  const wing = fill(blob([[150, 190], [190, 205], [205, 250], [180, 290], [140, 272], [128, 225]], 3), GREEN_D);
  const head = fill(ellipse(232, 128, 58, 54, 14, 2.5), GREEN);
  const crest = fill(blob([[188, 92], [196, 54], [214, 84], [226, 44], [240, 82], [262, 52], [266, 92], [230, 100]], 2), GREEN);
  const feet = stroke(line([[190, 310], [186, 334], [174, 340]]) + ' ' + line([[186, 334], [194, 342]]), 5) + stroke(line([[222, 308], [222, 334], [210, 342]]) + ' ' + line([[222, 334], [232, 342]]), 5);
  let beak = fill(blob([[278, 118], [318, 134], [278, 146]], 1.5), YEL);
  let eye = fill(ellipse(250, 118, 15, 16, 10, 1), '#FFFDF7', 4) + `<circle cx="253" cy="120" r="6.5" fill="${INK}"/>`;
  let extra = '';

  if (variant === 'panicking') {
    eye = fill(ellipse(250, 114, 21, 23, 12, 1.5), '#FFFDF7', 4) + `<circle cx="251" cy="114" r="3.5" fill="${INK}"/>`;
    beak = fill(blob([[276, 110], [322, 108], [284, 126]], 1.5), YEL) + fill(blob([[278, 136], [318, 152], [280, 150]], 1.5), YEL) + `<path d="M280 126 L 300 132 L 280 138Z" fill="${RED}"/>`;
    const feather = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})">${fill(blob([[0, -22], [9, -6], [6, 16], [0, 22], [-6, 16], [-9, -6]], 1.5), GREEN, 4)}${stroke(line([[0, -18], [0, 20]], 0.5), 3)}</g>`;
    extra = feather(70, 90, -30) + feather(330, 220, 40) + feather(96, 180, 20) + feather(320, 300, -60) + feather(130, 50, 70) + feather(300, 50, -20)
      + stroke(line([[340, 80], [372, 62]]), 6) + stroke(line([[346, 110], [380, 108]]), 6) + stroke(line([[60, 140], [28, 126]]), 6)
      + fill(blob([[360, 140], [372, 140], [368, 176], [362, 176]], 1), RED, 3) + `<circle cx="365" cy="190" r="6" fill="${RED}" stroke="${INK}" stroke-width="3"/>`;
  }
  if (variant === 'sweating') {
    extra = stroke(curve([[232, 92], [250, 86], [268, 96]]), 5)
      + [[190, 108, 1], [178, 150, 0.8], [296, 82, 0.9]].map(([x, y, s]) => fill(`M${x} ${y - 22 * s} Q ${x + 14 * s} ${y} ${x} ${y + 10 * s} Q ${x - 14 * s} ${y} ${x} ${y - 22 * s}Z`, RULE, 4)).join('');
    eye = fill(ellipse(250, 120, 15, 16, 10, 1), '#FFFDF7', 4) + `<circle cx="248" cy="126" r="6" fill="${INK}"/>`;
  }
  if (variant === 'side-eye') {
    eye = fill(ellipse(250, 120, 17, 13, 10, 1), '#FFFDF7', 4) + `<circle cx="261" cy="122" r="6" fill="${INK}"/>` + fill(blob([[232, 110], [268, 108], [268, 118], [232, 120]], 0.6), GREEN_D, 4);
    beak = fill(blob([[278, 122], [318, 132], [278, 142]], 1), YEL);
  }
  if (variant === 'sunglasses') {
    eye = fill(blob([[226, 104], [282, 100], [280, 126], [258, 136], [232, 128]], 1.5), INK, 4)
      + stroke(line([[236, 110], [252, 108]], 0.5), 4, '#FFFDF7') + stroke(line([[226, 108], [196, 112]]), 5);
    extra = stroke(curve([[282, 150], [292, 158], [304, 152]]), 4);
  }
  if (variant === 'nodding') {
    eye = stroke(curve([[238, 122], [250, 110], [262, 122]], 0.5), 5);
    extra = `<ellipse cx="236" cy="142" rx="10" ry="6" fill="${SALMON}" opacity="0.85"/>`
      + fill(blob([[330, 60], [337, 80], [358, 82], [341, 94], [348, 114], [330, 102], [312, 114], [319, 94], [302, 82], [323, 80]], 1), YEL, 4)
      + stroke(line([[70, 120], [52, 104]]), 5) + stroke(line([[66, 150], [42, 150]]), 5);
  }
  return [...tail, body, wing, chest, feet, crest, head, eye, beak, extra].join('\n');
}
for (const v of ['panicking', 'sweating', 'side-eye', 'sunglasses', 'nodding']) sticker(`quetzal-${v}`, quetzal(v));

// ---------- Study stickers ----------
seed = 21;
sticker('mug-cracked',
  fill(blob([[268, 170], [326, 176], [330, 232], [272, 268]], 3), 'none', 14).replace('fill="none"', 'fill="none"')
  + fill(blob([[100, 140], [280, 140], [272, 330], [240, 352], [140, 352], [108, 330]], 3), PAPER)
  + fill(blob([[104, 200], [278, 200], [276, 250], [106, 250]], 2), SALMON, 4)
  + fill(ellipse(190, 142, 90, 16, 14, 1.5), '#5A3A22', 5)
  + stroke(line([[176, 140], [196, 190], [172, 226], [204, 268], [184, 306], [206, 352]], 1), 5)
  + stroke(line([[196, 190], [222, 204]], 1), 4) + stroke(line([[204, 268], [230, 276]], 1), 4)
  + stroke(curve([[160, 110], [148, 86], [166, 64], [154, 40]]), 5) + stroke(curve([[214, 112], [202, 88], [220, 66], [208, 44]]), 5));

seed = 22;
sticker('alarm-clock',
  fill(ellipse(118, 112, 34, 28, 10, 2, -0.6), RED) + fill(ellipse(282, 112, 34, 28, 10, 2, 0.6), RED)
  + stroke(line([[150, 330], [130, 362]]), 7) + stroke(line([[250, 330], [270, 362]]), 7)
  + fill(ellipse(200, 228, 118, 118, 18, 3), RED) + fill(ellipse(200, 228, 92, 92, 16, 2), PAPER)
  + [0, 1, 2, 3].map((i) => { const a = i * Math.PI / 2; return stroke(line([[200 + Math.cos(a) * 72, 228 + Math.sin(a) * 72], [200 + Math.cos(a) * 84, 228 + Math.sin(a) * 84]], 0.5), 5); }).join('')
  + stroke(line([[200, 228], [200, 168]]), 7) + stroke(line([[200, 228], [244, 250]]), 6)
  + `<circle cx="200" cy="228" r="7" fill="${INK}"/>`
  + stroke(line([[40, 190], [16, 180]]), 6) + stroke(line([[36, 232], [10, 234]]), 6) + stroke(line([[360, 190], [384, 180]]), 6) + stroke(line([[364, 232], [390, 234]]), 6)
  + stroke(curve([[56, 80], [40, 60], [54, 40]]), 5) + stroke(curve([[344, 80], [360, 60], [346, 40]]), 5));

const bric = fontFace('BricolageGrotesque-Bold.ttf', 'Bric');
seed = 23;
sticker('badge-2am',
  fill(blob(Array.from({length: 24}, (_, i) => { const a = (i / 24) * Math.PI * 2; const r = i % 2 ? 150 : 172; return [200 + Math.cos(a) * r, 200 + Math.sin(a) * r]; }), 2), INK, 5)
  + fill(ellipse(200, 200, 128, 128, 16, 2), SALMON, 4)
  + `<text x="200" y="236" text-anchor="middle" font-family="Bric" font-size="112" fill="${INK}" transform="rotate(-6 200 200)">2AM</text>`
  + `<text x="200" y="290" text-anchor="middle" font-family="Bric" font-size="30" fill="${INK}" transform="rotate(-6 200 200)">still awake</text>`,
  {extraDefs: bric});

seed = 24;
const pen = (x, y, rot, c) => `<g transform="translate(${x} ${y}) rotate(${rot})">${fill(blob([[-120, -30], [80, -30], [80, 30], [-120, 30]], 2), c)}${fill(blob([[80, -26], [120, -26], [120, 26], [80, 26]], 1.5), PAPER, 4)}${fill(blob([[120, -14], [150, -6], [150, 6], [120, 14]], 1), c, 4)}${stroke(line([[-90, -10], [40, -10]], 0.5), 4, '#FFFDF7')}</g>`;
sticker('highlighters', pen(190, 250, -12, YEL) + pen(200, 190, -4, SALMON) + pen(210, 130, 6, GREEN));

seed = 25;
const star = Array.from({length: 10}, (_, i) => { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2; const r = i % 2 ? 72 : 165; return [200 + Math.cos(a) * r, 208 + Math.sin(a) * r]; });
sticker('gold-star', fill(blob(star, 2.5).replace(/Q/g, 'L').replace(/ L([\d.]+ [\d.]+) ([\d.]+ [\d.]+)/g, ' L$1'), YEL, 6)
  + fill(blob([[200, 100], [222, 160], [200, 150], [178, 160]], 1).replace(/Q/g, 'L').replace(/ L([\d.]+ [\d.]+) ([\d.]+ [\d.]+)/g, ' L$1'), '#FFF6B8', 0)
  + stroke(curve([[176, 236], [200, 252], [224, 236]]), 5) + `<circle cx="178" cy="206" r="7" fill="${INK}"/><circle cx="222" cy="206" r="7" fill="${INK}"/>`);

seed = 26;
sticker('a-plus',
  fill(blob(Array.from({length: 20}, (_, i) => { const a = (i / 20) * Math.PI * 2; const r = i % 2 ? 152 : 168; return [200 + Math.cos(a) * r, 200 + Math.sin(a) * r]; }), 2), SALMON, 5)
  + fill(ellipse(200, 200, 132, 132, 16, 2), PAPER, 4)
  + `<text x="196" y="262" text-anchor="middle" font-family="Bric" font-size="176" fill="${RED}" transform="rotate(-8 200 200)">A+</text>`,
  {extraDefs: bric});

seed = 27;
sticker('lightning', fill(blob([[226, 30], [110, 214], [190, 214], [150, 372], [296, 160], [214, 160], [262, 30]], 2).replace(/Q/g, 'L').replace(/ L([\d.]+ [\d.]+) ([\d.]+ [\d.]+)/g, ' L$1'), YEL, 7)
  + stroke(line([[96, 110], [70, 96]]), 6) + stroke(line([[312, 250], [340, 262]]), 6));

seed = 28;
sticker('heart', fill('M200 352 C 120 290 52 236 60 160 C 66 104 130 78 172 112 C 186 122 194 134 200 146 C 208 128 222 112 244 102 C 300 80 352 118 342 178 C 334 240 268 296 200 352Z', SALMON, 7)
  + stroke(curve([[108, 150], [116, 128], [138, 118]]), 6, '#FFFDF7'));

console.log('stickers:', fs.readdirSync(OUT).join(', '));
