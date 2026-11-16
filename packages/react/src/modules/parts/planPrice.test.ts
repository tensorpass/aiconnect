import assert from 'node:assert/strict';
import { test } from 'node:test';
import { priceText } from './planPrice.ts';

test('a plan price reads from cents in the page\'s language', () => {
  assert.equal(priceText({ amount: 2000, currency: 'USD' }, 'en'), '$20.00');
  assert.equal(priceText({ amount: 500, currency: 'USD' }, 'fr').replace(/\s/g, ' '), '5,00 $US');
  assert.equal(priceText({ amount: 500, currency: 'JPY' }, 'en'), '¥500');
});
