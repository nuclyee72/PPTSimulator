import { useEffect, useRef, useState, type ReactNode } from 'react';
import { TOUCH_UI } from '../lib/device';
import { loadPuniSprite, puniHeight, type PuniSprite } from '../lib/cutout';
import { loadPdfSlides } from '../lib/pdf';
import { readTextFile } from '../lib/text';
import { VENUES, type VenueId } from '../sim/venues';
import { DEFAULT_PUNIS, useApp } from '../store';

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
      setError('Only PDF files are supported. In PowerPoint, save via "Export → PDF".');
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
      setError("Couldn't read the PDF. Check that the file isn't corrupted or password-protected.");
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
    s.set({ puniImages: [...s.puniImages, ...urls] });
  };

  const removePuni = (url: string) => {
    s.set({ puniImages: s.puniImages.filter((u) => u !== url) });
  };

  const resetPunis = () => s.set({ puniImages: DEFAULT_PUNIS });

  const pickVenue = (id: VenueId) => s.set({ venue: id, puniCount: Math.min(s.puniCount, VENUES[id].seats.length) });

  const loading = pdfProgress !== null;
  const scriptPreview = s.script.split(/\r?\n/).filter((l) => l.trim()).slice(0, 3);
  const heroPuni = previews[s.puniImages[0]]?.preview;

  // Same size rule as in the 3D scene, scaled so the tallest and widest Puni still fit a tile.
  const loaded = s.puniImages.map((u) => previews[u]).filter(Boolean);
  const pxPerMetre = Math.min(
    ...loaded.map((p) => Math.min(TILE_H / puniHeight(p), TILE_W / (puniHeight(p) * p.aspect))),
  );

  return (
    <div className="setup">
      <header className="hero">
        {heroPuni ? <img src={heroPuni} alt="" className="hero-puni bob" /> : <span className="hero-puni" />}
        <div>
          <h1>Presentation Practice Simulator</h1>
          <p className="muted">Rehearse your talk in front of the Punis!</p>
        </div>
      </header>

      <div className="grid">
        <section className="card">
          <h3><span className="num">1</span> Slides (PDF) <small className="muted">optional</small></h3>
          <FileDrop accept="application/pdf,.pdf" onFiles={onPdf}>
            {loading ? (
              <p>Preparing slides… {pdfProgress[1] ? `${pdfProgress[0]} / ${pdfProgress[1]}` : ''}</p>
            ) : s.slides.length ? (
              <div className="loaded">
                <img src={s.slides[0].src} alt="First slide" className="thumb" />
                <div>
                  <b>{s.pdfName}</b>
                  <p className="muted">{s.slides.length} {s.slides.length === 1 ? 'slide' : 'slides'} ✓ · {TOUCH_UI ? 'Tap' : 'Click'} to replace</p>
                </div>
              </div>
            ) : (
              <p>📂 {TOUCH_UI ? 'Tap to choose a PDF' : 'Drop a PDF here or click to choose'}<br /><small className="muted">For PowerPoint files, save via "Export → PDF" first</small></p>
            )}
          </FileDrop>
        </section>

        <section className="card">
          <h3><span className="num">2</span> Script (TXT) <small className="muted">optional</small></h3>
          <FileDrop accept=".txt,text/plain" onFiles={onScript}>
            {s.script ? (
              <div className="script-preview">
                <b>{s.scriptName}</b>
                {scriptPreview.map((l, i) => (
                  <p key={i} className="muted ellipsis">{l}</p>
                ))}
              </div>
            ) : (
              <p>📝 {TOUCH_UI ? 'Tap to choose a .txt script' : 'Drop a .txt script here or click to choose'}<br /><small className="muted">Lines starting with # are highlighted as headings</small></p>
            )}
          </FileDrop>
        </section>

        <section className="card">
          <h3><span className="num">3</span> Venue</h3>
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
          <h3><span className="num">4</span> Audience size</h3>
          <div className="slider">
            <div className="count">
              <b>{s.puniCount}</b> <small className="muted">/ {maxSeats} seats · seating is random each time you enter</small>
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
                  {r === 0 ? 'Empty' : r === 1 ? 'Full' : `${r * 100}%`}
                </button>
              ))}
            </div>
            <label className="toggle">
              <input type="checkbox" checked={s.distraction} onChange={s.toggleDistraction} />
              <span className="switch" />
              <span>
                <b>😜 Distraction mode</b> <small className="muted">Some Punis goof off and look at each other instead of you ({TOUCH_UI ? '😜 button' : 'D key'} during the talk)</small>
              </span>
            </label>
          </div>
        </section>

        <section className="card wide">
          <h3>
            <span className="num">5</span> Puni friends <small className="muted">{s.puniImages.length} {s.puniImages.length === 1 ? 'kind' : 'kinds'} · seated mixed together</small>
            <button className="btn tiny push-right" onClick={resetPunis}>Reset</button>
          </h3>
          <div className="puni-list">
            {s.puniImages.map((url) => (
              <div key={url} className="puni-item">
                {previews[url] ? (
                  <img src={previews[url].preview} alt="" style={{ height: puniHeight(previews[url]) * pxPerMetre }} />
                ) : (
                  <div className="puni-loading">…</div>
                )}
                {s.puniImages.length > 1 && (
                  <button className="remove" title="Remove" onClick={() => removePuni(url)}>×</button>
                )}
              </div>
            ))}
            <FileDrop accept="image/*" multiple onFiles={addPunis} className="puni-add">
              <span className="plus">＋</span>
              <small className="muted">Add image</small>
            </FileDrop>
          </div>
          <p className="muted note">White backgrounds are removed automatically. Transparent PNGs work too.</p>
        </section>
      </div>

      {error && <p className="error">{error}</p>}

      <button className="btn primary big" disabled={loading} onClick={s.start}>
        Enter the stage 🎤
      </button>

      <footer className="copyright">
        Puni images are copyrighted by NEXON Games. © NEXON Games Co., Ltd. All Rights Reserved.
        <br />This site is a non-commercial fan project and is not affiliated with NEXON.
      </footer>
    </div>
  );
}
