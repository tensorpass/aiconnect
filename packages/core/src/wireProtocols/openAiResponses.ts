// The OpenAI Responses protocol, the default path of the Vercel AI SDK's `openai()` models and of
// the OpenAI SDK's `responses` API. The wallet keeps no conversation, so a request carries its
// whole input. Streamed answers go as typed events: the message item and its text deltas, one item
// per tool call, then `response.completed` with the usage.

import { textOf } from '../chatContent.ts';
import type {
  AssistantMessage, ChatMessage, ChatResponse, ContentPart, JsonSchema, ResponseFormat, ToolCall, ToolChoice,
  ToolDefinition, Usage,
} from '../types.ts';
import type { WalletRequestError } from '../walletProvider.ts';
import type { EventWriter } from './eventStream.ts';
import type { WalletAnswer } from './walletAnswer.ts';
import {
  EMPTY_PARAMETERS, errorType, parseToolArguments, toolNameOf, unsupported, userContent,
} from './wireProtocol.ts';
import type { AnswerContext, WireProtocol, WireRequest } from './wireProtocol.ts';

interface InputPart {
  type: string;
  text?: string;
  refusal?: string;
  image_url?: string;
}

interface InputItem {
  type?: string;
  role?: string;
  content?: string | InputPart[];
  call_id?: string;
  name?: string;
  arguments?: string;
  output?: string | InputPart[];
}

interface WireTool {
  type: string;
  name?: string;
  description?: string;
  parameters?: JsonSchema;
}

interface ResponsesBody {
  input?: string | InputItem[];
  instructions?: string;
  tools?: WireTool[];
  tool_choice?: string | { type: string; name?: string };
  text?: { format?: { type: string; name?: string; schema?: JsonSchema; strict?: boolean } };
  max_output_tokens?: number;
  temperature?: number;
  top_p?: number;
  previous_response_id?: string;
  stream?: boolean;
}

// The conversation being read, with the name of each tool call for the results that answer it.
interface Reading {
  messages: ChatMessage[];
  names: Map<string, string>;
}

function partOf(part: InputPart): ContentPart {
  if (part.type === 'input_text' || part.type === 'output_text') {
    return { type: 'text', text: part.text ?? '' };
  }
  if (part.type === 'refusal') {
    return { type: 'text', text: part.refusal ?? '' };
  }
  if (part.type === 'input_image' && part.image_url) {
    return { type: 'image', url: part.image_url };
  }
  throw unsupported(`${part.type} content`);
}

function partsOf(content: string | InputPart[] | undefined): ContentPart[] {
  if (typeof content === 'string') {
    return content ? [{ type: 'text', text: content }] : [];
  }
  return (content ?? []).map(partOf);
}

// A function call joins the assistant turn just before it, as the provider produced them together.
function readFunctionCall({ messages, names }: Reading, item: InputItem): void {
  const call: ToolCall = {
    id: item.call_id ?? '', name: item.name ?? '', arguments: parseToolArguments(item.arguments),
  };
  names.set(call.id, call.name);
  const last = messages.at(-1);
  if (last?.role === 'assistant') {
    last.toolCalls = [...(last.toolCalls ?? []), call];
  } else {
    messages.push({ role: 'assistant', content: '', toolCalls: [call] });
  }
}

function readMessage(item: InputItem): ChatMessage {
  const parts = partsOf(item.content);
  switch (item.role) {
    case 'system':
    case 'developer':
      return { role: 'system', content: textOf(parts) };
    case 'user':
      return { role: 'user', content: userContent(parts) };
    case 'assistant':
      return { role: 'assistant', content: textOf(parts) } satisfies AssistantMessage;
    default:
      throw unsupported(`${item.role} messages`);
  }
}

// Reasoning items hold the provider's own thinking, which another account cannot read.
function readItem(reading: Reading, item: InputItem): void {
  if (item.type === 'function_call') {
    readFunctionCall(reading, item);
  } else if (item.type === 'function_call_output') {
    const toolCallId = item.call_id ?? '';
    const content = textOf(partsOf(item.output));
    reading.messages.push({ role: 'tool', toolCallId, name: toolNameOf(reading.names, toolCallId), content });
  } else if (item.type === undefined || item.type === 'message') {
    reading.messages.push(readMessage(item));
  } else if (item.type !== 'reasoning') {
    throw unsupported(`${item.type} input items`);
  }
}

function readInput(body: ResponsesBody): ChatMessage[] {
  const reading: Reading = { messages: [], names: new Map() };
  if (body.instructions) {
    reading.messages.push({ role: 'system', content: body.instructions });
  }
  const items = typeof body.input === 'string' ? [{ role: 'user', content: body.input }] : body.input ?? [];
  items.forEach((item) => readItem(reading, item));
  return reading.messages;
}

function readTools(tools?: WireTool[]): ToolDefinition[] | undefined {
  return tools?.map((tool) => {
    if (tool.type !== 'function' || !tool.name) {
      throw unsupported(`${tool.type} tools`);
    }
    return { name: tool.name, description: tool.description ?? '', inputSchema: tool.parameters ?? EMPTY_PARAMETERS };
  });
}

function readToolChoice(choice: ResponsesBody['tool_choice']): ToolChoice | undefined {
  if (typeof choice !== 'object') {
    return choice as ToolChoice | undefined;
  }
  if (choice.type !== 'function' || !choice.name) {
    throw unsupported(`a ${choice.type} tool choice`);
  }
  return { name: choice.name };
}

