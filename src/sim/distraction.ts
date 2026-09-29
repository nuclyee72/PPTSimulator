import type { Vec3 } from './Boxes';

/** Share of the audience that pairs up to chat when distraction mode is on. */
const CHATTY_SHARE = 0.3;
/** Pairs only form between Punis within this distance (front/back neighbours count double). */
const PAIR_RANGE = 1.6;
/** Max head turn toward the partner; flat sprites turned further would go edge-on and vanish. */
const MAX_TURN = 1.05;
const FADE = 0.6; // seconds to turn toward / away from the partner

export interface Pair {
  a: number;
  b: number;
  period: number; // one chat + attention cycle, in seconds
  duty: number; // fraction of the period spent chatting
  offset: number;
}

export interface Chat {
  pair: Pair;
  turn: number; // yaw offset toward the partner (radians, clamped)
  toward: [number, number]; // unit XZ direction to the partner
}

/** Pairs up nearby Punis (same-row neighbours first) and staggers when each pair chats. */
export function pairUp(seats: Vec3[], baseYaws: number[], rand: () => number) {
  const n = seats.length;
  const maxPairs = n >= 2 ? Math.max(1, Math.round((n * CHATTY_SHARE) / 2)) : 0;
  const order = seats.map((_, i) => i).sort(() => rand() - 0.5);
  const taken = new Set<number>();
  const pairs: Pair[] = [];

  for (const i of order) {
    if (pairs.length >= maxPairs) break;
    if (taken.has(i)) continue;
    let best = -1;
    let bestD = PAIR_RANGE;
    for (let j = 0; j < n; j++) {
      if (j === i || taken.has(j)) continue;
      const d = Math.hypot(seats[j][0] - seats[i][0], (seats[j][2] - seats[i][2]) * 2);
      if (d < bestD) {
        best = j;
        bestD = d;
      }
    }
    if (best < 0) continue;
    taken.add(i).add(best);
    const period = 9 + rand() * 7;
    pairs.push({ a: i, b: best, period, duty: 0.4 + rand() * 0.2, offset: rand() * period });
  }

  const chats = new Map<number, Chat>();
  const link = (pair: Pair, me: number, other: number) => {
    const dx = seats[other][0] - seats[me][0];
    const dz = seats[other][2] - seats[me][2];
    const len = Math.hypot(dx, dz) || 1;
    const delta = wrapAngle(Math.atan2(dx, dz) - baseYaws[me]);
    chats.set(me, { pair, turn: Math.max(-MAX_TURN, Math.min(MAX_TURN, delta)), toward: [dx / len, dz / len] });
  };
  for (const pair of pairs) {
    link(pair, pair.a, pair.b);
    link(pair, pair.b, pair.a);
  }
  return { pairs, chats };
}

/** 0..1: how far into a chat this pair is at time t, eased at both ends. */
export function chatWeight(pair: Pair, t: number): number {
  const u = mod(t + pair.offset, pair.period);
  const on = pair.period * pair.duty;
  if (u >= on) return 0;
  const x = Math.min(1, Math.min(u, on - u) / FADE);
  return x * x * (3 - 2 * x);
}

function mod(a: number, b: number) {
  return ((a % b) + b) % b;
}

function wrapAngle(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}
