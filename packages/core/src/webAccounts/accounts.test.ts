import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { HttpFetch } from './openAiCompatibleSession.ts';
import { openRouterAccount } from './openRouterAccount.ts';
import { tensorPassAccount } from './tensorPassAccount.ts';
import { WebAccountStore } from './webAccountStore.ts';

interface Call {
  url: string;
  headers: Headers;
  body: string;
}

function played(answer: (call: Call) => Response): { fetch: HttpFetch; calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    fetch: async (url, init) => {
      const call = { url, headers: new Headers(init.headers), body: String(init.body) };
      calls.push(call);
      return answer(call);
    },
  };
}

const form = (call: Call) => Object.fromEntries(new URLSearchParams(call.body));
const chatStream = () => new Response('data: {"choices":[{"delta":{"content":"Hi"}}]}\n\ndata: [DONE]\n\n');
const AUTHORIZE = { redirectUri: 'https://shop.example/?aiconnect_state=s1', state: 's1', challenge: 'c'.repeat(43) };

test('OpenRouter\'s sign in carries the callback and the challenge, and its code becomes a key', async () => {
  const { fetch, calls } = played(() => Response.json({ key: 'sk-or-v1-abc' }));
  const account = openRouterAccount('openrouter/auto', { fetch });
  const url = new URL(account.authorizeUrl(AUTHORIZE));
  assert.equal(`${url.origin}${url.pathname}`, 'https://openrouter.ai/auth');
  assert.equal(url.searchParams.get('callback_url'), AUTHORIZE.redirectUri);
  assert.equal(url.searchParams.get('code_challenge'), AUTHORIZE.challenge);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  const credential = await account.exchange({ code: 'code-1', verifier: 'v-1', redirectUri: AUTHORIZE.redirectUri });
  assert.deepEqual(credential, { account: 'openrouter', key: 'sk-or-v1-abc' });
  assert.equal(calls[0].url, 'https://openrouter.ai/api/v1/auth/keys');
  assert.deepEqual(JSON.parse(calls[0].body), { code: 'code-1', code_verifier: 'v-1', code_challenge_method: 'S256' });
});

test('an OpenRouter code it refuses fails the exchange with its message', async () => {
  const { fetch } = played(() => Response.json({ error: { message: 'Invalid code' } }, { status: 400 }));
  await assert.rejects(openRouterAccount('m', { fetch }).exchange({ code: 'x', verifier: 'v', redirectUri: 'r' }), {
    message: 'Invalid code',
  });
});

const PLAN = { gateway: 'https://gateway.test', siteKey: 'tpk_site', level: 'smart' as const };

test('TensorPass\'s sign in names the site key and trades the code with its verifier and address', async () => {
  const tokens = { access_token: 'tpp-1', refresh_token: 'tpr-1', expires_in: 900 };
  const { fetch, calls } = played(() => Response.json(tokens));
  const account = tensorPassAccount({ ...PLAN, fetch });
  const url = new URL(account.authorizeUrl(AUTHORIZE));
  assert.equal(`${url.origin}${url.pathname}`, 'https://gateway.test/signin');
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    response_type: 'code', client_id: 'tpk_site', redirect_uri: AUTHORIZE.redirectUri,
    code_challenge: AUTHORIZE.challenge, code_challenge_method: 'S256', state: 's1',
  });
  const before = Date.now();
  const credential = await account.exchange({ code: 'code-1', verifier: 'v-1', redirectUri: AUTHORIZE.redirectUri });
  assert.equal(credential.account, 'tensorpass');
  assert.ok(credential.account === 'tensorpass' && credential.expiresAt >= before + 900_000);
  assert.equal(calls[0].url, 'https://gateway.test/oauth/token');
  assert.deepEqual(form(calls[0]), {
    client_id: 'tpk_site', grant_type: 'authorization_code', code: 'code-1', code_verifier: 'v-1',
    redirect_uri: AUTHORIZE.redirectUri,
  });
});

test('a TensorPass token near its end is renewed before the chat, which asks for the plan\'s level', async () => {
  const { fetch, calls } = played((call) => (call.url.endsWith('/oauth/token')
    ? Response.json({ access_token: 'tpp-2', refresh_token: 'tpr-2', expires_in: 900 })
    : chatStream()));
  const store = new WebAccountStore(null);
  store.save({ account: 'tensorpass', accessToken: 'tpp-1', refreshToken: 'tpr-1', expiresAt: Date.now() + 10_000 });
  const session = tensorPassAccount({ ...PLAN, fetch }).session(store, () => assert.fail('signed out'));
  const response = await session.chat({ messages: [{ role: 'user', content: 'Hello' }] });
  assert.equal(response.message.content, 'Hi');
  assert.deepEqual(form(calls[0]), { client_id: 'tpk_site', grant_type: 'refresh_token', refresh_token: 'tpr-1' });
  assert.equal(calls[1].url, 'https://gateway.test/v1/chat/completions');
  assert.equal(calls[1].headers.get('authorization'), 'Bearer tpp-2');
  assert.equal(JSON.parse(calls[1].body).model, 'smart');
  assert.equal(store.read()?.account === 'tensorpass' && store.read()?.refreshToken, 'tpr-2');
});

test('a refresh token the gateway refuses signs the visitor out, and sign out revokes the refresh token', async () => {
  const { fetch, calls } = played((call) => (call.url.endsWith('/oauth/token')
    ? Response.json({ error: 'invalid_grant' }, { status: 400 })
    : Response.json({ error: { message: 'This plan token is not valid.' } }, { status: 401 })));
  const store = new WebAccountStore(null);
  const held = {
    account: 'tensorpass' as const, accessToken: 'tpp-1', refreshToken: 'tpr-1', expiresAt: Date.now() + 600_000,
  };
  store.save(held);
  let signedOut = 0;
  const account = tensorPassAccount({ ...PLAN, fetch });
  await assert.rejects(account.session(store, () => (signedOut += 1)).chat({ messages: [] }), { status: 401 });
  assert.ok(signedOut >= 1);
  await account.revoke(held);
  assert.equal(calls.at(-1)?.url, 'https://gateway.test/oauth/revoke');
  assert.deepEqual(form(calls.at(-1)!), { client_id: 'tpk_site', token: 'tpr-1' });
});
