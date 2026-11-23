// The scripts of the elements package, as esbuild options: the Web Components script, which bundles the elements,
// React and the modules' stylesheet, the loader, which draws the chats' buttons and loads the Web Components script
// when the visitor reaches for one, the script of the sign in return page, and the two scripts published beside the
// Web Components script: pdf.js, which it loads the first time a PDF is read for a model that does not read PDFs, and
// the dictation's audio worklet. Stylesheets come in as minified text, for the elements' shadow roots and the page's
// tokens.

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { transform } from 'esbuild';
import type { BuildOptions, Plugin } from 'esbuild';

// Shopify's limit for the script of an app embed, which the loader stays under.
export const LOADER_LIMIT_BYTES = 10_000;

const minifiedCss: Plugin = {
  name: 'minified-css',
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      const { code } = await transform(await readFile(args.path, 'utf8'), { loader: 'css', minify: true });
      return { contents: code.trim(), loader: 'text' };
    });
  },
};

// The modules of core and React that load a script from beside their own file (pdfModule.js, pcmWorkletUrl.js in
// their dist) take, in the Web Components script, the address of the copy published beside it. The elements' own
// modules of those names are imported by their .ts names, which the filter leaves alone.
const besideScripts: Plugin = {
  name: 'beside-scripts',
  setup(build) {
    build.onResolve({ filter: /^\.\/(pdfModule|pcmWorkletUrl)\.js$/ }, (args) => ({
      path: resolve(import.meta.dirname, 'src', args.path.slice(2).replace(/\.js$/, '.ts')),
    }));
  },
};

const common: BuildOptions = {
  absWorkingDir: import.meta.dirname,
  bundle: true,
  format: 'iife',
  target: 'es2022',
  minify: true,
  jsx: 'automatic',
  plugins: [minifiedCss],
  define: { 'process.env.NODE_ENV': '"production"' },
  metafile: true,
  logLevel: 'warning',
};

export const elementsBundle = {
  ...common,
  plugins: [minifiedCss, besideScripts],
  entryPoints: ['src/index.ts'],
  outfile: 'dist/aiconnect-elements.js',
  sourcemap: true,
} satisfies BuildOptions;

export const loaderBundle = {
  ...common,
  entryPoints: ['src/loader/index.ts'],
  outfile: 'dist/aiconnect-loader.js',
} satisfies BuildOptions;

export const callbackBundle = {
  ...common,
  entryPoints: ['src/callback.ts'],
  outfile: 'dist/aiconnect-callback.js',
} satisfies BuildOptions;

export const pdfBundle = {
  ...common,
  format: 'esm',
  entryPoints: ['src/pdfEntry.ts'],
  outfile: 'dist/aiconnect-pdf.js',
} satisfies BuildOptions;

export const workletBundle = {
  ...common,
  format: 'esm',
  entryPoints: ['@tensorpass/aiconnect-react/pcmWorklet.js'],
  outfile: 'dist/aiconnect-pcm-worklet.js',
} satisfies BuildOptions;
