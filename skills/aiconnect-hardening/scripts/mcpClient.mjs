// A small MCP client over Streamable HTTP, with no dependency, so the pen test runs from any folder. It
// reads answers sent as JSON or as an event stream, and keeps the session the server gives, if any.

const PROTOCOL_VERSION = '2025-06-18';

function parseBody(text, contentType) {
  if (!text) {
    return null;
  }
  if (!contentType.includes('text/event-stream')) {
    return JSON.parse(text);
  }
  const data = text.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim());
  return data.length ? JSON.parse(data.at(-1)) : null;
}

// The JSON-RPC message of an answer, or null when the body is no JSON-RPC message (a proxy's error page).
function readMessage(text, contentType) {
  try {
    return parseBody(text, contentType);
  } catch {
    return null;
  }
}

export function createMcpClient(url, extraHeaders = {}) {
  let sessionId = null;
  let nextId = 1;

  async function post(body) {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': PROTOCOL_VERSION,
      ...extraHeaders,
      ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {}),
    };
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    sessionId = response.headers.get('mcp-session-id') ?? sessionId;
    const text = await response.text();
    return { status: response.status, message: readMessage(text, response.headers.get('content-type') ?? ''), text };
  }

  // One request; returns { status, result, error } with the HTTP status kept for rate limit checks.
  async function request(method, params = {}) {
    const { status, message, text } = await post({ jsonrpc: '2.0', id: nextId++, method, params });
    return { status, result: message?.result ?? null, error: message?.error ?? (message ? null : text) };
  }

  async function initialize() {
    const answer = await request('initialize', {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'aiconnect-pentest', version: '1.0.0' },
    });
    if (answer.result) {
      await post({ jsonrpc: '2.0', method: 'notifications/initialized' });
    }
    return answer;
  }

  async function listTools() {
    const answer = await request('tools/list');
    return { ...answer, tools: answer.result?.tools ?? [] };
  }

  // A tool call, with the text parts of the result joined as the AI Connect SDK joins them.
  async function callTool(name, args) {
    const answer = await request('tools/call', { name, arguments: args });
    const parts = answer.result?.content ?? [];
    const text = parts.filter((part) => part.type === 'text').map((part) => part.text).join('\n');
    return { ...answer, text, isError: Boolean(answer.result?.isError) };
  }

  return { initialize, listTools, callTool, request };
}
