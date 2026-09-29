import type { FC } from 'react';
import type { Vec3 } from '../Boxes';

export interface VenueDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** Presenter eye position; yaw 0 looks toward -Z (the audience). */
  presenter: Vec3;
  /** Seat surface points; Punis pick a random subset. */
  seats: Vec3[];
  screen: { center: Vec3; width: number; rotY: number; projector: Vec3 };
  podium: { p: Vec3; ry: number };
  background: string;
  Room: FC;
}

/** Seeded PRNG so a seating shuffle stays the same until it is re-rolled. */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
