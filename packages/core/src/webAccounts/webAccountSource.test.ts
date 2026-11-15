import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import type { ConnectionState } from '../connectionState.ts';
import type { HttpFetch } from './openAiCompatibleSession.ts';
import { WebAccountSource } from './webAccountSource.ts';
import { WebAccountStore } from './webAccountStore.ts';
import type { KeyValueStorage } from './webAccountStore.ts';

const ORIGIN = 'https://shop.example';

function mapStorage(): KeyValueStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
}

interface Browser {
  popups: { location: { href: string }; closed: boolean; close: () => void }[];
  assigned: string[];
  closedSelf: number;
  // Delivers a message to the page as `postMessage` does, from the origin given.
  deliver: (data: unknown, origin: string) => void;
}

const GLOBALS = ['window', 'location', 'history', 'localStorage', 'sessionStorage'];

// A page of the site in a browser: one window, its address, its history and its two storages. A popup the
// page opens shares the window here, as a page of the same origin shares the storage.
function installBrowser({ href, popups = true }: { href: string; popups?: boolean }): Browser {
  const target = new EventTarget();
  const browser: Browser = {
    popups: [], assigned: [], closedSelf: 0,
    deliver: (data, origin) => target.dispatchEvent(new MessageEvent('message', { data, origin })),
  };
  const location = {
    href,
    get origin() {
      return new URL(this.href).origin;
    },
    assign: (url: string) => browser.assigned.push(url),
  };
  const window = Object.assign(target, {
    opener: {
      postMessage: (data: unknown, origin: string) => origin === location.origin && browser.deliver(data, origin),
    },
    open: () => {
      if (!popups) {
        return null;
      }
      const popup = { location: { href: 'about:blank' }, closed: false, close: () => (popup.closed = true) };
      browser.popups.push(popup);
      return popup;
    },
    close: () => (browser.closedSelf += 1),
  });
  const history = {
    state: null,
    replaceState: (_state: unknown, _title: string, url: string) => (location.href = url),
  };
  const values = { window, location, history, localStorage: mapStorage(), sessionStorage: mapStorage() };
  for (const name of GLOBALS) {
    const value = values[name as keyof typeof values];
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  }
  return browser;
}

afterEach(() => {
  for (const name of GLOBALS) {
    delete (globalThis as Record<string, unknown>)[name];
  }
});

const exchangeFetch: HttpFetch = async (url) => (url.endsWith('/oauth/token')
  ? Response.json({ access_token: 'tpp-1', refresh_token: 'tpr-1', expires_in: 900 })
  : Response.json({ key: 'sk-or-1' }));

function source(store = new WebAccountStore(mapStorage()), fetch = exchangeFetch) {
  const changes: ConnectionState[] = [];
  const web: WebAccountSource = new WebAccountSource({
    options: { siteKey: 'tpk_site', planGateway: 'https://gateway.test' },
    onChange: () => changes.push(web.state()),
    store,
    fetch,
  });
  return { web, changes, store };
}

const until = (changes: ConnectionState[], status: string) => new Promise<ConnectionState>((resolve) => {
  const check = () => {
    const found = changes.find((change) => change.status === status);
    if (found) {
      resolve(found);
    } else {
      setTimeout(check, 1);
    }
  };
  check();
});

test('TensorPass comes first with a site key, and OpenRouter is offered to every site', () => {
  installBrowser({ href: `${ORIGIN}/books` });
  assert.deepEqual(source().web.ids, ['tensorpass', 'openrouter']);
  const plain = new WebAccountSource({ options: {}, onChange: () => undefined, store: new WebAccountStore(null) });
  assert.deepEqual(plain.ids, ['openrouter']);
});

test('a popup sign in comes back through the callback page and connects the account', async () => {
  const browser = installBrowser({ href: `${ORIGIN}/books?page=2#top` });
  const opener = source();
  await opener.web.signIn('tensorpass');
  assert.deepEqual(opener.changes[0], { status: 'signingIn', account: 'tensorpass' });
  const authorize = new URL(browser.popups[0].location.href);
  assert.equal(authorize.origin, 'https://gateway.test');
  const callback = new URL(authorize.searchParams.get('redirect_uri')!);
  assert.equal(`${callback.origin}${callback.pathname}`, `${ORIGIN}/books`);
  assert.equal(callback.searchParams.get('page'), '2');
  const state = authorize.searchParams.get('state')!;
  assert.equal(callback.searchParams.has('aiconnect_state'), false);

  browser.deliver({ type: 'aiconnect:sign-in', state, code: 'forged' }, 'https://evil.example');
  browser.deliver({ type: 'aiconnect:sign-in', state: 'other', code: 'forged' }, ORIGIN);
  assert.equal(opener.changes.length, 1);

  // The popup loads the site's page at the callback, hands the answer back and closes.
  location.href = `${callback}&code=code-1&state=${state}`;
  assert.equal(source(new WebAccountStore(mapStorage())).web.takeCallback(), 'window');
  assert.equal(browser.closedSelf, 1);
  const connected = await until(opener.changes, 'connected');
  assert.equal(connected.status === 'connected' && connected.account, 'tensorpass');
  assert.equal(connected.status === 'connected' && connected.providerName, 'TensorPass');
  assert.equal(opener.store.read()?.account, 'tensorpass');
});

