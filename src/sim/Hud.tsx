import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { requestLock } from './usePresenterInput';

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

function useElapsed(startedAt: number) {
  const [now, setNow] = useState(performance.now());
  useEffect(() => {
    const id = setInterval(() => setNow(performance.now()), 500);
    return () => clearInterval(id);
  }, []);
  const sec = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

export function Hud() {
  const { slideIndex, slides, mode, paused, startedAt, exitToSetup, shuffleSeats, distraction, toggleDistraction } = useApp();
  const elapsed = useElapsed(startedAt);

  return (
    <div className="hud">
      <div className="hud-top">
        <span className="chip">
          {slides.length ? (
            <>
              슬라이드 <b>{slideIndex + 1}</b> / {slides.length}
            </>
          ) : (
            '슬라이드 없음'
          )}
        </span>
        <span className="hud-right">
          {distraction && <span className="chip mode">😜 딴짓 ON</span>}
          <span className="chip">⏱ {elapsed}</span>
        </span>
      </div>

      {!paused && (
        <div className="hud-bottom">
          <span className="chip mode">{MODE_LABEL[mode]}</span>
          {HINTS[mode].map(([key, label]) => (
            <span key={key} className="chip hint">
              <kbd>{key}</kbd> {label}
            </span>
          ))}
        </div>
      )}

      {paused && (
        <div className="overlay" onClick={requestLock}>
          <div className="card pause-card" onClick={(e) => e.stopPropagation()}>
            <h2>발표 준비 완료!</h2>
            <p className="muted">화면을 클릭하면 발표자 시점으로 들어가요.</p>
            <ul className="controls">
              <li><kbd>마우스 이동</kbd> 둘러보기 (뒤돌면 큰 스크린이 보여요)</li>
              <li><kbd>좌클릭</kbd> 클리커 들기 → <kbd>휠</kbd> 이전 / 다음 슬라이드</li>
              <li><kbd>우클릭</kbd> 대본 들기 → <kbd>휠</kbd> 대본 스크롤</li>
              <li><kbd>→ / PageDown</kbd> <kbd>← / PageUp</kbd> 키보드·리모컨으로 넘기기</li>
              <li><kbd>D</kbd> 딴짓 모드 켜기/끄기</li>
              <li><kbd>R</kbd> 시선 정면으로 · <kbd>Esc</kbd> 일시정지</li>
            </ul>
            <div className="row">
              <button className="btn ghost" onClick={exitToSetup}>
                ← 설정으로
              </button>
              <button className="btn ghost" onClick={shuffleSeats}>
                🎲 자리 섞기
              </button>
              <button className={`btn ${distraction ? 'active' : 'ghost'}`} onClick={toggleDistraction}>
                😜 딴짓 {distraction ? 'ON' : 'OFF'}
              </button>
              <button className="btn primary" onClick={requestLock}>
                {slideIndex === 0 ? '발표 시작 🎤' : '계속하기 ▶'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
