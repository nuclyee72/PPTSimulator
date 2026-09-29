import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useApp } from '../store';
import { Box, type Vec3 } from './Boxes';
import { toon } from './toon';

let placeholder: HTMLCanvasElement | null = null;
/** Shown when no PDF was uploaded, so the screen isn't just blank. */
function placeholderSlide() {
  if (placeholder) return placeholder;
  const c = document.createElement('canvas');
  c.width = 1280;
  c.height = 720;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff4f6';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#ffd6e0';
  for (let y = 40; y < c.height; y += 80) for (let x = (y / 80) % 2 ? 80 : 40; x < c.width; x += 160) {
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#3b2f3f';
  ctx.font = '96px Jua, "Malgun Gothic", sans-serif';
  ctx.fillText('발표 자료 없음', c.width / 2, c.height / 2);
  ctx.fillStyle = '#9d8189';
  ctx.font = '40px "Gowun Dodum", "Malgun Gothic", sans-serif';
  ctx.fillText('대본과 말하기만 연습하는 중이에요 🎤', c.width / 2, c.height / 2 + 80);
  placeholder = c;
  return c;
}

/** One texture shared by the projector screen and the podium laptop, swapped when the slide changes. */
export function useSlideTexture() {
  const slides = useApp((s) => s.slides);
  const index = useApp((s) => s.slideIndex);
  const texture = useMemo(() => {
    const t = new THREE.Texture();
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
  useEffect(() => {
    texture.image = slides[index] ?? placeholderSlide();
    texture.needsUpdate = true;
  }, [slides, index, texture]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

interface Props {
  texture: THREE.Texture;
  aspect: number;
  center: Vec3;
  width: number;
  rotY: number;
  projector: Vec3;
}

export function ProjectorScreen({ texture, aspect, center, width, rotY, projector }: Props) {
  const height = width / aspect;
  const border = 0.08;

  // Faint light cone from the ceiling projector to the screen.
  const beam = useMemo(() => {
    const from = new THREE.Vector3(...projector);
    const to = new THREE.Vector3(...center);
    const dir = to.clone().sub(from);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize());
    const mid = from.clone().add(to).multiplyScalar(0.5);
    return { len, q, mid };
  }, [projector, center]);

  return (
    <>
      <group position={center} rotation={[0, rotY, 0]}>
        <Box p={[0, 0, -0.03]} size={[width + border * 2, height + border * 2, 0.04]} color="#f8f9fa" radius={0.02} />
        <Box p={[0, height / 2 + border + 0.05, -0.03]} size={[width + 0.4, 0.14, 0.14]} color="#adb5bd" radius={0.05} />
        <mesh position={[0, 0, 0.001]}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      </group>

      <group position={projector}>
        <Box p={[0, 0, 0]} size={[0.4, 0.16, 0.34]} color="#e9ecef" radius={0.04} />
        <Box p={[0, 0.2, 0]} size={[0.05, 0.3, 0.05]} color="#adb5bd" radius={0.015} outline={0.004} />
        <mesh position={[0, 0, 0.18]} rotation={[Math.PI / 2, 0, 0]} material={toon('#4a3b52')}>
          <cylinderGeometry args={[0.06, 0.06, 0.04, 16]} />
        </mesh>
      </group>
      <mesh position={beam.mid} quaternion={beam.q}>
        <cylinderGeometry args={[0.05, width * 0.4, beam.len, 24, 1, true]} />
        <meshBasicMaterial color="#fffbe6" transparent opacity={0.04} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
    </>
  );
}
