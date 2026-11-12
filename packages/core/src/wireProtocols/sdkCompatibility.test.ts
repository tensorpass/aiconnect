import assert from 'node:assert/strict';
import { test } from 'node:test';
import Anthropic from '@anthropic-ai/sdk';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { GoogleGenAI } from '@google/genai';
import { ChatOpenAI } from '@langchain/openai';
import { generateText, jsonSchema, Output, stepCountIs, streamText, tool } from 'ai';
import OpenAI from 'openai';
import type { ChatRequest, ChatResponse, ProviderSession, ToolCall } from '../types.ts';
import { WalletRequestError } from '../walletProvider.ts';
import { createWalletFetch } from './walletFetch.ts';

interface Reply {
  texts?: string[];
  response?: ChatResponse;
  error?: Error;
  // Keeps the answer open until the request's signal aborts.
  hang?: boolean;
  // Answers without naming who answers, as no wallet may.
  unnamed?: boolean;
}

// Who answers, as the wallet names it before the first text.
const ANSWERING = { providerName: 'Claude', model: 'claude-haiku-5-5' };

const USAGE = { inputTokens: 12, outputTokens: 5, cachedInputTokens: 2 };
const WEATHER_SCHEMA = { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] };

function textReply(text: string, model = 'claude-sonnet-5-5'): Reply {
  const middle = Math.ceil(text.length / 2);
  return {
    texts: [text.slice(0, middle), text.slice(middle)],
    response: { message: { role: 'assistant', content: text }, finishReason: 'stop', model, usage: USAGE },
  };
}

function toolReply(...toolCalls: ToolCall[]): Reply {
  const message = { role: 'assistant' as const, content: '', toolCalls };
  return { response: { message, finishReason: 'toolCalls', model: 'm', usage: USAGE } };
}

function hang(signal?: AbortSignal): Promise<never> {
  return new Promise((_resolve, reject) => signal?.addEventListener('abort', () => reject(signal.reason)));
}

// A wallet that answers each chat with the next scripted reply and records what it was asked. Its
// session names no model, as on Auto, where the wallet picks the account for each answer.
function scriptedWallet(...replies: Reply[]) {
  const requests: ChatRequest[] = [];
  const session: ProviderSession = {
    providerId: 'aiwallet',
    model: '',
    chat: async (request) => {
      requests.push(request);
      const reply = replies.shift()!;
      if (reply.error) {
        throw reply.error;
      }
      if (!reply.unnamed) {
        request.onStart?.(ANSWERING);
      }
      reply.texts?.forEach((text) => request.onText?.(text));
      return reply.hang ? hang(request.signal) : reply.response!;
    },
  };
  return { requests, fetch: createWalletFetch(async () => session) };
}

const weatherCall: ToolCall = { id: 'call_1', name: 'weather', arguments: { city: 'Paris' } };

test('the OpenAI SDK streams chat completions with the usage it asks for', async () => {
  const wallet = scriptedWallet(textReply('Hello there'));
  const client = new OpenAI({ apiKey: 'aiwallet', fetch: wallet.fetch, maxRetries: 0 });
  const stream = await client.chat.completions.create({
    model: 'gpt-anything',
    messages: [{ role: 'system', content: 'Be brief' }, { role: 'user', content: 'Hi' }],
    stream: true,
    stream_options: { include_usage: true },
    temperature: 0.2,
  });
  let text = '';
  let usage;
  for await (const chunk of stream) {
    text += chunk.choices[0]?.delta.content ?? '';
    usage = chunk.usage ?? usage;
  }
  assert.equal(text, 'Hello there');
  assert.equal(usage?.prompt_tokens, 12);
  assert.deepEqual(wallet.requests[0].messages, [
    { role: 'system', content: 'Be brief' }, { role: 'user', content: 'Hi' },
  ]);
  assert.equal(wallet.requests[0].options?.temperature, 0.2);
});

