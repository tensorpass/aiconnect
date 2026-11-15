// The accounts a visitor without the wallet signs in to on the page: TensorPass's plan, offered when the
// site gave its site key, and OpenRouter, offered to every site. The source runs the sign in in a popup or,
// where the browser blocks it, in the page itself, keeps the credential in the site's storage, and answers
// the state the client shows while no wallet is found: signing in, connected with the account, or the
// wallet missing with the last sign in that failed.

import type { ConnectionState, WebSignInFailure } from '../connectionState.ts';
import type { ProviderSession } from '../types.ts';
import { challengeFor, randomToken } from './pkce.ts';
import type { HttpFetch } from './openAiCompatibleSession.ts';
import { openRouterAccount, OPENROUTER_DEFAULT_MODEL } from './openRouterAccount.ts';
import {
  answerIn, callbackAddress, cleanAddress, forgetRedirected, keepForRedirect, listenForResult, markWindow,
  openSignInWindow, redirectedSignIn, returnToOpener, windowMark,
} from './signInWindow.ts';
import type { PendingSignIn, SignInResult } from './signInWindow.ts';
import { PLAN_GATEWAY, tensorPassAccount } from './tensorPassAccount.ts';
import type { PlanLevel } from './tensorPassAccount.ts';
import type { WebAccount } from './webAccount.ts';
import { WEB_ACCOUNT_KEY, WebAccountStore } from './webAccountStore.ts';
import type { WebAccountId } from './webAccountStore.ts';

export interface WebAccountOptions {
  // The site's public key from TensorPass, which offers the TensorPass plan's sign in.
  siteKey?: string;
  planGateway?: string;
  openRouterModel?: string;
  planLevel?: PlanLevel;
}

// How long a sign in waits for its answer before it ends.
const SIGN_IN_WAIT_MS = 10 * 60_000;

interface Watched extends PendingSignIn {
  stop: () => void;
  popup: Window;
}

export interface WebAccountSourceDeps {
  options: WebAccountOptions;
  // Called whenever the state the source answers changes.
  onChange: () => void;
  store?: WebAccountStore;
  fetch?: HttpFetch;
}

function accountsOf(options: WebAccountOptions, fetchImpl?: HttpFetch): Map<WebAccountId, WebAccount> {
  const accounts = new Map<WebAccountId, WebAccount>();
  if (options.siteKey) {
    accounts.set('tensorpass', tensorPassAccount({
      gateway: options.planGateway ?? PLAN_GATEWAY, siteKey: options.siteKey, level: options.planLevel ?? 'quick',
      fetch: fetchImpl,
    }));
  }
  const model = options.openRouterModel ?? OPENROUTER_DEFAULT_MODEL;
  accounts.set('openrouter', openRouterAccount(model, { fetch: fetchImpl }));
  return accounts;
}

const failureOf = (account: WebAccountId, result: SignInResult): WebSignInFailure => ({
  account,
  reason: result.error === 'access_denied' ? 'declined' : 'failed',
  message: result.error ?? 'No code came back from the sign in',
});

export class WebAccountSource {
  private readonly accounts: Map<WebAccountId, WebAccount>;
  private readonly sessions = new Map<WebAccountId, ProviderSession>();
  private pending: Watched | null = null;
  private signingIn: WebAccountId | null = null;
  private failure: WebSignInFailure | undefined;
  private readonly onChange: () => void;
  private readonly store: WebAccountStore;

  constructor({ options, onChange, store = new WebAccountStore(), fetch: fetchImpl }: WebAccountSourceDeps) {
    this.onChange = onChange;
    this.store = store;
    this.accounts = accountsOf(options, fetchImpl);
    globalThis.addEventListener?.('storage', (event: StorageEvent) => {
      if (event.key === WEB_ACCOUNT_KEY) {
        this.onChange();
      }
    });
  }

  // The accounts the connect window offers, TensorPass first when the site has a key.
  get ids(): WebAccountId[] {
    return [...this.accounts.keys()];
  }

  state(): ConnectionState {
    if (this.signingIn) {
      return { status: 'signingIn', account: this.signingIn };
    }
    const held = this.store.read();
    const account = held ? this.accounts.get(held.account) : undefined;
    if (!account) {
      return { status: 'noWallet', ...(this.failure ? { signInFailure: this.failure } : {}) };
    }
    return { status: 'connected', providerName: account.name, model: account.model, session: this.sessionOf(account),
      account: account.id };
  }

