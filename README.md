# Presentation Practice Simulator

👉 **https://nuclyee72.github.io/PPTSimulator/**

A first-person 3D web app for rehearsing a presentation in front of an audience of Punis (Vite + React + React Three Fiber).

```bash
npm install
npm run dev
```

## Usage
1. Upload your slides as a **PDF** (optional; in PowerPoint use Export → PDF. Without one, the screen shows "No slides")
2. Upload a script as **.txt** (optional; UTF-8 and EUC-KR both work, lines starting with `#` are highlighted as headings)
3. Pick a venue: Classroom (30 seats) / Lecture Hall (180 seats)
4. Set the audience size → enter

## Controls
| Input | Action |
|---|---|
| Left click | Clicker mode (click again to put it down) → wheel ↓/↑ next/previous slide |
| Right click | Script mode (click again to put it down) → wheel scrolls the script |
| Move mouse | Look around (turn around to see the big screen) |
| → / PageDown, ← / PageUp | Change slides with the keyboard or a real presentation remote |
| D | Toggle distraction mode (some Punis play with their neighbours instead of watching you) |
| R / Esc | Look forward / pause |

### Mobile (phones & tablets)
Touch devices automatically switch to on-screen buttons. Landscape is recommended.

| Input | Action |
|---|---|
| Drag the screen | Look around |
| 🖊️ Clicker → ◀ ▶ | Previous/next slide |
| 📄 Script → ▲ ▼ | Scroll the script (hold to keep scrolling) |
| 😜 / 🎯 / ⏸ | Distraction mode / look forward / pause |

## Puni images
Every image (png/jpg/webp) in `src/assets/punis/` shows up as a Puni — just drop files in and they're added automatically.
White backgrounds are removed in the browser, and transparent PNGs work as-is. You can also add or remove images on the setup screen.

Seats and characters are randomized each time you enter; use "🎲 Shuffle seats" on the pause screen to reshuffle.

## Structure
- `src/setup/` setup screen
- `src/sim/venues/` venue definitions (seat positions, screen/podium placement, room model) — add a new venue here and register it in `index.ts`
- `src/sim/Audience.tsx` Punis (instanced 2D sprites per character, random placement)
- `src/lib/cutout.ts` white background removal
- `src/sim/hands/` first-person clicker and script
- `src/sim/usePresenterInput.ts` input handling

## Copyright
Puni images (`src/assets/punis/`) are copyrighted by **NEXON Games**. © NEXON Games Co., Ltd. All Rights Reserved.
This project is a non-commercial fan project and is not affiliated with NEXON.
