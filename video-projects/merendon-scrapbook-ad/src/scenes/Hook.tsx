import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Group} from '../components/Group';
import {Headline, Strokes, Swipe, Typed, loopAround, smooth, wobblyLine} from '../components/Ink';
import {CornerTapes, Piece} from '../components/Paper';
import {Sticker, landPose} from '../components/Sticker';
import {HOOK_WORD, type Plan} from '../plan';
import {hash, pieceRot, signed, stepPoses} from '../lib/rand';
import {C, FONT} from '../lib/theme';

// faint handwriting rows already on a page (ink scribble "words")
export function scribbleRows(seed: string, x0: number, y0: number, rows: number, gap: number, maxW: number, color = 'rgba(30,26,23,0.78)', at = -999) {
  const paths = [];
  for (let r = 0; r < rows; r++) {
    let x = x0;
    const end = x0 + maxW * (0.55 + hash(seed, r, 'len') * 0.45);
    let k = 0;
    while (x < end - 40) {
      const wlen = 40 + hash(seed, r, k, 'w') * 110;
      const pts: Array<[number, number]> = [];
      const y = y0 + r * gap;
      for (let s = 0; s <= 10; s++) {
        const xx = x + (wlen * s) / 10;
        pts.push([xx, y - 10 - Math.abs(Math.sin(s * 1.7 + hash(seed, r, k) * 6)) * 14 + signed(3, seed, r, k, s)]);
      }
      paths.push({seed: `${seed}-${r}-${k}`, pts: smooth(pts, 4), at, dur: 1, color, min: 2, max: 3.5});
      x += wlen + 22;
      k++;
    }
  }
  return paths;
}

const PILE = [
  {kind: 'sheet', x: 120, y: 260, w: 560, h: 700, text: 'ch. 4–9 ???'},
  {kind: 'sticky', x: 620, y: 420, w: 330, h: 320, color: C.highlighter, text: 'DUE\nTMRW'},
  {kind: 'sheet', x: 380, y: 640, w: 560, h: 640, text: 'reread ALL'},
  {kind: 'sticky', x: 140, y: 880, w: 320, h: 300, color: C.salmon, text: 'quiz\nfri !!'},
  {kind: 'slip', x: 470, y: 330, w: 470, h: 110, text: 'lab report'},
  {kind: 'sticky', x: 560, y: 1010, w: 330, h: 300, color: C.highlighter, text: 'essay\ndraft??'},
  {kind: 'sheet', x: 90, y: 470, w: 520, h: 600, text: 'vocab 1–60'},
  {kind: 'slip', x: 200, y: 1180, w: 520, h: 110, text: 'study guide'},
  {kind: 'sticky', x: 700, y: 760, w: 300, h: 290, color: C.salmon, text: 'read\npp. 80-140'},
] as const;

