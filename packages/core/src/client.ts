// A site's connection to the visitor's AI, through the AI Wallet extension that holds the visitor's
// accounts. The site asks the wallet to connect, and the wallet asks the visitor the first time;
// the site then chats through the wallet, which answers with the account the visitor picked for
// this site. The site never sees a credential. A site the visitor approved connects on its own on
// later visits, and its state follows the account the visitor picks for it in the wallet.
// `fetch` lets the AI SDK a site already uses answer through the same connection.

import type { ChatRequest, ChatResponse, ProviderSession, WalletLink } from './types.ts';
import { findWallet, WalletRequestError } from './walletProvider.ts';
import type { ChatEvent, WalletChatParams, WalletProvider, WalletRefusal } from './walletProvider.ts';
import { createWalletFetch } from './wireProtocols/walletFetch.ts';
import type { WalletFetch } from './wireProtocols/walletFetch.ts';

export type ConnectionState =
  | { status: 'checking' }
  | { status: 'noWallet' }
  | { status: 'disconnected' }
  | { status: 'connecting' }
  | { status: 'connected'; providerName: string; model?: string; session: ProviderSession }
  | { status: 'error'; message: string; reason?: WalletRefusal };

// The options an OpenAI or Anthropic SDK client takes to answer through the wallet. The SDKs
// require an API key; the wallet never reads it, and the browser guard they keep for real keys
// does not apply, since none reaches the page.
export interface SdkOptions {
  apiKey: string;
  fetch: WalletFetch;
  dangerouslyAllowBrowser: true;
}

type Listener = (state: ConnectionState) => void;

const SDK_API_KEY = 'aiwallet';

// The AI Wallet page, where a visitor without the wallet gets it. It becomes the Chrome Web Store
// listing once the wallet is published there.
const WALLET_INSTALL_URL = 'https://tensorpass.app/wallet';

// The states a request waits through before it knows whether the site is connected.
const SETTLING = new Set<ConnectionState['status']>(['checking', 'connecting']);

const NOT_CONNECTED: Record<string, string> = {
  noWallet: 'AI Wallet is not installed in this browser',
  disconnected: 'AI Wallet is not connected on this site',
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const REFUSALS = new Set<unknown>(['declined', 'closed', 'interrupted'] satisfies WalletRefusal[]);

// The error state of a connection that did not go through, with the reason the wallet gave. The
// error comes from the wallet's own copy of `WalletRequestError`, so its reason is read as a field.
function connectError(error: unknown): ConnectionState {
  const reason = (error as { reason?: unknown } | null)?.reason;
  return {
    status: 'error',
    message: errorMessage(error),
    ...(REFUSALS.has(reason) ? { reason: reason as WalletRefusal } : {}),
  };
}

// Hands each event the wallet streams to the request's hook for it.
function chatListener(request: ChatRequest): (event: ChatEvent) => void {
  return (event) => {
    if (event.kind === 'start') {
      request.onStart?.({ providerName: event.providerName, model: event.model });
    } else {
      request.onText?.(event.delta);
    }
  };
}

function walletSession(wallet: WalletProvider, link: Extract<WalletLink, { connected: true }>): ProviderSession {
  return {
    providerId: 'aiwallet',
    model: link.model ?? '',
    chat: async (request) => {
      const params: WalletChatParams = { messages: request.messages, tools: request.tools, options: request.options };
      return (await wallet.request('chat', params, chatListener(request), request.signal)) as ChatResponse;
    },
  };
}

export class AiConnect {
  // Where a visitor without the wallet installs it, for the connect window's link.
  readonly installUrl: string = WALLET_INSTALL_URL;
  // A `fetch` for the AI SDKs: it answers their requests through the wallet, in their own protocol.
  readonly fetch: WalletFetch = createWalletFetch(() => this.connectedSession());
  readonly sdkOptions: SdkOptions = { apiKey: SDK_API_KEY, fetch: this.fetch, dangerouslyAllowBrowser: true };
  private readonly listeners = new Set<Listener>();
  private current: ConnectionState = { status: 'checking' };
  private wallet: Promise<WalletProvider | null> | null = null;

  constructor() {
    // A client built during a server render stays in the checking state.
    if (typeof window !== 'undefined') {
      this.reconnect();
    }
  }

  get state(): ConnectionState {
    return this.current;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Asks the wallet to let this site use the visitor's AI. The wallet asks the visitor the first time.
  async connect(): Promise<void> {
    const wallet = await this.findWallet();
    if (!wallet) {
      this.setState({ status: 'noWallet' });
      return;
    }
    this.setState({ status: 'connecting' });
    try {
      this.apply(wallet, (await wallet.request('connect')) as WalletLink);
    } catch (error) {
      this.setState(connectError(error));
    }
  }

  async disconnect(): Promise<void> {
    const wallet = await this.findWallet();
    await wallet?.request('disconnect');
    this.setState(wallet ? { status: 'disconnected' } : { status: 'noWallet' });
  }

  // The session of the connected site, once the status check or the visitor's approval is over.
  private async connectedSession(): Promise<ProviderSession> {
    if (typeof window === 'undefined') {
      throw new WalletRequestError('AI Wallet answers in the browser only', 401);
    }
    const state = await this.settled();
    if (state.status === 'connected') {
      return state.session;
    }
    throw new WalletRequestError(state.status === 'error' ? state.message : NOT_CONNECTED[state.status], 401);
  }

  private settled(): Promise<ConnectionState> {
    if (!SETTLING.has(this.current.status)) {
      return Promise.resolve(this.current);
    }
    return new Promise((resolve) => {
      const unsubscribe = this.subscribe((state) => {
        if (!SETTLING.has(state.status)) {
          unsubscribe();
          resolve(state);
        }
      });
    });
  }

  private findWallet(): Promise<WalletProvider | null> {
    this.wallet ??= findWallet().then((wallet) => {
      wallet?.onLink((link) => this.apply(wallet, link));
      return wallet;
    });
    return this.wallet;
  }

  // A site the visitor already approved connects without asking anything.
  private async reconnect(): Promise<void> {
    const wallet = await this.findWallet();
    if (!wallet) {
      this.setState({ status: 'noWallet' });
      return;
    }
    const link = await wallet.request('status').catch((): WalletLink => ({ connected: false }));
    this.apply(wallet, link as WalletLink);
  }

  private apply(wallet: WalletProvider, link: WalletLink): void {
    if (!link.connected) {
      this.setState({ status: 'disconnected' });
      return;
    }
    this.setState({
      status: 'connected',
      providerName: link.providerName,
      model: link.model,
      session: walletSession(wallet, link),
    });
  }

  private setState(state: ConnectionState): void {
    this.current = state;
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}
