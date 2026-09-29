// Per-frame mutable state that changes too often to live in the React store.
export const look = { yaw: 0, pitch: -0.05 };
export const scriptScroll = { target: 0, current: 0, max: 0 };
/** Eased 0..1 version of the distraction toggle, so Punis turn away and back smoothly. */
export const distraction = { mix: 0 };
