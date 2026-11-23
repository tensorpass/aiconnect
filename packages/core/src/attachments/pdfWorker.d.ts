// pdf.js's worker module, which registers `globalThis.pdfjsWorker` when imported, so pdf.js reads a PDF in
// the page without loading a worker script from an address.
declare module 'pdfjs-dist/build/pdf.worker.min.mjs';
