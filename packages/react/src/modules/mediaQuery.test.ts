import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COVERS_SCREEN, mediaQueryStore } from './mediaQuery.ts';

// A screen whose width the test turns, as a resize or a rotation does, with the 640 pixel breakpoint.
function screen(width: number) {
  const listeners = new Set<() => void>();
  const state = { width };
  const matchMedia = (query: string) => {
    assert.equal(query, COVERS_SCREEN);
    return {
      matches: state.width <= 640,
      addEventListener: (_type: string, listener: () => void) => void listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => void listeners.delete(listener),
    };
  };
  const turn = (next: number) => {
    state.width = next;
    listeners.forEach((listener) => listener());
  };
  return { matchMedia: matchMedia as never, turn, listeners };
}

test('the panel covers a phone up to 640 pixels and leaves a wider screen usable', () => {
  assert.equal(mediaQueryStore(screen(360).matchMedia, COVERS_SCREEN).getSnapshot(), true);
  assert.equal(mediaQueryStore(screen(640).matchMedia, COVERS_SCREEN).getSnapshot(), true);
  assert.equal(mediaQueryStore(screen(820).matchMedia, COVERS_SCREEN).getSnapshot(), false);
});

test('a rotation reaches the module, which stops listening once it unsubscribes', () => {
  const phone = screen(360);
  const store = mediaQueryStore(phone.matchMedia, COVERS_SCREEN);
  const seen: boolean[] = [];
  const unsubscribe = store.subscribe(() => seen.push(store.getSnapshot()));
  phone.turn(780);
  phone.turn(360);
  assert.deepEqual(seen, [false, true]);
  unsubscribe();
  assert.equal(phone.listeners.size, 0);
});
