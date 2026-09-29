/**
 * Phones and tablets get on-screen buttons and drag-to-look instead of pointer lock:
 * iOS Safari has no pointer lock at all, and Android Chrome refuses it without a mouse.
 */
export const TOUCH_UI =
  typeof window !== 'undefined' &&
  (window.matchMedia('(pointer: coarse)').matches || !('requestPointerLock' in Element.prototype));
