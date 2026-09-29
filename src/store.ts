import { create } from 'zustand';
import type { VenueId } from './sim/venues';

/** Every image in src/assets/punis becomes a Puni; drop more files there to add characters. */
export const DEFAULT_PUNIS = Object.values(
  import.meta.glob<string>('./assets/punis/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' }),
);
export const FALLBACK_PUNI = `${import.meta.env.BASE_URL}puni.svg`;
const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

export type HandMode = 'none' | 'clicker' | 'script';

interface AppState {
  screen: 'setup' | 'sim';

  // Setup inputs
  pdfName: string;
  slides: HTMLImageElement[];
  slideAspect: number;
  scriptName: string;
  script: string;
  venue: VenueId;
  puniCount: number;
  puniImages: string[];
  seatSeed: number; // re-rolled on every entry so seats and characters are shuffled
  distraction: boolean; // some Punis chat with each other instead of watching

  // Simulation
  slideIndex: number;
  mode: HandMode;
  lastClickAt: number; // performance.now() of the last clicker press, drives the button animation
  lastSlideChangeAt: number;
  paused: boolean;
  startedAt: number; // 0 until the presenter first enters the view

  set: (patch: Partial<AppState>) => void;
  start: () => void;
  exitToSetup: () => void;
  shuffleSeats: () => void;
  toggleDistraction: () => void;
  toggleMode: (mode: Exclude<HandMode, 'none'>) => void;
  step: (dir: 1 | -1) => void;
}

export const useApp = create<AppState>((set, get) => ({
  screen: 'setup',
  pdfName: '',
  slides: [],
  slideAspect: 16 / 9,
  scriptName: '',
  script: '',
  venue: 'classroom',
  puniCount: 20,
  puniImages: DEFAULT_PUNIS.length ? DEFAULT_PUNIS : [FALLBACK_PUNI],
  seatSeed: randomSeed(),
  distraction: false,

  slideIndex: 0,
  mode: 'none',
  lastClickAt: -Infinity,
  lastSlideChangeAt: -Infinity,
  paused: true,
  startedAt: 0,

  set: (patch) => set(patch),
  start: () => set({ screen: 'sim', slideIndex: 0, mode: 'none', paused: true, startedAt: 0, seatSeed: randomSeed() }),
  exitToSetup: () => set({ screen: 'setup', paused: true }),
  shuffleSeats: () => set({ seatSeed: randomSeed() }),
  toggleDistraction: () => set({ distraction: !get().distraction }),
  toggleMode: (mode) => set({ mode: get().mode === mode ? 'none' : mode }),
  step: (dir) => {
    const { slideIndex, slides } = get();
    const next = Math.min(Math.max(slideIndex + dir, 0), Math.max(slides.length - 1, 0));
    const now = performance.now();
    set(next === slideIndex ? { lastClickAt: now } : { slideIndex: next, lastClickAt: now, lastSlideChangeAt: now });
  },
}));