  // A page loaded as a sign in's callback: a popup hands the answer to its opener and closes, and a page
  // that went to the sign in itself finishes it. Answers what the page was, or null for any other page.
  takeCallback(): 'window' | 'redirect' | null {
    const mark = windowMark();
    const answer = mark ? answerIn(location.href, mark) : null;
    if (answer) {
      returnToOpener(answer);
      return 'window';
    }
    const pending = redirectedSignIn();
    const result = pending ? answerIn(location.href, pending.state) : null;
    if (!pending || !result) {
      return null;
    }
    forgetRedirected();
    cleanAddress();
    this.signingIn = pending.account;
    void this.finish(pending, result);
    return 'redirect';
  }

  // Starts a sign in. It must run from the visitor's click, which lets the browser open the popup.
  signIn(id: WebAccountId): Promise<void> {
    const account = this.accounts.get(id);
    if (!account) {
      throw new Error(`This site offers no ${id} sign in`);
    }
    this.cancel();
    const popup = openSignInWindow();
    const state = randomToken(16);
    const pending: PendingSignIn = { account: id, state, verifier: randomToken(), redirectUri: callbackAddress() };
    this.failure = undefined;
    this.signingIn = id;
    this.onChange();
    return challengeFor(pending.verifier).then((challenge) => {
      const url = account.authorizeUrl({ redirectUri: pending.redirectUri, state, challenge });
      if (!popup) {
        keepForRedirect(pending);
        location.assign(url);
        return;
      }
      this.watch(pending, popup);
      popup.location.href = url;
    }).catch((error: Error) => this.fail({ account: id, reason: 'failed', message: error.message }));
  }

  // Ends the sign in in progress; an answer it gets later is ignored.
  cancel(): void {
    this.pending?.popup.close();
    this.pending?.stop();
    this.pending = null;
    if (this.signingIn) {
      this.signingIn = null;
      this.onChange();
    }
  }

  async signOut(): Promise<void> {
    const held = this.store.read();
    this.store.forget();
    this.failure = undefined;
    this.onChange();
    if (held) {
      await this.accounts.get(held.account)?.revoke(held);
    }
  }

  // Waits for the popup's answer. When the page regains focus with the popup gone, the connect window
  // leaves its waiting step, and the answer is still taken if it comes: a provider page that isolates the
  // popup from its opener also makes `popup.closed` read true while the visitor is still signing in.
  private watch(pending: PendingSignIn, popup: Window): void {
    const stopListening = listenForResult(pending.state, (result) => {
      if (result.state === this.pending?.state) {
        this.pending.stop();
        this.pending = null;
        this.signingIn = pending.account;
        void this.finish(pending, result);
      }
    });
    const onFocus = () => {
      if (popup.closed && this.signingIn === pending.account && this.pending?.state === pending.state) {
        this.signingIn = null;
        this.onChange();
      }
    };
    window.addEventListener('focus', onFocus);
    const timer = setTimeout(() => this.expire(pending), SIGN_IN_WAIT_MS);
    markWindow(pending.state);
    this.pending = {
      ...pending,
      popup,
      stop: () => {
        stopListening();
        window.removeEventListener('focus', onFocus);
        clearTimeout(timer);
        markWindow(null);
      },
    };
  }

  // A sign in that got no answer in its time ends; one the connect window already left ends quietly.
  private expire(pending: PendingSignIn): void {
    if (this.signingIn) {
      this.fail({ account: pending.account, reason: 'expired', message: 'The sign in took too long' });
      return;
    }
    this.pending?.stop();
    this.pending = null;
  }

  private async finish(pending: PendingSignIn, result: SignInResult): Promise<void> {
    const account = this.accounts.get(pending.account);
    if (!account || !result.code) {
      this.fail(failureOf(pending.account, result));
      return;
    }
    try {
      this.store.save(await account.exchange({ code: result.code, verifier: pending.verifier,
        redirectUri: pending.redirectUri }));
      this.signingIn = null;
      this.onChange();
    } catch (error) {
      this.fail({ account: pending.account, reason: 'failed', message: (error as Error).message ?? String(error) });
    }
  }

  private fail(failure: WebSignInFailure): void {
    this.pending?.stop();
    this.pending = null;
    this.signingIn = null;
    this.failure = failure;
    this.onChange();
  }

  private sessionOf(account: WebAccount): ProviderSession {
    let session = this.sessions.get(account.id);
    if (!session) {
      session = account.session(this.store, () => {
        this.store.forget();
        this.onChange();
      });
      this.sessions.set(account.id, session);
    }
    return session;
  }
}
