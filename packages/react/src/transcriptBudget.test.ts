import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ChatMessage } from '@tensorpass/aiconnect';
import { withinRequestBudget } from './transcriptBudget.ts';

const image = (size: number) => ({ type: 'image' as const, url: `data:image/webp;base64,${'A'.repeat(size)}` });
const pdf = { type: 'file' as const, name: 'menu.pdf', url: `data:application/pdf;base64,${'B'.repeat(500)}` };

test('keeps a conversation that fits as it is', () => {
  const messages: ChatMessage[] = [{ role: 'system', content: 'Help' }, { role: 'user', content: [image(10)] }];
  assert.equal(withinRequestBudget(messages, 1000), messages);
});

test('replaces the oldest attachments with notes until the request fits, and keeps the last question', () => {
  const messages: ChatMessage[] = [
    { role: 'system', content: 'Help' },
    { role: 'user', content: [{ type: 'text', text: 'Look' }, image(600), pdf] },
    { role: 'assistant', content: 'A cat' },
    { role: 'user', content: [image(600)] },
  ];
  const fitted = withinRequestBudget(messages, 1000);
  assert.deepEqual(fitted[1], {
    role: 'user',
    content: [
      { type: 'text', text: 'Look' },
      { type: 'text', text: '[An image the visitor attached earlier]' },
      { type: 'text', text: '[menu.pdf, a file the visitor attached earlier]' },
    ],
  });
  assert.deepEqual(fitted[3], messages[3]);
});
