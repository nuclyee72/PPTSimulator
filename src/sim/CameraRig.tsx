import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect } from 'react';
import type * as THREE from 'three';
import { look, view } from '../runtime';
import type { Vec3 } from './Boxes';

const FOV = 62;

/** First-person head: position fixed at the podium, rotation driven by the mouse, with a gentle breathing sway. */
export function CameraRig({ position }: { position: Vec3 }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);

  useLayoutEffect(() => {
    camera.rotation.order = 'YXZ';
    look.yaw = 0;
    look.pitch = -0.08;
  }, [camera, position]);

  // Portrait phones: widen the view and pull the hands inward so the room and props still fit.
  useLayoutEffect(() => {
    const aspect = size.width / size.height;
    camera.fov = aspect >= 1 ? FOV : FOV + (1 - aspect) * 36;
    camera.updateProjectionMatrix();
    view.squeeze = Math.min(1, Math.max(0.35, aspect / 1.25));
  }, [camera, size]);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const k = 1 - Math.exp(-dt * 18); // smooth, frame-rate independent follow
    camera.rotation.y += (look.yaw - camera.rotation.y) * k;
    camera.rotation.x += (look.pitch - camera.rotation.x) * k;
    camera.position.set(position[0] + Math.sin(t * 0.6) * 0.004, position[1] + Math.sin(t * 1.3) * 0.006, position[2]);
  });

  return null;
}
