// The OpenAI chat completions protocol as a web account speaks it: the chat format written as a request
// body, and the streamed chunks gathered back into one answer, its tool calls rebuilt from their deltas.
// OpenRouter and TensorPass's plan gateway both answer in it.

import type {
  ChatMessage, ChatRequest, ChatResponse, ContentPart, FinishReason, ResponseFormat, ToolCall, ToolChoice,
  ToolDefinition, Usage,
} from '../types.ts';

// The name OpenAI requires on a JSON schema, for a site that gave its schema none.
const SCHEMA_NAME = 'answer';

const FINISH_REASONS: Record<string, FinishReason> = {
  stop: 'stop',
  length: 'length',
  tool_calls: 'toolCalls',
  function_call: 'toolCalls',
  content_filter: 'contentFilter',
};

interface ToolCallDelta {
  index: number;
  id?: string;
  function?: { name?: string; arguments?: string };
}

interface WireUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number };
}

export interface Chunk {
  model?: string;
  usage?: WireUsage;
  choices?: { delta?: { content?: string | null; tool_calls?: ToolCallDelta[] }; finish_reason?: string | null }[];
}

function wireContent(content: string | ContentPart[]) {
  if (typeof content === 'string') {
    return content;
  }
  return content.map((part) => (part.type === 'text'
    ? { type: 'text', text: part.text }
    : { type: 'image_url', image_url: { url: part.url } }));
}

function wireMessage(message: ChatMessage): Record<string, unknown> {
  if (message.role === 'tool') {
    return { role: 'tool', tool_call_id: message.toolCallId, content: message.content };
  }
  if (message.role === 'assistant' && message.toolCalls?.length) {
    return {
      role: 'assistant',
      content: message.content || null,
      tool_calls: message.toolCalls.map((call) => ({
        id: call.id,
        type: 'function',
        function: { name: call.name, arguments: JSON.stringify(call.arguments) },
      })),
    };
  }
  return { role: message.role, content: wireContent(message.content) };
}

function wireTool(tool: ToolDefinition): Record<string, unknown> {
  const { name, description, inputSchema } = tool;
  return { type: 'function', function: { name, description, parameters: inputSchema } };
}

function wireToolChoice(choice?: ToolChoice) {
  return typeof choice === 'object' ? { type: 'function', function: { name: choice.name } } : choice;
}

function wireResponseFormat(format?: ResponseFormat) {
  if (!format) {
    return undefined;
  }
  if (!format.schema) {
    return { type: 'json_object' };
  }
  const { name = SCHEMA_NAME, schema, strict } = format;
  return { type: 'json_schema', json_schema: { name, schema, strict } };
}

// Fields left undefined are dropped by the JSON encoding.
export function requestBody(model: string, request: ChatRequest): Record<string, unknown> {
  const options = request.options ?? {};
  return {
    model,
    stream: true,
    stream_options: { include_usage: true },
    messages: request.messages.map(wireMessage),
    tools: request.tools?.length ? request.tools.map(wireTool) : undefined,
    tool_choice: wireToolChoice(options.toolChoice),
    response_format: wireResponseFormat(options.responseFormat),
    max_tokens: options.maxTokens,
    temperature: options.temperature,
    top_p: options.topP,
    stop: options.stop?.length ? options.stop : undefined,
  };
}

function parseArguments(raw: string): Record<string, unknown> {
  if (!raw.trim()) {
    return {};
  }
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// The answer as its chunks arrive: the text, the tool calls, the finish reason, the model and the usage
// the provider reports on its last chunk.
export class AnswerAssembly {
  content = '';
  model: string;
  private reason: string | undefined;
  private usage: WireUsage | undefined;
  private readonly partials: { id: string; name: string; arguments: string }[] = [];

  constructor(model: string) {
    this.model = model;
  }

  // Takes one chunk and returns the text it adds.
  add(chunk: Chunk): string {
    this.model = chunk.model || this.model;
    this.usage = chunk.usage ?? this.usage;
    const choice = chunk.choices?.[0];
    this.reason = choice?.finish_reason || this.reason;
    for (const delta of choice?.delta?.tool_calls ?? []) {
      const partial = (this.partials[delta.index] ??= { id: '', name: '', arguments: '' });
      partial.id ||= delta.id ?? '';
      partial.name += delta.function?.name ?? '';
      partial.arguments += delta.function?.arguments ?? '';
    }
    const text = choice?.delta?.content ?? '';
    this.content += text;
    return text;
  }

  response(): ChatResponse {
    const toolCalls: ToolCall[] = this.partials.filter(Boolean).map((partial, index) => ({
      id: partial.id || `call_${index}`, name: partial.name, arguments: parseArguments(partial.arguments),
    }));
    const finishReason = toolCalls.length ? 'toolCalls' : FINISH_REASONS[this.reason ?? ''] ?? 'stop';
    return {
      message: { role: 'assistant', content: this.content, ...(toolCalls.length ? { toolCalls } : {}) },
      finishReason,
      model: this.model,
      usage: usageOf(this.usage),
    };
  }
}

function usageOf(usage: WireUsage | undefined): Usage | undefined {
  if (!usage) {
    return undefined;
  }
  return {
    inputTokens: usage.prompt_tokens ?? 0,
    outputTokens: usage.completion_tokens ?? 0,
    cachedInputTokens: usage.prompt_tokens_details?.cached_tokens ?? 0,
  };
}
