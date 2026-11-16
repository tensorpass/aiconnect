// TensorPass's plan for a visitor without the wallet. The site names itself with its public site key:
// the visitor signs in on TensorPass's page, which names the site's origin, and comes back with a code the
// page trades, with its PKCE verifier, for a plan token of a few minutes bound to the site's origin and a
// refresh token that works once. The page calls the plan's gateway with the token and asks for the plan's
// level as the model. An account without a subscription reads the plans and subscribes on TensorPass's
// billing page (tensorPassPlan.ts).
//
// Every tab of the site shares the stored tokens, and a refresh token used twice ends the sign in, so a
// renewal runs under a lock the tabs share and reads the store again first: another tab may have renewed.

import { WalletRequestError } from '../walletProvider.ts';
import type { WebAccount, WebAccountContext } from './webAccount.ts';
import { jsonOf, replyMessage, WEB_ACCOUNT_NAMES } from './webAccount.ts';
import { webSession } from './openAiCompatibleSession.ts';
import type { HttpFetch } from './openAiCompatibleSession.ts';
import { planAccess } from './tensorPassPlan.ts';
import type { TensorPassCredential, WebAccountStore } from './webAccountStore.ts';

export const PLAN_GATEWAY = 'https://plan.tensorpass.app';
export type PlanLevel = 'quick' | 'smart' | 'expert';
const NAME = WEB_ACCOUNT_NAMES.tensorpass;
// A token this close to its end is renewed before the call.
const RENEW_BEFORE_MS = 60_000;
const RENEW_LOCK = 'aiconnect:tensorpass-renewal';

export interface TensorPassOptions extends WebAccountContext {
  gateway: string;
  siteKey: string;
  level: PlanLevel;
}

interface TokenEndpoint {
  url: string;
  siteKey: string;
  send: HttpFetch;
}

async function postForm(endpoint: TokenEndpoint, path: string, fields: Record<string, string>) {
  return endpoint.send(`${endpoint.url}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: endpoint.siteKey, ...fields }).toString(),
  });
}

async function tokensOf(response: Response): Promise<TensorPassCredential> {
  const body = await jsonOf(response);
  const { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn } = body;
  if (!response.ok || typeof accessToken !== 'string' || typeof refreshToken !== 'string') {
    throw new WalletRequestError(`${NAME}: ${replyMessage(body, `the sign in answered ${response.status}`)}`,
      response.status);
  }
  const seconds = typeof expiresIn === 'number' ? expiresIn : 0;
  return { account: 'tensorpass', accessToken, refreshToken, expiresAt: Date.now() + seconds * 1000 };
}

// Runs the work under a lock every tab of the origin shares, where the browser has Web Locks.
function underLock<T>(work: () => Promise<T>): Promise<T> {
  const locks = (globalThis.navigator as Navigator | undefined)?.locks;
  return locks ? locks.request(RENEW_LOCK, work) : work();
}

// The stored credential renewed, or null once the gateway refuses the refresh token: the visitor signs in
// again. `stale` is the access token the caller found too old or refused.
function renewer(endpoint: TokenEndpoint, store: WebAccountStore, onSignedOut: () => void) {
  return (stale: string | null) => underLock(async () => {
    const held = store.read();
    if (held?.account !== 'tensorpass') {
      return null;
    }
    if (held.accessToken !== stale && held.expiresAt - RENEW_BEFORE_MS > Date.now()) {
      return held;
    }
    const response = await postForm(endpoint, '/oauth/token', {
      grant_type: 'refresh_token', refresh_token: held.refreshToken,
    });
    if (response.status === 400 || response.status === 401) {
      onSignedOut();
      return null;
    }
    const renewed = await tokensOf(response);
    store.save(renewed);
    return renewed;
  });
}

const bearer = (credential: TensorPassCredential) => ({ Authorization: `Bearer ${credential.accessToken}` });

// The headers of the stored token, renewed first when it is close to its end, and after a refusal.
function tokenReader(endpoint: TokenEndpoint, store: WebAccountStore, onSignedOut: () => void) {
  const renew = renewer(endpoint, store, onSignedOut);
  const held = () => {
    const credential = store.read();
    return credential?.account === 'tensorpass' ? credential : null;
  };
  return {
    current: async (): Promise<Record<string, string>> => {
      const credential = held();
      const fresh = credential && credential.expiresAt - RENEW_BEFORE_MS <= Date.now()
        ? await renew(credential.accessToken) : credential;
      return fresh ? bearer(fresh) : {};
    },
    renewed: async () => {
      const renewed = await renew(held()?.accessToken ?? null);
      return renewed ? bearer(renewed) : null;
    },
  };
}

export function tensorPassAccount(options: TensorPassOptions): WebAccount {
  // The browser's fetch called as a method of another object throws, so it is wrapped.
  const send: HttpFetch = options.fetch ?? ((input, init) => fetch(input, init));
  const endpoint = { url: options.gateway, siteKey: options.siteKey, send };
  return {
    id: 'tensorpass',
    name: NAME,
    model: options.level,
    authorizeUrl({ redirectUri, state, challenge }) {
      const url = new URL(`${options.gateway}/signin`);
      url.search = new URLSearchParams({
        response_type: 'code', client_id: options.siteKey, redirect_uri: redirectUri, code_challenge: challenge,
        code_challenge_method: 'S256', state,
      }).toString();
      return url.toString();
    },
    async exchange({ code, verifier, redirectUri }) {
      return tokensOf(await postForm(endpoint, '/oauth/token', {
        grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: redirectUri,
      }));
    },
    session(store, onSignedOut) {
      const token = tokenReader(endpoint, store, onSignedOut);
      return webSession({
        providerId: 'tensorpass',
        providerName: NAME,
        model: options.level,
        endpoint: `${options.gateway}/v1/chat/completions`,
        fetch: options.fetch,
        credential: token.current,
        renew: token.renewed,
        onRefused: onSignedOut,
      });
    },
    plan(store, onSignedOut) {
      return planAccess({ gateway: options.gateway, send, bearer: tokenReader(endpoint, store, onSignedOut).current });
    },
    async revoke(credential) {
      if (credential.account === 'tensorpass') {
        await postForm(endpoint, '/oauth/revoke', { token: credential.refreshToken }).catch(() => undefined);
      }
    },
  };
}
