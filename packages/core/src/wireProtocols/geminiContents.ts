// The Gemini `generateContent` protocol, as Google's Gen AI SDK and the Vercel AI SDK's `google()`
// models speak it. The path says whether to stream (`:streamGenerateContent`). Streamed answers go
// as plain data events of the same response shape; the last one carries the tool calls, the
// finish reason and the token counts. Gemini may leave tool call ids out: calls then get one in
// order, and each result answers the first open call of its name.

import { textOf } from '../chatContent.ts';
import type {
  ChatMessage, ChatResponse, ContentPart, FinishReason, JsonSchema, ToolCall, ToolChoice, ToolDefinition, Usage,
} from '../types.ts';
import { WalletRequestError } from '../walletProvider.ts';
import type { EventWriter } from './eventStream.ts';
import type { WalletAnswer } from './walletAnswer.ts';
import { EMPTY_PARAMETERS, unsupported, userContent } from './wireProtocol.ts';
import type { AnswerContext, WireProtocol, WireRequest } from './wireProtocol.ts';

interface WirePart {
  text?: string;
  thought?: boolean;
  inlineData?: { mimeType: string; data: string };
  fileData?: { mimeType?: string; fileUri: string };
  functionCall?: { id?: string; name: string; args?: Record<string, unknown> };
  functionResponse?: { id?: string; name: string; response?: unknown };
}

interface WireContent {
  role?: string;
  parts?: WirePart[];
}

interface FunctionDeclaration {
  name: string;
  description?: string;
  parameters?: JsonSchema;
  parametersJsonSchema?: JsonSchema;
}

interface WireTool {
  functionDeclarations?: FunctionDeclaration[];
}

interface GenerateBody {
  contents?: WireContent[];
  systemInstruction?: string | WireContent;
  tools?: WireTool | WireTool[];
  toolConfig?: { functionCallingConfig?: { mode?: string; allowedFunctionNames?: string[] } };
  generationConfig?: {
    maxOutputTokens?: number;
    temperature?: number;
    topP?: number;
    stopSequences?: string[];
    candidateCount?: number;
    responseMimeType?: string;
    responseSchema?: JsonSchema;
    responseJsonSchema?: JsonSchema;
  };
}

// The conversation being read, with the tool calls still waiting for their result.
interface Reading {
  messages: ChatMessage[];
  open: ToolCall[];
  calls: number;
}

const FINISH_REASONS: Record<FinishReason, string> = {
  stop: 'STOP',
  toolCalls: 'STOP',
  length: 'MAX_TOKENS',
  contentFilter: 'SAFETY',
};

const TOOL_MODES: Record<string, ToolChoice> = { AUTO: 'auto', NONE: 'none', ANY: 'required', VALIDATED: 'auto' };

const GOOGLE_STATUSES: Record<number, string> = {
  400: 'INVALID_ARGUMENT',
  401: 'UNAUTHENTICATED',
  403: 'PERMISSION_DENIED',
  404: 'NOT_FOUND',
  429: 'RESOURCE_EXHAUSTED',
  503: 'UNAVAILABLE',
};

// Gemini's OpenAPI style schema as JSON Schema: lower case types, `nullable` as a null type, and
// no `propertyOrdering`, which other providers refuse.
function jsonSchemaOf(schema: JsonSchema): JsonSchema {
  const converted: JsonSchema = { ...schema };
  delete converted.propertyOrdering;
  delete converted.nullable;
  if (typeof schema.type === 'string') {
    const type = schema.type.toLowerCase();
    converted.type = schema.nullable ? [type, 'null'] : type;
  }
  if (schema.properties) {
    const properties = Object.entries(schema.properties as Record<string, JsonSchema>);
    converted.properties = Object.fromEntries(properties.map(([name, value]) => [name, jsonSchemaOf(value)]));
  }
  if (schema.items) {
    converted.items = jsonSchemaOf(schema.items as JsonSchema);
  }
  if (Array.isArray(schema.anyOf)) {
    converted.anyOf = (schema.anyOf as JsonSchema[]).map(jsonSchemaOf);
  }
  return converted;
}

function mediaPart(mimeType: string | undefined, url: string): ContentPart {
  if (!mimeType?.startsWith('image/')) {
    throw unsupported(`${mimeType ?? 'untyped'} files`);
  }
  return { type: 'image', url };
}

function partOf(part: WirePart): ContentPart {
  if (typeof part.text === 'string') {
    return { type: 'text', text: part.text };
  }
  if (part.inlineData) {
    const { mimeType, data } = part.inlineData;
    return mediaPart(mimeType, `data:${mimeType};base64,${data}`);
  }
  if (part.fileData) {
    return mediaPart(part.fileData.mimeType, part.fileData.fileUri);
  }
  throw unsupported(`the ${Object.keys(part).join(', ')} part`);
}

function readModel(reading: Reading, parts: WirePart[]): void {
  const toolCalls: ToolCall[] = parts.filter((part) => part.functionCall).map((part) => {
    const { id, name, args } = part.functionCall!;
    reading.calls += 1;
    return { id: id ?? `call_${reading.calls}`, name, arguments: args ?? {} };
  });
  reading.open.push(...toolCalls);
  const content = textOf(parts.filter((part) => !part.functionCall).map(partOf));
  reading.messages.push({ role: 'assistant', content, ...(toolCalls.length ? { toolCalls } : {}) });
}

