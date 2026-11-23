// The OpenAI chat completions protocol, as the OpenAI SDK, LangChain's ChatOpenAI, LlamaIndex and
// the Vercel AI SDK's `openai.chat()` speak it. Streamed answers go as `chat.completion.chunk`
// events ending with `[DONE]`; tool calls and the finish reason come on the last chunks.

import { textOf } from '../chatContent.ts';
import type {
  ChatMessage, ChatResponse, ContentPart, FinishReason, JsonSchema, ResponseFormat, ToolCall, ToolChoice,
  ToolDefinition, Usage,
} from '../types.ts';
import type { WalletRequestError } from '../walletProvider.ts';
import type { EventWriter } from './eventStream.ts';
import type { WalletAnswer } from './walletAnswer.ts';
import {
  EMPTY_PARAMETERS, errorType, filePart, parseToolArguments, toolNameOf, unsupported, userContent,
} from './wireProtocol.ts';
import type { AnswerContext, WireProtocol, WireRequest } from './wireProtocol.ts';

interface WirePart {
  type: string;
  text?: string;
  refusal?: string;
  image_url?: string | { url: string };
  file?: { file_data?: string; filename?: string; file_id?: string };
}

interface WireToolCall {
  id: string;
  function: { name: string; arguments?: string };
}

interface WireMessage {
  role: string;
  content?: string | WirePart[] | null;
  tool_calls?: WireToolCall[];
  tool_call_id?: string;
}

interface WireTool {
  type: string;
  function?: { name: string; description?: string; parameters?: JsonSchema };
}

interface WireFormat {
  type: string;
  json_schema?: { name?: string; schema?: JsonSchema; strict?: boolean };
}

interface ChatBody {
  messages?: WireMessage[];
  tools?: WireTool[];
  tool_choice?: string | { function: { name: string } };
  response_format?: WireFormat;
  max_tokens?: number;
  max_completion_tokens?: number;
  temperature?: number;
  top_p?: number;
  stop?: string | string[];
  n?: number;
  stream?: boolean;
  stream_options?: { include_usage?: boolean };
}

const FINISH_REASONS: Record<FinishReason, string> = {
  stop: 'stop',
  length: 'length',
  toolCalls: 'tool_calls',
  contentFilter: 'content_filter',
};

function partOf(part: WirePart): ContentPart {
  if (part.type === 'text') {
    return { type: 'text', text: part.text ?? '' };
  }
  if (part.type === 'refusal') {
    return { type: 'text', text: part.refusal ?? '' };
  }
  if (part.type === 'image_url' && part.image_url) {
    return { type: 'image', url: typeof part.image_url === 'string' ? part.image_url : part.image_url.url };
  }
  if (part.type === 'file' && part.file) {
    return filePart(part.file.file_data, part.file.filename);
  }
  throw unsupported(`${part.type} content`);
}

function partsOf(content: WireMessage['content']): ContentPart[] {
  if (typeof content === 'string') {
    return content ? [{ type: 'text', text: content }] : [];
  }
  return (content ?? []).map(partOf);
}

function assistantMessage(message: WireMessage, names: Map<string, string>): ChatMessage {
  const toolCalls: ToolCall[] = (message.tool_calls ?? []).map((call) => ({
    id: call.id, name: call.function.name, arguments: parseToolArguments(call.function.arguments),
  }));
  toolCalls.forEach((call) => names.set(call.id, call.name));
  return { role: 'assistant', content: textOf(partsOf(message.content)), ...(toolCalls.length ? { toolCalls } : {}) };
}

function readMessages(messages: WireMessage[]): ChatMessage[] {
  const names = new Map<string, string>();
  return messages.map((message): ChatMessage => {
    switch (message.role) {
      case 'system':
      case 'developer':
        return { role: 'system', content: textOf(partsOf(message.content)) };
      case 'user':
        return { role: 'user', content: userContent(partsOf(message.content)) };
      case 'assistant':
        return assistantMessage(message, names);
      case 'tool': {
        const toolCallId = message.tool_call_id ?? '';
        const content = textOf(partsOf(message.content));
        return { role: 'tool', toolCallId, name: toolNameOf(names, toolCallId), content };
      }
      default:
        throw unsupported(`${message.role} messages`);
    }
  });
}

