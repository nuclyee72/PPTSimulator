import { useEffect, useRef, useState, type ReactNode } from 'react';
import { loadPuniSprite, puniHeight, type PuniSprite } from '../lib/cutout';
import { loadPdfSlides } from '../lib/pdf';
import { readTextFile } from '../lib/text';
import { VENUES, type VenueId } from '../sim/venues';
import { DEFAULT_PUNIS, FALLBACK_PUNI, useApp } from '../store';

// Usable area inside a Puni tile, in px (tile is 86×96 with 6px padding).
const TILE_W = 74;
const TILE_H = 84;

function FileDrop({
  accept,
  multiple = false,
  onFiles,
  className = '',
  children,
}: {
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  className?: string;
  children: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      className={`drop ${over ? 'over' : ''} ${className}`}
      onClick={() => input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const files = [...e.dataTransfer.files];
        if (files.length) onFiles(multiple ? files : files.slice(0, 1));
      }}
    >
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          if (files.length) onFiles(files);
          e.target.value = '';
        }}
      />
      {children}
    </div>
  );
}

/** Background-removed previews, filled in as each image finishes processing. */
function usePuniPreviews(urls: string[]) {
  const [previews, setPreviews] = useState<Record<string, PuniSprite>>({});
  useEffect(() => {
    let alive = true;
    for (const url of urls) {
      loadPuniSprite(url)
        .then((s) => alive && setPreviews((p) => (p[url] ? p : { ...p, [url]: s })))
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [urls]);
  return previews;
}

export function SetupScreen() {
  const s = useApp();
  const [pdfProgress, setPdfProgress] = useState<[number, number] | null>(null);
  const [error, setError] = useState('');
  const previews = usePuniPreviews(s.puniImages);
  const venue = VENUES[s.venue];
  const maxSeats = venue.seats.length;

  const onPdf = async ([file]: File[]) => {
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      setError('PDF 파일만 올릴 수 있어요. PowerPoint에서 "내보내기 → PDF"로 저장해 주세요.');
      return;
    }
    setError('');
    setPdfProgress([0, 0]);
    try {
      const { images, aspect } = await loadPdfSlides(file, (done, total) => setPdfProgress([done, total]));
      s.slides.forEach((img) => URL.revokeObjectURL(img.src));
      s.set({ slides: images, slideAspect: aspect, pdfName: file.name });
    } catch (e) {
      console.error(e);
      setError('PDF를 읽지 못했어요. 파일이 손상되었거나 암호가 걸려 있는지 확인해 주세요.');
    } finally {
      setPdfProgress(null);
    }
  };

  const onScript = async ([file]: File[]) => {
    setError('');
    s.set({ script: await readTextFile(file), scriptName: file.name });
  };

  const addPunis = (files: File[]) => {
    const urls = files.filter((f) => f.type.startsWith('image/')).map((f) => URL.createObjectURL(f));
    if (!urls.length) return;
    const kept = s.puniImages.filter((u) => u !== FALLBACK_PUNI);
    s.set({ puniImages: [...kept, ...urls] });
  };

  const removePuni = (url: string) => {
    const rest = s.puniImages.filter((u) => u !== url);
    s.set({ puniImages: rest.length ? rest : [FALLBACK_PUNI] });
  };

  const resetPunis = () => s.set({ puniImages: DEFAULT_PUNIS.length ? DEFAULT_PUNIS : [FALLBACK_PUNI] });

  const pickVenue = (id: VenueId) => s.set({ venue: id, puniCount: Math.min(s.puniCount, VENUES[id].seats.length) });

  const loading = pdfProgress !== null;
  const scriptPreview = s.script.split(/\r?\n/).filter((l) => l.trim()).slice(0, 3);
  const heroPuni = previews[s.puniImages[0]]?.preview ?? FALLBACK_PUNI;

  // Same size rule as in the 3D scene, scaled so the tallest and widest Puni still fit a tile.
  const loaded = s.puniImages.map((u) => previews[u]).filter(Boolean);
  const pxPerMetre = Math.min(
    ...loaded.map((p) => Math.min(TILE_H / puniHeight(p), TILE_W / (puniHeight(p) * p.aspect))),
  );

  return (
    <div className="setup">
      <header className="hero">
        <img src={heroPuni} alt="" className="hero-puni bob" />
        <div>
          <h1>발표 연습 시뮬레이터</h1>
          <p className="muted">푸니들 앞에서 미리 발표해 보세요!</p>
        </div>
      </header>

      <div className="grid">
        <section className="card">
          <h3><span className="num">1</span> 발표 자료 (PDF) <small className="muted">선택</small></h3>
          <FileDrop accept="application/pdf,.pdf" onFiles={onPdf}>
            {loading ? (
              <p>슬라이드 준비 중… {pdfProgress[1] ? `${pdfProgress[0]} / ${pdfProgress[1]}` : ''}</p>
            ) : s.slides.length ? (
              <div className="loaded">
                <img src={s.slides[0].src} alt="첫 슬라이드" className="thumb" />
                <div>
                  <b>{s.pdfName}</b>
                  <p className="muted">{s.slides.length}장 ✓ · 클릭해서 바꾸기</p>
                </div>
              </div>
            ) : (
              <p>📂 PDF를 끌어다 놓거나 클릭해서 선택<br /><small className="muted">PPT는 "내보내기 → PDF"로 저장해서 올려 주세요</small></p>
            )}
          </FileDrop>
        </section>

        <section className="card">
          <h3><span className="num">2</span> 대본 (TXT) <small className="muted">선택</small></h3>
          <FileDrop accept=".txt,text/plain" onFiles={onScript}>
            {s.script ? (
              <div className="script-preview">
                <b>{s.scriptName}</b>
                {scriptPreview.map((l, i) => (
                  <p key={i} className="muted ellipsis">{l}</p>
                ))}
              </div>
            ) : (
              <p>📝 대본 .txt 파일을 끌어다 놓거나 클릭<br /><small className="muted"># 로 시작하는 줄은 제목처럼 강조돼요</small></p>
            )}
          </FileDrop>
        </section>

        <section className="card">
          <h3><span className="num">3</span> 발표 장소</h3>
          <div className="venues">
            {(Object.keys(VENUES) as VenueId[]).map((id) => (
              <button key={id} className={`venue ${s.venue === id ? 'selected' : ''}`} onClick={() => pickVenue(id)}>
                <span className="emoji">{VENUES[id].emoji}</span>
                <b>{VENUES[id].name}</b>
                <small className="muted">{VENUES[id].description}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <h3><span className="num">4</span> 관객 수</h3>
          <div className="slider">
            <div className="count">
              <b>{s.puniCount}</b>명 <small className="muted">/ {maxSeats}석 · 자리는 입장할 때마다 랜덤</small>
            </div>
            <input
              type="range"
              min={0}
              max={maxSeats}
              value={s.puniCount}
              onChange={(e) => s.set({ puniCount: Number(e.target.value) })}
            />
            <div className="presets">
              {[0, 0.25, 0.5, 1].map((r) => (
                <button key={r} className="btn tiny" onClick={() => s.set({ puniCount: Math.round(maxSeats * r) })}>
                  {r === 0 ? '텅 빈' : r === 1 ? '만석' : `${r * 100}%`}
                </button>
              ))}
            </div>
            <label className="toggle">
              <input type="checkbox" checked={s.distraction} onChange={s.toggleDistraction} />
              <span className="switch" />
              <span>
                <b>😜 딴짓 모드</b> <small className="muted">일부 푸니가 발표자 대신 서로 쳐다보며 놀아요 (발표 중 D 키)</small>
              </span>
            </label>
          </div>
        </section>

        <section className="card wide">
          <h3>
            <span className="num">5</span> 푸니 친구들 <small className="muted">{s.puniImages.length}종 · 섞여서 앉아요</small>
            <button className="btn tiny push-right" onClick={resetPunis}>기본으로</button>
          </h3>
          <div className="puni-list">
            {s.puniImages.map((url) => (
              <div key={url} className="puni-item">
                {previews[url] ? (
                  <img src={previews[url].preview} alt="" style={{ height: puniHeight(previews[url]) * pxPerMetre }} />
                ) : (
                  <div className="puni-loading">…</div>
                )}
                {url !== FALLBACK_PUNI && (
                  <button className="remove" title="빼기" onClick={() => removePuni(url)}>×</button>
                )}
              </div>
            ))}
            <FileDrop accept="image/*" multiple onFiles={addPunis} className="puni-add">
              <span className="plus">＋</span>
              <small className="muted">이미지 추가</small>
            </FileDrop>
          </div>
          <p className="muted note">흰 배경 사진은 배경이 자동으로 지워져요. 투명 PNG도 좋아요.</p>
        </section>
      </div>

      {error && <p className="error">{error}</p>}

      <button className="btn primary big" disabled={loading} onClick={s.start}>
        발표장으로 입장 🎤
      </button>

      <footer className="copyright">
        푸니 이미지의 저작권은 NEXON Games에 있습니다. © NEXON Games Co., Ltd. All Rights Reserved.
        <br />이 사이트는 비상업적 팬 프로젝트이며 NEXON과 관련이 없습니다.
      </footer>
    </div>
  );
}