function answeredCall(reading: Reading, response: NonNullable<WirePart['functionResponse']>): ToolCall {
  const index = reading.open.findIndex((call) => (response.id ? call.id === response.id : call.name === response.name));
  if (index < 0) {
    throw new WalletRequestError(`A function response answers ${response.name}, which no open call made`, 400);
  }
  return reading.open.splice(index, 1)[0];
}

function readUser(reading: Reading, parts: WirePart[]): void {
  for (const part of parts.filter((candidate) => candidate.functionResponse)) {
    const call = answeredCall(reading, part.functionResponse!);
    const content = JSON.stringify(part.functionResponse!.response ?? {});
    reading.messages.push({ role: 'tool', toolCallId: call.id, name: call.name, content });
  }
  const rest = parts.filter((part) => !part.functionResponse).map(partOf);
  if (rest.length) {
    reading.messages.push({ role: 'user', content: userContent(rest) });
  }
}

// Thought parts hold the provider's own reasoning, which another account cannot read.
function readMessages(body: GenerateBody): ChatMessage[] {
  const reading: Reading = { messages: [], open: [], calls: 0 };
  const system = typeof body.systemInstruction === 'string'
    ? body.systemInstruction
    : textOf((body.systemInstruction?.parts ?? []).map(partOf));
  if (system) {
    reading.messages.push({ role: 'system', content: system });
  }
  for (const content of body.contents ?? []) {
    const parts = (content.parts ?? []).filter((part) => !part.thought);
    if (content.role === 'model') {
      readModel(reading, parts);
    } else {
      readUser(reading, parts);
    }
  }
  return reading.messages;
}

function readTools(tools: GenerateBody['tools']): ToolDefinition[] | undefined {
  if (!tools) {
    return undefined;
  }
  return [tools].flat().flatMap((tool) => {
    if (!tool.functionDeclarations) {
      throw unsupported(`the ${Object.keys(tool).join(', ')} tool`);
    }
    return tool.functionDeclarations.map(({ name, description = '', parameters, parametersJsonSchema }) => ({
      name,
      description,
      inputSchema: parametersJsonSchema ?? (parameters ? jsonSchemaOf(parameters) : EMPTY_PARAMETERS),
    }));
  });
}

function readToolChoice(config: GenerateBody['toolConfig']): ToolChoice | undefined {
  const calling = config?.functionCallingConfig;
  const names = calling?.allowedFunctionNames ?? [];
  if (calling?.mode === 'ANY' && names.length === 1) {
    return { name: names[0] };
  }
  return calling?.mode ? TOOL_MODES[calling.mode] : undefined;
}

function read(raw: Record<string, unknown>, url: URL): WireRequest {
  const body = raw as GenerateBody;
  const generation = body.generationConfig ?? {};
  if ((generation.candidateCount ?? 1) > 1) {
    throw unsupported('several candidates per request');
  }
  const { responseJsonSchema, responseSchema } = generation;
  const schema = responseJsonSchema ?? (responseSchema ? jsonSchemaOf(responseSchema) : undefined);
  const json = generation.responseMimeType === 'application/json';
  return {
    request: {
      messages: readMessages(body),
      tools: readTools(body.tools),
      options: {
        maxTokens: generation.maxOutputTokens,
        temperature: generation.temperature,
        topP: generation.topP,
        stop: generation.stopSequences,
        toolChoice: readToolChoice(body.toolConfig),
        responseFormat: json ? { type: 'json', schema } : undefined,
      },
    },
    stream: /:streamGenerateContent$/i.test(url.pathname),
  };
}

function usageMetadata(usage: Usage | undefined) {
  if (!usage) {
    return undefined;
  }
  return {
    promptTokenCount: usage.inputTokens,
    candidatesTokenCount: usage.outputTokens,
    totalTokenCount: usage.inputTokens + usage.outputTokens,
    cachedContentTokenCount: usage.cachedInputTokens,
  };
}

function callParts(calls: ToolCall[] = []): WirePart[] {
  return calls.map((call) => ({ functionCall: { id: call.id, name: call.name, args: call.arguments } }));
}

function chunk(context: AnswerContext, model: string, parts: WirePart[], response?: ChatResponse) {
  const finish = response ? { finishReason: FINISH_REASONS[response.finishReason] } : {};
  return {
    candidates: [{ content: { role: 'model', parts }, index: 0, ...finish }],
    usageMetadata: usageMetadata(response?.usage),
    modelVersion: model,
    responseId: context.id,
  };
}

async function stream(answer: WalletAnswer, write: EventWriter, context: AnswerContext): Promise<void> {
  const { model } = await answer.started;
  for await (const text of answer.texts()) {
    write.send(chunk(context, model, [{ text }]));
  }
  const response = await answer.result;
  write.send(chunk(context, response.model, callParts(response.message.toolCalls), response));
}

function body(response: ChatResponse, context: AnswerContext) {
  const { content, toolCalls } = response.message;
  const parts = [...(content ? [{ text: content }] : []), ...callParts(toolCalls)];
  return chunk(context, response.model, parts, response);
}

function errorBody(error: WalletRequestError) {
  return { error: { code: error.status, message: error.message, status: GOOGLE_STATUSES[error.status] ?? 'INTERNAL' } };
}

export const geminiContents: WireProtocol = { read, stream, body, error: errorBody };
