// The Anthropic Messages protocol, as the Anthropic SDK, the Vercel AI SDK's `anthropic()` models
// and LangChain's ChatAnthropic speak it. Streamed answers go as named events: `message_start`, a
// content block per text and per tool call, then `message_delta` with the stop reason and the
// usage. `message_start` names the model of the account that answers, which the wallet tells
// before the first text, and counts nothing yet, since the wallet reports usage once the answer ends.

import { dataUrl, textOf } from '../chatContent.ts';
import type {
  ChatMessage, ChatResponse, ContentPart, FinishReason, JsonSchema, ToolCall, ToolChoice, ToolDefinition, Usage,
} from '../types.ts';
import type { WalletRequestError } from '../walletProvider.ts';
import type { EventWriter } from './eventStream.ts';
import type { WalletAnswer } from './walletAnswer.ts';
import { EMPTY_PARAMETERS, errorType, toolNameOf, unsupported, userContent } from './wireProtocol.ts';
import type { AnswerContext, WireProtocol, WireRequest } from './wireProtocol.ts';

interface WireBlock {
  type: string;
  text?: string;
  source?: { type: string; media_type?: string; data?: string; url?: string };
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string | WireBlock[];
}

interface WireMessage {
  role: 'user' | 'assistant';
  content: string | WireBlock[];
}

interface WireTool {
  type?: string;
  name: string;
  description?: string;
  input_schema?: JsonSchema;
}

interface MessagesBody {
  system?: string | WireBlock[];
  messages?: WireMessage[];
  tools?: WireTool[];
  tool_choice?: { type: string; name?: string };
  output_config?: { format?: { type: string; schema?: JsonSchema } };
  output_format?: { type: string; schema?: JsonSchema };
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stop_sequences?: string[];
  stream?: boolean;
}

const STOP_REASONS: Record<FinishReason, string> = {
  stop: 'end_turn',
  length: 'max_tokens',
  toolCalls: 'tool_use',
  contentFilter: 'refusal',
};

// Thinking blocks hold the provider's own reasoning, which another account cannot read.
const SKIPPED_BLOCKS = new Set(['thinking', 'redacted_thinking']);

const TOOL_CHOICES: Record<string, ToolChoice> = { auto: 'auto', any: 'required', none: 'none' };

// What `message_start` counts: nothing yet, the final counts come with `message_delta`.
const NOTHING_COUNTED = { input_tokens: 0, output_tokens: 0 };

function blocksOf(content: string | WireBlock[] | undefined): WireBlock[] {
  if (typeof content === 'string') {
    return content ? [{ type: 'text', text: content }] : [];
  }
  return (content ?? []).filter((block) => !SKIPPED_BLOCKS.has(block.type));
}

function imageUrl(source: NonNullable<WireBlock['source']>): string {
  if (source.type === 'base64' && source.media_type && source.data) {
    return dataUrl({ mediaType: source.media_type, data: source.data });
  }
  if (source.type === 'url' && source.url) {
    return source.url;
  }
  throw unsupported(`${source.type} image sources`);
}

function partOf(block: WireBlock): ContentPart {
  if (block.type === 'text') {
    return { type: 'text', text: block.text ?? '' };
  }
  if (block.type === 'image' && block.source) {
    return { type: 'image', url: imageUrl(block.source) };
  }
  throw unsupported(`${block.type} content`);
}

// A tool result's content is text; images inside a result have no place in the shared format.
function resultText(block: WireBlock): string {
  const parts = blocksOf(block.content).map(partOf);
  if (parts.some((part) => part.type !== 'text')) {
    throw unsupported('images inside tool results');
  }
  return textOf(parts);
}

// A user turn carries the results of the previous tool calls first, then what the user wrote.
function readUser(blocks: WireBlock[], names: Map<string, string>): ChatMessage[] {
  const results = blocks.filter((block) => block.type === 'tool_result').map((block): ChatMessage => {
    const toolCallId = block.tool_use_id ?? '';
    return { role: 'tool', toolCallId, name: toolNameOf(names, toolCallId), content: resultText(block) };
  });
  const parts = blocks.filter((block) => block.type !== 'tool_result').map(partOf);
  return parts.length ? [...results, { role: 'user', content: userContent(parts) }] : results;
}

function readAssistant(blocks: WireBlock[], names: Map<string, string>): ChatMessage {
  const toolCalls: ToolCall[] = blocks.filter((block) => block.type === 'tool_use').map((block) => ({
    id: block.id ?? '', name: block.name ?? '', arguments: block.input ?? {},
  }));
  toolCalls.forEach((call) => names.set(call.id, call.name));
  const content = textOf(blocks.filter((block) => block.type !== 'tool_use').map(partOf));
  return { role: 'assistant', content, ...(toolCalls.length ? { toolCalls } : {}) };
}

