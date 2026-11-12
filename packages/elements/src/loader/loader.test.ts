// The loader's weight: under Shopify's 10 KB for an app embed's script, raw as Shopify measures it, and
// with no React in it, since the Web Components script brings React when the visitor reaches for a chat.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';
import { LOADER_LIMIT_BYTES, loaderBundle } from '../../bundles.ts';

test('the loader stays under the 10 KB of an app embed script, without React', async () => {
  const { outputFiles } = await build({ ...loaderBundle, write: false, metafile: false });
  const code = outputFiles[0].contents;
  const gzipped = gzipSync(code).length;
  console.log(`aiconnect-loader.js: ${code.length} bytes, ${gzipped} bytes gzipped`);
  assert.ok(code.length < LOADER_LIMIT_BYTES, `${code.length} bytes`);
  assert.ok(gzipped < code.length / 2, `${gzipped} bytes gzipped`);
  const text = outputFiles[0].text;
  assert.ok(!text.includes('createRoot') && !text.includes('react.production'), 'React is not in the loader');
  assert.ok(text.includes('data-elements-src') || text.includes('elementsSrc'), 'the loader reads the script address');
});
