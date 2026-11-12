// The two scripts of the elements package, as esbuild options: the Web Components script, which bundles
// the elements, React and the modules' stylesheet, and the loader, which draws the chats' buttons and
// loads the Web Components script when the visitor reaches for one. Stylesheets come in as minified
// text, for the elements' shadow roots and the page's tokens.

import { readFile } from 'node:fs/promises';
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
  entryPoints: ['src/index.ts'],
  outfile: 'dist/aiconnect-elements.js',
  sourcemap: true,
} satisfies BuildOptions;

export const loaderBundle = {
  ...common,
  entryPoints: ['src/loader/index.ts'],
  outfile: 'dist/aiconnect-loader.js',
} satisfies BuildOptions;
