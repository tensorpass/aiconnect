import assert from 'node:assert/strict';
import { test } from 'node:test';
import { acceptsType, attachmentsOn, checkAttachment, fitsQuestion, mediaTypeOf } from './attachmentPolicy.ts';


test('reads a Markdown or CSV file the browser left untyped from its extension', () => {
  assert.equal(mediaTypeOf({ name: 'notes.md', type: '' }), 'text/markdown');
  assert.equal(mediaTypeOf({ name: 'data.CSV', type: 'application/vnd.ms-excel' }), 'text/csv');
  assert.equal(mediaTypeOf({ name: 'photo.jpg', type: 'image/jpeg' }), 'image/jpeg');
});

test('takes images, PDFs and text files, and refuses other types', () => {
  assert.deepEqual(checkAttachment({ name: 'a.png', type: 'image/png', size: 10 }, {}, 0),
    { ok: true, kind: 'image', mediaType: 'image/png' });
  assert.equal(checkAttachment({ name: 'a.pdf', type: 'application/pdf', size: 10 }, {}, 0).ok, true);
  assert.deepEqual(checkAttachment({ name: 'a.zip', type: 'application/zip', size: 10 }, {}, 0),
    { ok: false, refusal: 'type' });
});

test('follows the site\'s kinds and types', () => {
  const pdf = { name: 'a.pdf', type: 'application/pdf', size: 10 };
  assert.deepEqual(checkAttachment(pdf, { files: false }, 0), { ok: false, refusal: 'type' });
  assert.equal(acceptsType('image/png', { accept: ['image/*'] }), true);
  assert.equal(acceptsType('application/pdf', { accept: ['image/*'] }), false);
});

test('caps the count of files, the size the page reads and the size of a question', () => {
  const image = { name: 'a.png', type: 'image/png', size: 600 };
  assert.deepEqual(checkAttachment(image, { maxFiles: 2 }, 2), { ok: false, refusal: 'count' });
  const huge = { ...image, size: 60 * 1024 * 1024 };
  assert.deepEqual(checkAttachment(huge, {}, 0), { ok: false, refusal: 'size' });
  assert.equal(fitsQuestion(500, 600, { maxBytes: 1000 }), false);
  assert.equal(fitsQuestion(400, 600, { maxBytes: 1000 }), true);
});

test('is off without a policy or with both kinds off', () => {
  assert.equal(attachmentsOn(undefined), false);
  assert.equal(attachmentsOn({}), true);
  assert.equal(attachmentsOn({ images: false, files: false }), false);
});
