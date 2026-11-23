// What the demo's dev and preview servers add to Vite: the bookshop's MCP server at /api/mcp, and
// the one script build of @tensorpass/aiconnect-elements at /aiconnect-elements.js, which the plain HTML page
// public/elements.html loads with a script tag, as a WordPress page would, with the pdf.js and dictation
// worklet scripts it loads from beside itself.

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import type { Connect, Plugin } from 'vite';
import { handleMcp } from './bookMcpServer.ts';

const ELEMENTS_SCRIPTS = new Set(['/aiconnect-elements.js', '/aiconnect-pdf.js', '/aiconnect-pcm-worklet.js']);
const require = createRequire(import.meta.url);

// Read on each request, so a fresh `npm run build -w @tensorpass/aiconnect-elements` shows on reload.
async function elementsScript(path: string): Promise<Buffer> {
  try {
    return await readFile(require.resolve(`@tensorpass/aiconnect-elements${path}`));
  } catch (error) {
    throw new Error('Build the elements first: npm run build -w @tensorpass/aiconnect-elements', { cause: error });
  }
}

const serveElements: Connect.NextHandleFunction = (request, response, next) => {
  const path = request.url ?? '';
  if (!ELEMENTS_SCRIPTS.has(path)) {
    next();
    return;
  }
  elementsScript(path).then((script) => {
    response.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-cache' });
    response.end(script);
  }, next);
};

const serveMcp: Connect.NextHandleFunction = (request, response, next) => {
  handleMcp(request, response).catch(next);
};

function addRoutes(middlewares: Connect.Server): void {
  middlewares.use('/api/mcp', serveMcp);
  middlewares.use(serveElements);
}

export function demoServer(): Plugin {
  return {
    name: 'aiconnect-demo-server',
    configureServer: (server) => addRoutes(server.middlewares),
    configurePreviewServer: (server) => addRoutes(server.middlewares),
  };
}
