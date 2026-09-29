import { useEffect } from 'react';
import { look, scriptScroll } from '../runtime';
import { useApp } from '../store';

const SENSITIVITY = 0.0022;
const YAW_LIMIT = Math.PI * 0.95;
const PITCH_MIN = -1.0;
const PITCH_MAX = 0.7;
const WHEEL_STEP = 60; // accumulated deltaY needed for one slide step (one mouse notch is ~100)
const WHEEL_COOLDOWN_MS = 220;

/**
 * Mouse and keyboard controls while presenting.
 * Left click toggles clicker mode, right click toggles script mode; the wheel acts on whichever is in hand.
 */
export function usePresenterInput(canvas: HTMLCanvasElement | null) {
  useEffect(() => {
    if (!canvas) return;
    const app = useApp.getState;
    let wheelAcc = 0;
    let lastStepAt = 0;

    const locked = () => document.pointerLockElement === canvas;

    const onLockChange = () => {
      const paused = !locked();
      app().set(!paused && app().startedAt === 0 ? { paused, startedAt: performance.now() } : { paused });
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
          look.yaw = 0;
          look.pitch = -0.08;
          break;
        default:
          return;
      }
      e.preventDefault();
    };

    const onContextMenu = (e: Event) => e.preventDefault();

    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('contextmenu', onContextMenu);
    return () => {
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

export function requestLock() {
  const canvas = document.querySelector<HTMLCanvasElement>('#sim canvas');
  // Chrome rejects re-locking within ~1s of Esc; the overlay stays up so the user can just click again.
  Promise.resolve(canvas?.requestPointerLock()).catch(() => {});
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
