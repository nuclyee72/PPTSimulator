import { useFrame } from '@react-three/fiber';
import { use, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { loadPuniSprites, puniHeight, type PuniSprite } from '../lib/cutout';
import { distraction } from '../runtime';
import { useApp } from '../store';
import type { Vec3 } from './Boxes';
import { chatWeight, pairUp, type Chat } from './distraction';
import { mulberry32 } from './venues/types';

const HOP_HEIGHT = 0.12;
const HOP_TIME = 0.4;

interface Person {
  p: Vec3;
  kind: number;
  yaw: number;
  phase: number;
  speed: number;
  tint: number;
  hopDelay: number;
  hopChance: number;
  chat?: Chat; // set for Punis that chat with a neighbour in distraction mode
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Punis sit in random seats; every character appears about equally often. */
export function Audience({ seats, count, presenter }: { seats: Vec3[]; count: number; presenter: Vec3 }) {
  const urls = useApp((s) => s.puniImages);
  const seed = useApp((s) => s.seatSeed);
  const sprites = use(loadPuniSprites(urls));

  const n = Math.min(count, seats.length);
  const groups = useMemo(() => {
    const rand = mulberry32(seed);
    const chosen = shuffle([...seats], rand).slice(0, n);
    const kinds = shuffle(Array.from({ length: n }, (_, i) => i % sprites.length), rand);
    const people: Person[] = chosen.map((p, i) => ({
      p,
      kind: kinds[i],
      yaw: Math.atan2(presenter[0] - p[0], presenter[2] - p[2]),
      phase: rand() * Math.PI * 2,
      speed: 1.6 + rand() * 0.8,
      tint: 0.95 + rand() * 0.05,
      hopDelay: rand() * 0.35,
      hopChance: rand(),
    }));
    const { chats } = pairUp(chosen, people.map((pp) => pp.yaw), rand);
    chats.forEach((chat, i) => (people[i].chat = chat));
    return sprites.map((_, kind) => people.filter((pp) => pp.kind === kind));
  }, [seats, n, presenter, seed, sprites]);

  // Ease the on/off switch so Punis turn away and back smoothly.
  useFrame((_, dt) => {
    const target = useApp.getState().distraction ? 1 : 0;
    distraction.mix += (target - distraction.mix) * (1 - Math.exp(-dt * 3));
  });

  return (
    <>
      {groups.map((people, kind) => (
        <PuniGroup key={kind} sprite={sprites[kind]} people={people} />
      ))}
    </>
  );
}

/** All Punis of one character in a single instanced draw call, with idle wobble and hops on slide change. */
function PuniGroup({ sprite, people }: { sprite: PuniSprite; people: Person[] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.translate(0, 0.5, 0); // pivot at the bottom so squash-and-stretch stays seated
    return g;
  }, []);

  useLayoutEffect(() => {
    const c = new THREE.Color();
    people.forEach((pp, i) => mesh.current?.setColorAt(i, c.setScalar(pp.tint)));
    if (mesh.current?.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [people]);

  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), s: new THREE.Vector3(), v: new THREE.Vector3() }),
    [],
  );

  const h = puniHeight(sprite);

  useFrame(({ clock }) => {
    const im = mesh.current;
    if (!im) return;
    const t = clock.elapsedTime;
    const { lastSlideChangeAt } = useApp.getState();
    const sinceChange = (performance.now() - lastSlideChangeAt) / 1000;
    // About a third of the audience hops when the slide changes; which third varies each time.
    const hopSeed = (lastSlideChangeAt * 0.618) % 1;
    people.forEach((pp, i) => {
      const wobble = Math.sin(t * pp.speed + pp.phase);
      let hop = 0;
      if ((pp.hopChance + hopSeed) % 1 < 0.33) {
        const ht = sinceChange - pp.hopDelay;
        if (ht > 0 && ht < HOP_TIME) hop = Math.sin((ht / HOP_TIME) * Math.PI);
      }
      // Distraction: turn and lean toward the partner, giggling, for a few seconds at a time.
      const c = pp.chat;
      const w = c ? distraction.mix * chatWeight(c.pair, t) : 0;
      const giggle = w * Math.sin(t * 11 + pp.phase);
      const squash = 1 + wobble * 0.025 - hop * 0.06 + giggle * 0.03;
      const roll = Math.sin(t * 0.7 + pp.phase) * 0.04 + (c ? -Math.sign(c.turn) * 0.26 * w + giggle * 0.06 : 0);
      tmp.s.set(h * sprite.aspect * (2 - squash), h * squash, 1);
      tmp.q.setFromEuler(tmp.e.set(0, pp.yaw + (c ? c.turn * w : 0), roll));
      tmp.v.set(pp.p[0], pp.p[1] + hop * HOP_HEIGHT, pp.p[2]);
      if (c) {
        tmp.v.x += c.toward[0] * 0.09 * w;
        tmp.v.z += c.toward[1] * 0.09 * w;
      }
      im.setMatrixAt(i, tmp.m.compose(tmp.v, tmp.q, tmp.s));
    });
    im.instanceMatrix.needsUpdate = true;
  });

  if (people.length === 0) return null;
  return (
    <instancedMesh key={people.length} ref={mesh} args={[geometry, undefined, people.length]} frustumCulled={false}>
      <meshBasicMaterial map={sprite.texture} alphaTest={0.5} toneMapped={false} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}
