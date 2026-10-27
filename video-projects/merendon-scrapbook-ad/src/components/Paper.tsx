import React from 'react';
import {staticFile} from 'remotion';
import {hash, signed} from '../lib/rand';
import {C, SHADOW} from '../lib/theme';

type Edges = {top?: number; right?: number; bottom?: number; left?: number};

// Irregular torn outline as a CSS polygon (px). `rough` is the tear depth per edge.
export function tornPolygon(seed: string, w: number, h: number, rough: Edges = {}) {
  const r = {top: 6, right: 4, bottom: 6, left: 4, ...rough};
  const pts: string[] = [];
  const edge = (name: keyof Edges, n: number, fn: (t: number, d: number) => [number, number]) => {
    for (let i = 0; i < n; i++) {
      const t = i / n;
      // mostly shallow fibres, with the odd deeper bite
      const deep = hash(seed, name, i, 'd') > 0.9 ? 1.8 : 1;
      const d = hash(seed, name, i) * r[name]! * deep;
      const [x, y] = fn(t, d);
      pts.push(`${x.toFixed(1)}px ${y.toFixed(1)}px`);
    }
  };
  const step = 11;
  edge('top', Math.max(4, Math.round(w / step)), (t, d) => [t * w, d]);
  edge('right', Math.max(4, Math.round(h / step)), (t, d) => [w - d, t * h]);
  edge('bottom', Math.max(4, Math.round(w / step)), (t, d) => [w - t * w, h - d]);
  edge('left', Math.max(4, Math.round(h / step)), (t, d) => [d, h - t * h]);
  return `polygon(${pts.join(',')})`;
}

export type PieceProps = {
  seed: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rot?: number;
  color?: string;
  lined?: boolean;
  margin?: boolean;
  rough?: Edges;
  shadow?: boolean;
  style?: React.CSSProperties;
  innerStyle?: React.CSSProperties;
  children?: React.ReactNode;
};

const fiber = `url(${staticFile('textures/paper-fiber.png')})`;

// A torn paper piece. Shadow lives on the wrapper so the clip-path doesn't eat it.
export const Piece: React.FC<PieceProps> = ({seed, x, y, w, h, rot = 0, color = C.paper, lined, margin, rough, shadow = true, style, innerStyle, children}) => {
  const layers: string[] = [];
  if (margin) layers.push(`linear-gradient(to right, transparent 108px, ${C.margin} 108px, ${C.margin} 111px, transparent 111px)`);
  if (lined) layers.push(`repeating-linear-gradient(to bottom, transparent 0px, transparent 62px, ${C.rule} 62px, ${C.rule} 64px)`);
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, transform: `rotate(${rot}deg)`, filter: shadow ? SHADOW : undefined, ...style}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          clipPath: tornPolygon(seed, w, h, rough),
          backgroundColor: color,
          backgroundImage: layers.join(',') || undefined,
          ...innerStyle,
        }}
      >
        <div style={{position: 'absolute', inset: 0, backgroundImage: fiber, backgroundSize: '512px', mixBlendMode: 'multiply', opacity: 0.35}} />
        {children}
      </div>
    </div>
  );
};

// Washi tape strip with jagged (finger-torn) ends.
export const Tape: React.FC<{seed: string; x: number; y: number; w?: number; h?: number; rot?: number; tone?: 'salmon' | 'cream'; style?: React.CSSProperties}> = ({
  seed,
  x,
  y,
  w = 170,
  h = 52,
  rot,
  tone = 'cream',
  style,
}) => {
  const teeth = 7;
  const pts: string[] = [];
  for (let i = 0; i <= teeth; i++) pts.push(`${(i % 2 ? 7 : 0) + hash(seed, 'l', i) * 5}px ${(i / teeth) * h}px`);
  for (let i = teeth; i >= 0; i--) pts.push(`${w - (i % 2 ? 7 : 0) - hash(seed, 'r', i) * 5}px ${(i / teeth) * h}px`);
  const r = rot ?? signed(9, seed, 'tape-rot') + (hash(seed, 'flip') > 0.5 ? 38 : -38);
  return (
    <div
      style={{
        position: 'absolute',
        left: x - w / 2,
        top: y - h / 2,
        width: w,
        height: h,
        transform: `rotate(${r}deg)`,
        clipPath: `polygon(${pts.join(',')})`,
        background: tone === 'salmon' ? C.tapeSalmon : C.tapeCream,
        backgroundImage:
          'repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 3px, transparent 3px, transparent 9px)',
        boxShadow: 'inset 0 0 0 1px rgba(30,26,23,0.05)',
        ...style,
      }}
    />
  );
};

// Tape on the corners of something that just landed (slightly crooked, not all four).
export const CornerTapes: React.FC<{seed: string; x: number; y: number; w: number; h: number; tone?: 'salmon' | 'cream'; corners?: Array<'tl' | 'tr' | 'bl' | 'br'>}> = ({
  seed,
  x,
  y,
  w,
  h,
  tone,
  corners = ['tl', 'br'],
}) => (
  <>
    {corners.map((k) => {
      const cx = x + (k.includes('l') ? 0 : w) + signed(10, seed, k, 'x');
      const cy = y + (k.startsWith('t') ? 0 : h) + signed(8, seed, k, 'y');
      const base = k === 'tl' || k === 'br' ? -40 : 40;
      return <Tape key={k} seed={`${seed}-${k}`} x={cx} y={cy} rot={base + signed(8, seed, k, 'r')} tone={tone} />;
    })}
  </>
);