function readMessages(body: MessagesBody): ChatMessage[] {
  const names = new Map<string, string>();
  const system = textOf(blocksOf(body.system).map(partOf));
  const conversation = (body.messages ?? []).flatMap((message) => (message.role === 'assistant'
    ? [readAssistant(blocksOf(message.content), names)]
    : readUser(blocksOf(message.content), names)));
  return system ? [{ role: 'system', content: system }, ...conversation] : conversation;
}

function readTools(tools?: WireTool[]): ToolDefinition[] | undefined {
  return tools?.map((tool) => {
    if (tool.type && tool.type !== 'custom') {
      throw unsupported(`the ${tool.type} tool`);
    }
    return { name: tool.name, description: tool.description ?? '', inputSchema: tool.input_schema ?? EMPTY_PARAMETERS };
  });
}

function readToolChoice(choice: MessagesBody['tool_choice']): ToolChoice | undefined {
  if (!choice) {
    return undefined;
  }
  return choice.type === 'tool' && choice.name ? { name: choice.name } : TOOL_CHOICES[choice.type];
}

function read(raw: Record<string, unknown>): WireRequest {
  const body = raw as MessagesBody;
  const format = body.output_config?.format ?? body.output_format;
  return {
    request: {
      messages: readMessages(body),
      tools: readTools(body.tools),
      options: {
        maxTokens: body.max_tokens,
        temperature: body.temperature,
        topP: body.top_p,
        stop: body.stop_sequences,
        toolChoice: readToolChoice(body.tool_choice),
        responseFormat: format ? { type: 'json', schema: format.schema } : undefined,
      },
    },
    stream: body.stream === true,
  };
}

// The protocol counts cached input apart from the rest.
function wireUsage(usage: Usage | undefined) {
  if (!usage) {
    return undefined;
  }
  return {
    input_tokens: usage.inputTokens - usage.cachedInputTokens,
    output_tokens: usage.outputTokens,
    cache_read_input_tokens: usage.cachedInputTokens,
  };
}

function contentBlocks({ message }: ChatResponse) {
  const text = message.content ? [{ type: 'text', text: message.content }] : [];
  const uses = (message.toolCalls ?? []).map((call) => ({
    type: 'tool_use', id: call.id, name: call.name, input: call.arguments,
  }));
  return [...text, ...uses];
}

function messageObject(context: AnswerContext, model: string, content: unknown[], response?: ChatResponse) {
  return {
    id: `msg_${context.id}`,
    type: 'message',
    role: 'assistant',
    model,
    content,
    stop_reason: response ? STOP_REASONS[response.finishReason] : null,
    stop_sequence: null,
    usage: response ? wireUsage(response.usage) : NOTHING_COUNTED,
  };
}

function writeToolUse(write: EventWriter, call: ToolCall, index: number): void {
  const contentBlock = { type: 'tool_use', id: call.id, name: call.name, input: {} };
  const delta = { type: 'input_json_delta', partial_json: JSON.stringify(call.arguments) };
  write.send({ type: 'content_block_start', index, content_block: contentBlock }, 'content_block_start');
  write.send({ type: 'content_block_delta', index, delta }, 'content_block_delta');
  write.send({ type: 'content_block_stop', index }, 'content_block_stop');
}

async function stream(answer: WalletAnswer, write: EventWriter, context: AnswerContext): Promise<void> {
  const { model } = await answer.started;
  write.send({ type: 'message_start', message: messageObject(context, model, []) }, 'message_start');
  let streamed = false;
  for await (const text of answer.texts()) {
    if (!streamed) {
      const contentBlock = { type: 'text', text: '' };
      write.send({ type: 'content_block_start', index: 0, content_block: contentBlock }, 'content_block_start');
      streamed = true;
    }
    write.send({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } }, 'content_block_delta');
  }
  const response = await answer.result;
  if (streamed) {
    write.send({ type: 'content_block_stop', index: 0 }, 'content_block_stop');
  }
  const offset = streamed ? 1 : 0;
  (response.message.toolCalls ?? []).forEach((call, index) => writeToolUse(write, call, index + offset));
  const delta = { stop_reason: STOP_REASONS[response.finishReason], stop_sequence: null };
  write.send({ type: 'message_delta', delta, usage: wireUsage(response.usage) }, 'message_delta');
  write.send({ type: 'message_stop' }, 'message_stop');
}

function body(response: ChatResponse, context: AnswerContext) {
  return messageObject(context, response.model, contentBlocks(response), response);
}

function errorBody(error: WalletRequestError) {
  return { type: 'error', error: { type: errorType(error.status), message: error.message } };
}

export const anthropicMessages: WireProtocol = {
  read,
  stream,
  body,
  error: errorBody,
  streamError: (error) => ({ data: errorBody(error), event: 'error' }),
};
