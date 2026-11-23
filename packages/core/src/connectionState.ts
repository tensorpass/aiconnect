// What a site sees of its connection to the visitor's AI: the wallet being looked for, missing, asked or
// connected, and, without the wallet, an account the visitor signs in to on the page.

import type { Dictation } from './dictation.ts';
import type { ProviderSession, ReadableParts } from './types.ts';
import type { WalletRefusal } from './walletProvider.ts';
import type { WebAccountId } from './webAccounts/webAccountStore.ts';

// Why a web sign in did not go through: the visitor cancelled it on the provider's page, it failed, or it
// was left open longer than a sign in waits.
export interface WebSignInFailure {
  account: WebAccountId;
  reason: 'declined' | 'failed' | 'expired';
  message: string;
}

export type ConnectionState =
  | { status: 'checking' }
  | { status: 'noWallet'; signInFailure?: WebSignInFailure }
  | { status: 'disconnected' }
  | { status: 'connecting' }
  | { status: 'signingIn'; account: WebAccountId }
  // `account` names the web account that answers; it is absent when the wallet answers. `reads` says what
  // the model reads besides text, when the wallet says it; `dictation` is there when the account
  // transcribes the visitor's voice.
  | {
    status: 'connected';
    providerName: string;
    model?: string;
    session: ProviderSession;
    account?: WebAccountId;
    reads?: ReadableParts;
    dictation?: Dictation;
  }
  | { status: 'error'; message: string; reason?: WalletRefusal };
