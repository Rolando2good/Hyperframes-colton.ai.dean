import React from 'react';
import {useCurrentFrame} from 'remotion';
import {hash, onTwos, signed} from '../lib/rand';
import {C, FONT} from '../lib/theme';

type Pt = [number, number];

// Resample a polyline to ~even spacing so stroke width can vary smoothly.
function resample(pts: Pt[], step = 5): Pt[] {
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
  }
  return out;
}

// Catmull-Rom through control points -> dense polyline
export function smooth(ctrl: Pt[], seg = 8): Pt[] {
  if (ctrl.length < 3) return ctrl;
  const p = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
  const out: Pt[] = [];
  for (let i = 1; i < p.length - 2; i++) {
    for (let s = 0; s < seg; s++) {
      const t = s / seg, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p[i - 1][0], p[i][0], p[i + 1][0], p[i + 2][0]), f(p[i - 1][1], p[i][1], p[i + 1][1], p[i + 2][1])]);
    }
  }
  out.push(ctrl[ctrl.length - 1]);
  return out;
}

// Variable-width (2–6px) pen stroke as a filled outline; `progress` draws it on.
export function strokeOutline(seed: string, pts: Pt[], progress: number, minW = 2, maxW = 6): string {
  const P = resample(pts);
  const n = Math.max(2, Math.round(P.length * Math.min(1, progress)));
  if (progress <= 0) return '';
  const L: Pt[] = [];
  const R: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)];
    const b = P[Math.min(P.length - 1, i + 1)];
    let nx = -(b[1] - a[1]);
    let ny = b[0] - a[0];
    const len = Math.hypot(nx, ny) || 1;
    nx /= len;
    ny /= len;
    // pressure: slow noise along the stroke + tapered ends
    const u = i / (P.length - 1);
    const pressure = 0.5 + 0.5 * Math.sin(u * 9 + hash(seed, 'ph') * 6) * 0.6 + signed(0.2, seed, Math.floor(i / 6));
    const taper = Math.min(1, u * 8, (1 - u) * 6 + 0.3);
    const wdt = (minW + (maxW - minW) * Math.max(0, Math.min(1, pressure))) * Math.max(0.45, taper);
    L.push([P[i][0] + (nx * wdt) / 2, P[i][1] + (ny * wdt) / 2]);
    R.push([P[i][0] - (nx * wdt) / 2, P[i][1] - (ny * wdt) / 2]);
  }
  const f = (p: Pt) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  return `M${L.map(f).join(' L')} L${R.reverse().map(f).join(' L')} Z`;
}

// Draw-on progress on twos: `at` start frame, `dur` frames to finish.
export const drawProgress = (frame: number, at: number, dur: number) => {
  if (frame < at) return 0;
  return Math.min(1, (onTwos(frame - at) + 2) / dur);
};

export const Strokes: React.FC<{paths: Array<{seed: string; pts: Pt[]; at: number; dur: number; color?: string; min?: number; max?: number}>; w?: number; h?: number; style?: React.CSSProperties}> = ({
  paths,
  w = 1080,
  h = 1920,
  style,
}) => {
  const frame = useCurrentFrame();
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none', ...style}}>
      {paths.map((p) => (
        <path key={p.seed} d={strokeOutline(p.seed, p.pts, drawProgress(frame, p.at, p.dur), p.min, p.max)} fill={p.color ?? C.redPen} />
      ))}
    </svg>
  );
};

// ---- shape generators (all hand-wobbled) ----
export function loopAround(seed: string, cx: number, cy: number, rx: number, ry: number): Pt[] {
  const ctrl: Pt[] = [];
  const turns = 1.18; // overshoots its start like a real pen circle
  const n = 14;
  const a0 = -2.4 + signed(0.3, seed, 'a0');
  for (let i = 0; i <= n; i++) {
    const a = a0 + (i / n) * Math.PI * 2 * turns;
    const k = 1 + signed(0.07, seed, i) + (i / n) * 0.06;
    ctrl.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return smooth(ctrl);
}
export function wobblyLine(seed: string, a: Pt, b: Pt, wob = 4, n = 6): Pt[] {
  const ctrl: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    ctrl.push([a[0] + (b[0] - a[0]) * t + signed(wob, seed, i, 'x'), a[1] + (b[1] - a[1]) * t + signed(wob, seed, i, 'y')]);
  }
  return smooth(ctrl);
}
export function checkMark(seed: string, x: number, y: number, s = 1): Pt[] {
  return smooth([
    [x, y],
    [x + 18 * s + signed(3, seed, 1), y + 26 * s],
    [x + 30 * s, y + 42 * s + signed(3, seed, 2)],
    [x + 52 * s, y + 4 * s],
    [x + 78 * s + signed(4, seed, 3), y - 34 * s],
  ]);
}

