// A PDF for a model that does not read PDFs: pdf.js reads it in the page, its text goes as a text file
// under the PDF's name, and each page without text, such as a scan, goes as an image when the model reads
// images. pdf.js loads only when such a PDF is sent (pdfModule.ts).

import { encodeBase64Text } from '../chatContent.ts';
import type { ContentPart } from '../types.ts';
import { blobDataUrl, encodedImage, fittedSize } from './imagePrep.ts';
import { loadPdfJs } from './pdfModule.ts';

// The pages read from one PDF, and the scanned pages sent as images.
const MAX_PAGES = 200;
const MAX_SCANNED_PAGES = 20;

// A page holding fewer characters than this is read as a scan.
const SCAN_TEXT_LENGTH = 16;

type PdfLoading = ReturnType<typeof import('pdfjs-dist').getDocument>;
type PdfPage = Awaited<ReturnType<Awaited<PdfLoading['promise']>['getPage']>>;

async function loadPdf(bytes: ArrayBuffer): Promise<PdfLoading> {
  const pdfjs = await loadPdfJs();
  return pdfjs.getDocument({ data: new Uint8Array(bytes) });
}

async function pageText(page: PdfPage): Promise<string> {
  const content = await page.getTextContent();
  return content.items
    .map((item) => ('str' in item ? `${item.str}${item.hasEOL ? '\n' : ''}` : ''))
    .join('')
    .trim();
}

async function pageImage(page: PdfPage): Promise<ContentPart> {
  const base = page.getViewport({ scale: 1 });
  const { width } = fittedSize(base.width, base.height);
  const viewport = page.getViewport({ scale: width / base.width });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  await page.render({ canvas, viewport, background: '#fff' }).promise;
  return { type: 'image', url: await blobDataUrl(await encodedImage(canvas, canvas.width, canvas.height)) };
}

export interface ReadPdf {
  parts: ContentPart[];
  // Pages the model will not see: scans for a model without images, and pages past the limits.
  unread: number;
}

export async function readPdf(file: Blob, name: string, readsImages: boolean): Promise<ReadPdf> {
  const loading = await loadPdf(await file.arrayBuffer());
  const pdf = await loading.promise;
  const texts: string[] = [];
  const images: ContentPart[] = [];
  let unread = Math.max(0, pdf.numPages - MAX_PAGES);
  try {
    for (let number = 1; number <= Math.min(pdf.numPages, MAX_PAGES); number += 1) {
      const page = await pdf.getPage(number);
      const text = await pageText(page);
      if (text.length >= SCAN_TEXT_LENGTH) {
        texts.push(`[Page ${number}]\n${text}`);
      } else if (readsImages && images.length < MAX_SCANNED_PAGES) {
        images.push(await pageImage(page));
      } else {
        unread += 1;
      }
      page.cleanup();
    }
  } finally {
    await loading.destroy();
  }
  const text: ContentPart[] = texts.length
    ? [{ type: 'file', name, url: `data:text/plain;base64,${encodeBase64Text(texts.join('\n\n'))}` }]
    : [];
  return { parts: [...text, ...images], unread };
}