test('the OpenAI SDK runs a tool round trip on chat completions', async () => {
  const wallet = scriptedWallet(toolReply(weatherCall), textReply('Sunny in Paris'));
  const client = new OpenAI({ apiKey: 'aiwallet', fetch: wallet.fetch, maxRetries: 0 });
  const tools = [{ type: 'function' as const, function: { name: 'weather', parameters: WEATHER_SCHEMA } }];
  const messages: OpenAI.ChatCompletionMessageParam[] = [{ role: 'user', content: 'Weather in Paris?' }];
  const first = await client.chat.completions.create({ model: 'x', messages, tools, tool_choice: 'required' });
  const call = first.choices[0].message.tool_calls![0];
  assert.equal(first.choices[0].finish_reason, 'tool_calls');
  assert.equal(call.type === 'function' && call.function.arguments, '{"city":"Paris"}');
  messages.push(first.choices[0].message, { role: 'tool', tool_call_id: call.id, content: '22 degrees' });
  const second = await client.chat.completions.create({ model: 'x', messages, tools });
  assert.equal(second.choices[0].message.content, 'Sunny in Paris');
  assert.equal(wallet.requests[0].options?.toolChoice, 'required');
  assert.deepEqual(wallet.requests[1].messages.at(-1), {
    role: 'tool', toolCallId: 'call_1', name: 'weather', content: '22 degrees',
  });
});

test('the OpenAI SDK streams the Responses protocol with structured output', async () => {
  const wallet = scriptedWallet(textReply('{"city":"Paris"}'));
  const client = new OpenAI({ apiKey: 'aiwallet', fetch: wallet.fetch, maxRetries: 0 });
  const stream = client.responses.stream({
    model: 'x',
    instructions: 'Answer in JSON',
    input: 'Where?',
    text: { format: { type: 'json_schema', name: 'place', schema: WEATHER_SCHEMA, strict: true } },
  });
  const final = await stream.finalResponse();
  assert.equal(final.output_text, '{"city":"Paris"}');
  assert.equal(final.usage?.output_tokens, 5);
  assert.deepEqual(wallet.requests[0].options?.responseFormat, {
    type: 'json', name: 'place', schema: WEATHER_SCHEMA, strict: true,
  });
});

test('the OpenAI SDK streams each tool call in a chunk of its own, after the model that answers', async () => {
  const wallet = scriptedWallet(toolReply(weatherCall, { ...weatherCall, id: 'call_2', arguments: { city: 'Rome' } }));
  const client = new OpenAI({ apiKey: 'aiwallet', fetch: wallet.fetch, maxRetries: 0 });
  const stream = await client.chat.completions.create({
    model: 'x', messages: [{ role: 'user', content: 'Paris and Rome?' }], stream: true,
  });
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  assert.equal(chunks[0].model, ANSWERING.model);
  const calls = chunks.flatMap((chunk) => chunk.choices[0]?.delta.tool_calls ?? []);
  assert.deepEqual(calls.map((call) => [call.index, call.id]), [[0, 'call_1'], [1, 'call_2']]);
  assert.equal(chunks.filter((chunk) => chunk.choices[0]?.delta.tool_calls).length, 2);
});

test('a stream the wallet answers without naming who answers fails', async () => {
  const wallet = scriptedWallet({ ...textReply('Hello'), unnamed: true });
  const client = new OpenAI({ apiKey: 'aiwallet', fetch: wallet.fetch, maxRetries: 0 });
  await assert.rejects(
    client.chat.completions.create({ model: 'x', messages: [{ role: 'user', content: 'Hi' }], stream: true }),
    (error) => error instanceof OpenAI.InternalServerError && /without naming/.test(error.message),
  );
});

test('a wallet error before any text becomes the SDK error of its status', async () => {
  const wallet = scriptedWallet({ error: new WalletRequestError('Mistral answered 429: slow down', 429) });
  const client = new OpenAI({ apiKey: 'aiwallet', fetch: wallet.fetch, maxRetries: 0 });
  await assert.rejects(
    client.chat.completions.create({ model: 'x', messages: [{ role: 'user', content: 'Hi' }] }),
    (error) => error instanceof OpenAI.RateLimitError && /slow down/.test(error.message),
  );
});

