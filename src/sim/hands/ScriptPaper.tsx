import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { wrapText } from '../../lib/text';
import { scriptScroll, view } from '../../runtime';
import { useApp } from '../../store';
import { Box } from '../Boxes';

const PAPER_W = 0.23;
const PAPER_H = PAPER_W * 1.414;
const UP = new THREE.Vector3(-0.03, -0.085, -0.43);
const DOWN = new THREE.Vector3(-0.1, -0.75, -0.4);
const HOLD_DELAY_MS = 250; // a quick tap on a touch scroll button nudges; holding it scrolls continuously
const HOLD_SPEED = 900; // px of script canvas per second
const target = new THREE.Vector3();
const down = new THREE.Vector3();

const CW = 1024;
const CH = Math.round(CW * 1.414);
const MARGIN_X = 96;
const TOP = 150;
const BOTTOM = 70;
const FONT_PX = 40;
const LINE_H = 64;
const FONT_FAMILY = '"Gowun Dodum", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';

/** A line like "# 2. 문제 제기" or "[슬라이드 3]" is drawn as a highlighted heading. */
const isHeading = (line: string) => /^\s*#/.test(line) || /^\s*\[.*\]\s*$/.test(line);

/** Script on a clipboard held in the left hand; the text is drawn to a canvas and re-drawn as it scrolls. */
export function ScriptPaper() {
  const script = useApp((s) => s.script);
  const scriptName = useApp((s) => s.scriptName);
  const group = useRef<THREE.Group>(null);
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    document.fonts.load(`${FONT_PX}px "Gowun Dodum"`).finally(() => setFontsReady(true));
  }, []);

  const { ctx, texture } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = CW;
    canvas.height = CH;
    const ctx = canvas.getContext('2d')!;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return { ctx, texture };
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);

  const lines = useMemo(() => {
    ctx.font = `${FONT_PX}px ${FONT_FAMILY}`;
    const text = script.trim() ? script : '대본 파일을 올리지 않았어요.\n\n설정 화면에서 .txt 대본을 추가하면 여기에 표시됩니다.';
    return wrapText(ctx, text, CW - MARGIN_X - 70);
  }, [script, ctx, fontsReady]);

  const viewH = CH - TOP - BOTTOM;
  const drawnAt = useRef(NaN);
  useEffect(() => {
    scriptScroll.max = Math.max(0, lines.length * LINE_H - viewH + LINE_H);
    scriptScroll.target = Math.min(scriptScroll.target, scriptScroll.max);
    drawnAt.current = NaN; // force a redraw
  }, [lines, viewH]);

  const draw = (offset: number) => {
    ctx.fillStyle = '#fffdf6';
    ctx.fillRect(0, 0, CW, CH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, TOP - 10, CW, viewH + 10);
    ctx.clip();
    // Ruled notebook lines scroll with the text.
    const first = Math.floor(offset / LINE_H);
    for (let i = first; i < first + Math.ceil(viewH / LINE_H) + 2; i++) {
      const y = TOP + i * LINE_H - offset;
      ctx.fillStyle = '#dbe7fb';
      ctx.fillRect(40, y + LINE_H - 12, CW - 80, 2);
      const line = lines[i];
      if (line === undefined) continue;
      const heading = isHeading(line);
      ctx.font = `${heading ? 'bold ' : ''}${FONT_PX}px ${FONT_FAMILY}`;
      ctx.fillStyle = heading ? '#e76f51' : '#3b2f3f';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(heading ? line.replace(/^\s*#+\s*/, '') : line, MARGIN_X, y + LINE_H - 22);
    }
    ctx.restore();

    ctx.fillStyle = '#ffb4a2';
    ctx.fillRect(72, TOP - 10, 3, viewH + 10);

    // Header
    ctx.font = `bold 34px ${FONT_FAMILY}`;
    ctx.fillStyle = '#9d8189';
    ctx.fillText(`📄 ${scriptName || '대본'}`, 48, 104);
    ctx.fillStyle = '#f1e3d3';
    ctx.fillRect(40, 124, CW - 80, 3);

    // Scrollbar
    if (scriptScroll.max > 0) {
      const trackH = viewH - 20;
      const thumbH = Math.max(60, (trackH * viewH) / (viewH + scriptScroll.max));
      const y = TOP + (trackH - thumbH) * (offset / scriptScroll.max);
      ctx.fillStyle = '#f1e3d3';
      roundRect(ctx, CW - 40, TOP, 14, trackH, 7);
      ctx.fillStyle = '#ffafcc';
      roundRect(ctx, CW - 40, y, 14, thumbH, 7);
    }
    texture.needsUpdate = true;
  };

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const active = useApp.getState().mode === 'script';
    const k = 1 - Math.exp(-dt * 12);
    down.copy(DOWN).setX(DOWN.x * view.squeeze);
    target.copy(active ? UP : DOWN).setX((active ? UP : DOWN).x * view.squeeze);
    g.position.lerp(target, k);
    g.rotation.set(-0.22 + (1 - Math.min(1, g.position.distanceTo(down) / 0.3)) * -0.6, 0.06, 0.03);
    g.visible = g.position.distanceTo(down) > 0.02;

    if (scriptScroll.hold && performance.now() - scriptScroll.holdSince > HOLD_DELAY_MS) {
      scriptScroll.target += scriptScroll.hold * HOLD_SPEED * dt;
    }
    scriptScroll.target = Math.min(Math.max(scriptScroll.target, 0), scriptScroll.max);
    scriptScroll.current += (scriptScroll.target - scriptScroll.current) * (1 - Math.exp(-dt * 14));
    if (g.visible && !(Math.abs(scriptScroll.current - drawnAt.current) < 0.5)) {
      drawnAt.current = scriptScroll.current;
      draw(scriptScroll.current);
    }
  });

  return (
    <group ref={group} position={DOWN.toArray()} visible={false}>
      {/* Clipboard */}
      <Box p={[0, -0.006, -0.006]} size={[PAPER_W + 0.024, PAPER_H + 0.03, 0.008]} color="#d4a373" radius={0.004} outline={0.002} />
      <Box p={[0, PAPER_H / 2 + 0.004, 0.002]} size={[0.08, 0.025, 0.012]} color="#adb5bd" radius={0.005} outline={0.002} />
      <mesh position={[0, -0.008, 0]}>
        <planeGeometry args={[PAPER_W, PAPER_H]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* Thumbs */}
      <Box p={[-PAPER_W / 2 + 0.005, -0.06, 0.012]} size={[0.024, 0.05, 0.02]} color="#ffd3b6" radius={0.009} outline={0.002} rx={0} />
      <Box p={[PAPER_W / 2 - 0.005, -0.09, 0.012]} size={[0.024, 0.05, 0.02]} color="#ffd3b6" radius={0.009} outline={0.002} />
    </group>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}
