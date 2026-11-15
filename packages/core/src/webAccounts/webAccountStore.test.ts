import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WEB_ACCOUNT_KEY, WebAccountStore } from './webAccountStore.ts';
import type { KeyValueStorage } from './webAccountStore.ts';

function mapStorage(): KeyValueStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
}

const PLAN = { account: 'tensorpass', accessToken: 'tpp-1', refreshToken: 'tpr-1', expiresAt: 5 } as const;

test('a credential is kept under one key of the site\'s storage and removed at sign out', () => {
  const storage = mapStorage();
  const store = new WebAccountStore(storage);
  store.save({ account: 'openrouter', key: 'sk-or-1' });
  assert.deepEqual(JSON.parse(storage.values.get(WEB_ACCOUNT_KEY)!), { account: 'openrouter', key: 'sk-or-1' });
  assert.deepEqual(new WebAccountStore(storage).read(), { account: 'openrouter', key: 'sk-or-1' });
  store.save(PLAN);
  assert.deepEqual(store.read(), PLAN);
  store.forget();
  assert.equal(store.read(), null);
  assert.equal(storage.values.size, 0);
});

test('a stored value of another shape, or one another tab removed, reads as no account', () => {
  const storage = mapStorage();
  const store = new WebAccountStore(storage);
  storage.values.set(WEB_ACCOUNT_KEY, '{"account":"openrouter"}');
  assert.equal(store.read(), null);
  storage.values.set(WEB_ACCOUNT_KEY, 'not json');
  assert.equal(store.read(), null);
  store.save(PLAN);
  storage.values.delete(WEB_ACCOUNT_KEY);
  assert.equal(store.read(), null);
});

test('a browser that refuses storage keeps the credential for the page alone', () => {
  const refusing: KeyValueStorage = {
    getItem: () => null,
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
    removeItem: () => undefined,
  };
  const store = new WebAccountStore(refusing);
  store.save({ account: 'openrouter', key: 'sk-or-2' });
  assert.deepEqual(store.read(), { account: 'openrouter', key: 'sk-or-2' });
  store.forget();
  assert.equal(store.read(), null);
  const none = new WebAccountStore(null);
  none.save(PLAN);
  assert.deepEqual(none.read(), PLAN);
});
