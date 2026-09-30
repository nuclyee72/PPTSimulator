import { Box, Boxes, type BoxItem, type Vec3 } from '../Boxes';
import { flat, toon } from '../toon';
import type { VenueDef } from './types';

const W = 9; // x: -4.5..4.5
const FRONT = 3;
const BACK = -8;
const H = 3.2;
const MID = (FRONT + BACK) / 2;
const DEPTH = FRONT - BACK;
const COLS = [-3.25, -1.95, -0.65, 0.65, 1.95, 3.25];
const ROWS = [0, 1, 2, 3, 4].map((r) => -1.9 - r * 1.15);

const seatsRaw = ROWS.flatMap((z, row) => COLS.map((x) => ({ p: [x, 0.46, z - 0.02] as Vec3, row })));

const CHAIR_COLORS = ['#8ecae6', '#ffb4a2'];
const chairsOf = (c: number) => seatsRaw.filter((_, i) => i % 2 === c);
const chairSeats = CHAIR_COLORS.map((_, c): BoxItem[] => chairsOf(c).map(({ p: [x, , z] }) => ({ p: [x, 0.43, z] })));
const chairBacks = CHAIR_COLORS.map((_, c): BoxItem[] =>
  chairsOf(c).map(({ p: [x, , z] }) => ({ p: [x, 0.76, z - 0.2], rx: -0.08 })),
);
const chairLegs: BoxItem[] = seatsRaw.flatMap(({ p: [x, , z] }) =>
  [-0.17, 0.17].flatMap((dx) => [-0.16, 0.16].map((dz) => ({ p: [x + dx, 0.21, z + dz] as Vec3 }))),
);
const deskTops: BoxItem[] = seatsRaw.map(({ p: [x, , z] }) => ({ p: [x, 0.73, z + 0.47] }));
const deskSides: BoxItem[] = seatsRaw.flatMap(({ p: [x, , z] }) =>
  [-0.28, 0.28].map((dx) => ({ p: [x + dx, 0.36, z + 0.47] as Vec3 })),
);
const deskShelves: BoxItem[] = seatsRaw.map(({ p: [x, , z] }) => ({ p: [x, 0.6, z + 0.5] }));

const floorLines: BoxItem[] = Array.from({ length: 11 }, (_, i) => ({ p: [-4 + i * 0.8, 0.002, MID] }));
const ceilingLights: BoxItem[] = [-2.2, 2.2].flatMap((x) => [0.5, -2.5, -5.5].map((z) => ({ p: [x, H - 0.03, z] as Vec3 })));
const chalk: BoxItem[] = [{ p: [-2.6, 0.91, FRONT - 0.12] }, { p: [-2.45, 0.91, FRONT - 0.1] }, { p: [-0.5, 0.91, FRONT - 0.12] }];
const WINDOW_ZS = [0.2, -2.8, -5.8];
const LOCKER_COLORS = ['#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff'];
const NOTE_COLORS = ['#ffadad', '#fdffb6', '#caffbf', '#a0c4ff', '#ffc6ff', '#ffd6a5'];
const LEAVES = [
  [0, 0.75, 0, 0.3],
  [0.15, 0.95, 0.05, 0.22],
  [-0.12, 0.9, -0.08, 0.2],
] as const;

