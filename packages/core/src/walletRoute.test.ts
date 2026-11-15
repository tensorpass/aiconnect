import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iosBrowserOf, walletRouteOf } from './walletRoute.ts';
import type { BrowserSignals } from './visitorBrowser.ts';

const PAGE = 'https://shop.example/books?q=sea&lang=fr#top';
const APP_URL = `https://tensorpass.app/open?url=${encodeURIComponent(PAGE)}`;

const IPHONE_17 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)';
const IPHONE_16 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)';
const IPAD_17 = 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)';
const SAFARI_17 = `${IPHONE_17} Version/17.4 Mobile/15E148 Safari/604.1`;
const SAFARI_16 = `${IPHONE_16} Version/16.6 Mobile/15E148 Safari/604.1`;
const CHROME_IOS = `${IPHONE_17} CriOS/142.0.7444.77 Mobile/15E148 Safari/604.1`;
const FIREFOX_IOS = `${IPHONE_17} FxiOS/145.0 Mobile/15E148 Safari/605.1.15`;
const EDGE_IOS = `${IPHONE_17} Version/17.0 EdgiOS/142.0.3595.53 Mobile/15E148 Safari/605.1.15`;
const CHROME_IOS_16 = `${IPHONE_16} CriOS/142.0.7444.77 Mobile/15E148 Safari/604.1`;
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) '
  + 'Chrome/142.0.0.0 Mobile Safari/537.36';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)';

const signals = (userAgent: string, extra: Partial<BrowserSignals> = {}): BrowserSignals => ({
  userAgent, brands: [], brave: false, mobile: false, ...extra,
});

test('Safari on an iPhone gets the AI Wallet app from the wallet\'s Safari page', () => {
  for (const userAgent of [SAFARI_17, SAFARI_16, `${IPAD_17} Version/17.4 Mobile/15E148 Safari/604.1`]) {
    assert.deepEqual(walletRouteOf(signals(userAgent), PAGE), {
      kind: 'iphoneSafari',
      appUrl: 'https://tensorpass.app/wallet?browser=safari',
    }, userAgent);
  }
});

test('Chrome, Firefox and Edge on iOS 17 hand the page to Safari or to the app', () => {
  for (const userAgent of [CHROME_IOS, FIREFOX_IOS, EDGE_IOS]) {
    assert.deepEqual(walletRouteOf(signals(userAgent), PAGE), {
      kind: 'iphoneBrowser',
      safariUrl: 'x-safari-https://shop.example/books?q=sea&lang=fr#top',
      appUrl: APP_URL,
    }, userAgent);
  }
});

test('before iOS 17, which has no Safari scheme, another browser hands the page to the app only', () => {
  const route = walletRouteOf(signals(CHROME_IOS_16), PAGE);
  assert.deepEqual(route, { kind: 'iphoneBrowser', safariUrl: null, appUrl: APP_URL });
});

test('a plain http page opens in Safari through its own scheme, and a page that is not web does not', () => {
  const http = walletRouteOf(signals(CHROME_IOS), 'http://localhost:4605/');
  assert.equal(http.kind === 'iphoneBrowser' && http.safariUrl, 'x-safari-http://localhost:4605/');
  const file = walletRouteOf(signals(CHROME_IOS), 'file:///index.html');
  assert.equal(file.kind === 'iphoneBrowser' && file.safariUrl, null);
});

test('Android and computers keep the wallet\'s install page for their browser', () => {
  assert.deepEqual(walletRouteOf(signals(ANDROID_CHROME, { brands: ['Google Chrome'], mobile: true }), PAGE), {
    kind: 'install', browser: 'other', url: 'https://tensorpass.app/wallet',
  });
  assert.deepEqual(walletRouteOf(signals(`${MAC} Version/27.2 Safari/605.1.15`), PAGE), {
    kind: 'install', browser: 'safari', url: 'https://tensorpass.app/wallet?browser=safari',
  });
  const chrome = `${MAC.replace('605.1.15', '537.36')} Chrome/142.0.0.0 Safari/537.36`;
  assert.deepEqual(walletRouteOf(signals(chrome, { brands: ['Google Chrome'] }), PAGE), {
    kind: 'install', browser: 'chrome', url: 'https://tensorpass.app/wallet?browser=chrome',
  });
});

test('an iPad that presents itself as a Mac stays on the computer\'s route', () => {
  assert.equal(iosBrowserOf(`${MAC} Version/17.4 Safari/605.1.15`), null);
  assert.deepEqual(iosBrowserOf(`${IPAD_17} CriOS/142.0 Mobile/15E148 Safari/604.1`), { safari: false, version: 17 });
});
