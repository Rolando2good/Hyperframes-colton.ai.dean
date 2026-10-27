// The edit decision list: every visual event and every SFX, in absolute
// frames, derived from words.json via cues.ts. Scenes read their timing from
// here and the soundtrack is generated from the same numbers, so picture and
// sound can never drift apart.
import {BEAT, FPS, buildCues, snapToBeat, type Word} from './cues';
import {hash} from './lib/rand';

const F = (t: number) => Math.round(t * FPS);
// Keep an event far enough before the next cut that it actually reads on screen.
const before = (f: number, cut: number, margin = 10) => Math.min(f, cut - margin);

export type SfxName =
  | 'paper_rip' | 'tape_stick' | 'tape_tear' | 'pencil_scribble' | 'marker_squeak' | 'stamp_thud'
  | 'page_flip' | 'paper_crumple' | 'camera_shutter' | 'pop_sticker' | 'typewriter_clack' | 'bell_ding';
export type SfxEvent = {at: number; name: SfxName; volume?: number};
export type Shot = {at: number; scale: number; cx: number; cy: number};

export type Plan = ReturnType<typeof buildPlan>;

// Layout anchors shared by the scene and the camera.
export const HOOK_WORD = {x: 250, y: 560}; // where "students" is typed (screen space at scale 1)
export const MYTH_LABEL = {x: 540, y: 760};
export const URL_TEXT = 'merendonarchive.com · start free';
export const LABEL_TEXT = 'rereading ≠ learning';

