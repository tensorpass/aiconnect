// The Web Components' pdf.js: the copy published beside their script (pdfEntry.ts), loaded the first time a
// PDF is read for a model that does not read PDFs, in place of the module of the same name in core.

import { besideElements } from './besideElements.ts';

export async function loadPdfJs(): Promise<typeof import('pdfjs-dist')> {
  return import(besideElements('aiconnect-pdf.js')) as Promise<typeof import('pdfjs-dist')>;
}
