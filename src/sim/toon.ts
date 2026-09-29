import * as THREE from 'three';

// Casual cel-shaded look: 3-step toon ramp + inverted-hull outlines.

let gradient: THREE.DataTexture | null = null;
function gradientMap() {
  if (!gradient) {
    gradient = new THREE.DataTexture(new Uint8Array([150, 210, 255]), 3, 1, THREE.RedFormat);
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
    gradient.needsUpdate = true;
  }
  return gradient;
}

const toonCache = new Map<string, THREE.MeshToonMaterial>();
export function toon(color: string): THREE.MeshToonMaterial {
  let m = toonCache.get(color);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color, gradientMap: gradientMap() });
    toonCache.set(color, m);
  }
  return m;
}

const flatCache = new Map<string, THREE.MeshBasicMaterial>();
/** Unlit color, for glowing things like windows and ceiling lights. */
export function flat(color: string): THREE.MeshBasicMaterial {
  let m = flatCache.get(color);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    flatCache.set(color, m);
  }
  return m;
}

export const OUTLINE_COLOR = '#4a3b52';
const outlineCache = new Map<number, THREE.MeshBasicMaterial>();
export function outline(thickness = 0.008): THREE.MeshBasicMaterial {
  let m = outlineCache.get(thickness);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color: OUTLINE_COLOR, side: THREE.BackSide });
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `vec3 transformed = position + normal * ${thickness.toFixed(4)};`,
      );
    };
    m.customProgramCacheKey = () => `outline-${thickness}`;
    outlineCache.set(thickness, m);
  }
  return m;
}
