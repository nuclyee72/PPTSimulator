import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { view } from '../../runtime';
import { useApp } from '../../store';
import { Box } from '../Boxes';
import { toon } from '../toon';

const UP = new THREE.Vector3(0.27, -0.21, -0.4);
const DOWN = new THREE.Vector3(0.24, -0.6, -0.35);
const PRESS_MS = 180;
const LED_ON = new THREE.Color('#fff0f3');
const LED_OFF = new THREE.Color('#ff4d6d');
const target = new THREE.Vector3();
const down = new THREE.Vector3();

/** Stick-shaped presentation remote held in the right hand. */
export function Clicker() {
  const group = useRef<THREE.Group>(null);
  const buttons = useRef<THREE.Group>(null);
  const led = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const { mode, lastClickAt } = useApp.getState();
    const active = mode === 'clicker';
    const k = 1 - Math.exp(-dt * 14);
    down.copy(DOWN).setX(DOWN.x * view.squeeze);
    target.copy(active ? UP : DOWN).setX((active ? UP : DOWN).x * view.squeeze);
    g.position.lerp(target, k);
    g.visible = g.position.distanceTo(down) > 0.02;

    const since = performance.now() - lastClickAt;
    const press = active && since < PRESS_MS ? Math.sin((since / PRESS_MS) * Math.PI) : 0;
    g.position.z -= press * 0.012;
    g.rotation.set(0.35 - press * 0.08, 0.18, -0.12);
    if (buttons.current) buttons.current.position.y = -press * 0.004;
    led.current?.color.copy(press > 0 ? LED_ON : LED_OFF);
  });

  return (
    <group ref={group} position={DOWN.toArray()} visible={false}>
      {/* Fist */}
      <Box p={[0, -0.01, 0.02]} size={[0.07, 0.065, 0.09]} color="#ffd3b6" radius={0.028} outline={0.003} />
      <Box p={[-0.034, 0.012, 0.0]} size={[0.02, 0.022, 0.05]} color="#ffd3b6" radius={0.009} outline={0.002} />
      {/* Stick body pointing forward */}
      <Box p={[0, 0.012, -0.05]} size={[0.03, 0.022, 0.17]} color="#3d405b" radius={0.01} outline={0.003} />
      <group ref={buttons}>
        <mesh position={[0, 0.025, -0.1]} material={toon('#ef476f')}>
          <cylinderGeometry args={[0.009, 0.009, 0.008, 16]} />
        </mesh>
        <mesh position={[0, 0.025, -0.07]} material={toon('#ffd166')}>
          <cylinderGeometry args={[0.006, 0.006, 0.008, 16]} />
        </mesh>
      </group>
      <mesh position={[0, 0.012, -0.137]}>
        <sphereGeometry args={[0.007, 12, 12]} />
        <meshBasicMaterial ref={led} color="#ff4d6d" toneMapped={false} />
      </mesh>
    </group>
  );
}
