// The site's MCP server for the chat, at app/api/mcp/route.ts: search the site's pages and read one page,
// from the index scripts/build-index.mjs writes. It holds no state, answers in JSON, caps each request and
// each result, checks each result against the chat policy before it leaves, and limits each visitor
// address to 60 requests a minute. The transport counts the bytes of a request as it reads them, whatever
// length the request declares, which needs @modelcontextprotocol/sdk 1.31 or later.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  WebStandardStreamableHTTPServerTransport,
} from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import { checkToolResult } from '@tensorpass/aiconnect';
import { chatPolicy } from '@/lib/ai/chatPolicy.mjs';
import { createRateLimit, tooManyRequests, visitorAddress } from '@/lib/ai/rateLimit.mjs';
import { pageText, searchIndex } from '@/lib/ai/siteIndex.mjs';
import type { SiteIndex } from '@/lib/ai/siteIndex.mjs';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 16_384;
const PASSAGE_CHARS = 700;
const PAGE_CHARS = 6000;
const READ_ONLY = { readOnlyHint: true, openWorldHint: false };
const rateLimit = createRateLimit({ limit: 60, windowMs: 60_000 });
// The index, read once when the route loads. Rebuild it with scripts/build-index.mjs.
const siteIndex: SiteIndex = JSON.parse(readFileSync(path.join(process.cwd(), 'data/site-index.json'), 'utf8'));

const text = (value: string, isError = false) => ({ content: [{ type: 'text' as const, text: value }], isError });

// A result that names something the policy keeps internal never leaves the server: anyone can call it
// without the page.
const checked = (value: string) => (checkToolResult(value, chatPolicy).ok
  ? text(value)
  : text('This result is not available.', true));

function createServer(): McpServer {
  const server = new McpServer({ name: 'site-search', version: '1.0.0' });
  server.registerTool('search_site', {
    title: 'Search the site',
    description: 'Search the pages of this site. Returns up to `limit` passages as JSON, each with its page title, '
      + 'section heading, path and text. Use the words the site would use; if nothing matches, the answer is [] '
      + 'and a shorter query or a synonym is the next try. Cite the path of each page you use.',
    inputSchema: {
      query: z.string().min(2).max(200).describe('Words to look for, such as "return policy" or "delivery Lyon"'),
      limit: z.number().int().min(1).max(8).default(5).describe('How many passages to return'),
    },
    annotations: READ_ONLY,
  }, async ({ query, limit }) => {
    const hits = searchIndex(siteIndex, query, limit)
      .map((hit) => ({ ...hit, text: hit.text.slice(0, PASSAGE_CHARS) }));
    return checked(JSON.stringify(hits));
  });
  server.registerTool('read_page', {
    title: 'Read a page of the site',
    description: 'The full text of one page of this site, by the path search_site returned, such as /returns.',
    inputSchema: { path: z.string().min(1).max(200).describe('The page path, starting with /') },
    annotations: READ_ONLY,
  }, async ({ path }) => {
    const page = pageText(siteIndex, path);
    return page
      ? checked(JSON.stringify({ ...page, text: page.text.slice(0, PAGE_CHARS) }))
      : text(`No page at ${path}. Use a path from search_site.`, true);
  });
  return server;
}

export async function POST(request: Request) {
  const allowed = rateLimit(visitorAddress(request.headers));
  if (!allowed.ok) {
    return tooManyRequests(allowed.retryAfterSeconds);
  }
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
    maxRequestBodySize: MAX_BODY_BYTES,
  });
  await createServer().connect(transport);
  return transport.handleRequest(request);
}

function methodNotAllowed() {
  return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'POST' } });
}

export const GET = methodNotAllowed;
export const DELETE = methodNotAllowed;