function Room() {
  return (
    <group>
      {/* Floor, ceiling, walls */}
      <Box p={[0, -0.05, MID]} size={[W, 0.1, DEPTH]} color="#f2c58f" outline={false} radius={0.01} />
      <Boxes size={[0.03, 0.004, DEPTH]} color="#e0ad74" outline={false} radius={0.001} items={floorLines} />
      <Box p={[0, H + 0.05, MID]} size={[W, 0.1, DEPTH]} color="#fffaf0" outline={false} radius={0.01} />
      <Boxes size={[1.3, 0.05, 0.6]} color="#fffdf5" unlit items={ceilingLights} />
      <Box p={[0, H / 2, BACK - 0.1]} size={[W, H, 0.2]} color="#fff1dc" outline={false} radius={0.01} />
      <Box p={[0, H / 2, FRONT + 0.1]} size={[W, H, 0.2]} color="#fff1dc" outline={false} radius={0.01} />
      <Box p={[-W / 2 - 0.1, H / 2, MID]} size={[0.2, H, DEPTH]} color="#fff1dc" outline={false} radius={0.01} />
      <Box p={[W / 2 + 0.1, H / 2, MID]} size={[0.2, H, DEPTH]} color="#fff1dc" outline={false} radius={0.01} />
      {/* Wainscot */}
      <Box p={[-W / 2 + 0.02, 0.45, MID]} size={[0.08, 0.9, DEPTH]} color="#ffd6a5" radius={0.02} outline={false} />
      <Box p={[W / 2 - 0.02, 0.45, MID]} size={[0.08, 0.9, DEPTH]} color="#ffd6a5" radius={0.02} outline={false} />
      <Box p={[0, 0.45, BACK + 0.02]} size={[W, 0.9, 0.08]} color="#ffd6a5" radius={0.02} outline={false} />

      {/* Windows on the left wall */}
      {WINDOW_ZS.map((z) => (
        <group key={z} position={[-W / 2 + 0.03, 1.85, z]}>
          <mesh rotation={[0, Math.PI / 2, 0]} material={flat('#bde0fe')}>
            <planeGeometry args={[2.0, 1.4]} />
          </mesh>
          <Box p={[0.02, 0, 0]} size={[0.06, 1.5, 0.08]} color="#ffffff" />
          <Box p={[0.02, 0, 0]} size={[0.06, 0.06, 2.1]} color="#ffffff" />
          <Box p={[0.02, 0.73, 0]} size={[0.07, 0.08, 2.1]} color="#ffffff" />
          <Box p={[0.02, -0.73, 0]} size={[0.1, 0.08, 2.2]} color="#ffffff" />
          <Box p={[0.04, 0, 1.12]} size={[0.06, 1.55, 0.3]} color="#ffc8dd" radius={0.03} />
          <Box p={[0.04, 0, -1.12]} size={[0.06, 1.55, 0.3]} color="#ffc8dd" radius={0.03} />
        </group>
      ))}

      {/* Blackboard, chalk tray and clock on the front wall */}
      <Box p={[-1.4, 1.65, FRONT - 0.03]} size={[4.4, 1.5, 0.06]} color="#c8956d" radius={0.03} />
      <Box p={[-1.4, 1.65, FRONT - 0.07]} size={[4.2, 1.3, 0.03]} color="#3f7a63" radius={0.01} outline={false} />
      <Box p={[-1.4, 0.88, FRONT - 0.12]} size={[4.2, 0.04, 0.12]} color="#c8956d" radius={0.015} />
      <Boxes size={[0.08, 0.02, 0.02]} color="#ffffff" radius={0.008} outline={false} items={chalk} />
      <group position={[0.6, 2.75, FRONT - 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh material={toon('#ffffff')}>
          <cylinderGeometry args={[0.22, 0.22, 0.05, 32]} />
        </mesh>
        <mesh material={toon('#ef476f')} position={[0, -0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.22, 0.025, 8, 32]} />
        </mesh>
        <Box p={[0, -0.03, -0.06]} size={[0.02, 0.01, 0.13]} color="#4a3b52" outline={false} radius={0.004} />
        <Box p={[0.05, -0.03, 0]} size={[0.1, 0.01, 0.02]} color="#4a3b52" outline={false} radius={0.004} />
      </group>

      {/* Door and bulletin board on the right wall */}
      <Box p={[W / 2 - 0.04, 1.05, 1.6]} size={[0.08, 2.1, 1.0]} color="#d4a373" radius={0.03} />
      <Box p={[W / 2 - 0.09, 1.0, 1.25]} size={[0.06, 0.06, 0.12]} color="#ffd166" radius={0.02} />
      <Box p={[W / 2 - 0.04, 1.75, -3]} size={[0.06, 1.1, 2.6]} color="#e9c46a" radius={0.02} />
      {NOTE_COLORS.map((c, i) => (
        <Box key={c} p={[W / 2 - 0.09, 1.95 - (i % 2) * 0.45, -4 + i * 0.4]} size={[0.02, 0.32, 0.26]} color={c} radius={0.005} outline={0.004} />
      ))}

      {/* Lockers on the back wall */}
      {LOCKER_COLORS.map((c, i) => (
        <Box key={c} p={[-3.5 + i * 1.0, 0.55, BACK + 0.3]} size={[0.95, 1.1, 0.45]} color={c} radius={0.04} />
      ))}

      {/* Plant in the corner */}
      <group position={[-3.9, 0, 2.4]}>
        <mesh material={toon('#e76f51')} position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.2, 0.15, 0.5, 16]} />
        </mesh>
        {LEAVES.map(([x, y, z, r], i) => (
          <mesh key={i} material={toon('#80b918')} position={[x, y, z]}>
            <icosahedronGeometry args={[r, 1]} />
          </mesh>
        ))}
      </group>

      {/* Desks and chairs */}
      <Boxes size={[0.66, 0.04, 0.46]} color="#f7b267" items={deskTops} />
      <Boxes size={[0.04, 0.72, 0.4]} color="#7fb3d5" items={deskSides} radius={0.015} outline={0.005} />
      <Boxes size={[0.56, 0.02, 0.36]} color="#7fb3d5" items={deskShelves} radius={0.008} outline={0.004} />
      {CHAIR_COLORS.map((c, i) => (
        <group key={c}>
          <Boxes size={[0.42, 0.05, 0.4]} color={c} items={chairSeats[i]} />
          <Boxes size={[0.42, 0.34, 0.04]} color={c} items={chairBacks[i]} />
        </group>
      ))}
      <Boxes size={[0.035, 0.42, 0.035]} color="#6c757d" items={chairLegs} radius={0.012} outline={0.004} />
    </group>
  );
}

export const classroom: VenueDef = {
  id: 'classroom',
  name: 'Classroom',
  emoji: '🏫',
  description: 'Cozy classroom · up to 30 seats',
  presenter: [-0.2, 1.6, 1.3],
  seats: seatsRaw.map((s) => s.p),
  screen: { center: [1.9, 1.85, FRONT - 0.2], width: 3.0, rotY: Math.PI, projector: [1.9, H - 0.35, -1.5] },
  podium: { p: [0.42, 0, 0.45], ry: 0 },
  background: '#fff1dc',
  Room,
};