function readTools(tools?: WireTool[]): ToolDefinition[] | undefined {
  return tools?.map((tool) => {
    if (tool.type !== 'function' || !tool.function) {
      throw unsupported(`${tool.type} tools`);
    }
    const { name, description = '', parameters = EMPTY_PARAMETERS } = tool.function;
    return { name, description, inputSchema: parameters };
  });
}

function readToolChoice(choice: ChatBody['tool_choice']): ToolChoice | undefined {
  return typeof choice === 'object' ? { name: choice.function.name } : choice as ToolChoice | undefined;
}

function readFormat(format?: WireFormat): ResponseFormat | undefined {
  if (!format || format.type === 'text') {
    return undefined;
  }
  return { type: 'json', ...format.json_schema };
}

function read(body: Record<string, unknown>): WireRequest {
  const chat = body as ChatBody;
  if ((chat.n ?? 1) > 1) {
    throw unsupported('several choices per request');
  }
  return {
    request: {
      messages: readMessages(chat.messages ?? []),
      tools: readTools(chat.tools),
      options: {
        maxTokens: chat.max_completion_tokens ?? chat.max_tokens,
        temperature: chat.temperature,
        topP: chat.top_p,
        stop: typeof chat.stop === 'string' ? [chat.stop] : chat.stop,
        toolChoice: readToolChoice(chat.tool_choice),
        responseFormat: readFormat(chat.response_format),
      },
    },
    stream: chat.stream === true,
    includeUsage: chat.stream_options?.include_usage === true,
  };
}

function wireUsage(usage: Usage) {
  return {
    prompt_tokens: usage.inputTokens,
    completion_tokens: usage.outputTokens,
    total_tokens: usage.inputTokens + usage.outputTokens,
    prompt_tokens_details: { cached_tokens: usage.cachedInputTokens },
  };
}

function wireToolCall(call: ToolCall) {
  return { id: call.id, type: 'function', function: { name: call.name, arguments: JSON.stringify(call.arguments) } };
}

function chunk(context: AnswerContext, model: string, delta: Record<string, unknown>, finish: string | null = null) {
  return {
    id: `chatcmpl-${context.id}`,
    object: 'chat.completion.chunk',
    created: context.created,
    model,
    choices: [{ index: 0, delta, finish_reason: finish, logprobs: null }],
  };
}

async function stream(answer: WalletAnswer, write: EventWriter, context: AnswerContext): Promise<void> {
  const answering = (await answer.started).model;
  write.send(chunk(context, answering, { role: 'assistant', content: '' }));
  for await (const text of answer.texts()) {
    write.send(chunk(context, answering, { content: text }));
  }
  const { message, finishReason, model, usage } = await answer.result;
  // One chunk per call, as OpenAI streams them.
  (message.toolCalls ?? []).forEach((call, index) => {
    write.send(chunk(context, model, { tool_calls: [{ index, ...wireToolCall(call) }] }));
  });
  write.send(chunk(context, model, {}, FINISH_REASONS[finishReason]));
  if (context.wire.includeUsage && usage) {
    write.send({ ...chunk(context, model, {}), choices: [], usage: wireUsage(usage) });
  }
  write.send('[DONE]');
}

function body({ message, finishReason, model, usage }: ChatResponse, context: AnswerContext) {
  const toolCalls = message.toolCalls?.length ? message.toolCalls.map(wireToolCall) : undefined;
  return {
    id: `chatcmpl-${context.id}`,
    object: 'chat.completion',
    created: context.created,
    model,
    choices: [{
      index: 0,
      message: { role: 'assistant', content: message.content || null, refusal: null, tool_calls: toolCalls },
      finish_reason: FINISH_REASONS[finishReason],
      logprobs: null,
    }],
    usage: usage ? wireUsage(usage) : undefined,
  };
}

function errorBody(error: WalletRequestError) {
  return { error: { message: error.message, type: errorType(error.status), param: null, code: null } };
}

export const openAiChat: WireProtocol = {
  read,
  stream,
  body,
  error: errorBody,
  streamError: (error) => ({ data: errorBody(error) }),
};
