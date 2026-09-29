import type * as THREE from 'three';
import { Box, type Vec3 } from './Boxes';
import { toon } from './toon';

const TOP = 1.05;
const LID_W = 0.36;
const LID_H = 0.23;
const LID_TILT = -0.35; // leaned back toward the audience side so the screen faces the presenter

/** Podium with a laptop showing the current slide, facing the presenter (+Z in local space). */
export function Podium({ p, ry, texture, aspect }: { p: Vec3; ry: number; texture: THREE.Texture; aspect: number }) {
  const screenH = LID_H - 0.03;
  const screenW = Math.min(LID_W - 0.03, screenH * aspect);
  return (
    <group position={p} rotation={[0, ry, 0]}>
      <Box p={[0, 0.5, 0]} size={[0.72, 1.0, 0.5]} color="#c8956d" radius={0.05} />
      <Box p={[0, 0.55, -0.26]} size={[0.5, 0.5, 0.03]} color="#ffd166" radius={0.1} outline={0.005} />
      <Box p={[0, TOP + 0.025, 0]} size={[0.82, 0.05, 0.58]} color="#e6b98a" radius={0.02} />

      {/* Laptop */}
      <group position={[-0.05, TOP + 0.05, 0.05]}>
        <Box p={[0, 0.01, 0]} size={[LID_W, 0.02, 0.25]} color="#dee2e6" radius={0.008} outline={0.004} />
        <group position={[0, 0.02, -0.12]} rotation={[LID_TILT, 0, 0]}>
          <Box p={[0, LID_H / 2, 0]} size={[LID_W, LID_H, 0.012]} color="#dee2e6" radius={0.005} outline={0.004} />
          <mesh position={[0, LID_H / 2, 0.0065]}>
            <planeGeometry args={[screenW, screenH]} />
            <meshBasicMaterial map={texture} toneMapped={false} />
          </mesh>
        </group>
      </group>

      {/* Water bottle and a sticky note, low enough not to block the view */}
      <mesh material={toon('#a0c4ff')} position={[0.3, TOP + 0.13, -0.05]}>
        <cylinderGeometry args={[0.03, 0.03, 0.16, 16]} />
      </mesh>
      <mesh material={toon('#ff8fab')} position={[0.3, TOP + 0.225, -0.05]}>
        <cylinderGeometry args={[0.018, 0.018, 0.03, 12]} />
      </mesh>
      <Box p={[0.28, TOP + 0.055, 0.17]} size={[0.08, 0.004, 0.08]} color="#fdffb6" radius={0.001} outline={0.002} ry={0.3} />
    </group>
  );
}
