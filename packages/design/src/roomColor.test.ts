import assert from 'node:assert/strict';
import { test } from 'node:test';
import { roomColor } from './roomColor.ts';

test('the stripe runs from red through orange to green with the room left', () => {
  assert.equal(roomColor(0), 'rgb(229 72 77)');
  assert.equal(roomColor(0.5), 'rgb(245 158 11)');
  assert.equal(roomColor(1), 'rgb(34 180 85)');
  assert.equal(roomColor(0.75), 'rgb(140 169 48)');
});
