// The wallet's answer as a protocol reads it: who answers, the text as it streams, then the full
// result. The wallet names who answers before the first text and before the result, so a protocol
// whose stream names the model in its first event writes the model that answers. An answer that
// fails before the wallet named anyone fails its start too, so the failure can still become an
// HTTP error.

import type { ChatRequest, ChatResponse, ChatStart, ProviderSession } from '../types.ts';
import { WalletRequestError } from '../walletProvider.ts';

export interface WalletAnswer {
  started: Promise<ChatStart>;
  texts(): AsyncGenerator<string>;
  result: Promise<ChatResponse>;
}

const UNNAMED = 'AI Wallet answered without naming the account that answers';

export function askWallet(session: ProviderSession, request: Omit<ChatRequest, 'onStart' | 'onText'>): WalletAnswer {
  const queue: string[] = [];
  let settled = false;
  let wake = () => {};
  let start: (answering: ChatStart) => void = () => {};
  let fail: (error: unknown) => void = () => {};
  const started = new Promise<ChatStart>((resolve, reject) => {
    start = resolve;
    fail = reject;
  });
  // A whole answer never reads its start, which must not leave the failure unhandled.
  started.catch(() => undefined);
  const result = session.chat({
    ...request,
    onStart: start,
    onText: (delta) => {
      queue.push(delta);
      wake();
    },
  });
  const settle = () => {
    settled = true;
    wake();
  };
  result.then(settle, settle);
  // Once the start is set, neither of these changes it.
  result.then(() => fail(new WalletRequestError(UNNAMED, 502)), fail);

  async function* texts(): AsyncGenerator<string> {
    for (;;) {
      while (queue.length) {
        yield queue.shift()!;
      }
      if (settled) {
        return;
      }
      await new Promise<void>((resolve) => {
        wake = resolve;
      });
    }
  }

  return { started, texts, result };
}
