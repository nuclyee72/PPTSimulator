import { useEffect, useState, type ReactNode } from 'react';
import { TOUCH_UI } from '../lib/device';
import { scriptScroll } from '../runtime';
import { useApp } from '../store';
import { requestLock, resetLook } from './usePresenterInput';

const HINTS = {
  none: [
    ['좌클릭', '클리커 들기'],
    ['우클릭', '대본 들기'],
  ],
  clicker: [
    ['휠 ↓ / ↑', '다음 / 이전 슬라이드'],
    ['좌클릭', '내려놓기'],
    ['우클릭', '대본으로 바꾸기'],
  ],
  script: [
    ['휠', '대본 스크롤'],
    ['우클릭', '내려놓기'],
    ['좌클릭', '클리커로 바꾸기'],
  ],
} as const;

const MODE_LABEL = { none: '🙌 빈손', clicker: '🖊️ 클리커', script: '📄 대본' } as const;
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
          📄<small>대본</small>
        </button>
      </div>
      {mode === 'none' && <div className="touch-hint chip">👆 화면을 드래그해서 둘러보기</div>}
      <div className="touch-side right">
        {mode === 'clicker' && (
          <div className="touch-pair row-pair">
            <button className="tbtn" onClick={() => step(-1)}>◀</button>
            <button className="tbtn" onClick={() => step(1)}>▶</button>
          </div>
        )}
        <button className={`tbtn big ${mode === 'clicker' ? 'on' : ''}`} onClick={() => toggleMode('clicker')}>
          🖊️<small>클리커</small>
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
                슬라이드 <b>{slideIndex + 1}</b> / {slides.length}
              </>
            ) : (
              '슬라이드 없음'
            )}
          </span>
          {TOUCH_UI && <span className="chip">⏱ {elapsed}</span>}
        </span>
        {TOUCH_UI ? (
          !paused && (
            <span className="hud-right">
              <button className={`tbtn small ${distraction ? 'on' : ''}`} onClick={toggleDistraction} title="딴짓 모드">
                😜
              </button>
              <button className="tbtn small" onClick={resetLook} title="정면 보기">
                🎯
              </button>
              <button className="tbtn small" onClick={pause} title="일시정지">
                ⏸
              </button>
            </span>
          )
        ) : (
          <span className="hud-right">
            {distraction && <span className="chip mode">😜 딴짓 ON</span>}
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
            <h2>발표 준비 완료!</h2>
            {TOUCH_UI ? (
              <>
                <p className="muted">시작 버튼을 누르면 발표자 시점으로 들어가요.</p>
                <ul className="controls">
                  <li><kbd>👆 드래그</kbd> 둘러보기 (뒤돌면 큰 스크린이 보여요)</li>
                  <li><kbd>🖊️ 클리커</kbd> 들고 <kbd>◀ ▶</kbd> 이전 / 다음 슬라이드</li>
                  <li><kbd>📄 대본</kbd> 들고 <kbd>▲ ▼</kbd> 대본 스크롤 (꾹 누르면 계속)</li>
                  <li><kbd>😜</kbd> 딴짓 모드 · <kbd>🎯</kbd> 정면 보기 · <kbd>⏸</kbd> 일시정지</li>
                </ul>
                <p className="muted note portrait-only">📱 가로로 돌리면 더 넓게 보여요</p>
              </>
            ) : (
              <>
                <p className="muted">화면을 클릭하면 발표자 시점으로 들어가요.</p>
                <ul className="controls">
                  <li><kbd>마우스 이동</kbd> 둘러보기 (뒤돌면 큰 스크린이 보여요)</li>
                  <li><kbd>좌클릭</kbd> 클리커 들기 → <kbd>휠</kbd> 이전 / 다음 슬라이드</li>
                  <li><kbd>우클릭</kbd> 대본 들기 → <kbd>휠</kbd> 대본 스크롤</li>
                  <li><kbd>→ / PageDown</kbd> <kbd>← / PageUp</kbd> 키보드·리모컨으로 넘기기</li>
                  <li><kbd>D</kbd> 딴짓 모드 켜기/끄기</li>
                  <li><kbd>R</kbd> 시선 정면으로 · <kbd>Esc</kbd> 일시정지</li>
                </ul>
              </>
            )}
            {lockFailed && <p className="error lock-error">앗, 브라우저가 잠깐 막았어요. 1초 뒤에 다시 눌러 주세요!</p>}
            <div className="row">
              <button className="btn ghost" onClick={leave}>
                ← 설정으로
              </button>
              <button className="btn ghost" onClick={shuffleSeats}>
                🎲 자리 섞기
              </button>
              <button className={`btn ${distraction ? 'active' : 'ghost'}`} onClick={toggleDistraction}>
                😜 딴짓 {distraction ? 'ON' : 'OFF'}
              </button>
              <button className="btn primary" onClick={enter}>
                {startedAt ? '계속하기 ▶' : '발표 시작 🎤'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
