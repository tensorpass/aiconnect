import assert from 'node:assert/strict';
import { test } from 'node:test';
import { builtInMessages } from './messages.ts';
import { linkTarget, walletStep } from './walletStep.ts';

const en = builtInMessages.en;
const APP_URL = 'https://tensorpass.app/open?url=https%3A%2F%2Fshop.example%2F';

test('a computer gets one install link for its browser, opened beside the site', () => {
  const step = walletStep({ kind: 'install', browser: 'firefox', url: 'https://tensorpass.app/wallet?browser=firefox' },
    en);
  assert.equal(step.title, en.installTitle);
  assert.equal(step.text, en.installText('Firefox'));
  assert.deepEqual(step.links.map(({ label, newTab, marks }) => [label, newTab, marks]), [
    ['Add to Firefox', true, true],
  ]);
  assert.deepEqual(linkTarget(step.links[0]), { target: '_blank', rel: 'noreferrer' });
  assert.equal(step.aside, undefined);
});

test('Safari, on a Mac as on an iPhone, tells a visitor who already added the wallet how to allow it', () => {
  const mac = walletStep({ kind: 'install', browser: 'safari', url: 'https://tensorpass.app/wallet?browser=safari' },
    en);
  const iphone = walletStep({ kind: 'iphoneSafari', appUrl: 'https://tensorpass.app/wallet?browser=safari' }, en);
  assert.equal(mac.aside, en.safariAlreadyAdded);
  assert.equal(iphone.aside, en.safariAlreadyAdded);
});

test('Safari on an iPhone gets the app, and another browser hands the page to Safari then to the app', () => {
  const safari = walletStep({ kind: 'iphoneSafari', appUrl: 'https://tensorpass.app/wallet?browser=safari' }, en);
  assert.deepEqual(safari.links.map(({ label, marks }) => [label, marks]), [['Get the AI Wallet app', false]]);
  const other = walletStep({ kind: 'iphoneBrowser', safariUrl: 'x-safari-https://shop.example/', appUrl: APP_URL },
    en);
  assert.equal(other.title, 'Continue in Safari or in AI Wallet');
  assert.equal(other.aside, undefined);
  assert.deepEqual(other.links.map(({ label, href, newTab, secondary }) => [label, href, newTab, secondary]), [
    ['Open in Safari', 'x-safari-https://shop.example/', false, false],
    ['Open in AI Wallet', APP_URL, false, true],
  ]);
  assert.deepEqual(linkTarget(other.links[1]), {});
});

test('before iOS 17 another browser hands the page to the app alone', () => {
  const step = walletStep({ kind: 'iphoneBrowser', safariUrl: null, appUrl: APP_URL }, en);
  assert.equal(step.title, 'Continue in AI Wallet');
  assert.deepEqual(step.links.map(({ label }) => label), ['Open in AI Wallet']);
});

test('every language words the phone step without naming an extension or a reload', () => {
  for (const [locale, messages] of Object.entries(builtInMessages)) {
    for (const [key, text] of Object.entries(messages.phone)) {
      assert.ok(text.length > 0, `${locale}.${key}`);
      assert.doesNotMatch(text, /extension|reload|recharg|תוסף|إضافة|扩展|\s[-–—]\s|--/i, `${locale}.${key}`);
    }
  }
});