export function buildPlan(words: Word[]) {
  const c = buildCues(words);
  const w = (i: number) => F(words[i].start);

  const scene = {
    hook: 0,
    myth: F(c.scene.myth),
    turn: F(c.scene.turn),
    tabs: F(c.scene.turnTabs),
    payoff: F(c.scene.payoff),
    cta: F(c.scene.cta),
    hold: F(c.holdFrom),
    end: F(c.duration),
  };

  // ---------- 1. HOOK ----------
  const typeLetters = 'students'.length;
  const circleAt = Math.max(typeLetters * 2 + 2, F(c.hook.students.end));
  const wideAt = Math.max(circleAt + 12, F(snapToBeat(c.hook.overloaded.start) - BEAT));
  const pileStart = F(c.hook.overloaded.start);
  const sweepAt = F(c.hook.comeback.start);
  const hook = {
    letterEvery: 2,
    circleAt,
    wideAt,
    pileStart,
    pileEvery: 4,
    pileCount: 9,
    badgeAt: pileStart + 4 * 4 + 2,
    quetzalAt: F(c.hook.moment.start),
    sweepAt,
    headlineAt: sweepAt + 4,
    swipeAt: sweepAt + 10,
    cardAt: w(c.hook.comeback.i + 1), // "of"
    crossAt: F(c.hook.century.start),
    stampAt: Math.min(F(c.hook.next.start) - 4, scene.myth - 16),
  };

  // ---------- 2. MYTH ----------
  const hlFrom = F(c.myth.rereading.start);
  const hlTo = F(c.myth.burning.start) - 2;
  const myth = {
    at: scene.myth,
    headerAt: scene.myth + 6,
    highlights: Array.from({length: 18}, (_, i) => Math.round(hlFrom + ((hlTo - hlFrom) * i) / 17)),
    quetzalAt: F(c.myth.notes.start),
    mugAt: F(c.myth.burning.start),
    clockAt: F(c.myth.burning.start) + 4,
    rattleTo: F(c.myth.out.end) + 8,
    strikeAt: F(c.myth.themselves.start),
    labelAt: F(c.myth.out.start),
  };

  // ---------- 3. TURN ----------
  // cards start sorting the moment the scene lands (fast pace: no idle stack)
  const sortStart = scene.turn + 4;
  const sel = c.turn.select.i;
  const turn = {
    at: scene.turn,
    cardsAt: [0, 1, 2].map((i) => Math.round(sortStart + (i * (F(c.turn.manageable.end) - sortStart)) / 2)),
    highlightersAt: F(c.turn.information.start),
    cardChecksAt: [0, 1, 2].map((k) => F(c.turn.never.start) + k * 6),
    lightningAt: F(c.turn.easier.start),
    tabsAt: scene.tabs,
    tabAt: [w(sel), w(sel + 1), w(sel + 2)].map((f, i) => Math.max(f, scene.tabs + 2 + i * 4)),
    arrowAt: before(F(c.turn.learnBest.start), scene.payoff, 22),
    heartAt: before(F(c.turn.learnBest.end), scene.payoff, 10),
  };

  // ---------- 4. PAYOFF ----------
  const checkBeat = snapToBeat(c.payoff.quiz.start);
  const payoff = {
    at: scene.payoff,
    headerAt: scene.payoff + 8,
    checksAt: [0, 1, 2].map((k) => F(checkBeat + k * BEAT)),
    shadesAt: F(c.payoff.really.start),
    starAt: before(F(c.payoff.exam.start) - 4, scene.cta, 18),
    aPlusAt: before(F(c.payoff.exam.start) + 2, scene.cta, 12),
  };

  // ---------- 5. CTA ----------
  const sd = c.cta.startDoing.i;
  const cta = {
    at: scene.cta,
    ripAt: Math.max(scene.cta + 6, w(c.cta.stop.i + 1)), // on "rereading"
    headlineAt: [0, 1, 2, 3, 4, 5].map((k) => w(sd + k)),
    logoAt: F(c.cta.logo),
    urlAt: F(c.cta.url),
    urlCharsPerPose: 4,
    quetzalAt: F(c.cta.quetzal),
  };

  // ---------- Camera ----------
  const shots: Shot[] = [
    {at: 0, scale: 2.1, cx: HOOK_WORD.x + 120, cy: HOOK_WORD.y + 10},
    // editor's step-out: tight -> medium on "see" -> wide before "overloaded"
    {at: Math.min(Math.max(F(snapToBeat(c.hook.see.start)), hook.circleAt + 12), hook.wideAt - 10), scale: 1.45, cx: HOOK_WORD.x + 200, cy: HOOK_WORD.y + 220},
    {at: hook.wideAt, scale: 1, cx: 540, cy: 960},
    {at: myth.labelAt, scale: 1.16, cx: MYTH_LABEL.x, cy: MYTH_LABEL.y + 40},
    {at: scene.turn, scale: 1, cx: 540, cy: 960},
  ];
  const punches = [turn.lightningAt, hook.sweepAt, hook.cardAt, hook.stampAt, scene.myth, myth.strikeAt, scene.turn, scene.tabs, scene.payoff, payoff.aPlusAt, scene.cta, cta.ripAt, cta.logoAt].sort((a, b) => a - b);
  const chroma = [hook.stampAt];
  const shake = {from: hook.pileStart, to: hook.sweepAt};

  // ---------- SFX (all under the VO; levels baked into the files) ----------
  const sfx: SfxEvent[] = [];
  const add = (at: number, name: SfxName, volume = 1) => sfx.push({at, name, volume});
  for (let i = 0; i < typeLetters; i++) add(i * hook.letterEvery, 'typewriter_clack', 0.8);
  add(hook.circleAt, 'pencil_scribble');
  for (let i = 0; i < hook.pileCount; i++) add(hook.pileStart + i * hook.pileEvery, i % 3 === 0 ? 'page_flip' : 'tape_stick', 0.75);
  add(hook.badgeAt, 'pop_sticker');
  add(hook.quetzalAt, 'pop_sticker');
  add(hook.sweepAt, 'paper_crumple');
  add(hook.headlineAt, 'tape_stick');
  add(hook.swipeAt, 'marker_squeak', 0.5);
  add(hook.cardAt, 'page_flip');
  add(hook.crossAt, 'pencil_scribble', 0.9);
  add(hook.stampAt, 'stamp_thud');

  add(myth.at, 'page_flip');
  for (let i = 0; i < 3; i++) add(myth.headerAt + i * 4, 'typewriter_clack', 0.6);
  myth.highlights.forEach((f, i) => i % 4 === 0 && add(f, 'marker_squeak', 0.35));
  add(myth.quetzalAt, 'pop_sticker');
  add(myth.mugAt, 'pop_sticker');
  add(myth.clockAt, 'pop_sticker');
  add(myth.strikeAt, 'pencil_scribble');
  add(myth.labelAt, 'tape_stick');
  for (let i = 0; i < 5; i++) add(myth.labelAt + 4 + i * 4, 'typewriter_clack', 0.7);

  turn.cardsAt.forEach((f) => add(f, 'page_flip', 0.9));
  add(turn.cardsAt[2] + 8, 'tape_tear', 0.8);
  add(turn.highlightersAt, 'pop_sticker');
  add(turn.cardChecksAt[0], 'marker_squeak', 0.7);
  add(turn.lightningAt, 'pop_sticker');
  turn.tabAt.forEach((f, i) => add(f, i === 0 ? 'tape_tear' : 'tape_stick', 0.9));
  add(turn.arrowAt, 'pencil_scribble');
  add(turn.heartAt, 'pop_sticker');

  add(payoff.at, 'page_flip');
  for (let i = 0; i < 3; i++) add(payoff.headerAt + i * 4, 'typewriter_clack', 0.6);
  payoff.checksAt.forEach((f) => add(f, 'marker_squeak'));
  add(payoff.shadesAt, 'pop_sticker');
  add(payoff.shadesAt + 4, 'camera_shutter', 0.8);
  add(payoff.starAt, 'pop_sticker');
  add(payoff.aPlusAt, 'pop_sticker');
  add(payoff.aPlusAt + 2, 'bell_ding', 0.6);

  add(cta.ripAt, 'paper_rip');
  add(cta.headlineAt[0], 'tape_stick', 0.6);
  add(cta.logoAt, 'tape_stick');
  for (let i = 0; i < 4; i++) add(cta.urlAt + i * 4, 'typewriter_clack', 0.7);
  add(cta.quetzalAt, 'pop_sticker');

  return {cues: c, scene, hook, myth, turn, payoff, cta, shots, punches, chroma, shake, sfx};
}

// Pick one of the 7 pre-pitched pop files (-3..+3 semitones), seeded by frame.
export function popFile(at: number) {
  const semi = Math.floor(hash('pop', at) * 7) - 3;
  return `sfx/pop_sticker_${semi < 0 ? `m${-semi}` : `p${semi}`}.wav`;
}
