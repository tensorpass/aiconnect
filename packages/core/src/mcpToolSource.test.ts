import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpServer as ModernMcpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { McpToolSource } from './mcpToolSource.ts';

// A site's MCP server that fails its first request, as a server still starting does.
function serverFailingOnce() {
  let failed = false;
  return createServer(async (request, response) => {
    if (!failed) {
      failed = true;
      response.writeHead(503).end();
      return;
    }
    const server = new McpServer({ name: 'bookshop', version: '1.0.0' });
    server.registerTool('search', { description: 'Search the catalog' }, async () => ({ content: [] }));
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(request, response);
  });
}

// A server of the 2026-07-28 revision only, as Mastra's `MCPServer` serves its tools: a 2025
// handshake gets the unsupported version error.
function modernOnlyServer() {
  const handler = createMcpHandler(() => {
    const server = new ModernMcpServer({ name: 'bookshop', version: '1.0.0' });
    server.registerTool('search', { description: 'Search the catalog' }, async () => ({
      content: [{ type: 'text', text: '[{"title":"Piranesi"}]' }],
    }));
    return server;
  }, { legacy: 'reject' });
  return createServer(toNodeHandler(handler));
}

async function listening(http: Server, context: { after: (fn: () => void) => void }): Promise<string> {
  http.listen(0, '127.0.0.1');
  context.after(() => {
    http.closeAllConnections();
    http.close();
  });
  await once(http, 'listening');
  return `http://127.0.0.1:${(http.address() as AddressInfo).port}/mcp`;
}

test('a failed read of the tools lets the next call try again', async (context) => {
  const source = new McpToolSource(await listening(serverFailingOnce(), context));
  await assert.rejects(source.listTools());
  assert.deepEqual((await source.listTools()).map((tool) => tool.name), ['search']);
});

test('the tools of a server that serves only the 2026-07-28 revision are read and called', async (context) => {
  const source = new McpToolSource(await listening(modernOnlyServer(), context));
  assert.deepEqual((await source.listTools()).map((tool) => tool.name), ['search']);
  assert.equal(await source.callTool('search', {}), '[{"title":"Piranesi"}]');
});
