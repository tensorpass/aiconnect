// The bookshop's catalog as an MCP server at /api/mcp, the way a real site serves its tools: the
// Web Components page reads them through its `mcp` attribute. It answers statelessly over
// Streamable HTTP, one server and transport per request, and only to POST.

import type { IncomingMessage, ServerResponse } from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { BOOK_TOOLS, SEARCH_BOOKS, searchBooks } from '../src/bookCatalog.ts';

function bookServer(): Server {
  const server = new Server({ name: 'bookshop', version: '0.1.0' }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: BOOK_TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
    if (params.name !== SEARCH_BOOKS) {
      return { isError: true, content: [{ type: 'text', text: `Unknown tool ${params.name}` }] };
    }
    return { content: [{ type: 'text', text: JSON.stringify(searchBooks(params.arguments ?? {})) }] };
  });
  return server;
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function handleMcp(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method !== 'POST') {
    response.writeHead(405, { Allow: 'POST' }).end();
    return;
  }
  const server = bookServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  response.on('close', () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(request, response, await readJson(request));
}
