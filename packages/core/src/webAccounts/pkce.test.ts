import assert from 'node:assert/strict';
import { test } from 'node:test';
import { challengeFor, randomToken } from './pkce.ts';

test('the S256 challenge matches the example of RFC 7636', async () => {
  const challenge = await challengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk');
  assert.equal(challenge, 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});

test('a random token is base64url without padding and new each time', () => {
  const verifier = randomToken();
  assert.match(verifier, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(randomToken(), verifier);
  assert.match(randomToken(16), /^[A-Za-z0-9_-]{22}$/);
});
