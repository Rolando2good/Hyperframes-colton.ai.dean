import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {FPS, speechRegions, type Word} from '../cues';
import {popFile, type Plan} from '../plan';
import {hash, jitter, onTwos, signed} from '../lib/rand';
import {C, FONT} from '../lib/theme';
import {strokeOutline, wobblyLine} from './Ink';

// ---------------- Desk: kraft scan + halftone (multiply 8%) ----------------
export const Desk: React.FC = () => (
  <>
    <Img src={staticFile('textures/kraft.jpg')} style={{position: 'absolute', left: -80, top: -140, width: 1240, height: 2200}} />
    <div
      style={{
        position: 'absolute',
        left: -80,
        top: -140,
        width: 1240,
        height: 2200,
        backgroundImage: `url(${staticFile('textures/halftone.png')})`,
        backgroundSize: '120px',
        mixBlendMode: 'multiply',
        opacity: 0.08,
      }}
    />
  </>
);

// ---------------- Film grain 6%, re-randomized every 2 frames ----------------
export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const k = Math.floor(hash('grain', onTwos(frame)) * 8);
  const ox = Math.floor(hash('gx', onTwos(frame)) * 200);
  const oy = Math.floor(hash('gy', onTwos(frame)) * 200);
  return (
    <Img
      src={staticFile(`textures/grain-${k}.png`)}
      style={{position: 'absolute', left: -ox, top: -oy, width: 1080 + 200, height: 1920 + 200, opacity: 0.06, pointerEvents: 'none'}}
    />
  );
};

export const Vignette: React.FC = () => (
  <AbsoluteFill style={{background: 'radial-gradient(ellipse 75% 62% at 50% 46%, transparent 55%, rgba(30,26,23,0.08) 82%, rgba(30,26,23,0.16) 100%)', pointerEvents: 'none'}} />
);

// 1px RGB split, used only on stamp hits.
export const ChromaDefs: React.FC = () => (
  <svg width={0} height={0} style={{position: 'absolute'}}>
    <filter id="chroma" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
      <feOffset in="r" dx="1" dy="0" result="r2" />
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
      <feOffset in="b" dx="-1" dy="0" result="b2" />
      <feComposite in="r2" in2="g" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="rg" />
      <feComposite in="rg" in2="b2" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
    </filter>
  </svg>
);

