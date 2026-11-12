// Writes the logo files into the folder given on the command line, from the mark's shapes, so the files
// and the code that draws the mark never drift apart. The wordmark is Reddit Sans at 800 turned into
// outlines, so the files render the same wherever the font is missing. Run with
// `npm run brand -w @tensorpass/aiconnect-design -- <folder>`; the website's repository passes its brand folder.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import opentype from 'opentype.js';
import { BRAND_INK, BRAND_WHITE, MARK_GRID, appIconSvg, markCellColor, markShapes, markSvg } from '../src/brandMark.ts';
import type { MarkTheme } from '../src/brandMark.ts';

const FONT_FILE = '@fontsource/reddit-sans/files/reddit-sans-latin-800-normal.woff';

const WORDMARK = 'TensorPass';
// The wordmark's capitals stand at a little over half the mark's height, centred on it.
const CAP_HEIGHT = 30;
const MARK_GAP = 14;
const LETTER_SPACING = -0.02;

async function loadFont(): Promise<opentype.Font> {
  const bytes = await readFile(createRequire(import.meta.url).resolve(FONT_FILE));
  return opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

function wordmarkPath(font: opentype.Font): { d: string; width: number } {
  const fontSize = (CAP_HEIGHT * font.unitsPerEm) / font.tables.os2.sCapHeight;
  const baseline = (MARK_GRID + CAP_HEIGHT) / 2;
  const probe = font.getPath(WORDMARK, 0, baseline, fontSize, { letterSpacing: LETTER_SPACING }).getBoundingBox();
  const left = MARK_GRID + MARK_GAP - probe.x1;
  const path = font.getPath(WORDMARK, left, baseline, fontSize, { letterSpacing: LETTER_SPACING });
  return { d: path.toPathData(2), width: Math.ceil(path.getBoundingBox().x2) };
}

function lockupSvg(wordmark: { d: string; width: number }, theme: MarkTheme): string {
  const textColor = theme === 'light' ? BRAND_INK : BRAND_WHITE;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${wordmark.width}" height="${MARK_GRID}" `
    + `viewBox="0 0 ${wordmark.width} ${MARK_GRID}">`
    + markShapes(markCellColor(theme))
    + `<path d="${wordmark.d}" fill="${textColor}"/></svg>`;
}

function logoFolder(): string {
  const folder = process.argv[2];
  if (!folder) {
    throw new Error('Name the folder the logo files go to: npm run brand -w @tensorpass/aiconnect-design -- <folder>');
  }
  return path.resolve(process.env.INIT_CWD ?? process.cwd(), folder);
}

const logoDir = logoFolder();
const wordmark = wordmarkPath(await loadFont());
const FILES = {
  'mark.svg': markSvg({ theme: 'light' }),
  'mark-dark.svg': markSvg({ theme: 'dark' }),
  'wordmark.svg': lockupSvg(wordmark, 'light'),
  'wordmark-dark.svg': lockupSvg(wordmark, 'dark'),
  'app-icon.svg': appIconSvg(),
};

await mkdir(logoDir, { recursive: true });
await Promise.all(Object.entries(FILES).map(([name, svg]) => writeFile(path.join(logoDir, name), `${svg}\n`)));
