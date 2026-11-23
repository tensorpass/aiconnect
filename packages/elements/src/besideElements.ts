// The address of a script published beside the Web Components script, such as its copy of pdf.js, read from
// the Web Components script's own address while it runs for the first time.

const ELEMENTS_SRC = document.currentScript instanceof HTMLScriptElement && document.currentScript.src
  ? document.currentScript.src
  : document.baseURI;

export function besideElements(name: string): string {
  return new URL(name, ELEMENTS_SRC).href;
}
