import assert from 'node:assert/strict';
import { test } from 'node:test';
import { modelLabel } from './accountModel.ts';

test('the badge names a TensorPass level by its name and an OpenRouter model by its short name', () => {
  assert.deepEqual(['quick', 'smart', 'expert'].map((level) => modelLabel(level, 'tensorpass')),
    ['Quick', 'Smart', 'Expert']);
  assert.equal(modelLabel('openrouter/auto', 'openrouter'), 'auto');
  assert.equal(modelLabel('anthropic/claude-sonnet-4.5', 'openrouter'), 'claude-sonnet-4.5');
  assert.equal(modelLabel('gpt-5.1'), 'gpt-5.1');
});
