import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect } from 'react';
import { look } from '../runtime';
import type { Vec3 } from './Boxes';

/** First-person head: position fixed at the podium, rotation driven by the mouse, with a gentle breathing sway. */
export function CameraRig({ position }: { position: Vec3 }) {
  const camera = useThree((s) => s.camera);

  useLayoutEffect(() => {
    camera.rotation.order = 'YXZ';
    look.yaw = 0;
    look.pitch = -0.08;
  }, [camera, position]);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const k = 1 - Math.exp(-dt * 18); // smooth, frame-rate independent follow
    camera.rotation.y += (look.yaw - camera.rotation.y) * k;
    camera.rotation.x += (look.pitch - camera.rotation.x) * k;
    camera.position.set(position[0] + Math.sin(t * 0.6) * 0.004, position[1] + Math.sin(t * 1.3) * 0.006, position[2]);
  });

  return null;
}
