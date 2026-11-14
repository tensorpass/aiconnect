import { test } from 'node:test';
import assert from 'node:assert/strict';
import { browserOf, walletInstallUrl } from './visitorBrowser.ts';
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

test('a phone or a tablet installs no extension, so it gets the wallet\'s page without a browser', () => {
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 27_2 like Mac OS X) AppleWebKit/605.1.15 Version/27.2 '
    + 'Mobile/15E148 Safari/604.1';
  assert.equal(browserOf(signals(iphone)), 'other');
  assert.equal(browserOf(signals(CHROME, { brands: ['Google Chrome'], mobile: true })), 'other');
  assert.equal(walletInstallUrl('other'), 'https://tensorpass.app/wallet');
  assert.equal(walletInstallUrl('firefox'), 'https://tensorpass.app/wallet?browser=firefox');
});