function readFormat(format: NonNullable<ResponsesBody['text']>['format']): ResponseFormat | undefined {
  if (!format || format.type === 'text') {
    return undefined;
  }
  return { type: 'json', name: format.name, schema: format.schema, strict: format.strict };
}

function read(raw: Record<string, unknown>): WireRequest {
  const body = raw as ResponsesBody;
  if (body.previous_response_id) {
    throw unsupported('previous_response_id: send the whole conversation, AI Wallet keeps none');
  }
  return {
    request: {
      messages: readInput(body),
      tools: readTools(body.tools),
      options: {
        maxTokens: body.max_output_tokens,
        temperature: body.temperature,
        topP: body.top_p,
        toolChoice: readToolChoice(body.tool_choice),
        responseFormat: readFormat(body.text?.format),
      },
    },
    stream: body.stream === true,
  };
}

function messageItem(id: string, text: string) {
  return {
    id, type: 'message', status: 'completed', role: 'assistant',
    content: [{ type: 'output_text', text, annotations: [] }],
  };
}

function functionCallItem(call: ToolCall) {
  return {
    id: `fc_${call.id}`, type: 'function_call', status: 'completed',
    call_id: call.id, name: call.name, arguments: JSON.stringify(call.arguments),
  };
}

function wireUsage(usage: Usage | undefined) {
  if (!usage) {
    return null;
  }
  const { inputTokens, outputTokens, cachedInputTokens } = usage;
  return {
    input_tokens: inputTokens,
    input_tokens_details: { cached_tokens: cachedInputTokens },
    output_tokens: outputTokens,
    total_tokens: inputTokens + outputTokens,
  };
}

function responseObject(context: AnswerContext, model: string, response?: ChatResponse, output: unknown[] = []) {
  const incomplete = response?.finishReason === 'length' || response?.finishReason === 'contentFilter';
  const reason = response?.finishReason === 'length' ? 'max_output_tokens' : 'content_filter';
  return {
    id: `resp_${context.id}`,
    object: 'response',
    created_at: context.created,
    status: response ? (incomplete ? 'incomplete' : 'completed') : 'in_progress',
    model,
    output,
    error: null,
    incomplete_details: incomplete ? { reason } : null,
    usage: wireUsage(response?.usage),
  };
}

function outputItems(context: AnswerContext, { message }: ChatResponse) {
  const text = message.content ? [messageItem(`msg_${context.id}`, message.content)] : [];
  return [...text, ...(message.toolCalls ?? []).map(functionCallItem)];
}

// Each event carries its type and a sequence number, as the provider numbers them.
function eventSender(write: EventWriter) {
  let sequence = 0;
  return (type: string, fields: Record<string, unknown>) => {
    write.send({ type, sequence_number: sequence, ...fields }, type);
    sequence += 1;
  };
}

function writeMessageEnd(send: ReturnType<typeof eventSender>, id: string, text: string): void {
  const part = { type: 'output_text', text, annotations: [] };
  send('response.output_text.done', { item_id: id, output_index: 0, content_index: 0, text, logprobs: [] });
  send('response.content_part.done', { item_id: id, output_index: 0, content_index: 0, part });
  send('response.output_item.done', { output_index: 0, item: messageItem(id, text) });
}

function writeFunctionCall(send: ReturnType<typeof eventSender>, call: ToolCall, index: number): void {
  const item = functionCallItem(call);
  send('response.output_item.added', { output_index: index, item: { ...item, status: 'in_progress', arguments: '' } });
  send('response.function_call_arguments.delta', { item_id: item.id, output_index: index, delta: item.arguments });
  send('response.function_call_arguments.done', { item_id: item.id, output_index: index, arguments: item.arguments });
  send('response.output_item.done', { output_index: index, item });
}

async function stream(answer: WalletAnswer, write: EventWriter, context: AnswerContext): Promise<void> {
  const send = eventSender(write);
  const id = `msg_${context.id}`;
  send('response.created', { response: responseObject(context, (await answer.started).model) });
  let streamed = false;
  for await (const delta of answer.texts()) {
    if (!streamed) {
      const part = { type: 'output_text', text: '', annotations: [] };
      const item = { ...messageItem(id, ''), status: 'in_progress', content: [] };
      send('response.output_item.added', { output_index: 0, item });
      send('response.content_part.added', { item_id: id, output_index: 0, content_index: 0, part });
      streamed = true;
    }
    send('response.output_text.delta', { item_id: id, output_index: 0, content_index: 0, delta, logprobs: [] });
  }
  const response = await answer.result;
  if (streamed) {
    writeMessageEnd(send, id, response.message.content);
  }
  const offset = streamed ? 1 : 0;
  (response.message.toolCalls ?? []).forEach((call, index) => writeFunctionCall(send, call, index + offset));
  const final = responseObject(context, response.model, response, outputItems(context, response));
  send(final.status === 'completed' ? 'response.completed' : 'response.incomplete', { response: final });
}

function body(response: ChatResponse, context: AnswerContext) {
  return responseObject(context, response.model, response, outputItems(context, response));
}

function errorBody(error: WalletRequestError) {
  return { error: { message: error.message, type: errorType(error.status), param: null, code: null } };
}

export const openAiResponses: WireProtocol = {
  read,
  stream,
  body,
  error: errorBody,
  streamError: (error) => ({
    data: { type: 'error', code: errorType(error.status), message: error.message, param: null },
    event: 'error',
  }),
};
