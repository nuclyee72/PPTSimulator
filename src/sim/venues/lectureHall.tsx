import { Box, Boxes, type BoxItem, type Vec3 } from '../Boxes';
import type { VenueDef } from './types';

const HALF_W = 8; // x: -8..8
const FRONT = 4;
const BACK = -14;
const H = 7;
const MID = (FRONT + BACK) / 2;
const DEPTH = FRONT - BACK;
const ROW_COUNT = 10;
const ROW_DEPTH = 1.05;
const STEP = 0.32;
const rowZ = (r: number) => -2.4 - r * ROW_DEPTH;
const rowY = (r: number) => r * STEP;

/** Three seating blocks separated by aisles. */
const SECTIONS: [number, number][] = [
  [-7.2, -2.9],
  [-1.95, 1.95],
  [2.9, 7.2],
];
const SEAT_PITCH = 0.64;
const sectionSeatXs = SECTIONS.map(([a, b]) => {
  const n = Math.floor((b - a) / SEAT_PITCH);
  const start = (a + b) / 2 - ((n - 1) * SEAT_PITCH) / 2;
  return Array.from({ length: n }, (_, i) => start + i * SEAT_PITCH);
});

const seatsRaw = Array.from({ length: ROW_COUNT }, (_, row) =>
  sectionSeatXs.flat().map((x) => ({ p: [x, rowY(row) + 0.47, rowZ(row) - 0.22] as Vec3, row })),
).flat();

const rows = Array.from({ length: ROW_COUNT }, (_, r) => r);
const risers = rows.slice(1).map((r) => {
  const front = rowZ(r) + ROW_DEPTH / 2;
  const depth = front - BACK;
  return { r, p: [0, rowY(r) / 2, front - depth / 2] as Vec3, size: [HALF_W * 2, rowY(r), depth] as Vec3 };
});
const nosing: BoxItem[] = rows.slice(1).map((r) => ({ p: [0, rowY(r), rowZ(r) + ROW_DEPTH / 2] }));

const seatBottoms: BoxItem[] = seatsRaw.map(({ p: [x, y, z] }) => ({ p: [x, y - 0.03, z] }));
const seatBacks: BoxItem[] = seatsRaw.map(({ p: [x, y, z] }) => ({ p: [x, y + 0.28, z - 0.24], rx: -0.12 }));
const seatStands: BoxItem[] = seatsRaw.map(({ p: [x, y, z] }) => ({ p: [x, y - 0.25, z - 0.05] }));
const deskItems = (yOff: number, zOff: number) =>
  rows.flatMap((r) => SECTIONS.map(([a, b]) => ({ p: [(a + b) / 2, rowY(r) + yOff, rowZ(r) + zOff] as Vec3, w: b - a })));
const deskTops = deskItems(0.74, 0.28);
const deskFronts = deskItems(0.37, 0.47);

const slats: BoxItem[] = Array.from({ length: 14 }, (_, i) => BACK + 1 + i * 1.2).flatMap((z) => [
  { p: [-HALF_W + 0.06, 3.2, z] as Vec3 },
  { p: [HALF_W - 0.06, 3.2, z] as Vec3 },
]);
const ceilingLights: BoxItem[] = [-4, 0, 4].flatMap((x) => [1, -4, -9].map((z) => ({ p: [x, H - 0.05, z] as Vec3 })));
const RISER_COLORS = ['#d9c8f5', '#cdb8f0'];
const SECTION_SEAT_COLORS = ['#ff8fab', '#ffb703', '#ff8fab'];

function DeskRow({ items, height, depth, color }: { items: typeof deskTops; height: number; depth: number; color: string }) {
  // Each section has a different width, so group desks by width and draw one instanced set per width.
  const widths = [...new Set(items.map((d) => d.w))];
  return (
    <>
      {widths.map((w) => (
        <Boxes key={w} size={[w, height, depth]} color={color} radius={0.02} items={items.filter((d) => d.w === w)} />
      ))}
    </>
  );
}