export const Hook: React.FC<{plan: Plan}> = ({plan}) => {
  const frame = useCurrentFrame();
  const h = plan.hook;
  const wide = frame >= h.wideAt;
  // The pile and the original page get swept off-frame on "comeback".
  const sweep = stepPoses(frame, h.sweepAt, [
    {dx: -70, rot: -2},
    {dx: -420, rot: -6},
    {dx: -980, rot: -11},
    {dx: -1700, rot: -15},
  ]);
  const swept = sweep && frame >= h.sweepAt + 8;

  // report card slam
  const card = stepPoses(frame, h.cardAt, [{s: 1.22}, {s: 0.97}, {s: 1}]);
  const stamp = stepPoses(frame, h.stampAt, [{s: 1.35}, {s: 0.94}, {s: 1}]);
  const head = landPose(frame, h.headlineAt);

  return (
    <>
      {!swept && (
        <Group seed="hook-desk" dx={sweep?.dx ?? 0} rot={sweep?.rot ?? 0}>
          <Group seed="hook-page" amp={wide ? 6 : 2}>
            <Piece seed="hook-page" x={70} y={150} w={940} h={1180} rot={-1.4} lined margin rough={{top: 12}}>
              <Typed text="mon. 11:48 pm" at={-999} size={38} style={{position: 'absolute', left: 140, top: 34, opacity: 0.8}} />
            </Piece>
            <Strokes paths={scribbleRows('hook-notes', 220, 780, 6, 64, 680)} />
            <Typed text="students" at={0} size={48} style={{position: 'absolute', left: HOOK_WORD.x, top: HOOK_WORD.y - 6}} />
            <Strokes paths={[{seed: 'hook-circle', pts: loopAround('hook-circle', HOOK_WORD.x + 118, HOOK_WORD.y + 22, 150, 50), at: h.circleAt, dur: 10, min: 2.5, max: 6}]} />
          </Group>
          {PILE.map((p, i) => {
            const at = h.pileStart + i * h.pileEvery;
            const pose = landPose(frame, at);
            if (!pose) return null;
            const seed = `pile-${i}`;
            const color = 'color' in p ? p.color : C.paper;
            return (
              <Group key={seed} seed={seed} dy={pose.dy} scale={pose.s} origin={`${p.x + p.w / 2}px ${p.y + p.h / 2}px`}>
                <Piece seed={seed} x={p.x} y={p.y} w={p.w} h={p.h} rot={pieceRot(seed)} color={color} lined={p.kind === 'sheet'} margin={p.kind === 'sheet'} rough={p.kind === 'sticky' ? {top: 3, right: 2, bottom: 2, left: 2} : undefined}>
                  <Typed text={p.text} at={-999} size={p.kind === 'sticky' ? 46 : 42} seed={seed} style={{position: 'absolute', left: p.kind === 'sheet' ? 140 : 30, top: p.kind === 'slip' ? 30 : 36}} />
                </Piece>
                {p.kind === 'sheet' ? <Strokes paths={scribbleRows(seed, p.x + 150, p.y + 190, 5, 64, p.w - 220)} /> : null}
              </Group>
            );
          })}
          <Sticker name="badge-2am" x={830} y={330} size={270} at={h.badgeAt} />
          <Sticker name="quetzal-panicking" x={320} y={1060} size={400} at={h.quetzalAt} motion={(pose) => ({r: pose % 2 ? 5 : -4, dx: pose % 2 ? 4 : -3})} />
        </Group>
      )}

      {/* "the comeback." */}
      {head && (
        <Group seed="hook-head" dy={head.dy} scale={head.s} origin="540px 270px">
          <Piece seed="hook-head" x={60} y={160} w={960} h={220} rot={-2.2}>
            <Swipe seed="hook-swipe" x={300} y={92} w={600} h={82} at={h.swipeAt} dur={6} rot={-1} />
            <Headline text="the comeback." seed="hook-head" size={124} style={{position: 'absolute', left: 50, top: 46}} />
          </Piece>
          <CornerTapes seed="hook-head-t" x={60} y={160} w={960} h={220} tone="salmon" corners={['tl', 'tr']} />
        </Group>
      )}

      {/* report card: F gets crossed out, magenta A+ stamped */}
      {card && (
        <Group seed="report" scale={card.s} origin="540px 860px">
          <Piece seed="report" x={140} y={430} w={800} h={860} rot={1.6} rough={{top: 4, bottom: 9}}>
            <Typed text="REPORT CARD" at={-999} size={46} style={{position: 'absolute', left: 60, top: 54}} />
            <Typed text="term 1 · period 3" at={-999} size={38} style={{position: 'absolute', left: 60, top: 116, opacity: 0.75}} />
            {[
              ['algebra', 'D'],
              ['biology', 'F'],
              ['history', 'D-'],
              ['english', 'C-'],
            ].map(([s, g], i) => (
              <React.Fragment key={s}>
                <Typed text={s} at={-999} size={42} style={{position: 'absolute', left: 60, top: 500 + i * 76}} />
                <Typed text={g} at={-999} size={42} style={{position: 'absolute', left: 560, top: 500 + i * 76}} />
                <div style={{position: 'absolute', left: 50, right: 50, top: 556 + i * 76, height: 2, background: 'rgba(30,26,23,0.35)'}} />
              </React.Fragment>
            ))}
          </Piece>
          <Strokes
            paths={[
              {seed: 'F1', pts: wobblyLine('F1', [730, 486], [722, 726], 3, 4), at: -999, dur: 1, min: 4, max: 6},
              {seed: 'F2', pts: wobblyLine('F2', [732, 490], [862, 478], 3, 4), at: -999, dur: 1, min: 4, max: 6},
              {seed: 'F3', pts: wobblyLine('F3', [728, 600], [830, 594], 3, 3), at: -999, dur: 1, min: 4, max: 6},
              {seed: 'Fc', pts: loopAround('Fc', 790, 606, 118, 150), at: -999, dur: 1, min: 2, max: 4},
              {seed: 'X1', pts: wobblyLine('X1', [656, 460], [930, 760], 5, 5), at: h.crossAt, dur: 4, min: 3, max: 6},
              {seed: 'X2', pts: wobblyLine('X2', [928, 470], [660, 752], 5, 5), at: h.crossAt + 4, dur: 4, min: 3, max: 6},
            ]}
          />
          {stamp && (
            <div
              style={{
                position: 'absolute',
                left: 170,
                top: 600,
                width: 400,
                height: 250,
                transform: `rotate(-11deg) scale(${stamp.s})`,
                border: `9px solid ${C.magenta}`,
                borderRadius: 18,
                color: C.magenta,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: FONT.head,
                fontWeight: 700,
                fontSize: 210,
                lineHeight: 1,
                mixBlendMode: 'multiply',
                // worn rubber: knock out specks with the grain scan
                maskImage: `radial-gradient(circle at 30% 40%, #000 60%, rgba(0,0,0,0.75) 100%)`,
                opacity: 0.92,
              }}
            >
              A+
            </div>
          )}
        </Group>
      )}
    </>
  );
};
