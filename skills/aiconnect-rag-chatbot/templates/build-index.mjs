#!/usr/bin/env node
// Builds the chat's search index from the site's pages and writes it as JSON:
//
//   node scripts/build-index.mjs --origin http://localhost:3000 --out data/site-index.json --exclude /account
//
// --origin is a running copy of the site (the dev server, or the live site after a deploy); --sitemap
// defaults to <origin>/sitemap.xml. Run it again whenever the content changes, and commit the JSON.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { collectPages } from '../lib/ai/collectPages.mjs';
import { buildIndex } from '../lib/ai/siteIndex.mjs';

function parseArgs(argv) {
  const options = { exclude: [] };
  for (let index = 0; index < argv.length; index += 2) {
    const [flag, value] = [argv[index], argv[index + 1]];
    if (!value) {
      throw new Error(`Missing value for ${flag}`);
    }
    if (flag === '--exclude') {
      options.exclude.push(...value.split(','));
    } else if (['--origin', '--sitemap', '--out'].includes(flag)) {
      options[flag.slice(2)] = value;
    } else {
      throw new Error(`Unknown option ${flag}`);
    }
  }
  if (!options.origin || !options.out) {
    throw new Error('Usage: build-index.mjs --origin <url> --out <file> [--sitemap <url>] [--exclude /a,/b]');
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const sitemapUrl = options.sitemap ?? new URL('/sitemap.xml', options.origin).href;
  const pages = await collectPages({ sitemapUrl, origin: options.origin, exclude: options.exclude });
  if (!pages.length) {
    throw new Error(`No page to index from ${sitemapUrl}`);
  }
  const index = buildIndex(pages);
  await mkdir(path.dirname(path.resolve(options.out)), { recursive: true });
  await writeFile(options.out, `${JSON.stringify(index)}\n`);
  console.log(`Indexed ${index.pages} pages in ${index.passages.length} passages into ${options.out}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
