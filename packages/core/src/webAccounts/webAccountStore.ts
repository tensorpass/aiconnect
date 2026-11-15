// Where a web account's credential lives: the site's own localStorage, for this origin only, under one
// key. Every script of the site's pages can read it, which the AI Wallet's accounts are kept from: the
// wallet holds those in the extension. Signing out removes it. A browser that refuses storage, such as a
// private window with storage blocked, keeps the credential for the page's life only.

export type WebAccountId = 'tensorpass' | 'openrouter';

// An OpenRouter key bound to the visitor's own credits.
export interface OpenRouterCredential {
  account: 'openrouter';
  key: string;
}

// A TensorPass plan token of a few minutes, its refresh token, and when the access token ends, in epoch
// milliseconds.
export interface TensorPassCredential {
  account: 'tensorpass';
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export type WebCredential = OpenRouterCredential | TensorPassCredential;

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const WEB_ACCOUNT_KEY = 'aiconnect:web-account';

const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

function credentialOf(value: unknown): WebCredential | null {
  const held = value as Record<string, unknown> | null;
  if (held?.account === 'openrouter' && isText(held.key)) {
    return { account: 'openrouter', key: held.key };
  }
  if (held?.account === 'tensorpass' && isText(held.accessToken) && isText(held.refreshToken)
    && typeof held.expiresAt === 'number') {
    return {
      account: 'tensorpass', accessToken: held.accessToken, refreshToken: held.refreshToken, expiresAt: held.expiresAt,
    };
  }
  return null;
}

function parsed(raw: string): WebCredential | null {
  try {
    return credentialOf(JSON.parse(raw));
  } catch {
    return null;
  }
}

// Reading `localStorage` itself throws where the browser blocks storage. A server render has none.
function pageStorage(): KeyValueStorage | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export class WebAccountStore {
  private memory: WebCredential | null = null;
  // Set once the browser refuses storage: the credential then lives in this page alone.
  private memoryOnly: boolean;
  private readonly storage: KeyValueStorage | null;

  constructor(storage: KeyValueStorage | null = pageStorage()) {
    this.storage = storage;
    this.memoryOnly = !storage;
  }

  read(): WebCredential | null {
    if (this.memoryOnly || !this.storage) {
      return this.memory;
    }
    try {
      const raw = this.storage.getItem(WEB_ACCOUNT_KEY);
      return raw ? parsed(raw) : null;
    } catch {
      this.memoryOnly = true;
      return this.memory;
    }
  }

  save(credential: WebCredential): void {
    this.memory = credential;
    if (this.memoryOnly || !this.storage) {
      return;
    }
    try {
      this.storage.setItem(WEB_ACCOUNT_KEY, JSON.stringify(credential));
    } catch {
      this.memoryOnly = true;
    }
  }

  forget(): void {
    this.memory = null;
    try {
      this.storage?.removeItem(WEB_ACCOUNT_KEY);
    } catch {
      // Nothing was stored.
    }
  }
}
