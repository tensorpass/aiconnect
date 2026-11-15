// OpenRouter for a visitor without the wallet: the site sends the visitor to OpenRouter's sign in with a
// PKCE challenge, OpenRouter sends them back with a code, and the page trades it for a key bound to the
// visitor's own credits. Every answer is billed to them. OpenRouter's sign in takes no state, so the
// client carries it in the callback address.
// https://openrouter.ai/docs/use-cases/oauth-pkce

import type { WebAccount, WebAccountContext } from './webAccount.ts';
import { jsonOf, replyMessage } from './webAccount.ts';
import { webSession } from './openAiCompatibleSession.ts';

const AUTHORIZE_URL = 'https://openrouter.ai/auth';
const KEY_EXCHANGE_URL = 'https://openrouter.ai/api/v1/auth/keys';
const CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
// OpenRouter's Auto Router, which picks the model for each prompt.
export const OPENROUTER_DEFAULT_MODEL = 'openrouter/auto';
const NAME = 'OpenRouter';

// OpenRouter credits the site that sent the call by these two headers.
function siteHeaders(): Record<string, string> {
  const origin = globalThis.location?.origin;
  return origin ? { 'HTTP-Referer': origin, 'X-Title': globalThis.location.host } : {};
}

export function openRouterAccount(model: string, context: WebAccountContext = {}): WebAccount {
  const send = context.fetch ?? fetch;
  return {
    id: 'openrouter',
    name: NAME,
    model,
    authorizeUrl({ redirectUri, challenge }) {
      const url = new URL(AUTHORIZE_URL);
      url.search = new URLSearchParams({
        callback_url: redirectUri, code_challenge: challenge, code_challenge_method: 'S256',
      }).toString();
      return url.toString();
    },
    async exchange({ code, verifier }) {
      const response = await send(KEY_EXCHANGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: 'S256' }),
      });
      const body = await jsonOf(response);
      if (!response.ok || typeof body.key !== 'string') {
        throw new Error(replyMessage(body, `${NAME} answered ${response.status}`));
      }
      return { account: 'openrouter', key: body.key };
    },
    session(store, onSignedOut) {
      return webSession({
        providerId: 'openrouter',
        providerName: NAME,
        model,
        endpoint: CHAT_URL,
        headers: siteHeaders(),
        fetch: context.fetch,
        credential: async (): Promise<Record<string, string>> => {
          const held = store.read();
          return held?.account === 'openrouter' ? { Authorization: `Bearer ${held.key}` } : {};
        },
        renew: async () => null,
        onRefused: onSignedOut,
      });
    },
    // The key stays listed on the visitor's OpenRouter keys page, where they delete it.
    revoke: async () => undefined,
  };
}
