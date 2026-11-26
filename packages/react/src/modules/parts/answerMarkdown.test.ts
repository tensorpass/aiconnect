// The answer's light Markdown: what reads as formatting, what stays text while it streams, and the
// links a module refuses to draw.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { answerBlocks, inlineRuns, keepAllowedLinks } from './answerMarkdown.ts';

test('bold, italic, code and links become runs, the rest stays text', () => {
  assert.deepEqual(inlineRuns('Try **Piranesi**, a *calm* read: `search_books` [more](https://example.com/p).'), [
    { kind: 'text', text: 'Try ' },
    { kind: 'strong', runs: [{ kind: 'text', text: 'Piranesi' }] },
    { kind: 'text', text: ', a ' },
    { kind: 'em', runs: [{ kind: 'text', text: 'calm' }] },
    { kind: 'text', text: ' read: ' },
    { kind: 'code', text: 'search_books' },
    { kind: 'text', text: ' ' },
    { kind: 'link', text: 'more', href: 'https://example.com/p' },
    { kind: 'text', text: '.' },
  ]);
});

test('a bare address becomes a link labelled with its host and path, without the closing punctuation', () => {
  assert.deepEqual(inlineRuns('Start here: https://www.llb-auction.com/valuation.'), [
    { kind: 'text', text: 'Start here: ' },
    { kind: 'link', text: 'llb-auction.com/valuation', href: 'https://www.llb-auction.com/valuation' },
    { kind: 'text', text: '.' },
  ]);
  assert.deepEqual(inlineRuns('(www.example.com/menu/)'), [
    { kind: 'text', text: '(' },
    { kind: 'link', text: 'example.com/menu', href: 'https://www.example.com/menu/' },
    { kind: 'text', text: ')' },
  ]);
});

test('a long address is cut in its label and kept whole in its link', () => {
  const href = 'https://example.com/sales/2026/modern-and-contemporary-art/lot-118?ref=chat';
  const [run] = inlineRuns(href);
  assert.equal(run.kind === 'link' && run.href, href);
  assert.equal(run.kind === 'link' && run.text, 'example.com/sales/2026/modern-and-conte…');
});

test('a link inside bold or italic text stays a link', () => {
  assert.deepEqual(inlineRuns('**[Free valuation](https://example.com/valuation)** or *https://example.com/sell*'), [
    { kind: 'strong', runs: [{ kind: 'link', text: 'Free valuation', href: 'https://example.com/valuation' }] },
    { kind: 'text', text: ' or ' },
    { kind: 'em', runs: [{ kind: 'link', text: 'example.com/sell', href: 'https://example.com/sell' }] },
  ]);
});

test('a mark the stream has not closed yet stays plain text', () => {
  assert.deepEqual(inlineRuns('Try **Pira'), [{ kind: 'text', text: 'Try **Pira' }]);
});

test('a link to a script or another scheme is kept as its text', () => {
  assert.deepEqual(inlineRuns('[open](javascript:void)'), [{ kind: 'text', text: '[open](javascript:void)' }]);
  assert.deepEqual(inlineRuns('[home](//evil.example)'), [{ kind: 'text', text: '[home](//evil.example)' }]);
  assert.deepEqual(inlineRuns('[book](/books/piranesi)'), [{ kind: 'link', text: 'book', href: '/books/piranesi' }]);
});

test('an address that leaves the site once the browser resolves it is kept as its text', () => {
  const leaving = [
    '/\\evil.example/', '\\\\evil.example', '/\t/evil.example', 'https:/\\evil.example', 'data:text/html,x',
  ];
  for (const href of leaving) {
    assert.deepEqual(inlineRuns(`[open](${href})`).map((run) => run.kind), ['text'], href);
  }
  assert.deepEqual(inlineRuns('[top](#top) [up](../a)').filter((run) => run.kind === 'link').length, 2);
});

test('lines group into paragraphs, headings and lists', () => {
  const blocks = answerBlocks('## Tonight\nTwo calm books:\n\n1. **Piranesi**\n2. Gilead\n- short\n\nEnjoy.\nBye');
  assert.deepEqual(blocks.map((block) => block.kind), ['heading', 'paragraph', 'list', 'list', 'paragraph']);
  const [, , numbered, bullets, closing] = blocks;
  assert.equal(numbered.kind === 'list' && numbered.ordered && numbered.items.length, 2);
  assert.equal(bullets.kind === 'list' && !bullets.ordered && bullets.items.length, 1);
  assert.deepEqual(closing.kind === 'paragraph' && closing.runs, [
    { kind: 'text', text: 'Enjoy.' },
    { kind: 'text', text: '\n' },
    { kind: 'text', text: 'Bye' },
  ]);
});

test('an image is never drawn: its description stays as text, and its address is dropped', () => {
  assert.deepEqual(inlineRuns('Status ![verified](https://attacker.example/p.png?d=1) ok'), [
    { kind: 'text', text: 'Status ' },
    { kind: 'text', text: 'verified' },
    { kind: 'text', text: ' ok' },
  ]);
});

test('a link the guards do not allow stays as its words, in paragraphs and in lists', () => {
  const blocks = answerBlocks('See [menu](https://cafe.example/menu) or [verify](https://attacker.example/?d=1)\n'
    + '- [verify](https://attacker.example/?d=2)');
  const allowed = (href: string) => href.startsWith('https://cafe.example/');
  const [paragraph, list] = keepAllowedLinks(blocks, allowed);
  assert.deepEqual(paragraph.kind === 'paragraph' && paragraph.runs, [
    { kind: 'text', text: 'See ' },
    { kind: 'link', text: 'menu', href: 'https://cafe.example/menu' },
    { kind: 'text', text: ' or ' },
    { kind: 'text', text: 'verify' },
  ]);
  assert.deepEqual(list.kind === 'list' && list.items, [[{ kind: 'text', text: 'verify' }]]);
});

test('a bare address the guards do not allow stays as its words, inside bold text too', () => {
  const blocks = answerBlocks('Go to **https://attacker.example/x** or https://cafe.example/menu');
  const [paragraph] = keepAllowedLinks(blocks, (href) => href.startsWith('https://cafe.example/'));
  assert.deepEqual(paragraph.kind === 'paragraph' && paragraph.runs, [
    { kind: 'text', text: 'Go to ' },
    { kind: 'strong', runs: [{ kind: 'text', text: 'attacker.example/x' }] },
    { kind: 'text', text: ' or ' },
    { kind: 'link', text: 'cafe.example/menu', href: 'https://cafe.example/menu' },
  ]);
});
