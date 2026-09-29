/** Reads a .txt file, falling back to EUC-KR (CP949) for Korean files saved by Windows Notepad. */
export async function readTextFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^\uFEFF/, '');
  } catch {
    return new TextDecoder('euc-kr').decode(buf);
  }
}

/** Word-wraps text to a pixel width; breaks inside words only when a single word is too long (common in Korean). */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (para.trim() === '') {
      out.push('');
      continue;
    }
    let line = '';
    for (const token of para.split(/(\s+)/)) {
      if (!token) continue;
      const candidate = line + token;
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line.trim()) out.push(line.trimEnd());
      line = token.trimStart();
      // Token alone is wider than the line: hard-break by character.
      while (ctx.measureText(line).width > maxWidth) {
        let cut = line.length - 1;
        while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > maxWidth) cut--;
        out.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    if (line.trim()) out.push(line.trimEnd());
  }
  return out;
}
