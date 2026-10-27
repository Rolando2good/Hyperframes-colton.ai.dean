import React from 'react';
import {useCurrentFrame} from 'remotion';
import {jitter} from '../lib/rand';

// Moves a set of elements together with one hand-placed ±6px jitter (boiling on twos),
// plus an optional pose transform (slides, slams, sweeps).
export const Group: React.FC<{seed: string; dx?: number; dy?: number; rot?: number; scale?: number; origin?: string; children: React.ReactNode; amp?: number}> = ({
  seed,
  dx = 0,
  dy = 0,
  rot = 0,
  scale = 1,
  origin = '540px 960px',
  amp = 6,
  children,
}) => {
  const j = jitter(seed, useCurrentFrame(), amp);
  return (
    <div style={{position: 'absolute', inset: 0, transformOrigin: origin, transform: `translate(${j.x + dx}px, ${j.y + dy}px) rotate(${j.r + rot}deg) scale(${scale})`}}>
      {children}
    </div>
  );
};
