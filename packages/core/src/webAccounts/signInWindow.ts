// The window a web sign in runs in, and the way its answer comes back to the page that opened it.
//
// The page opens a popup from the visitor's click, and the provider's sign in sends it back to the page's
// own address with the sign in's state in `aiconnect_state` and the code (or OAuth's error). The page
// loads there in the popup, recognises the state the opener marked in the origin's storage, hands the
// answer to the opener and closes. The answer goes by `postMessage` to the opener's origin alone and by a
// BroadcastChannel, which only pages of the same origin hear: a sign in page that isolates itself from its
// opener, as Google's does, leaves the popup without `window.opener`. Where the browser blocks the popup,
// the page itself goes to the sign in and comes back to finish it, its pending sign in kept in the tab's
// sessionStorage.

import type { WebAccountId } from './webAccountStore.ts';

export const CALLBACK_PARAM = 'aiconnect_state';
const WINDOW_NAME = 'aiconnect-sign-in';
const WINDOW_FEATURES = 'popup,width=520,height=720';
const CHANNEL = 'aiconnect:sign-in';
const MESSAGE_TYPE = 'aiconnect:sign-in';
// The state of the sign in whose popup is open, in localStorage, which the popup shares with its opener.
const WINDOW_MARK = 'aiconnect:sign-in-window';
// The sign in a page left for the provider's page in place of a popup, in sessionStorage.
const REDIRECT_KEY = 'aiconnect:sign-in';
// The parameters a callback adds to the page's address, removed once the sign in is read.
const CALLBACK_PARAMS = [CALLBACK_PARAM, 'code', 'state', 'error', 'error_description', 'error_uri', 'iss'];

export interface SignInResult {
  state: string;
  code?: string;
  error?: string;
}

export interface PendingSignIn {
  account: WebAccountId;
  state: string;
  verifier: string;
  redirectUri: string;
}

// Storage access throws where the browser blocks it; the sign in then runs without the mark.
function attempt<T>(work: () => T): T | undefined {
  try {
    return work();
  } catch {
    return undefined;
  }
}

function withoutCallback(address: string): URL {
  const url = new URL(address);
  for (const name of CALLBACK_PARAMS) {
    url.searchParams.delete(name);
  }
  return url;
}

// The page's own address, which the provider sends the sign in back to, carrying its state.
export function callbackAddress(state: string): string {
  const url = withoutCallback(location.href);
  url.hash = '';
  url.searchParams.set(CALLBACK_PARAM, state);
  return url.toString();
}

// Opened empty during the click, so the browser lets it open; null where the browser blocks it.
export function openSignInWindow(): Window | null {
  return window.open('', WINDOW_NAME, WINDOW_FEATURES);
}

// The sign in's answer in the page's address, when the page is a callback.
export function callbackResult(address: string): SignInResult | null {
  const params = new URL(address).searchParams;
  const state = params.get(CALLBACK_PARAM);
  if (!state) {
    return null;
  }
  const code = params.get('code');
  const error = params.get('error');
  return { state, ...(code ? { code } : {}), ...(error ? { error } : {}) };
}

function isResult(data: unknown): data is SignInResult & { type: string } {
  const message = data as Record<string, unknown> | null;
  return message?.type === MESSAGE_TYPE && typeof message.state === 'string';
}

export function markWindow(state: string | null): void {
  attempt(() => (state ? localStorage.setItem(WINDOW_MARK, state) : localStorage.removeItem(WINDOW_MARK)));
}

export function isMarkedWindow(state: string): boolean {
  return attempt(() => localStorage.getItem(WINDOW_MARK)) === state;
}

// In the popup: hands the answer to the page that opened it, then closes.
export function returnToOpener(result: SignInResult): void {
  const message = { type: MESSAGE_TYPE, ...result };
  attempt(() => window.opener?.postMessage(message, location.origin));
  if (typeof BroadcastChannel === 'function') {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage(message);
    channel.close();
  }
  window.close();
}

// In the opener: hears the answers of its own origin, by either way, until the returned function stops it.
export function listenForResult(onResult: (result: SignInResult) => void): () => void {
  const take = (data: unknown) => {
    if (isResult(data)) {
      onResult({ state: data.state, code: data.code, error: data.error });
    }
  };
  const onMessage = (event: MessageEvent) => {
    if (event.origin === location.origin) {
      take(event.data);
    }
  };
  window.addEventListener('message', onMessage);
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL) : null;
  channel?.addEventListener('message', (event) => take(event.data));
  return () => {
    window.removeEventListener('message', onMessage);
    channel?.close();
  };
}

export function keepForRedirect(pending: PendingSignIn): void {
  attempt(() => sessionStorage.setItem(REDIRECT_KEY, JSON.stringify(pending)));
}

// The sign in this tab left for the provider's page, once: it is removed as it is read.
export function takeRedirected(): PendingSignIn | null {
  const raw = attempt(() => sessionStorage.getItem(REDIRECT_KEY));
  attempt(() => sessionStorage.removeItem(REDIRECT_KEY));
  if (!raw) {
    return null;
  }
  const pending = attempt(() => JSON.parse(raw) as PendingSignIn);
  return pending && typeof pending.state === 'string' && typeof pending.verifier === 'string' ? pending : null;
}

// Takes the callback's parameters out of the address bar, leaving the page where it was.
export function cleanAddress(): void {
  history.replaceState(history.state, '', withoutCallback(location.href).toString());
}
