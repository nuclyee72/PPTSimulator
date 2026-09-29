import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import type * as THREE from 'three';
import { Clicker } from './Clicker';
import { ScriptPaper } from './ScriptPaper';

/** Holds the first-person props in camera space. Mounted after CameraRig so the camera has already moved this frame. */
export function Hands() {
  const camera = useThree((s) => s.camera);
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    group.current?.position.copy(camera.position);
    group.current?.quaternion.copy(camera.quaternion);
  });
  return (
    <group ref={group}>
      <Clicker />
      <ScriptPaper />
    </group>
  );
}
