import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Group} from '../components/Group';
import {Strokes, Typed, checkMark, smooth, wobblyLine} from '../components/Ink';
import {CornerTapes, Piece, Tape} from '../components/Paper';
import {Sticker, landPose} from '../components/Sticker';
import type {Plan} from '../plan';
import {pieceRot, stepPoses} from '../lib/rand';
import {C} from '../lib/theme';
import {scribbleRows} from './Hook';

type Pt = [number, number];
const CARD = {w: 780, h: 290};
const MESSY = [
  {x: 170, y: 640, r: 3.6},
  {x: 90, y: 760, r: -3.8},
  {x: 200, y: 880, r: 2.4},
];
const NEAT = [
  {x: 150, y: 250, r: -1.2},
  {x: 150, y: 600, r: 1.0},
  {x: 150, y: 950, r: -0.6},
];
const SUBJECTS = ['biology', 'history', 'algebra'];

// Index card: blue rules + red header line
const IndexCard: React.FC<{seed: string; x: number; y: number; r: number; label: string}> = ({seed, x, y, r, label}) => (
  <Piece
    seed={seed}
    x={x}
    y={y}
    w={CARD.w}
    h={CARD.h}
    rot={r}
    rough={{top: 2, right: 2, bottom: 2, left: 2}}
    innerStyle={{
      backgroundImage: `linear-gradient(to bottom, transparent 92px, rgba(217,83,79,0.5) 92px, rgba(217,83,79,0.5) 95px, transparent 95px), repeating-linear-gradient(to bottom, transparent 0px, transparent 150px, ${C.rule} 150px, ${C.rule} 152px, transparent 152px, transparent 210px)`,
    }}
  >
    <Typed text={label} at={-999} size={46} seed={seed} style={{position: 'absolute', left: 48, top: 30}} />
  </Piece>
);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const icon = {
  read: (x: number, y: number): Pt[][] => [
    [[x, y + 10], [x + 36, y], [x + 36, y + 62], [x, y + 72], [x, y + 10]],
    [[x + 36, y], [x + 72, y + 10], [x + 72, y + 72], [x + 36, y + 62]],
  ],
  listen: (x: number, y: number): Pt[][] => [
    smooth([[x + 4, y + 50], [x + 8, y + 10], [x + 40, y - 6], [x + 70, y + 10], [x + 74, y + 50]]),
    [[x - 2, y + 42], [x + 16, y + 42], [x + 16, y + 74], [x - 2, y + 74], [x - 2, y + 42]],
    [[x + 62, y + 42], [x + 80, y + 42], [x + 80, y + 74], [x + 62, y + 74], [x + 62, y + 42]],
  ],
  flashcards: (x: number, y: number): Pt[][] => [
    [[x + 12, y], [x + 80, y], [x + 80, y + 50], [x + 12, y + 50], [x + 12, y]],
    [[x, y + 14], [x + 68, y + 14], [x + 68, y + 66], [x, y + 66], [x, y + 14]],
    [[x + 12, y + 34], [x + 52, y + 34]],
  ],
};
const TABS = [
  {label: 'read', color: C.highlighter, icon: icon.read},
  {label: 'listen', color: C.salmon, icon: icon.listen},
  {label: 'flashcards', color: C.paper, icon: icon.flashcards},
] as const;
const TAB = {x: 190, w: 660, h: 190, y0: 470, gap: 260};

