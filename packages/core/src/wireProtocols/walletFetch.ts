// A `fetch` for the AI SDKs. It recognises the protocol an SDK speaks from the path of its request,
// reads the request into the wallet's chat format, asks the wallet, and answers in the same
// protocol, streamed or whole. Nothing reaches the network: the host the SDK targets does not
// matter, and its API key is never read. An answer that fails before any text comes back as an
// HTTP error with the wallet's status, so each SDK raises its own typed error.

import type { ProviderSession } from '../types.ts';
import { WalletRequestError } from '../walletProvider.ts';
import { anthropicMessages } from './anthropicMessages.ts';
import { eventStream } from './eventStream.ts';
import { geminiContents } from './geminiContents.ts';
import { openAiChat } from './openAiChat.ts';
import { openAiResponses } from './openAiResponses.ts';
import { askWallet } from './walletAnswer.ts';
import type { WalletAnswer } from './walletAnswer.ts';
import type { AnswerContext, WireProtocol, WireRequest } from './wireProtocol.ts';

export type WalletFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const ROUTES: { path: RegExp; protocol: WireProtocol }[] = [
  { path: /\/chat\/completions$/, protocol: openAiChat },
  { path: /\/responses$/, protocol: openAiResponses },
  { path: /\/messages$/, protocol: anthropicMessages },
  { path: /:(stream)?generateContent$/i, protocol: geminiContents },
];

const JSON_HEADERS = { 'content-type': 'application/json' };

function protocolFor(request: Request, url: URL): WireProtocol | undefined {
  return request.method === 'POST' ? ROUTES.find((route) => route.path.test(url.pathname))?.protocol : undefined;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

// An endpoint the wallet does not answer, in the error shape the OpenAI, Anthropic and Google
// SDKs all read.
function notAnswered(request: Request, url: URL): Response {
  const message = `AI Wallet answers chat requests only, not ${request.method} ${url.pathname}`;
  return jsonResponse(404, { type: 'error', error: { type: 'not_found_error', message, code: 404 } });
}

// The wallet's errors carry their status; anything else is a failure of the page itself.
function walletError(error: unknown): WalletRequestError {
  const { message, status } = error as { message?: string; status?: unknown };
  return new WalletRequestError(message ?? String(error), typeof status === 'number' ? status : 500);
}

// The SDK's body may be a stream, which a request built from it must read in half duplex.
function asRequest(input: RequestInfo | URL, init?: RequestInit): Request {
  const streamed = init?.body instanceof ReadableStream;
  return new Request(input, streamed ? { ...init, duplex: 'half' } as RequestInit : init);
}

async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return await request.json() as Record<string, unknown>;
  } catch {
    throw new WalletRequestError('The request body is not JSON', 400);
  }
}

function streamResponse(protocol: WireProtocol, answer: WalletAnswer, context: AnswerContext, stop: () => void) {
  const body = eventStream(async (writer) => {
    try {
      await protocol.stream(answer, writer, context);
    } catch (error) {
      if (!protocol.streamError || (error as Error)?.name === 'AbortError') {
        throw error;
      }
      const { data, event } = protocol.streamError(walletError(error));
      writer.send(data, event);
    }
  }, stop);
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

async function answer(protocol: WireProtocol, wire: WireRequest, session: ProviderSession, signal: AbortSignal) {
  // Stopped by the SDK's signal, or by the SDK cancelling the stream it reads.
  const controller = new AbortController();
  signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  const stop = () => controller.abort(new DOMException('The SDK stopped reading the answer', 'AbortError'));
  const context = { id: crypto.randomUUID(), created: Math.floor(Date.now() / 1000), wire };
  const walletAnswer = askWallet(session, { ...wire.request, signal: controller.signal });
  if (!wire.stream) {
    return jsonResponse(200, protocol.body(await walletAnswer.result, context));
  }
  // The stream opens once the wallet names who answers; a failure before that is an HTTP error.
  await walletAnswer.started;
  return streamResponse(protocol, walletAnswer, context, stop);
}

export function createWalletFetch(connectedSession: () => Promise<ProviderSession>): WalletFetch {
  return async (input, init) => {
    const request = asRequest(input, init);
    request.signal.throwIfAborted();
    const url = new URL(request.url);
    const protocol = protocolFor(request, url);
    if (!protocol) {
      return notAnswered(request, url);
    }
    try {
      const wire = protocol.read(await jsonBody(request), url);
      return await answer(protocol, wire, await connectedSession(), request.signal);
    } catch (error) {
      if (request.signal.aborted) {
        throw request.signal.reason;
      }
      const failure = walletError(error);
      return jsonResponse(failure.status, protocol.error(failure));
    }
  };
}
