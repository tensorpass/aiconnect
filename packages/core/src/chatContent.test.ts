import assert from 'node:assert/strict';
import { test } from 'node:test';
import { attachedText, decodeBase64Text, encodeBase64Text, fileText, isTextFile, textOf } from './chatContent.ts';

test('encodes and decodes text in every script', () => {
  for (const text of ['Bonjour é', 'שלום עולם', 'مرحبا بالعالم', '你好']) {
    assert.equal(decodeBase64Text(encodeBase64Text(text)), text);
  }
});

test('reads the text of a text file and none of a PDF', () => {
  const csv = { type: 'file' as const, name: 'a.csv', url: `data:text/csv;base64,${encodeBase64Text('a,b')}` };
  const pdf = { type: 'file' as const, name: 'a.pdf', url: 'data:application/pdf;base64,JVBERi0' };
  assert.equal(fileText(csv), 'a,b');
  assert.equal(fileText(pdf), null);
  assert.deepEqual(attachedText([{ type: 'text', text: 'hi' }, csv, pdf]), ['a,b']);
  assert.equal(textOf([{ type: 'text', text: 'hi' }, csv]), 'hi');
});

test('knows the text file types', () => {
  assert.equal(isTextFile('text/markdown'), true);
  assert.equal(isTextFile('application/json'), true);
  assert.equal(isTextFile('application/pdf'), false);
});