test('aborting the SDK stops the wallet answer', async () => {
  const wallet = scriptedWallet({ texts: ['Once upon'], hang: true });
  const client = new OpenAI({ apiKey: 'aiwallet', fetch: wallet.fetch, maxRetries: 0 });
  const controller = new AbortController();
  const stream = await client.chat.completions.create(
    { model: 'x', messages: [{ role: 'user', content: 'A story' }], stream: true },
    { signal: controller.signal },
  );
  let text = '';
  for await (const chunk of stream) {
    text += chunk.choices[0]?.delta.content ?? '';
    if (text) {
      controller.abort();
    }
  }
  assert.equal(text, 'Once upon');
  assert.equal(wallet.requests[0].signal?.aborted, true);
});

test('an endpoint the wallet does not answer is a not found error', async () => {
  const client = new OpenAI({ apiKey: 'aiwallet', fetch: scriptedWallet().fetch, maxRetries: 0 });
  await assert.rejects(client.embeddings.create({ model: 'x', input: 'Hi' }), OpenAI.NotFoundError);
});

test('the Anthropic SDK streams text and tool use with images in the request', async () => {
  const reply = textReply('A cat. Checking the weather.');
  reply.response = { ...reply.response!, message: { ...reply.response!.message, toolCalls: [weatherCall] } };
  reply.response.finishReason = 'toolCalls';
  const wallet = scriptedWallet(reply);
  const client = new Anthropic({ apiKey: 'aiwallet', fetch: wallet.fetch, maxRetries: 0 });
  const image = { type: 'base64' as const, media_type: 'image/png' as const, data: 'iVBORw0K' };
  const message = await client.messages.stream({
    model: 'claude-anything',
    max_tokens: 1000,
    system: 'You see images',
    messages: [{ role: 'user', content: [{ type: 'image', source: image }, { type: 'text', text: 'What is it?' }] }],
    tools: [{ name: 'weather', input_schema: WEATHER_SCHEMA as Anthropic.Tool.InputSchema }],
  }).finalMessage();
  assert.equal(message.stop_reason, 'tool_use');
  // The protocol names the model when the answer starts: the one the wallet names before the text.
  assert.equal(message.model, ANSWERING.model);
  assert.deepEqual(message.content.map((block) => block.type), ['text', 'tool_use']);
  assert.deepEqual(message.content[1].type === 'tool_use' && message.content[1].input, { city: 'Paris' });
  assert.equal(message.usage.output_tokens, 5);
  assert.deepEqual(wallet.requests[0].messages[1], {
    role: 'user',
    content: [{ type: 'image', url: 'data:image/png;base64,iVBORw0K' }, { type: 'text', text: 'What is it?' }],
  });
});

test('the Anthropic SDK reads a tool result turn and a whole answer', async () => {
  const wallet = scriptedWallet(textReply('Sunny'));
  const client = new Anthropic({ apiKey: 'aiwallet', fetch: wallet.fetch, maxRetries: 0 });
  const message = await client.messages.create({
    model: 'x',
    max_tokens: 100,
    messages: [
      { role: 'user', content: 'Weather?' },
      { role: 'assistant', content: [{ type: 'tool_use', id: 'call_1', name: 'weather', input: { city: 'Paris' } }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'call_1', content: '22 degrees' }] },
    ],
  });
  assert.deepEqual(message.content, [{ type: 'text', text: 'Sunny' }]);
  assert.deepEqual(wallet.requests[0].messages[2], {
    role: 'tool', toolCallId: 'call_1', name: 'weather', content: '22 degrees',
  });
  assert.equal(wallet.requests[0].options?.maxTokens, 100);
});

