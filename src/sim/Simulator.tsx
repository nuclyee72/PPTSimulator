import { Canvas } from '@react-three/fiber';
import { Suspense, useState } from 'react';
import { useApp } from '../store';
import { Audience } from './Audience';
import { CameraRig } from './CameraRig';
import { Hands } from './hands/Hands';
import { Hud } from './Hud';
import { Podium } from './Podium';
import { ProjectorScreen, useSlideTexture } from './ProjectorScreen';
import { usePresenterInput } from './usePresenterInput';
import { VENUES } from './venues';

function Scene() {
  const venue = VENUES[useApp((s) => s.venue)];
  const puniCount = useApp((s) => s.puniCount);
  const aspect = useApp((s) => s.slideAspect);
  const slideTexture = useSlideTexture();
  const { Room } = venue;

  return (
    <>
      <color attach="background" args={[venue.background]} />
      <hemisphereLight args={['#fff8ee', '#ffe3d1', 2.0]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[-6, 8, 3]} intensity={1.6} />

      <Room />
      <ProjectorScreen texture={slideTexture} aspect={aspect} {...venue.screen} />
      <Podium {...venue.podium} texture={slideTexture} aspect={aspect} />
      <Suspense fallback={null}>
        <Audience seats={venue.seats} count={puniCount} presenter={venue.presenter} />
      </Suspense>

      <CameraRig position={venue.presenter} />
      <Hands />
    </>
  );
}

export function Simulator() {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  usePresenterInput(canvas);

  return (
    <div id="sim">
      <Canvas
        camera={{ fov: 62, near: 0.02, far: 100 }}
        dpr={[1, 2]}
        onCreated={({ gl }) => setCanvas(gl.domElement)}
      >
        <Scene />
      </Canvas>
      <Hud />
    </div>
  );
}
