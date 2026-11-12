// The AI Wallet as a page sees it: `window.aiwallet`, which the extension announces to every page.
// The extension's page script runs before the site's code, so the wallet is there on load; the
// announce event covers a script that runs later.

import type { ChatMessage, ChatStart, GenerationOptions, ToolDefinition, WalletLink } from './types.ts';

// What a site sends with a `chat` request.
export interface WalletChatParams {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  options?: GenerationOptions;
}

// What a chat streams to the page before its result: one `start` naming who answers, sent before
// the first text or, when the answer has no text, before the result; then each piece of text.
export type ChatEvent = ({ kind: 'start' } & ChatStart) | { kind: 'text'; delta: string };

// Why a connection did not go through when the visitor's own step in the wallet says why: they
// declined the site, closed the wallet's window before finishing, or the wallet stopped before it
// answered. The site words each one in the page's language, with the next step.
export type WalletRefusal = 'declined' | 'closed' | 'interrupted';

// A request the wallet refused or could not answer. `status` follows HTTP and is set where the
// failure happens: the provider's own status for a provider error, 401 for a site the visitor has
// not connected, 403 for a declined connection, a locked wallet or a wallet without an account,
// 499 for an answer the visitor stopped in the wallet. `reason` says why a connection did not go
// through, when the visitor's step in the wallet says why.
export class WalletRequestError extends Error {
  readonly status: number;
  readonly reason?: WalletRefusal;

  constructor(message: string, status: number, reason?: WalletRefusal) {
    super(message);
    this.name = 'WalletRequestError';
    this.status = status;
    this.reason = reason;
  }
}

export interface WalletProvider {
  isAIWallet: true;
  // A chat streams its events to `onEvent`. Aborting `signal` rejects the request with the signal's
  // reason, and the wallet stops the chat it runs for it.
  request(
    method: string, params?: unknown, onEvent?: (event: ChatEvent) => void, signal?: AbortSignal,
  ): Promise<unknown>;
  // Called when the visitor changes, in the wallet, the account or model this site answers with.
  onLink(listener: (link: WalletLink) => void): () => void;
}

// How long a page waits for the wallet to announce itself before concluding it is not installed.
const ANNOUNCE_WAIT_MS = 300;

export function findWallet(): Promise<WalletProvider | null> {
  const present = (globalThis as { aiwallet?: WalletProvider }).aiwallet;
  if (present?.isAIWallet) {
    return Promise.resolve(present);
  }
  return new Promise((resolve) => {
    const onAnnounce = (event: Event) => {
      window.removeEventListener('aiwallet:announce', onAnnounce);
      resolve((event as CustomEvent<WalletProvider>).detail);
    };
    window.addEventListener('aiwallet:announce', onAnnounce);
    window.dispatchEvent(new Event('aiwallet:request'));
    setTimeout(() => {
      window.removeEventListener('aiwallet:announce', onAnnounce);
      resolve(null);
    }, ANNOUNCE_WAIT_MS);
  });
}