test('Google Gen AI streams content and runs a function call round trip', async () => {
  const wallet = scriptedWallet(textReply('Bonjour'), toolReply(weatherCall));
  const client = new GoogleGenAI({ apiKey: 'aiwallet', httpOptions: { fetch: wallet.fetch } });
  let text = '';
  const stream = await client.models.generateContentStream({ model: 'gemini-anything', contents: 'Say hello' });
  for await (const chunk of stream) {
    text += chunk.text ?? '';
  }
  assert.equal(text, 'Bonjour');
  const declarations = [{ name: 'weather', parametersJsonSchema: WEATHER_SCHEMA }];
  const result = await client.models.generateContent({
    model: 'x', contents: 'Weather in Paris?', config: { tools: [{ functionDeclarations: declarations }] },
  });
  assert.deepEqual(result.functionCalls?.[0].args, { city: 'Paris' });
  assert.equal(result.usageMetadata?.promptTokenCount, 12);
  assert.deepEqual(wallet.requests[1].tools, [{ name: 'weather', description: '', inputSchema: WEATHER_SCHEMA }]);
});

test('the Vercel AI SDK runs its tool loop on the Responses protocol', async () => {
  const wallet = scriptedWallet(toolReply(weatherCall), textReply('It is sunny in Paris'));
  const openai = createOpenAI({ apiKey: 'aiwallet', fetch: wallet.fetch });
  const weather = tool({
    description: 'Weather of a city',
    inputSchema: jsonSchema<{ city: string }>(WEATHER_SCHEMA),
    execute: async ({ city }) => `22 degrees in ${city}`,
  });
  const result = streamText({
    model: openai('gpt-anything'), prompt: 'Weather?', tools: { weather }, stopWhen: stepCountIs(3),
  });
  assert.equal(await result.text, 'It is sunny in Paris');
  assert.deepEqual(wallet.requests[1].messages.at(-1), {
    role: 'tool', toolCallId: 'call_1', name: 'weather', content: '22 degrees in Paris',
  });
});

test('the Vercel AI SDK reads structured output from chat completions', async () => {
  const wallet = scriptedWallet(textReply('{"city":"Paris"}'));
  const openai = createOpenAI({ apiKey: 'aiwallet', fetch: wallet.fetch });
  const result = await generateText({
    model: openai.chat('gpt-anything'),
    prompt: 'Where?',
    output: Output.object({ schema: jsonSchema<{ city: string }>(WEATHER_SCHEMA) }),
  });
  assert.deepEqual(result.output, { city: 'Paris' });
  assert.equal(wallet.requests[0].options?.responseFormat?.type, 'json');
});

test('the Vercel AI SDK streams through its Anthropic and Google providers', async () => {
  const wallet = scriptedWallet(textReply('From Claude'), textReply('From Gemini'));
  const anthropic = createAnthropic({ apiKey: 'aiwallet', fetch: wallet.fetch });
  const google = createGoogleGenerativeAI({ apiKey: 'aiwallet', fetch: wallet.fetch });
  const claude = streamText({ model: anthropic('claude-anything'), prompt: 'Hi' });
  assert.equal(await claude.text, 'From Claude');
  assert.equal((await claude.usage).outputTokens, 5);
  const gemini = streamText({ model: google('gemini-anything'), prompt: 'Hi' });
  assert.equal(await gemini.text, 'From Gemini');
});

test('LangChain binds tools to ChatOpenAI', async () => {
  const wallet = scriptedWallet(toolReply(weatherCall), textReply('Hello from LangChain'));
  const model = new ChatOpenAI({ apiKey: 'aiwallet', model: 'gpt-anything', configuration: { fetch: wallet.fetch } });
  const withTools = model.bindTools([{
    type: 'function', function: { name: 'weather', description: 'Weather', parameters: WEATHER_SCHEMA },
  }]);
  const called = await withTools.invoke('Weather in Paris?');
  assert.deepEqual(called.tool_calls?.[0].args, { city: 'Paris' });
  const answered = await model.invoke('Hello');
  assert.equal(answered.content, 'Hello from LangChain');
});
