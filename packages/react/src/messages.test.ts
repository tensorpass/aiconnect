import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WalletRequestError } from '@tensorpass/aiconnect';
import { builtInModuleMessages, failedAnswerText } from './messages.ts';

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
