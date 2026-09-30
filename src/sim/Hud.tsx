import { useEffect, useState, type ReactNode } from 'react';
import { TOUCH_UI } from '../lib/device';
import { scriptScroll } from '../runtime';
import { useApp } from '../store';
import { requestLock, resetLook } from './usePresenterInput';

const HINTS = {
  none: [
    ['Left click', 'Pick up clicker'],
    ['Right click', 'Pick up script'],
  ],
  clicker: [
    ['Wheel ↓ / ↑', 'Next / previous slide'],
    ['Left click', 'Put down'],
    ['Right click', 'Switch to script'],
  ],
  script: [
    ['Wheel', 'Scroll script'],
    ['Right click', 'Put down'],
    ['Left click', 'Switch to clicker'],
  ],
} as const;

const MODE_LABEL = { none: '🙌 Empty hands', clicker: '🖊️ Clicker', script: '📄 Script' } as const;
const TAP_SCROLL = 90; // px of script canvas per tap on ▲ / ▼

function useElapsed(startedAt: number) {
  const [now, setNow] = useState(performance.now());
  useEffect(() => {
    const id = setInterval(() => setNow(performance.now()), 500);
    return () => clearInterval(id);
  }, []);
  const sec = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

/** Nudges the script on tap and keeps scrolling while held. */
function ScrollButton({ dir, children }: { dir: 1 | -1; children: ReactNode }) {
  const release = () => {
    scriptScroll.hold = 0;
  };
  return (
    <button
      className="tbtn"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        scriptScroll.target += dir * TAP_SCROLL;
        scriptScroll.hold = dir;
        scriptScroll.holdSince = performance.now();
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      {children}
    </button>
  );
}

/** On-screen buttons for phones and tablets: left thumb holds the script, right thumb the clicker. */
function TouchControls() {
  const mode = useApp((s) => s.mode);
  const toggleMode = useApp((s) => s.toggleMode);
  const step = useApp((s) => s.step);
  return (
    <>
      <div className="touch-side left">
        {mode === 'script' && (
          <div className="touch-pair">
            <ScrollButton dir={-1}>▲</ScrollButton>
            <ScrollButton dir={1}>▼</ScrollButton>
          </div>
        )}
        <button className={`tbtn big ${mode === 'script' ? 'on' : ''}`} onClick={() => toggleMode('script')}>
          📄<small>Script</small>
        </button>
      </div>
      {mode === 'none' && <div className="touch-hint chip">👆 Drag the screen to look around</div>}
      <div className="touch-side right">
        {mode === 'clicker' && (
          <div className="touch-pair row-pair">
            <button className="tbtn" onClick={() => step(-1)}>◀</button>
            <button className="tbtn" onClick={() => step(1)}>▶</button>
          </div>
        )}
        <button className={`tbtn big ${mode === 'clicker' ? 'on' : ''}`} onClick={() => toggleMode('clicker')}>
          🖊️<small>Clicker</small>
        </button>
      </div>
    </>
  );
}

export function Hud() {
  const { slideIndex, slides, mode, paused, startedAt, exitToSetup, shuffleSeats, distraction, toggleDistraction, pause } =
    useApp();
  const elapsed = useElapsed(startedAt);
  const [lockFailed, setLockFailed] = useState(false);

  const enter = () => {
    setLockFailed(false);
    requestLock(() => setLockFailed(true));
  };
  const leave = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    exitToSetup();
  };

  return (
    <div className={`hud ${TOUCH_UI ? 'touch' : ''}`}>
      <div className="hud-top">
        <span className="hud-left">
          <span className="chip">
            {slides.length ? (
              <>
                Slide <b>{slideIndex + 1}</b> / {slides.length}
              </>
            ) : (
              'No slides'
            )}
          </span>
          {TOUCH_UI && <span className="chip">⏱ {elapsed}</span>}
        </span>
        {TOUCH_UI ? (
          !paused && (
            <span className="hud-right">
              <button className={`tbtn small ${distraction ? 'on' : ''}`} onClick={toggleDistraction} title="Distraction mode">
                😜
              </button>
              <button className="tbtn small" onClick={resetLook} title="Look forward">
                🎯
              </button>
              <button className="tbtn small" onClick={pause} title="Pause">
                ⏸
              </button>
            </span>
          )
        ) : (
          <span className="hud-right">
            {distraction && <span className="chip mode">😜 Distraction ON</span>}
            <span className="chip">⏱ {elapsed}</span>
          </span>
        )}
      </div>

      {!paused &&
        (TOUCH_UI ? (
          <TouchControls />
        ) : (
          <div className="hud-bottom">
            <span className="chip mode">{MODE_LABEL[mode]}</span>
            {HINTS[mode].map(([key, label]) => (
              <span key={key} className="chip hint">
                <kbd>{key}</kbd> {label}
              </span>
            ))}
          </div>
        ))}

      {paused && (
        <div className="overlay" onClick={enter}>
          <div className="card pause-card" onClick={(e) => e.stopPropagation()}>
            <h2>Ready to present!</h2>
            {TOUCH_UI ? (
              <>
                <p className="muted">Press Start to step into the presenter's view.</p>
                <ul className="controls">
                  <li><kbd>👆 Drag</kbd> Look around (turn around to see the big screen)</li>
                  <li><kbd>🖊️ Clicker</kbd> then <kbd>◀ ▶</kbd> Previous / next slide</li>
                  <li><kbd>📄 Script</kbd> then <kbd>▲ ▼</kbd> Scroll script (hold to keep scrolling)</li>
                  <li><kbd>😜</kbd> Distraction mode · <kbd>🎯</kbd> Look forward · <kbd>⏸</kbd> Pause</li>
                </ul>
                <p className="muted note portrait-only">📱 Rotate to landscape for a wider view</p>
              </>
            ) : (
              <>
                <p className="muted">Click the screen to step into the presenter's view.</p>
                <ul className="controls">
                  <li><kbd>Move mouse</kbd> Look around (turn around to see the big screen)</li>
                  <li><kbd>Left click</kbd> Pick up clicker → <kbd>Wheel</kbd> Previous / next slide</li>
                  <li><kbd>Right click</kbd> Pick up script → <kbd>Wheel</kbd> Scroll script</li>
                  <li><kbd>→ / PageDown</kbd> <kbd>← / PageUp</kbd> Change slides with keyboard or remote</li>
                  <li><kbd>D</kbd> Toggle distraction mode</li>
                  <li><kbd>R</kbd> Look forward · <kbd>Esc</kbd> Pause</li>
                </ul>
              </>
            )}
            {lockFailed && <p className="error lock-error">Oops, the browser blocked that for a moment. Try again in a second!</p>}
            <div className="row">
              <button className="btn ghost" onClick={leave}>
                ← Back to setup
              </button>
              <button className="btn ghost" onClick={shuffleSeats}>
                🎲 Shuffle seats
              </button>
              <button className={`btn ${distraction ? 'active' : 'ghost'}`} onClick={toggleDistraction}>
                😜 Distraction {distraction ? 'ON' : 'OFF'}
              </button>
              <button className="btn primary" onClick={enter}>
                {startedAt ? 'Resume ▶' : 'Start 🎤'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