test('a sign in the visitor declines goes back to the choice with the reason', async () => {
  const browser = installBrowser({ href: `${ORIGIN}/` });
  const opener = source();
  await opener.web.signIn('openrouter');
  const state = new URL(browser.popups[0].location.href).searchParams.get('state')!;
  browser.deliver({ type: 'aiconnect:sign-in', state, error: 'access_denied' }, ORIGIN);
  const back = await until(opener.changes, 'noWallet');
  assert.equal(back.status === 'noWallet' && back.signInFailure?.reason, 'declined');
});

test('cancel closes the popup and ends the sign in; an answer after it is ignored', async () => {
  const browser = installBrowser({ href: `${ORIGIN}/` });
  const opener = source();
  await opener.web.signIn('openrouter');
  opener.web.cancel();
  assert.equal(browser.popups[0].closed, true);
  assert.deepEqual(opener.web.state(), { status: 'noWallet' });
  const state = new URL(browser.popups[0].location.href).searchParams.get('state');
  browser.deliver({ type: 'aiconnect:sign-in', state, code: 'late' }, ORIGIN);
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(opener.store.read(), null);
});

test('a blocked popup signs in through the page itself, which finishes the sign in on its return', async () => {
  const browser = installBrowser({ href: `${ORIGIN}/books`, popups: false });
  const store = new WebAccountStore(mapStorage());
  await source(store).web.signIn('openrouter');
  const authorize = new URL(browser.assigned[0]);
  assert.equal(authorize.origin, 'https://openrouter.ai');
  const callback = authorize.searchParams.get('callback_url')!;
  assert.equal(callback, `${ORIGIN}/books`);

  location.href = `${callback}?code=code-2&state=${authorize.searchParams.get('state')}`;
  const returned = source(store);
  assert.equal(returned.web.takeCallback(), 'redirect');
  assert.equal(location.href, `${ORIGIN}/books`);
  await until(returned.changes, 'connected');
  assert.deepEqual(store.read(), { account: 'openrouter', key: 'sk-or-1' });
  await returned.web.signOut();
  assert.equal(store.read(), null);
  assert.equal(returned.web.state().status, 'noWallet');
});

test('a page whose address carries a state this tab never started is no sign in', () => {
  installBrowser({ href: `${ORIGIN}/?code=c&state=stranger` });
  const page = source();
  assert.equal(page.web.takeCallback(), null);
  assert.equal(page.store.read(), null);
});

test('a popup the provider isolated from its opener answers over the channel of its state', async () => {
  const browser = installBrowser({ href: `${ORIGIN}/` });
  const opener = source();
  await opener.web.signIn('openrouter');
  const authorize = new URL(browser.popups[0].location.href);
  const state = authorize.searchParams.get('state')!;
  // OpenRouter's page set a Cross-Origin-Opener-Policy, so the popup comes back without window.opener.
  Object.assign(window, { opener: null });
  location.href = `${authorize.searchParams.get('callback_url')}?code=code-3&state=${state}`;
  assert.equal(source(new WebAccountStore(mapStorage())).web.takeCallback(), 'window');
  await until(opener.changes, 'connected');
  assert.equal(opener.store.read()?.account, 'openrouter');
});

test('a refusal OpenRouter sends back without the state still reaches the waiting page', async () => {
  const browser = installBrowser({ href: `${ORIGIN}/` });
  const opener = source();
  await opener.web.signIn('openrouter');
  location.href = `${ORIGIN}/?error=access_denied`;
  assert.equal(source(new WebAccountStore(mapStorage())).web.takeCallback(), 'window');
  const back = await until(opener.changes, 'noWallet');
  assert.equal(back.status === 'noWallet' && back.signInFailure?.reason, 'declined');
  assert.equal(browser.closedSelf, 1);
});

test('focus back with the popup gone leaves the waiting step, and a late answer still connects', async () => {
  const browser = installBrowser({ href: `${ORIGIN}/` });
  const opener = source();
  await opener.web.signIn('openrouter');
  const state = new URL(browser.popups[0].location.href).searchParams.get('state');
  window.dispatchEvent(new Event('focus'));
  assert.equal(opener.web.state().status, 'signingIn');
  browser.popups[0].closed = true;
  window.dispatchEvent(new Event('focus'));
  assert.deepEqual(opener.web.state(), { status: 'noWallet' });
  browser.deliver({ type: 'aiconnect:sign-in', state, code: 'late-but-real' }, ORIGIN);
  await until(opener.changes, 'connected');
  assert.equal(opener.store.read()?.account, 'openrouter');
});
