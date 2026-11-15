import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runConversation } from '../toolLoop.ts';
import type { ChatStart, ToolSource } from '../types.ts';
import { webSession } from './openAiCompatibleSession.ts';
import type { HttpFetch, WebSessionConfig } from './openAiCompatibleSession.ts';

interface Call {
  url: string;
  headers: Headers;
  body: Record<string, unknown>;
}

function stream(events: unknown[]): Response {
  const text = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('') + 'data: [DONE]\n\n';
  return new Response(text, { headers: { 'content-type': 'text/event-stream' } });
}

// Answers each call with the next reply, and keeps what each call sent.
function played(replies: Response[]): { fetch: HttpFetch; calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    fetch: async (url, init) => {
      calls.push({ url, headers: new Headers(init.headers), body: JSON.parse(String(init.body)) });
      return replies.shift()!;
    },
  };
}

function config(fetch: HttpFetch, overrides: Partial<WebSessionConfig> = {}): WebSessionConfig {
  return {
    providerId: 'openrouter',
    providerName: 'OpenRouter',
    model: 'openrouter/auto',
    endpoint: 'https://openrouter.test/v1/chat/completions',
    credential: async () => ({ Authorization: 'Bearer key-1' }),
    renew: async () => null,
    onRefused: () => undefined,
    fetch,
    ...overrides,
  };
}

const TEXT_ANSWER = [
  { model: 'vendor/model-a', choices: [{ delta: { content: 'Read ' } }] },
  { choices: [{ delta: { content: 'Piranesi.' }, finish_reason: 'stop' }] },
  { choices: [], usage: { prompt_tokens: 12, completion_tokens: 3, prompt_tokens_details: { cached_tokens: 2 } } },
];

test('a chat streams its text after naming who answers, and returns the whole answer with its usage', async () => {
  const { fetch, calls } = played([stream(TEXT_ANSWER)]);
  const events: string[] = [];
  const response = await webSession(config(fetch)).chat({
    messages: [{ role: 'system', content: 'Be brief' }, { role: 'user', content: 'A calm book' }],
    options: { maxTokens: 50, toolChoice: { name: 'search' }, responseFormat: { type: 'json' } },
    onStart: (start: ChatStart) => events.push(`start ${start.providerName} ${start.model}`),
    onText: (delta) => events.push(delta),
  });
  assert.deepEqual(events, ['start OpenRouter vendor/model-a', 'Read ', 'Piranesi.']);
  assert.deepEqual(response, {
    message: { role: 'assistant', content: 'Read Piranesi.' },
    finishReason: 'stop',
    model: 'vendor/model-a',
    usage: { inputTokens: 12, outputTokens: 3, cachedInputTokens: 2 },
  });
  assert.equal(calls[0].headers.get('authorization'), 'Bearer key-1');
  assert.equal(calls[0].body.model, 'openrouter/auto');
  assert.equal(calls[0].body.stream, true);
  assert.equal(calls[0].body.max_tokens, 50);
  assert.deepEqual(calls[0].body.tool_choice, { type: 'function', function: { name: 'search' } });
  assert.deepEqual(calls[0].body.response_format, { type: 'json_object' });
});

const TOOL_CALL = [
  { choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_1', function: { name: 'search', arguments: '' } }] } }] },
  { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '{"q":"ca' } }] } }] },
  {
    choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'lm"}' } }] }, finish_reason: 'tool_calls' }],
  },
];

test('the conversation loop runs a tool the account asks for, then streams its final answer', async () => {
  const { fetch, calls } = played([stream(TOOL_CALL), stream(TEXT_ANSWER)]);
  const tools: ToolSource = {
    listTools: async () => [{ name: 'search', description: 'Search the books', inputSchema: { type: 'object' } }],
    callTool: async (name, args) => `${name} found Piranesi for ${String(args.q)}`,
  };
  let streamed = '';
  const added = await runConversation({
    session: webSession(config(fetch)), tools, messages: [{ role: 'user', content: 'A calm book' }],
    onText: (delta) => {
      streamed += delta;
    },
  });
  assert.deepEqual(added[0], {
    role: 'assistant', content: '', toolCalls: [{ id: 'call_1', name: 'search', arguments: { q: 'calm' } }],
  });
  assert.deepEqual(added[1], {
    role: 'tool', toolCallId: 'call_1', name: 'search', content: 'search found Piranesi for calm',
  });
  assert.equal(streamed, 'Read Piranesi.');
  const second = calls[1].body.messages as Record<string, unknown>[];
  assert.deepEqual(second.at(-2), {
    role: 'assistant', content: null,
    tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'search', arguments: '{"q":"calm"}' } }],
  });
  assert.deepEqual(second.at(-1), { role: 'tool', tool_call_id: 'call_1', content: 'search found Piranesi for calm' });
  assert.equal((calls[0].body.tools as unknown[]).length, 1);
});

test('a refused call carries the provider\'s status and its own message', async () => {
  const refusal = Response.json(
    { error: { type: 'plan_error', code: 'plan_site_cap_reached', message: 'This site reached its monthly limit.' } },
    { status: 429 },
  );
  const { fetch } = played([refusal]);
  await assert.rejects(webSession(config(fetch, { providerName: 'TensorPass' })).chat({ messages: [] }), {
    name: 'WalletRequestError', status: 429, message: 'TensorPass: This site reached its monthly limit.',
  });
});

test('a 401 renews the credential once, and a second 401 signs the visitor out', async () => {
  const unauthorized = () => Response.json({ error: { message: 'This plan token is not valid.' } }, { status: 401 });
  const renewed = played([unauthorized(), stream(TEXT_ANSWER)]);
  const response = await webSession(config(renewed.fetch, { renew: async () => ({ Authorization: 'Bearer key-2' }) }))
    .chat({ messages: [] });
  assert.equal(response.message.content, 'Read Piranesi.');
  assert.equal(renewed.calls[1].headers.get('authorization'), 'Bearer key-2');

  let refused = 0;
  const dead = played([unauthorized()]);
  await assert.rejects(webSession(config(dead.fetch, { onRefused: () => (refused += 1) })).chat({ messages: [] }), {
    status: 401,
  });
  assert.equal(refused, 1);
  assert.equal(dead.calls.length, 1);
});

test('an error the provider sends inside the stream stops the answer with its message', async () => {
  const { fetch } = played([stream([TEXT_ANSWER[0], { error: { code: 502, message: 'Upstream stopped' } }])]);
  await assert.rejects(webSession(config(fetch)).chat({ messages: [] }), {
    status: 502, message: 'OpenRouter: Upstream stopped',
  });
});
