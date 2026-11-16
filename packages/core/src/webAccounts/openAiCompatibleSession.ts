// The chat session of a web account: the site's page calls the account's chat completions endpoint
// itself, with the visitor's credential, and streams the answer to the conversation loop in the same
// events the wallet sends. The account names who answers before the first text or the result, a refused
// call becomes a `WalletRequestError` with the provider's status and its own message, and a call refused
// with 401 renews the credential once where the account can, then signs the visitor out.

import type { ChatRequest, ChatResponse, ProviderSession } from '../types.ts';
import { WalletRequestError } from '../walletProvider.ts';
import { AnswerAssembly, requestBody } from './openAiWire.ts';
import type { Chunk } from './openAiWire.ts';
import { serverSentEvents } from './serverSentEvents.ts';
import type { WebAccountId } from './webAccountStore.ts';

export type HttpFetch = (input: string, init: RequestInit) => Promise<Response>;

export interface WebSessionConfig {
  providerId: WebAccountId;
  providerName: string;
  model: string;
  endpoint: string;
  // The headers that carry the credential, read for each call.
  credential: () => Promise<Record<string, string>>;
  // A new credential after a 401, or null where the account has none to renew.
  renew: () => Promise<Record<string, string> | null>;
  // The credential no longer opens the account: the visitor is signed out.
  onRefused: () => void;
  headers?: Record<string, string>;
  fetch?: HttpFetch;
}

// The characters of a refusal's body read for its message.
const ERROR_DETAIL_LENGTH = 300;

// The message OpenRouter and the plan gateway both put in `error.message`, or the start of the body, and
// the gateway's `error.code`, by which the chat tells a plan without a subscription from other refusals.
async function refusalOf(config: WebSessionConfig, response: Response): Promise<WalletRequestError> {
  const text = (await response.text().catch(() => '')).slice(0, 4096);
  let message = text.slice(0, ERROR_DETAIL_LENGTH);
  let code: string | undefined;
  try {
    const detail = (JSON.parse(text) as { error?: { message?: unknown; code?: unknown } }).error;
    message = typeof detail?.message === 'string' ? detail.message : message;
    code = typeof detail?.code === 'string' ? detail.code : undefined;
  } catch {
    // The body is not JSON; its start stands as the message.
  }
  const status = response.status;
  return new WalletRequestError(`${config.providerName}: ${message || `HTTP ${status}`}`, status, undefined, code);
}

function send(config: WebSessionConfig, headers: Record<string, string>, request: ChatRequest): Promise<Response> {
  return (config.fetch ?? fetch)(config.endpoint, {
    method: 'POST',
    signal: request.signal,
    headers: { 'Content-Type': 'application/json', ...config.headers, ...headers },
    body: JSON.stringify(requestBody(config.model, request)),
  });
}

async function answered(config: WebSessionConfig, request: ChatRequest): Promise<Response> {
  let response = await send(config, await config.credential(), request);
  if (response.status === 401) {
    await response.body?.cancel().catch(() => undefined);
    const renewed = await config.renew();
    response = renewed ? await send(config, renewed, request) : response;
  }
  if (response.status === 401) {
    config.onRefused();
  }
  if (!response.ok) {
    throw await refusalOf(config, response);
  }
  return response;
}

// A provider that fails after the stream opened sends an event with `error` in place of a chunk.
function throwStreamError(config: WebSessionConfig, event: Record<string, unknown>): void {
  const failure = event.error as { message?: unknown; code?: unknown } | undefined;
  if (failure) {
    const message = typeof failure.message === 'string' ? failure.message : 'the answer stopped';
    const status = typeof failure.code === 'number' ? failure.code : 502;
    throw new WalletRequestError(`${config.providerName}: ${message}`, status);
  }
}

async function chat(config: WebSessionConfig, request: ChatRequest): Promise<ChatResponse> {
  const response = await answered(config, request);
  const answer = new AnswerAssembly(config.model);
  let started = false;
  const start = () => {
    if (!started) {
      started = true;
      request.onStart?.({ providerName: config.providerName, model: answer.model });
    }
  };
  for await (const event of serverSentEvents(response)) {
    throwStreamError(config, event);
    const text = answer.add(event as Chunk);
    if (text) {
      start();
      request.onText?.(text);
    }
  }
  start();
  return answer.response();
}

export function webSession(config: WebSessionConfig): ProviderSession {
  return { providerId: config.providerId, model: config.model, chat: (request) => chat(config, request) };
}