function Seats() {
  // Colour seats by section for a playful look.
  const bySection = (arr: BoxItem[]) =>
    SECTIONS.map(([a, b]) => arr.filter((s) => s.p[0] >= a - 0.01 && s.p[0] <= b + 0.01));
  const bottoms = bySection(seatBottoms);
  const backs = bySection(seatBacks);
  return (
    <>
      {SECTIONS.map((_, i) => (
        <group key={i}>
          <Boxes size={[0.52, 0.08, 0.46]} color={SECTION_SEAT_COLORS[i]} radius={0.035} items={bottoms[i]} />
          <Boxes size={[0.52, 0.5, 0.07]} color={SECTION_SEAT_COLORS[i]} radius={0.035} items={backs[i]} />
        </group>
      ))}
      <Boxes size={[0.08, 0.44, 0.08]} color="#6c757d" radius={0.02} outline={0.004} items={seatStands} />
    </>
  );
}

function Room() {
  return (
    <group>
      {/* Stage / floor / ceiling / walls */}
      <Box p={[0, -0.05, MID]} size={[HALF_W * 2, 0.1, DEPTH]} color="#b8a1d9" outline={false} radius={0.01} />
      <Box p={[0, -0.04, 1.5]} size={[HALF_W * 2, 0.1, 5]} color="#e6b98a" outline={false} radius={0.01} />
      <Box p={[0, H + 0.05, MID]} size={[HALF_W * 2, 0.1, DEPTH]} color="#fff8ec" outline={false} radius={0.01} />
      <Boxes size={[2.4, 0.08, 0.5]} color="#fffdf5" unlit items={ceilingLights} />
      <Box p={[0, H / 2, BACK - 0.1]} size={[HALF_W * 2, H, 0.2]} color="#fdf0d5" outline={false} radius={0.01} />
      <Box p={[0, H / 2, FRONT + 0.1]} size={[HALF_W * 2, H, 0.2]} color="#fdf0d5" outline={false} radius={0.01} />
      <Box p={[-HALF_W - 0.1, H / 2, MID]} size={[0.2, H, DEPTH]} color="#fdf0d5" outline={false} radius={0.01} />
      <Box p={[HALF_W + 0.1, H / 2, MID]} size={[0.2, H, DEPTH]} color="#fdf0d5" outline={false} radius={0.01} />
      <Boxes size={[0.1, 5, 0.5]} color="#e6b98a" radius={0.03} outline={false} items={slats} />
      {/* Front wall accent panel behind the screen */}
      <Box p={[0, 3.3, FRONT - 0.03]} size={[12, 4.8, 0.06]} color="#a0c4ff" radius={0.03} outline={false} />

      {/* Tiered floor */}
      {risers.map(({ r, p, size }) => (
        <Box key={r} p={p} size={size} color={RISER_COLORS[r % 2]} outline={false} radius={0.01} />
      ))}
      <Boxes size={[HALF_W * 2, 0.04, 0.08]} color="#ffd6a5" outline={false} radius={0.015} items={nosing} />

      {/* Desks and seats */}
      <DeskRow items={deskTops} height={0.04} depth={0.36} color="#ffd6a5" />
      <DeskRow items={deskFronts} height={0.74} depth={0.04} color="#e6b98a" />
      <Seats />
    </group>
  );
}

export const lectureHall: VenueDef = {
  id: 'lectureHall',
  name: '계단식 강의실',
  emoji: '🎓',
  description: `넓은 강의실 · 최대 ${seatsRaw.length}석`,
  presenter: [-2.2, 1.6, 1.4],
  seats: seatsRaw.map((s) => s.p),
  screen: { center: [1.6, 3.4, FRONT - 0.15], width: 6.2, rotY: Math.PI, projector: [1.6, H - 0.6, -5] },
  podium: { p: [-1.75, 0, 0.5], ry: 0 },
  background: '#fdf0d5',
  Room,
};
