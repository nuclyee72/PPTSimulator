import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { flat, outline as outlineMat, toon } from './toon';

export type Vec3 = [number, number, number];
export interface BoxItem {
  p: Vec3;
  ry?: number;
  rx?: number;
}

interface Props {
  size: Vec3;
  items: BoxItem[];
  color: string;
  radius?: number;
  outline?: number | false;
  unlit?: boolean;
}

/** Many identical rounded boxes in one draw call (plus one for the outline hull). */
export function Boxes({ size, items, color, radius = 0.03, outline = 0.008, unlit = false }: Props) {
  const geom = useMemo(() => {
    const r = Math.max(0.001, Math.min(radius, Math.min(...size) / 2 - 0.001));
    return new RoundedBoxGeometry(size[0], size[1], size[2], 2, r);
  }, [size[0], size[1], size[2], radius]);
  const body = useRef<THREE.InstancedMesh>(null);
  const hull = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const one = new THREE.Vector3(1, 1, 1);
    const pos = new THREE.Vector3();
    items.forEach((it, i) => {
      q.setFromEuler(e.set(it.rx ?? 0, it.ry ?? 0, 0));
      m.compose(pos.set(...it.p), q, one);
      body.current?.setMatrixAt(i, m);
      hull.current?.setMatrixAt(i, m);
    });
    if (body.current) body.current.instanceMatrix.needsUpdate = true;
    if (hull.current) hull.current.instanceMatrix.needsUpdate = true;
  }, [items]);

  useLayoutEffect(() => () => geom.dispose(), [geom]);

  return (
    <>
      <instancedMesh
        key={`b${items.length}`}
        ref={body}
        args={[geom, unlit ? flat(color) : toon(color), items.length]}
        frustumCulled={false}
      />
      {outline !== false && (
        <instancedMesh key={`o${items.length}`} ref={hull} args={[geom, outlineMat(outline), items.length]} frustumCulled={false} />
      )}
    </>
  );
}

/** Convenience for a single box. */
export function Box(props: Omit<Props, 'items'> & BoxItem) {
  const { p, rx, ry, ...rest } = props;
  const items = useMemo(() => [{ p, rx, ry }], [p[0], p[1], p[2], rx, ry]);
  return <Boxes {...rest} items={items} />;
}