// ---------------- Virtual camera (full 30fps) ----------------
export const Camera: React.FC<{plan: Plan; children: React.ReactNode}> = ({plan, children}) => {
  const raw = useCurrentFrame();
  const frame = Math.min(raw, plan.scene.hold); // final hold: camera stops too
  const t = frame / FPS;
  const shot = [...plan.shots].reverse().find((s) => s.at <= frame) ?? plan.shots[0];
  // slow drift: ~2.8px/s horizontal, ~3px/s vertical
  const driftX = 38 * Math.sin(t * 0.075 + 0.3);
  const driftY = 30 * Math.sin(t * 0.1 + 1.1);
  // 1.03 punch on beat drops, snapping back fast (no float)
  const p = [...plan.punches].reverse().find((q) => q <= frame);
  const punch = p !== undefined && frame - p < 12 ? 1 + 0.03 * Math.exp(-(frame - p) / 3) : 1;
  const inShake = frame >= plan.shake.from && frame < plan.shake.to;
  const sx = inShake ? signed(3, 'shake-x', onTwos(frame)) : 0;
  const sy = inShake ? signed(3, 'shake-y', onTwos(frame)) : 0;
  const s = shot.scale;
  const X = 540, Y = s === 1 ? 960 : 800;
  const tx = X - shot.cx * s;
  const ty = Y - shot.cy * s;
  const chroma = plan.chroma.some((c) => frame >= c && frame < c + 4);
  return (
    <AbsoluteFill style={{transformOrigin: '540px 960px', transform: `scale(${punch})`, filter: chroma ? 'url(#chroma)' : undefined}}>
      <AbsoluteFill style={{transformOrigin: '0 0', transform: `translate(${tx + driftX + sx}px, ${ty + driftY + sy}px) scale(${s})`}}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------- Captions ----------------
type Chunk = {words: Array<Word & {i: number}>; from: number; to: number};

export function chunkWords(words: Word[]): Chunk[] {
  const chunks: Chunk[] = [];
  let cur: Array<Word & {i: number}> = [];
  const flush = () => {
    if (cur.length) chunks.push({words: cur, from: cur[0].start, to: cur[cur.length - 1].end});
    cur = [];
  };
  words.forEach((w, i) => {
    const chars = cur.reduce((n, x) => n + x.word.length + 1, 0) + w.word.length;
    if (cur.length >= 4 || (cur.length && chars > 22)) flush();
    cur.push({...w, i});
    if (/[.,?!]$/.test(w.word)) flush();
  });
  flush();
  // each chunk stays up until the next one (or 0.3s after its last word on a pause)
  chunks.forEach((c, k) => {
    const next = chunks[k + 1];
    c.to = next && next.from - c.to < 0.5 ? next.from : c.to + 0.3;
  });
  return chunks;
}

const pct = (seed: string, depth = 6) => {
  const pts: string[] = [];
  const n = 18;
  for (let i = 0; i < n; i++) pts.push(`calc(${(i / n) * 100}% ) calc(0% + ${(hash(seed, 't', i) * depth).toFixed(1)}px)`);
  for (let i = 0; i < 5; i++) pts.push(`calc(100% - ${(hash(seed, 'r', i) * 4).toFixed(1)}px) calc(${(i / 5) * 100}%)`);
  for (let i = 0; i < n; i++) pts.push(`calc(${100 - (i / n) * 100}%) calc(100% - ${(hash(seed, 'b', i) * depth).toFixed(1)}px)`);
  for (let i = 0; i < 5; i++) pts.push(`calc(0% + ${(hash(seed, 'l', i) * 4).toFixed(1)}px) calc(${100 - (i / 5) * 100}%)`);
  return `polygon(${pts.join(',')})`;
};

export const Captions: React.FC<{words: Word[]}> = ({words}) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const chunks = React.useMemo(() => chunkWords(words), [words]);
  const k = chunks.findIndex((c) => t >= c.from && t < c.to);
  if (k < 0) return null;
  const chunk = chunks[k];
  const seed = `cap-${k}`;
  const j = jitter(seed, frame, 4);
  return (
    <div style={{position: 'absolute', left: 120, right: 120, top: 1450, display: 'flex', justifyContent: 'center'}}>
      <div
        style={{
          transform: `translate(${j.x}px, calc(-50% + ${j.y}px)) rotate(${signed(1.5, seed, 'rot')}deg)`,
          filter: 'drop-shadow(0 6px 14px rgba(30,26,23,0.25))',
          maxWidth: 840,
        }}
      >
        <div
          style={{
            clipPath: pct(seed),
            background: C.paper,
            padding: '20px 30px 24px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            columnGap: 16,
            rowGap: 4,
          }}
        >
          {chunk.words.map((w) => {
            const wf = Math.round(w.start * FPS);
            const nextStart = words[w.i + 1]?.start ?? w.end + 0.3;
            const active = t >= w.start && t < Math.max(w.end, nextStart);
            const isYour = w.word.replace(/[^A-Za-z]/g, '') === 'YOUR';
            const age = frame - wf;
            const scale = active && age < 6 ? 1 + 0.08 * Math.sin((Math.PI * age) / 6) : 1;
            const text = isYour ? 'YOUR' : w.word.toLowerCase().replace(/[^a-z0-9'’]/g, '');
            const ulProgress = isYour ? Math.min(1, Math.max(0, (onTwos(age) + 2) / 8)) : 0;
            return (
              <span
                key={w.i}
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  fontFamily: FONT.cap,
                  fontWeight: 700,
                  fontSize: 64,
                  lineHeight: 1.12,
                  letterSpacing: '-0.01em',
                  color: isYour ? C.redPen : C.ink,
                  transform: `scale(${scale})`,
                  padding: '0 8px',
                }}
              >
                {/* active word: salmon marker block, ink text on top (5.0:1) */}
                {active && !isYour ? (
                  <span style={{position: 'absolute', left: 0, right: 0, top: 8, bottom: 6, background: C.salmon, clipPath: pct(`${seed}-${w.i}`, 4), zIndex: 0}} />
                ) : null}
                <span style={{position: 'relative', zIndex: 1}}>{text}</span>
                {isYour && ulProgress > 0 ? (
                  <svg width="100%" height="24" viewBox="0 0 200 24" preserveAspectRatio="none" style={{position: 'absolute', left: 0, bottom: -10, overflow: 'visible'}}>
                    <path d={strokeOutline('your-ul', wobblyLine('your-ul', [6, 10], [194, 14], 3, 5), ulProgress, 3, 6)} fill={C.redPen} />
                  </svg>
                ) : null}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ---------------- Soundtrack ----------------
export const SoundTrack: React.FC<{plan: Plan; words: Word[]}> = ({plan, words}) => {
  const regions = React.useMemo(() => speechRegions(words), [words]);
  // Sidechain from words.json: -6dB while the voice speaks (80ms attack, 250ms release)
  const duck = (f: number) => {
    const t = f / FPS;
    let d = 0;
    for (const [a, b] of regions) {
      if (t >= a - 0.08 && t <= b + 0.25) {
        const k = t < a ? (t - (a - 0.08)) / 0.08 : t > b ? 1 - (t - b) / 0.25 : 1;
        d = Math.max(d, k);
      }
    }
    return 1 - 0.5 * d; // 0.5 linear = -6dB
  };
  let prevPop = '';
  return (
    <>
      <Audio src={staticFile('vo/voiceover.mp3')} volume={1} />
      <Audio src={staticFile('music/bed.wav')} volume={duck} />
      {plan.sfx.map((e, i) => {
        let src = e.name === 'pop_sticker' ? popFile(e.at) : `sfx/${e.name}.wav`;
        if (e.name === 'pop_sticker') {
          // never the same pitch twice in a row
          if (src === prevPop) src = popFile(e.at + 1);
          if (src === prevPop) src = popFile(e.at + 2);
          prevPop = src;
        }
        return (
          <Sequence key={`${e.name}-${i}`} from={e.at} durationInFrames={60} layout="none">
            <Audio src={staticFile(src)} volume={e.volume ?? 1} />
          </Sequence>
        );
      })}
    </>
  );
};
