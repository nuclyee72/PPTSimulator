// Copies pdf.js runtime assets (CJK cmaps, standard fonts, wasm decoders) into public/
// so Korean PDFs render correctly without hitting a CDN.
import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const src = resolve('node_modules/pdfjs-dist');
const dest = resolve('public/pdfjs');
for (const dir of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  if (existsSync(resolve(src, dir))) cpSync(resolve(src, dir), resolve(dest, dir), { recursive: true });
}
