// The window a web sign in runs in, and the way its answer comes back to the page that opened it.
//
// The page opens a popup from the visitor's click, and the provider's sign in sends it back to the site's
// return address (the `signInCallback` page, or else the page itself) with the code (or OAuth's error) and
// the sign in's state. The page there finds the state the opener marked in the origin's storage, hands the
// answer to the opener and closes. A
// sign in page that isolates itself from its opener with a Cross-Origin-Opener-Policy, as Google's and
// some providers' pages do, leaves the popup without `window.opener` once it comes back, so the answer
// also goes by a BroadcastChannel named after the state and by a storage event, which reach every page of
// the same origin and no other. Where the browser blocks the popup, the page itself goes to the sign in
// and comes back to finish it, its pending sign in kept in the tab's sessionStorage.

import type { WebAccountId } from './webAccountStore.ts';

const WINDOW_NAME = 'aiconnect-sign-in';
const WINDOW_FEATURES = 'popup,width=520,height=720';
const CHANNEL_PREFIX = 'aiconnect:sign-in:';
// The answer written for the storage event, removed at once.
const RESULT_KEY = 'aiconnect:sign-in-result';
const MESSAGE_TYPE = 'aiconnect:sign-in';
// The state of the sign in whose popup is open, in localStorage, which the popup shares with its opener.
const WINDOW_MARK = 'aiconnect:sign-in-window';
// The sign in a page left for the provider's page in place of a popup, in sessionStorage.
const REDIRECT_KEY = 'aiconnect:sign-in';
// The parameters a callback adds to the page's address, removed once the sign in is read. `aiconnect_state`
// is the state an earlier release carried in the address.
const CALLBACK_PARAMS = ['aiconnect_state', 'code', 'state', 'error', 'error_description', 'error_uri', 'iss'];

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
  // The page the sign in started from, which a dedicated return page sends the tab back to.
  returnTo: string;
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

// The page's own address, without the parameters of a sign in's answer.
export function pageAddress(): string {
  const url = withoutCallback(location.href);
  url.hash = '';
  return url.toString();
}

// Where the provider sends the sign in back to: the site's return page, a path or an address on the page's
// own origin, or else the page itself.
export function callbackAddress(signInCallback?: string): string {
  if (!signInCallback) {
    return pageAddress();
  }
  const url = new URL(signInCallback, location.href);
  if (url.origin !== location.origin) {
    throw new Error(`signInCallback must be on this page's origin, ${location.origin}`);
  }
  return url.toString();
}

// The page a sign in started from, with the answer for its client to finish.
export function withAnswer(address: string, answer: SignInResult): string {
  const url = new URL(address);
  url.searchParams.set('state', answer.state);
  url.searchParams.set(answer.code ? 'code' : 'error', answer.code ?? answer.error ?? 'server_error');
  return url.toString();
}

// Opened empty during the click, so the browser lets it open; null where the browser blocks it.
export function openSignInWindow(): Window | null {
  return window.open('', WINDOW_NAME, WINDOW_FEATURES);
}

// The answer of the sign in that expects `state`, when the page's address carries it. TensorPass returns
// the state with the code or the error. OpenRouter may come back with its code or its error alone, as it
// did on 16 November 2026; such an answer is taken while this origin waits for a sign in, since only the
// verifier the page holds trades a code.
export function answerIn(address: string, state: string): SignInResult | null {
  const params = new URL(address).searchParams;
  const code = params.get('code');
  const error = params.get('error');
  const returned = params.get('state');
  if ((returned === state || !returned) && (code || error)) {
    return { state, ...(code ? { code } : {}), ...(error ? { error } : {}) };
  }
  return null;
}

function isResult(data: unknown): data is SignInResult & { type: string } {
  const message = data as Record<string, unknown> | null;
  return message?.type === MESSAGE_TYPE && typeof message.state === 'string';
}

export function markWindow(state: string | null): void {
  attempt(() => (state ? localStorage.setItem(WINDOW_MARK, state) : localStorage.removeItem(WINDOW_MARK)));
}

// The state of the sign in whose popup is open, as its opener marked it.
export function windowMark(): string | null {
  return attempt(() => localStorage.getItem(WINDOW_MARK)) ?? null;
}

// In the popup: hands the answer to the page that opened it, by each way, then closes.
export function returnToOpener(result: SignInResult): void {
  const message = { type: MESSAGE_TYPE, ...result };
  attempt(() => window.opener?.postMessage(message, location.origin));
  if (typeof BroadcastChannel === 'function') {
    const channel = new BroadcastChannel(CHANNEL_PREFIX + result.state);
    channel.postMessage(message);
    channel.close();
  }
  attempt(() => {
    localStorage.setItem(RESULT_KEY, JSON.stringify(message));
    localStorage.removeItem(RESULT_KEY);
  });
  window.close();
}

// In the opener: hears the answer of the sign in that expects `state`, from its own origin, by any of the
// three ways, until the returned function stops it.
export function listenForResult(state: string, onResult: (result: SignInResult) => void): () => void {
  const take = (data: unknown) => {
    if (isResult(data) && data.state === state) {
      onResult({ state: data.state, code: data.code, error: data.error });
    }
  };
  const onMessage = (event: MessageEvent) => {
    if (event.origin === location.origin) {
      take(event.data);
    }
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === RESULT_KEY && event.newValue) {
      take(attempt(() => JSON.parse(event.newValue!) as unknown));
    }
  };
  window.addEventListener('message', onMessage);
  window.addEventListener('storage', onStorage);
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL_PREFIX + state) : null;
  channel?.addEventListener('message', (event) => take(event.data));
  return () => {
    window.removeEventListener('message', onMessage);
    window.removeEventListener('storage', onStorage);
    channel?.close();
  };
}

export function keepForRedirect(pending: PendingSignIn): void {
  attempt(() => sessionStorage.setItem(REDIRECT_KEY, JSON.stringify(pending)));
}

// The sign in this tab left for the provider's page, if any.
export function redirectedSignIn(): PendingSignIn | null {
  const raw = attempt(() => sessionStorage.getItem(REDIRECT_KEY));
  if (!raw) {
    return null;
  }
  const pending = attempt(() => JSON.parse(raw) as PendingSignIn);
  const complete = pending && typeof pending.state === 'string' && typeof pending.verifier === 'string';
  return complete ? { ...pending, returnTo: pending.returnTo ?? pending.redirectUri } : null;
}

export function forgetRedirected(): void {
  attempt(() => sessionStorage.removeItem(REDIRECT_KEY));
}

// Whether the page is the return of a sign in this origin started, in a popup or in the tab: the loader
// then loads the client at once, since the sign in waits for it.
export function isSignInReturn(address: string): boolean {
  const state = windowMark() ?? redirectedSignIn()?.state;
  return Boolean(state && answerIn(address, state));
}

// Takes the callback's parameters out of the address bar, leaving the page where it was.
export function cleanAddress(): void {
  history.replaceState(history.state, '', withoutCallback(location.href).toString());
}