export const Turn: React.FC<{plan: Plan}> = ({plan}) => {
  const frame = useCurrentFrame();
  const t = plan.turn;

  if (frame < t.tabsAt) {
    // A: messy stack sorts itself into 3 neat taped index cards
    return (
      <>
        <Group seed="turn-loose">
          <Piece seed="loose-a" x={300} y={560} w={560} h={700} rot={pieceRot('loose-a')} lined margin />
          <Strokes paths={scribbleRows('loose-a', 450, 760, 6, 64, 360)} />
        </Group>
        {[2, 1, 0].map((i) => {
          const k = stepPoses(frame, t.cardsAt[i], [0.38, 0.82, 1.05, 1]) ?? 0;
          const x = lerp(MESSY[i].x, NEAT[i].x, k);
          const y = lerp(MESSY[i].y, NEAT[i].y, k);
          const r = lerp(MESSY[i].r, NEAT[i].r, Math.min(1, k));
          const landed = frame >= t.cardsAt[i] + 6;
          return (
            <Group key={i} seed={`card-${i}`}>
              <IndexCard seed={`card-${i}`} x={x} y={y} r={r} label={SUBJECTS[i]} />
              <Strokes paths={scribbleRows(`card-${i}`, x + 60, y + 190, 1, 60, 560)} />
              {landed ? <CornerTapes seed={`card-${i}-tape`} x={x} y={y} w={CARD.w} h={CARD.h} tone={i === 1 ? 'salmon' : 'cream'} corners={i === 1 ? ['tr', 'bl'] : ['tl', 'br']} /> : null}
            </Group>
          );
        })}
        {/* each class gets its red tick on "never been easier" */}
        <Strokes paths={NEAT.map((n, i) => ({seed: `card-tick-${i}`, pts: checkMark(`card-tick-${i}`, n.x + 640, n.y + 40, 0.9), at: t.cardChecksAt[i], dur: 4, min: 3, max: 6}))} />
        <Sticker name="highlighters" x={820} y={1230} size={280} at={t.highlightersAt} />
        <Sticker name="lightning" x={930} y={250} size={230} at={t.lightningAt} />
      </>
    );
  }

  // B: three cut-out tabs taped on; arrow picks one
  const arrow = smooth([
    [985, 1300],
    [1000, 1220],
    [970, 1130],
    [920, 1060],
    [870, 1040],
  ]);
  return (
    <>
      <Group seed="tabs-page">
        <Piece seed="tabs-page" x={70} y={150} w={940} h={1150} rot={1.2} lined margin rough={{top: 10}}>
          <Typed text="how do i learn best?" at={t.tabsAt + 2} charsPerPose={2} size={46} style={{position: 'absolute', left: 140, top: 92}} />
        </Piece>
      </Group>
      {TABS.map((tab, i) => {
        const pose = landPose(frame, t.tabAt[i]);
        if (!pose) return null;
        const y = TAB.y0 + i * TAB.gap;
        const seed = `tab-${i}`;
        // tiny ink icon, drawn on right after the tab lands
        const paths = tab.icon(TAB.x + 46, y + 48).map((pts, n) => ({seed: `${seed}-icon-${n}`, pts, at: t.tabAt[i] + 4, dur: 4, color: C.ink, min: 2.5, max: 4.5}));
        return (
          <Group key={seed} seed={seed} dy={pose.dy} scale={pose.s} origin={`${TAB.x + TAB.w / 2}px ${y + TAB.h / 2}px`}>
            <Piece seed={seed} x={TAB.x} y={y} w={TAB.w} h={TAB.h} rot={pieceRot(seed)} color={tab.color} rough={{top: 3, right: 6, bottom: 3, left: 3}}>
              <Typed text={tab.label} at={-999} size={48} seed={seed} style={{position: "absolute", left: 170, top: 66}} />
            </Piece>
            <Strokes paths={paths} />
            <Tape seed={`${seed}-tape`} x={TAB.x + 6} y={y + TAB.h / 2} rot={-80 + pieceRot(seed) * 2} w={130} tone={i === 1 ? 'cream' : 'salmon'} />
          </Group>
        );
      })}
      <Strokes
        paths={[
          {seed: 'arrow', pts: arrow, at: t.arrowAt, dur: 8, min: 3, max: 6},
          {seed: 'arrow-h1', pts: wobblyLine('arrow-h1', [870, 1040], [922, 1022], 2, 3), at: t.arrowAt + 8, dur: 2, min: 3, max: 6},
          {seed: 'arrow-h2', pts: wobblyLine('arrow-h2', [870, 1040], [902, 1086], 2, 3), at: t.arrowAt + 8, dur: 2, min: 3, max: 6},
        ]}
      />
      <Sticker name="heart" x={940} y={930} size={150} at={t.heartAt} />
    </>
  );
};
