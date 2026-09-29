import { useEffect } from 'react';
import { TOUCH_UI } from '../lib/device';
import { look, scriptScroll } from '../runtime';
import { useApp } from '../store';

const SENSITIVITY = 0.0022;
const TOUCH_SENSITIVITY = 0.0045;
const YAW_LIMIT = Math.PI * 0.95;
const PITCH_MIN = -1.0;
const PITCH_MAX = 0.7;
const WHEEL_STEP = 60; // accumulated deltaY needed for one slide step (one mouse notch is ~100)
const WHEEL_COOLDOWN_MS = 220;

/**
 * Mouse and keyboard controls while presenting.
 * Left click toggles clicker mode, right click toggles script mode; the wheel acts on whichever is in hand.
 * On touch devices dragging the canvas looks around instead, and the HUD provides the buttons.
 */
export function usePresenterInput(canvas: HTMLCanvasElement | null) {
  useEffect(() => {
    if (!canvas) return;
    const app = useApp.getState;
    let wheelAcc = 0;
    let lastStepAt = 0;

    const locked = () => document.pointerLockElement === canvas;

    const onLockChange = () => (locked() ? app().resume() : app().pause());

    // Drag to look, grabbing the world like a panorama viewer. Only one finger steers.
    let drag: { id: number; x: number; y: number } | null = null;
    const onPointerDown = (e: PointerEvent) => {
      if (drag || app().paused) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (drag?.id !== e.pointerId) return;
      look.yaw = clamp(look.yaw + (e.clientX - drag.x) * TOUCH_SENSITIVITY, -YAW_LIMIT, YAW_LIMIT);
      look.pitch = clamp(look.pitch + (e.clientY - drag.y) * TOUCH_SENSITIVITY, PITCH_MIN, PITCH_MAX);
      drag.x = e.clientX;
      drag.y = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (drag?.id === e.pointerId) drag = null;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!locked()) return;
      look.yaw = clamp(look.yaw - e.movementX * SENSITIVITY, -YAW_LIMIT, YAW_LIMIT);
      look.pitch = clamp(look.pitch - e.movementY * SENSITIVITY, PITCH_MIN, PITCH_MAX);
    };

    const onMouseDown = (e: MouseEvent) => {
      if (!locked()) return;
      if (e.button === 0) app().toggleMode('clicker');
      else if (e.button === 2) app().toggleMode('script');
    };

    const onWheel = (e: WheelEvent) => {
      if (!locked()) return;
      e.preventDefault();
      const delta = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
      const { mode, step } = app();
      if (mode === 'script') {
        scriptScroll.target += delta * 0.9;
      } else if (mode === 'clicker') {
        const now = performance.now();
        // Ignore the tail of a fast flick / trackpad inertia so one gesture is one slide.
        if (now - lastStepAt < WHEEL_COOLDOWN_MS) return;
        wheelAcc += delta;
        if (Math.abs(wheelAcc) >= WHEEL_STEP) {
          step(wheelAcc > 0 ? 1 : -1);
          lastStepAt = now;
          wheelAcc = 0;
        }
      }
    };

    // Keyboard fallback. Real presentation remotes send PageUp/PageDown, so those work too.
    const onKeyDown = (e: KeyboardEvent) => {
      const { paused, step, toggleMode, mode } = app();
      if (paused) return;
      switch (e.code) {
        case 'PageDown':
        case 'ArrowRight':
        case 'Space':
        case 'Enter':
          step(1);
          break;
        case 'PageUp':
        case 'ArrowLeft':
        case 'Backspace':
          step(-1);
          break;
        case 'ArrowDown':
          if (mode === 'script') scriptScroll.target += 120;
          break;
        case 'ArrowUp':
          if (mode === 'script') scriptScroll.target -= 120;
          break;
        case 'KeyQ':
          toggleMode('clicker');
          break;
        case 'KeyE':
          toggleMode('script');
          break;
        case 'KeyD':
          app().toggleDistraction();
          break;
        case 'KeyR':
          resetLook();
          break;
        case 'Escape':
          if (!TOUCH_UI) return; // with pointer lock the browser handles Esc itself
          app().pause();
          break;
        default:
          return;
      }
      e.preventDefault();
    };

    const onContextMenu = (e: Event) => e.preventDefault();

    if (TOUCH_UI) {
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerup', onPointerUp);
      canvas.addEventListener('pointercancel', onPointerUp);
    }
    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('contextmenu', onContextMenu);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('contextmenu', onContextMenu);
      if (locked()) document.exitPointerLock();
    };
  }, [canvas]);
}

/** Enters the presenter view. `onFail` runs if the browser refuses the pointer lock. */
export function requestLock(onFail: () => void) {
  if (TOUCH_UI) {
    useApp.getState().resume();
    // Hide the browser bars where possible (not supported on iPhone).
    document.documentElement.requestFullscreen?.().catch(() => {});
    return;
  }
  const canvas = document.querySelector<HTMLCanvasElement>('#sim canvas');
  if (!canvas) return;
  // Chrome rejects re-locking within ~1s of Esc; older browsers report it only via the event.
  const done = () => {
    document.removeEventListener('pointerlockerror', fail);
    document.removeEventListener('pointerlockchange', done);
  };
  const fail = () => {
    done();
    onFail();
  };
  document.addEventListener('pointerlockerror', fail);
  document.addEventListener('pointerlockchange', done);
  Promise.resolve(canvas.requestPointerLock()).catch(fail);
}

export function resetLook() {
  look.yaw = 0;
  look.pitch = -0.08;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
