// Every beat in the ad is derived from public/vo/words.json — nothing is
// hard-coded in seconds except the 84 BPM grid; even the runtime follows the VO.
// This file has no imports so Node (scripts/make-music.mjs) can load it too.

export type Word = {word: string; start: number; end: number};

export const FPS = 30;
// After the last word: logo lands, then the final frame holds.
export const OUTRO_S = 2.4;
export const BPM = 84;
export const BEAT = 60 / BPM; // 0.714s
export const FINAL_HOLD_S = 1.5;

export const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '');

// Index of the first word of `phrase` at or after `from`.
export function findPhrase(words: Word[], phrase: string, from = 0): number {
  const target = phrase.split(/\s+/).map(norm);
  for (let i = from; i <= words.length - target.length; i++) {
    if (target.every((t, k) => norm(words[i + k].word) === t)) return i;
  }
  throw new Error(`words.json is missing the phrase "${phrase}"`);
}

// Scene cuts land on the beat grid. Prefer the nearest beat, but never let the
// cut arrive noticeably after the word it belongs to.
export function snapToBeat(t: number): number {
  const nearest = Math.round(t / BEAT) * BEAT;
  return nearest > t + 0.15 ? Math.floor(t / BEAT) * BEAT : nearest;
}

// Runtime = end of the VO + outro, rounded up to a whole frame.
export const durationFor = (words: Word[]) => Math.ceil((words[words.length - 1].end + OUTRO_S) * FPS) / FPS;

export type Cues = ReturnType<typeof buildCues>;

export function buildCues(words: Word[]) {
  const at = (phrase: string, from = 0) => {
    const i = findPhrase(words, phrase, from);
    return {i, start: words[i].start, end: words[i + phrase.split(/\s+/).length - 1].end};
  };

  const students = at('students');
  const see = at('see those people');
  const overloaded = at('overloaded');
  const moment = at('one moment');
  const comeback = at('comeback');
  const century = at('century');
  const next = at('the next', century.i);

  const well = at("well it's not");
  const rereading = at('rereading');
  const notes = at('your notes');
  const test = at('before your test');
  const burning = at('burning');
  const themselves = at('themselves');
  const out = at('out', burning.i);

  const making = at('making their classes');
  const manageable = at('manageable');
  const information = at('information');
  const never = at('never been easier');
  const easier = at('easier');
  const select = at('select what format');
  const learnBest = at('learn best in');

  const bestOfAll = at('best of all');
  const quiz = at('quiz yourself');
  const accurately = at('accurately');
  const really = at('really');
  const your = at('your exam');
  const exam = at('exam', your.i);

  const stop = at('stop rereading');
  const startDoing = at('start doing what works for you');
  const last = words[words.length - 1];

  const duration = durationFor(words);
  const holdFrom = duration - FINAL_HOLD_S;
  const scene = {
    hook: 0,
    myth: snapToBeat(well.start),
    // "it's actually by" belongs to the strike-through label's read time; the
    // sort-into-cards visual starts on "making".
    turn: snapToBeat(making.start),
    turnTabs: snapToBeat(select.start),
    payoff: snapToBeat(bestOfAll.start),
    cta: snapToBeat(stop.start),
  };
  // Logo is taped on after the headline has been said, but never later than
  // 1s before the final hold so the brand sits on screen >= 2.5s.
  const logo = Math.min(snapToBeat(last.start), holdFrom - 1.0);

  return {
    words,
    duration,
    holdFrom,
    scene,
    hook: {students, see, overloaded, moment, comeback, century, next},
    myth: {well, rereading, notes, test, burning, themselves, out},
    turn: {making, manageable, information, never, easier, select, learnBest},
    payoff: {bestOfAll, quiz, accurately, really, your, exam},
    cta: {stop, startDoing, last, logo, url: logo + BEAT * 0.5, quetzal: logo + BEAT},
    music: {
      filterOpen: snapToBeat(comeback.start),
      drumsIn: scene.myth,
      drumsOut: scene.cta,
      bell: logo,
    },
  };
}

// Regions where the voice is speaking (gaps < 0.3s merged) — drives ducking.
export function speechRegions(words: Word[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const w of words) {
    const prev = out[out.length - 1];
    if (prev && w.start - prev[1] < 0.3) prev[1] = w.end;
    else out.push([w.start, w.end]);
  }
  return out;
}
