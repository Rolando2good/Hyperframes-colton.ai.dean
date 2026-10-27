import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {jitter, onTwos, pieceRot, signed, stepPoses} from '../lib/rand';
import {SHADOW} from '../lib/theme';

export type StickerName =
  | 'quetzal-panicking' | 'quetzal-sweating' | 'quetzal-side-eye' | 'quetzal-sunglasses' | 'quetzal-nodding'
  | 'mug-cracked' | 'alarm-clock' | 'badge-2am' | 'highlighters' | 'gold-star' | 'a-plus' | 'lightning' | 'heart';

// Slap-on: scale 0 → 1.15 → 1.0 across 6 frames (3 poses on twos) with a
// 4–8° rotation overshoot. Never fades.
export const Sticker: React.FC<{
  name: StickerName;
  x: number; // centre
  y: number;
  size: number;
  at: number;
  seed?: string;
  rot?: number;
  // per-hold rotation offset after landing (rattle, nod…)
  motion?: (pose: number, frame: number) => {r?: number; dx?: number; dy?: number};
}> = ({name, x, y, size, at, seed = name, rot, motion}) => {
  const frame = useCurrentFrame();
  const base = rot ?? pieceRot(seed) * 2;
  const overshoot = (signed(1, seed, 'os') > 0 ? 1 : -1) * (4 + Math.abs(signed(4, seed, 'osa')));
  const pose = stepPoses(frame, at, [
    {s: 0, r: base},
    {s: 1.15, r: base + overshoot},
    {s: 1, r: base},
  ]);
  if (!pose || pose.s === 0) return null;
  const j = jitter(seed, frame, 6);
  const m = frame >= at + 4 && motion ? motion(Math.floor((frame - at) / 2), onTwos(frame)) : {};
  return (
    <Img
      src={staticFile(`stickers/${name}.svg`)}
      style={{
        position: 'absolute',
        left: x - size / 2 + j.x + (m.dx ?? 0),
        top: y - size / 2 + j.y + (m.dy ?? 0),
        width: size,
        height: size,
        transform: `rotate(${pose.r + j.r + (m.r ?? 0)}deg) scale(${pose.s})`,
        filter: SHADOW,
      }}
    />
  );
};

// Paper-landing poses for pieces that slap down: a little big, then settle.
export function landPose(frame: number, at: number) {
  return stepPoses(frame, at, [
    {s: 1.08, dy: -10, shadow: 1.6},
    {s: 0.985, dy: 2, shadow: 0.9},
    {s: 1, dy: 0, shadow: 1},
  ]);
}
