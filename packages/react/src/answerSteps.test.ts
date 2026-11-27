// How the pieces of a streamed answer join: within a step end to end, across a tool call as paragraphs.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appendAnswer } from './answerSteps.ts';

test('pieces of one step join end to end', () => {
  assert.equal(appendAnswer('Let me pull up how it ', 'works.', false), 'Let me pull up how it works.');
});

test('the first piece after a tool call opens a paragraph', () => {
  assert.equal(appendAnswer('Let me pull up how it works.', 'You start with', true),
    'Let me pull up how it works.\n\nYou start with');
});

test('no break before the first words, nor after white space', () => {
  assert.equal(appendAnswer('', 'You start', true), 'You start');
  assert.equal(appendAnswer('Here it is.\n', 'You start', true), 'Here it is.\nYou start');
});
