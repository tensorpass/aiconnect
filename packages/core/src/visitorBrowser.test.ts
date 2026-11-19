import { test } from 'node:test';
import assert from 'node:assert/strict';
import { browserOf, walletInstallUrl, walletStore } from './visitorBrowser.ts';
import type { BrowserSignals } from './visitorBrowser.ts';

const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)';
const CHROME = `${MAC} Chrome/142.0.0.0 Safari/537.36`;

const signals = (userAgent: string, extra: Partial<BrowserSignals> = {}): BrowserSignals => ({
  userAgent, brands: [], brave: false, mobile: false, ...extra,
});

test('each desktop browser is named by its brands, Brave\'s own flag or its user agent', () => {
  const cases: [BrowserSignals, string][] = [
    [signals(CHROME, { brands: ['Chromium', 'Google Chrome', 'Not A Brand'] }), 'chrome'],
    [signals(CHROME), 'chrome'],
    [signals(CHROME.replace('Chrome/', 'HeadlessChrome/'), { brands: ['Chromium', 'Not A Brand'] }), 'chrome'],
    [signals(`${CHROME} Edg/142.0.0.0`), 'edge'],
    [signals(CHROME, { brands: ['Chromium', 'Microsoft Edge'] }), 'edge'],
    [signals(`${CHROME} OPR/124.0.0.0`), 'opera'],
    [signals(CHROME, { brands: ['Chromium', 'Brave'], brave: true }), 'brave'],
    [signals('Mozilla/5.0 (Macintosh; Intel Mac OS X 15.7; rv:145.0) Gecko/20100101 Firefox/145.0'), 'firefox'],
    [signals(`${MAC} Version/27.2 Safari/605.1.15`), 'safari'],
    [signals(`${CHROME} Vivaldi/7.7`), 'other'],
    [signals('Node.js/26'), 'other'],
  ];
  for (const [given, expected] of cases) {
    assert.equal(browserOf(given), expected, given.userAgent);
  }
});

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 27_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ';

test('Safari is named on an iPhone and an iPad, where the wallet runs in it', () => {
  const ipad = IPHONE.replace('iPhone; CPU iPhone OS', 'iPad; CPU OS');
  assert.equal(browserOf(signals(`${IPHONE}Version/27.2 Mobile/15E148 Safari/604.1`)), 'safari');
  assert.equal(browserOf(signals(`${ipad}Version/27.2 Mobile/15E148 Safari/604.1`)), 'safari');
  assert.equal(walletInstallUrl('safari'), 'https://tensorpass.app/wallet?browser=safari');
});

test('any other browser of a phone or a tablet gets the wallet\'s page without a browser', () => {
  const others = [
    `${IPHONE}CriOS/142.0.0.0 Mobile/15E148 Safari/604.1`,
    `${IPHONE}FxiOS/145.0 Mobile/15E148 Safari/605.1.15`,
    `${IPHONE}EdgiOS/142.0.0.0 Version/27.0 Mobile/15E148 Safari/604.1`,
    'Mozilla/5.0 (Linux; U; Android 4.3; en-us) AppleWebKit/534.30 Version/4.0 Mobile Safari/534.30',
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Version/4.0 Chrome/142.0.0.0 Mobile Safari/537.36',
  ];
  for (const userAgent of others) {
    assert.equal(browserOf(signals(userAgent)), 'other', userAgent);
  }
  assert.equal(browserOf(signals(CHROME, { brands: ['Google Chrome'], mobile: true })), 'other');
  assert.equal(walletInstallUrl('other'), 'https://tensorpass.app/wallet');
});

test('each desktop browser with a store listing installs from it', () => {
  const chromeWebStore = 'https://chromewebstore.google.com/detail/ai-wallet/gkmgamdkmlidbjfmheeghkcjdofdafge';
  for (const browser of ['chrome', 'edge', 'brave', 'opera'] as const) {
    assert.equal(walletInstallUrl(browser), chromeWebStore, browser);
    assert.equal(walletStore(browser)?.name, 'Chrome Web Store', browser);
  }
  assert.equal(walletInstallUrl('firefox'), 'https://addons.mozilla.org/en-US/firefox/addon/ai-wallet/');
  assert.equal(walletStore('firefox')?.name, 'Firefox Add-ons');
  assert.equal(walletStore('safari'), null);
  assert.equal(walletStore('other'), null);
});
