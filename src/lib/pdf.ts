import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const TARGET_WIDTH = 1920;
// Copied into public/ by scripts/copy-pdf-assets.mjs; BASE_URL keeps this working under a sub-path (GitHub Pages).
const PDFJS = `${import.meta.env.BASE_URL}pdfjs`;

export interface LoadedSlides {
  images: HTMLImageElement[];
  aspect: number; // width / height of the first page
}

/** Renders every PDF page to a JPEG image so it can be used as a 3D texture. */
export async function loadPdfSlides(file: File, onProgress?: (done: number, total: number) => void): Promise<LoadedSlides> {
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({
    data,
    cMapUrl: `${PDFJS}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${PDFJS}/standard_fonts/`,
    wasmUrl: `${PDFJS}/wasm/`,
    iccUrl: `${PDFJS}/iccs/`,
  });
  const doc = await task.promise;

  const images: HTMLImageElement[] = [];
  let aspect = 16 / 9;
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const base = page.getViewport({ scale: 1 });
      if (i === 1) aspect = base.width / base.height;
      const viewport = page.getViewport({ scale: TARGET_WIDTH / base.width });

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      page.cleanup();

      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/jpeg', 0.9),
      );
      const img = new Image();
      img.src = URL.createObjectURL(blob);
      await img.decode();
      images.push(img);
      onProgress?.(i, doc.numPages);
    }
  } finally {
    await task.destroy();
  }
  return { images, aspect };
}
