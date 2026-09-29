// Per-frame mutable state that changes too often to live in the React store.
export const look = { yaw: 0, pitch: -0.05 };
/** `hold` is -1/0/1 while a touch scroll button is held down; `holdSince` is when it was pressed. */
export const scriptScroll = { target: 0, current: 0, max: 0, hold: 0, holdSince: 0 };
/** Eased 0..1 version of the distraction toggle, so Punis turn away and back smoothly. */
export const distraction = { mix: 0 };
/** How far the hand props are pulled toward the centre, so they stay on screen on narrow (portrait) views. */
export const view = { squeeze: 1 };
