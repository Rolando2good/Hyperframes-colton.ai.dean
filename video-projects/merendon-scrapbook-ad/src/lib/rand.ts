// Seeded randomness + stop-motion timing helpers. No Math.random anywhere.

// Hold every pose for 2 frames (effective 15fps) — paper & stickers only.
export const onTwos = (frame: number) => Math.floor(frame / 2) * 2;

// Stable 0..1 hash of any list of seeds.
export function hash(...parts: Array<string | number>): number {
  let h = 2166136261;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

// -a..a
export const signed = (a: number, ...parts: Array<string | number>) => (hash(...parts) * 2 - 1) * a;

// ±6px total: a fixed "placed by hand" offset (±4) plus a per-hold boil (±2).
export function jitter(seed: string | number, frame: number, amp = 6) {
  const hold = onTwos(frame);
  const place = amp * (2 / 3);
  const boil = amp / 3;
  return {
    x: signed(place, seed, 'px') + signed(boil, seed, 'bx', hold),
    y: signed(place, seed, 'py') + signed(boil, seed, 'by', hold),
    r: signed(0.35, seed, 'br', hold),
  };
}

// Random rotation in [-4°, 4°] for a paper piece.
export const pieceRot = (seed: string | number) => signed(4, seed, 'rot');

// Pose index since `at` on twos (-1 before it starts).
export const poseSince = (frame: number, at: number) => (frame < at ? -1 : Math.floor((frame - at) / 2));

// Step through a list of poses on twos, holding the last.
export function stepPoses<T>(frame: number, at: number, poses: T[]): T | null {
  const i = poseSince(frame, at);
  if (i < 0) return null;
  return poses[Math.min(i, poses.length - 1)];
}
