import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Group} from '../components/Group';
import {Strokes, Swipe, Typed, wobblyLine} from '../components/Ink';
import {Piece, Tape} from '../components/Paper';
import {Sticker, landPose} from '../components/Sticker';
import {LABEL_TEXT, MYTH_LABEL, type Plan} from '../plan';
import {hash, stepPoses} from '../lib/rand';
import {scribbleRows} from './Hook';

const PAGE = {x: 60, y: 130, w: 960, h: 1160};
const ROWS = 14;
const ROW0 = 320; // first handwriting baseline (screen y), sits on a blue rule
const GAP = 64;

// Re-read-to-death notes page. `hl` = frames at which each highlight swipe lands.
export const NotesPage: React.FC<{seed: string; hl: number[]; headerAt: number}> = ({seed, hl, headerAt}) => (
  <>
    <Piece seed={seed} x={PAGE.x} y={PAGE.y} w={PAGE.w} h={PAGE.h} rot={-0.8} lined margin rough={{top: 12, bottom: 5}}>
      <Typed text="ch. 7 — notes" at={headerAt} charsPerPose={1} size={46} style={{position: 'absolute', left: 140, top: 52}} />
      {/* highlights live inside the page so they multiply onto the paper */}
      {hl.map((at, i) => {
        const row = i < ROWS ? (i * 5) % ROWS : Math.floor(hash(seed, 'r2', i) * ROWS); // first pass hits every row, then yellow on yellow
        const x = 120 + hash(seed, 'hx', i) * 60;
        const w = i < ROWS ? 520 + hash(seed, 'hw', i) * 280 : 760;
        return <Swipe key={i} seed={`${seed}-hl-${i}`} x={x} y={ROW0 - PAGE.y + row * GAP - 44} w={w} h={50} at={at} dur={4} />;
      })}
    </Piece>
    <Strokes paths={scribbleRows(`${seed}-ink`, 200, ROW0, ROWS, GAP, 740)} />
  </>
);

export const Myth: React.FC<{plan: Plan}> = ({plan}) => {
  const frame = useCurrentFrame();
  const m = plan.myth;
  const slide = stepPoses(frame, m.at, [{dy: 1100}, {dy: 420}, {dy: 60}, {dy: -8}, {dy: 0}]);
  const label = landPose(frame, m.labelAt);
  // red pen X through the whole page, each diagonal gone over twice
  const strikes = [
    {a: [150, 230], b: [960, 1220]},
    {a: [940, 210], b: [140, 1230]},
  ].flatMap((d, k) =>
    [0, 1].map((pass) => ({
      seed: `strike-${k}-${pass}`,
      pts: wobblyLine(`strike-${k}-${pass}`, [d.a[0] + pass * 9, d.a[1] - pass * 6] as [number, number], [d.b[0] - pass * 7, d.b[1] + pass * 5] as [number, number], 9, 7),
      at: m.strikeAt + k * 6 + pass * 2,
      dur: 6,
      min: 3,
      max: 6,
    })),
  );
  return (
    <Group seed="myth-page" dy={slide?.dy ?? 0}>
      <NotesPage seed="myth" hl={m.highlights} headerAt={m.headerAt} />
      <Strokes paths={strikes} />
      <Sticker name="quetzal-sweating" x={870} y={1110} size={320} at={m.quetzalAt} motion={(p) => ({dx: p % 2 ? 2 : -2})} />
      <Sticker name="mug-cracked" x={220} y={1130} size={300} at={m.mugAt} />
      <Sticker
        name="alarm-clock"
        x={850}
        y={290}
        size={280}
        at={m.clockAt}
        motion={(p, f) => (f < m.rattleTo ? {r: p % 2 ? 8 : -7, dx: p % 2 ? 4 : -4, dy: p % 2 ? -3 : 1} : {})}
      />
      {label && (
        <Group seed="myth-label" dy={label.dy} scale={label.s} origin={`${MYTH_LABEL.x}px ${MYTH_LABEL.y}px`}>
          <Piece seed="myth-label" x={MYTH_LABEL.x - 330} y={MYTH_LABEL.y - 58} w={660} h={116} rot={-3} rough={{top: 5, bottom: 5}}>
            <Typed text={LABEL_TEXT} at={m.labelAt + 4} charsPerPose={2} size={48} style={{position: 'absolute', left: 42, top: 32}} />
          </Piece>
          <Tape seed="label-l" x={MYTH_LABEL.x - 320} y={MYTH_LABEL.y - 40} rot={-52} tone="salmon" />
          <Tape seed="label-r" x={MYTH_LABEL.x + 318} y={MYTH_LABEL.y + 22} rot={-48} tone="salmon" />
        </Group>
      )}
    </Group>
  );
};
