// What the client needs of each account a visitor signs in to on the page: its sign in page, the trade of
// the code it sends back for a credential, the chat session that credential opens, and how the
// credential is given up at sign out.

import type { ProviderSession } from '../types.ts';
import type { HttpFetch } from './openAiCompatibleSession.ts';
import type { WebAccountId, WebAccountStore, WebCredential } from './webAccountStore.ts';

export interface AuthorizeRequest {
  redirectUri: string;
  state: string;
  challenge: string;
}

export interface CodeExchange {
  code: string;
  verifier: string;
  redirectUri: string;
}

export interface WebAccount {
  id: WebAccountId;
  // The account's name as the connect window and the chat show it.
  name: string;
  model: string;
  authorizeUrl(request: AuthorizeRequest): string;
  exchange(request: CodeExchange): Promise<WebCredential>;
  // `onSignedOut` runs when the credential stops opening the account.
  session(store: WebAccountStore, onSignedOut: () => void): ProviderSession;
  revoke(credential: WebCredential): Promise<void>;
}

export interface WebAccountContext {
  fetch?: HttpFetch;
}

// A reply's JSON body, or an empty object for a body that is not JSON.
export async function jsonOf(response: Response): Promise<Record<string, unknown>> {
  return await response.json().catch(() => ({})) as Record<string, unknown>;
}

// The reason a token endpoint gives, OAuth's `error_description` or the gateway's `error.message`.
export function replyMessage(body: Record<string, unknown>, fallback: string): string {
  const described = body.error_description;
  const nested = (body.error as { message?: unknown } | undefined)?.message;
  if (typeof described === 'string') {
    return described;
  }
  return typeof nested === 'string' ? nested : fallback;
}
