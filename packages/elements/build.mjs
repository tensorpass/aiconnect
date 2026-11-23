// Builds the Web Components script, its loader, the sign in return page's script and the pdf.js and dictation
// worklet scripts published beside the Web Components script into dist, minified, on React's production build, the
// Web Components script with its source map beside it. The loader must stay under Shopify's limit for an
// app embed's script, so the build fails when it grows past it.

import { build } from 'esbuild';
import {
  callbackBundle, elementsBundle, LOADER_LIMIT_BYTES, loaderBundle, pdfBundle, workletBundle,
} from './bundles.ts';

for (const options of [elementsBundle, loaderBundle, callbackBundle, pdfBundle, workletBundle]) {
  const result = await build(options);
  const bytes = result.metafile.outputs[options.outfile].bytes;
  console.log(`AI Connect ${options.outfile} built (${(bytes / 1024).toFixed(1)} KB)`);
  if (options === loaderBundle && bytes > LOADER_LIMIT_BYTES) {
    throw new Error(`The loader weighs ${bytes} bytes, over the ${LOADER_LIMIT_BYTES} of an app embed's script.`);
  }
}
