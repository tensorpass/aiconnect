import assert from 'node:assert/strict';
import { test } from 'node:test';
import { builtInMessages } from './pickerMessages.ts';
import { builtInWebMessages, withAccount } from './webAccountMessages.ts';

test('every language of the connect window words the web accounts, with the account named where it belongs', () => {
  assert.deepEqual(Object.keys(builtInWebMessages), Object.keys(builtInMessages));
  for (const [locale, copy] of Object.entries(builtInWebMessages)) {
    for (const named of [copy.signInWith, copy.signingInTitle, ...Object.values(copy.failures)]) {
      assert.ok(named.includes('{account}'), `${locale}: ${named}`);
    }
    assert.deepEqual(Object.keys(copy.answers), ['tensorpass', 'openrouter']);
    assert.ok(copy.answers.openrouter.includes('OpenRouter') && copy.answers.tensorpass.includes('TensorPass'));
  }
  assert.equal(withAccount(builtInWebMessages.fr.signInWith, 'OpenRouter'), 'Se connecter avec OpenRouter');
});

test('the web accounts\' copy keeps dashes out of the words, as the connect window\'s copy does', () => {
  const words = JSON.stringify(builtInWebMessages);
  assert.doesNotMatch(words, /[–—]| - |--/);
});
