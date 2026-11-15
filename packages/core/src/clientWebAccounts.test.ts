import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { AiConnect } from './client.ts';
import type { ConnectionState } from './connectionState.ts';
import { WEB_ACCOUNT_KEY } from './webAccounts/webAccountStore.ts';

const GLOBALS = ['window', 'location', 'localStorage'];

// A page of the site without the wallet: nothing answers the wallet's announce request.
function pageWithoutWallet(stored: Map<string, string>): void {
  const localStorage = {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => void stored.set(key, value),
    removeItem: (key: string) => void stored.delete(key),
  };
  const values = {
    window: Object.assign(new EventTarget(), { localStorage }),
    location: { href: 'https://shop.example/', origin: 'https://shop.example' },
    localStorage,
  };
  for (const [name, value] of Object.entries(values)) {
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  }
}

afterEach(() => {
  for (const name of GLOBALS) {
    delete (globalThis as Record<string, unknown>)[name];
  }
});

function settled(client: AiConnect): Promise<ConnectionState> {
  return new Promise((resolve) => {
    const unsubscribe = client.subscribe((state) => {
      if (state.status !== 'checking') {
        unsubscribe();
        resolve(state);
      }
    });
  });
}

test('without the wallet, a web account signed in on an earlier visit connects the site', async () => {
  const stored = new Map([[WEB_ACCOUNT_KEY, JSON.stringify({ account: 'openrouter', key: 'sk-or-1' })]]);
  pageWithoutWallet(stored);
  const client = new AiConnect({ openRouterModel: 'vendor/model' });
  const state = await settled(client);
  assert.equal(state.status, 'connected');
  assert.equal(state.status === 'connected' && state.account, 'openrouter');
  assert.equal(state.status === 'connected' && state.model, 'vendor/model');
  assert.deepEqual(client.webAccounts, ['openrouter']);
  await client.disconnect();
  assert.equal(client.state.status, 'noWallet');
  assert.equal(stored.has(WEB_ACCOUNT_KEY), false);
});

test('with neither the wallet nor a web account, a site key offers TensorPass before OpenRouter', async () => {
  pageWithoutWallet(new Map());
  const client = new AiConnect({ siteKey: 'tpk_site' });
  assert.deepEqual(await settled(client), { status: 'noWallet' });
  assert.deepEqual(client.webAccounts, ['tensorpass', 'openrouter']);
});
