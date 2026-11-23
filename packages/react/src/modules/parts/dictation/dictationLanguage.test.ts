import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dictationLanguage } from './dictationLanguage.ts';

test('takes the region of the visitor\'s own language', () => {
  assert.equal(dictationLanguage('ar', ['fr-FR', 'ar-MA', 'en']), 'ar-MA');
  assert.equal(dictationLanguage('he', ['he-IL', 'en-US']), 'he-IL');
});

test('falls to the language\'s most spoken region without one', () => {
  assert.equal(dictationLanguage('fr', ['en-US', 'fr']), 'fr-FR');
  assert.equal(dictationLanguage('zh', []), 'zh-CN');
});