// ---- Typewriter text (Special Elite) ----
export const Typed: React.FC<{
  text: string;
  at: number;
  charsPerPose?: number;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  seed?: string;
}> = ({text, at, charsPerPose = 1, size = 44, color = C.ink, style, seed = text}) => {
  const frame = useCurrentFrame();
  const shown = frame < at ? 0 : Math.min(text.length, (Math.floor((frame - at) / 2) + 1) * charsPerPose);
  return (
    <div style={{fontFamily: FONT.type, fontSize: size, color, whiteSpace: 'pre', lineHeight: 1.15, ...style}}>
      {[...text].map((ch, i) =>
        ch === '\n' ? (
          <br key={i} />
        ) : (
        <span
          key={i}
          style={{
            display: 'inline-block',
            visibility: i < shown ? 'visible' : 'hidden',
            // a real typewriter: uneven baseline and ink
            transform: `translateY(${signed(1.6, seed, i, 'y')}px) rotate(${signed(1.2, seed, i, 'r')}deg)`,
            opacity: 0.82 + hash(seed, i, 'ink') * 0.18,
            minWidth: ch === ' ' ? '0.5em' : undefined,
          }}
        >
          {ch}
        </span>
        ),
      )}
    </div>
  );
};

// ---- Fraunces headline, letters wobble ±1.5° on twos ----
export const Headline: React.FC<{text: string; size?: number; color?: string; seed: string; style?: React.CSSProperties; letterStyle?: (i: number) => React.CSSProperties}> = ({
  text,
  size = 140,
  color = C.ink,
  seed,
  style,
  letterStyle,
}) => {
  const hold = onTwos(useCurrentFrame());
  return (
    <div
      style={{
        fontFamily: FONT.head,
        fontWeight: 700,
        fontVariationSettings: "'SOFT' 100, 'WONK' 1",
        fontSize: size,
        letterSpacing: '-0.02em',
        lineHeight: 0.95,
        color,
        whiteSpace: 'pre',
        ...style,
      }}
    >
      {[...text].map((ch, i) => (
        <span key={i} style={{display: 'inline-block', transform: `rotate(${signed(1.5, seed, i, hold)}deg) translateY(${signed(1.5, seed, i, 'y', hold)}px)`, ...letterStyle?.(i)}}>
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </div>
  );
};

// ---- Highlighter swipe (multiply, 75%), grows on twos ----
export const Swipe: React.FC<{seed: string; x: number; y: number; w: number; h?: number; at: number; dur?: number; rot?: number}> = ({seed, x, y, w, h = 54, at, dur = 6, rot}) => {
  const frame = useCurrentFrame();
  const p = drawProgress(frame, at, dur);
  if (p <= 0) return null;
  const cur = w * p;
  const pts: string[] = [];
  const n = 8;
  for (let i = 0; i <= n; i++) pts.push(`${((i / n) * cur).toFixed(1)}px ${(hash(seed, 't', i) * 7).toFixed(1)}px`);
  pts.push(`${(cur + signed(6, seed, 'end')).toFixed(1)}px ${(h * 0.5).toFixed(1)}px`);
  for (let i = n; i >= 0; i--) pts.push(`${((i / n) * cur).toFixed(1)}px ${(h - hash(seed, 'b', i) * 7).toFixed(1)}px`);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w + 10,
        height: h,
        transform: `rotate(${rot ?? signed(1.6, seed, 'rot')}deg)`,
        transformOrigin: '0 50%',
        background: C.highlighter,
        opacity: 0.75,
        mixBlendMode: 'multiply',
        clipPath: `polygon(${pts.join(',')})`,
      }}
    />
  );
};
