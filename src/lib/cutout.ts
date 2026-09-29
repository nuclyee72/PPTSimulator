import * as THREE from 'three';

const MAX_SIZE = 512;

export interface PuniSprite {
  texture: THREE.CanvasTexture;
  aspect: number; // width / height after cropping
  fill: number; // fraction of the cropped rectangle covered by the doll
  preview: string; // PNG data URL of the cut-out, for the setup screen
}

/**
 * Turns a product photo on a white background into a transparent sprite.
 * The background is flood-filled inward from the image border, so white areas inside
 * the doll (shirts, halos) are kept. Images that already have transparency are only cropped.
 */
async function cutout(url: string): Promise<PuniSprite> {
  const img = new Image();
  img.src = url;
  await img.decode();

  const scale = Math.min(1, MAX_SIZE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const src = document.createElement('canvas');
  src.width = w;
  src.height = h;
  const sctx = src.getContext('2d', { willReadFrequently: true })!;
  sctx.drawImage(img, 0, 0, w, h);
  const data = sctx.getImageData(0, 0, w, h);
  const px = data.data;

  const isBackground = (i: number) => {
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2], a = px[i * 4 + 3];
    if (a < 16) return true;
    const min = Math.min(r, g, b);
    return min >= 241 && Math.max(r, g, b) - min <= 14;
  };

  // 1) Flood fill from every border pixel.
  const bg = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let top = 0;
  const seed = (i: number) => {
    if (!bg[i] && isBackground(i)) {
      bg[i] = 1;
      stack[top++] = i;
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x);
    seed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    seed(y * w);
    seed(y * w + w - 1);
  }
  while (top > 0) {
    const i = stack[--top];
    const x = i % w;
    if (x > 0) seed(i - 1);
    if (x < w - 1) seed(i + 1);
    if (i >= w) seed(i - w);
    if (i < w * (h - 1)) seed(i + w);
  }

  // 2) Eat one ring of light, JPEG-blurred edge pixels so no white fringe remains.
  const fringe: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (bg[i]) continue;
    const x = i % w;
    const touchesBg = (x > 0 && bg[i - 1]) || (x < w - 1 && bg[i + 1]) || (i >= w && bg[i - w]) || (i < w * (h - 1) && bg[i + w]);
    if (touchesBg && Math.min(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]) >= 215) fringe.push(i);
  }
  for (const i of fringe) bg[i] = 1;

  // 3) Bleed edge colours outward into transparent pixels so mipmaps don't pull in white.
  const filled = Uint8Array.from(bg, (v) => (v ? 0 : 1));
  for (let pass = 0; pass < 6; pass++) {
    const next: [number, number][] = [];
    for (let i = 0; i < w * h; i++) {
      if (filled[i]) continue;
      const x = i % w;
      const n = x > 0 && filled[i - 1] ? i - 1 : x < w - 1 && filled[i + 1] ? i + 1 : i >= w && filled[i - w] ? i - w : i < w * (h - 1) && filled[i + w] ? i + w : -1;
      if (n >= 0) next.push([i, n]);
    }
    for (const [i, n] of next) {
      px[i * 4] = px[n * 4];
      px[i * 4 + 1] = px[n * 4 + 1];
      px[i * 4 + 2] = px[n * 4 + 2];
      filled[i] = 1;
    }
  }

  // 4) Apply alpha and find the bounding box of the doll.
  let minX = w, minY = h, maxX = -1, maxY = -1;
  let opaque = 0;
  for (let i = 0; i < w * h; i++) {
    if (bg[i]) {
      px[i * 4 + 3] = 0;
      continue;
    }
    opaque++;
    const x = i % w, y = (i - x) / w;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  sctx.putImageData(data, 0, 0);
  if (maxX < 0) [minX, minY, maxX, maxY] = [0, 0, w - 1, h - 1];

  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  out.getContext('2d')!.drawImage(src, minX, minY, cw, ch, 0, 0, cw, ch);

  const texture = new THREE.CanvasTexture(out);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, aspect: cw / ch, fill: opaque ? opaque / (cw * ch) : 1, preview: out.toDataURL('image/png') };
}

/**
 * Punis are sized by the area the doll covers, not the image height, so characters with tall
 * halos or ears don't come out smaller. This is the square root of that area in metres.
 */
const PUNI_SIZE = 0.6;

/** Display height in metres (width is height × aspect). */
export function puniHeight(s: Pick<PuniSprite, 'aspect' | 'fill'>): number {
  return PUNI_SIZE / Math.sqrt(s.aspect * s.fill);
}

const cache = new Map<string, Promise<PuniSprite>>();
export function loadPuniSprite(url: string): Promise<PuniSprite> {
  let p = cache.get(url);
  if (!p) {
    p = cutout(url);
    cache.set(url, p);
  }
  return p;
}

const setCache = new Map<string, Promise<PuniSprite[]>>();
/** Stable promise per list of URLs, so it can be passed to React's use(). */
export function loadPuniSprites(urls: string[]): Promise<PuniSprite[]> {
  const key = urls.join('|');
  let p = setCache.get(key);
  if (!p) {
    p = Promise.all(urls.map(loadPuniSprite));
    setCache.set(key, p);
  }
  return p;
}
