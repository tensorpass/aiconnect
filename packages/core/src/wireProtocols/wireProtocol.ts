// What every protocol an AI SDK speaks provides to `AiConnect.fetch`: reading the SDK's request
// into the wallet's chat format, and writing the wallet's answer back the way the provider's own
// servers write it, streamed or whole, with errors in the provider's shape.

import { inlineData, isTextFile, PDF_TYPE } from '../chatContent.ts';
import type { ChatRequest, ChatResponse, ContentPart, FilePart, JsonSchema } from '../types.ts';
import { WalletRequestError } from '../walletProvider.ts';
import type { EventWriter } from './eventStream.ts';
import type { WalletAnswer } from './walletAnswer.ts';

export interface WireRequest {
  request: Pick<ChatRequest, 'messages' | 'tools' | 'options'>;
  stream: boolean;
  // OpenAI streams the usage only to a request that asks for it.
  includeUsage?: boolean;
}

// The answer being written: its id, its creation time in seconds and the request it answers. A
// stream reads the model that answers from the answer's start.
export interface AnswerContext {
  id: string;
  created: number;
  wire: WireRequest;
}

export interface StreamError {
  data: unknown;
  event?: string;
}

export interface WireProtocol {
  read(body: Record<string, unknown>, url: URL): WireRequest;
  stream(answer: WalletAnswer, write: EventWriter, context: AnswerContext): Promise<void>;
  body(response: ChatResponse, context: AnswerContext): unknown;
  error(error: WalletRequestError): unknown;
  // How the protocol reports a failure after the stream started; without it the stream breaks.
  streamError?(error: WalletRequestError): StreamError;
}

// A function the SDK declares without parameters takes an empty object.
export const EMPTY_PARAMETERS: JsonSchema = { type: 'object', properties: {} };

const ERROR_TYPES: Record<number, string> = {
  400: 'invalid_request_error',
  401: 'authentication_error',
  403: 'permission_error',
  404: 'not_found_error',
  429: 'rate_limit_error',
};

// The error type OpenAI and Anthropic name for a status.
export function errorType(status: number): string {
  return ERROR_TYPES[status] ?? 'api_error';
}

export function unsupported(what: string): WalletRequestError {
  return new WalletRequestError(`AI Wallet does not take ${what}`, 400);
}

// A file an SDK attached as a `data:` URL: a PDF or a text file, the files the chat format carries.
export function filePart(url: string | undefined, name: string | undefined): FilePart {
  const inline = url ? inlineData(url) : null;
  if (!url || !inline) {
    throw unsupported('files given by address or by id');
  }
  if (inline.mediaType !== PDF_TYPE && !isTextFile(inline.mediaType)) {
    throw unsupported(`${inline.mediaType} files`);
  }
  return { type: 'file', url, name: name || 'attachment' };
}

// A single text stays a string; images, files or several parts stay parts.
export function userContent(parts: ContentPart[]): string | ContentPart[] {
  return parts.length === 1 && parts[0].type === 'text' ? parts[0].text : parts;
}

export function parseToolArguments(raw: string | undefined): Record<string, unknown> {
  if (!raw?.trim()) {
    return {};
  }
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new WalletRequestError(`Tool call arguments are not JSON: ${raw.slice(0, 100)}`, 400);
  }
}

// The name of the tool a result answers, read from the call earlier in the conversation.
export function toolNameOf(names: Map<string, string>, callId: string): string {
  const name = names.get(callId);
  if (!name) {
    throw new WalletRequestError(`A tool result answers ${callId}, which no earlier tool call made`, 400);
  }
  return name;
}
