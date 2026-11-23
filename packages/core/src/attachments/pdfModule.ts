// pdf.js for the page, loaded the first time a PDF is read for a model that does not read PDFs. Its worker
// module comes with it and registers itself, so pdf.js reads the PDF in the page and fetches no worker
// script from an address. The Web Components build puts its own copy of pdf.js, a script beside its own, in
// this module's place.

export async function loadPdfJs(): Promise<typeof import('pdfjs-dist')> {
  const [pdfjs] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs')]);
  return pdfjs;
}
