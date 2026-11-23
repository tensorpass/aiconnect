import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PreparedAttachment } from '@tensorpass/aiconnect/attachments';
import { attachmentList, heldBytes, readyAttachments, stillReading } from './attachmentList.ts';
import type { AttachmentItem } from './attachmentList.ts';
import { fileSize } from './fileSize.ts';

const photo: PreparedAttachment = {
  name: 'cat.jpg', size: 4_000_000, kind: 'image', bytes: 300_000,
  part: { type: 'image', url: 'data:image/webp;base64,' },
};
const reading = (id: string): AttachmentItem => ({
  id, name: `${id}.jpg`, size: 4_000_000, kind: 'image', prepared: null,
});

test('a file is read, then ready, and counts its prepared size', () => {
  let items = attachmentList([], { type: 'add', item: reading('a') });
  items = attachmentList(items, { type: 'add', item: reading('b') });
  assert.equal(stillReading(items), true);
  items = attachmentList(items, { type: 'ready', id: 'a', prepared: photo });
  assert.deepEqual(readyAttachments(items), [photo]);
  assert.equal(heldBytes(items), 300_000);
  assert.equal(heldBytes(items, 'a'), 0);
  items = attachmentList(items, { type: 'remove', id: 'b' });
  assert.equal(stillReading(items), false);
  assert.deepEqual(attachmentList(items, { type: 'clear' }), []);
});

test('sizes read in the module\'s language', () => {
  assert.equal(fileSize(300_000, 'en'), '293 kB');
  assert.equal(fileSize(5 * 1024 * 1024, 'en'), '5 MB');
  assert.equal(fileSize(1_572_864, 'fr'), '1,5\u202fMo');
});
