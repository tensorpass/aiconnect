import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WalletRequestError } from '@tensorpass/aiconnect';
import {
  alreadyAddedLine, builtInMessages, builtInModuleMessages, failedAnswerText, installLabel, installText,
} from './messages.ts';

const en = builtInModuleMessages.en;

test('a 429 says the account reached its usage limit, a 5xx that its provider is down', () => {
  const limit = failedAnswerText(new WalletRequestError('ChatGPT answered 429', 429), 'ChatGPT', en);
  assert.match(limit, /^ChatGPT has reached its usage limit for now\. Try again later, or choose another account/);
  const down = failedAnswerText(new WalletRequestError('Claude answered 503', 503), 'Claude', en);
  assert.equal(down, 'Claude is not answering right now. Try again in a moment.');
});

test('the wallet\'s own copy of the error is read by its status', () => {
  const fromWallet = Object.assign(new Error('ChatGPT answered 429'), { status: 429 });
  assert.match(failedAnswerText(fromWallet, 'ChatGPT', en), /usage limit/);
});

test('a failure the wallet words itself keeps its message', () => {
  const locked = new WalletRequestError('AI Wallet is locked', 403);
  assert.equal(failedAnswerText(locked, 'ChatGPT', en), 'AI Wallet is locked');
  assert.equal(failedAnswerText(new Error('network down'), 'ChatGPT', en), 'network down');
});

test('in Safari the install step tells a visitor who added the wallet how to allow it on every website', () => {
  for (const messages of Object.values(builtInMessages)) {
    const line = alreadyAddedLine(messages, 'safari');
    assert.ok(line?.includes('AI Wallet') && line.includes('Safari'), line);
  }
  assert.equal(
    alreadyAddedLine(builtInMessages.en, 'safari'),
    'Already added? Click AI Wallet in Safari\'s toolbar and choose Always Allow on Every Website.',
  );
});

test('a browser that runs the wallet everywhere once it is added shows no such line', () => {
  for (const browser of ['chrome', 'edge', 'brave', 'opera', 'firefox', 'other'] as const) {
    assert.equal(alreadyAddedLine(builtInMessages.en, browser), undefined, browser);
  }
});

test('the install step names the visitor\'s browser, or says their browser for one the wallet does not name', () => {
  assert.equal(
    installText(builtInMessages.en, 'chrome'),
    'Add AI Wallet to Chrome and this site answers with the AI plan you already pay for: ChatGPT, Claude, Gemini, '
      + 'Grok and more.',
  );
  assert.match(installText(builtInMessages.en, 'other'), /^Add AI Wallet to your browser and this site answers/);
  assert.match(installText(builtInMessages.fr, 'firefox'), /^Ajoutez AI Wallet à Firefox et ce site répond/);
  for (const messages of Object.values(builtInMessages)) {
    const named = installText(messages, 'edge');
    const unnamed = installText(messages, 'other');
    assert.ok(named.includes('Edge') && named.includes('ChatGPT') && named.includes('Grok'), named);
    assert.ok(!/Chrome|Edge|Brave|Opera|Firefox|Safari/.test(unnamed) && unnamed.includes('Gemini'), unnamed);
  }
});

test('the install button names the visitor\'s browser, or installs the wallet in a browser it does not name', () => {
  assert.equal(installLabel(builtInMessages.en, 'brave'), 'Add to Brave');
  assert.equal(installLabel(builtInMessages.en, 'other'), 'Install AI Wallet');
});
