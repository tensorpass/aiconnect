import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fitToViewport, lockPageScroll, releaseViewport, VIEWPORT_HEIGHT, VIEWPORT_TOP } from './pageLock.ts';

// A window that scrolls where it is told and calls its scroll listeners, as a browser does after a scroll.
function view(scrollX: number, scrollY: number) {
  const listeners = new Set<() => void>();
  const moves: [number, number][] = [];
  const window = {
    scrollX,
    scrollY,
    moves,
    listeners,
    scrollTo({ left = 0, top = 0, behavior }: ScrollToOptions) {
      assert.equal(behavior, 'instant');
      moves.push([left, top]);
      window.scrollX = left;
      window.scrollY = top;
    },
    addEventListener: (_type: 'scroll', listener: () => void) => void listeners.add(listener),
    removeEventListener: (_type: 'scroll', listener: () => void) => void listeners.delete(listener),
    // A scroll the page's code or the browser makes, then the scroll event.
    scrollBy(y: number) {
      window.scrollY += y;
      listeners.forEach((listener) => listener());
    },
  };
  return window;
}

test('the lock holds the page and gives back the values the site had set', () => {
  const style = { overflow: 'clip', overscrollBehavior: 'auto' };
  const release = lockPageScroll(style, view(0, 120));
  assert.deepEqual(style, { overflow: 'hidden', overscrollBehavior: 'none' });
  release();
  assert.deepEqual(style, { overflow: 'clip', overscrollBehavior: 'auto' });
});

test('the release leaves an inline style the site never set empty', () => {
  const style = { overflow: '', overscrollBehavior: '' };
  lockPageScroll(style, view(0, 0))();
  assert.deepEqual(style, { overflow: '', overscrollBehavior: '' });
});

test('the page stays where the visitor left it while held, and the release stops holding it', () => {
  const page = view(0, 149);
  const release = lockPageScroll({ overflow: '', overscrollBehavior: '' }, page);
  page.scrollBy(300);
  assert.equal(page.scrollY, 149);
  assert.deepEqual(page.moves, [[0, 149]]);
  release();
  assert.equal(page.listeners.size, 0);
  page.scrollBy(300);
  assert.equal(page.scrollY, 449);
  assert.deepEqual(page.moves, [[0, 149]]);
});

test('the release puts back a position the page left without a scroll event', () => {
  const page = view(0, 149);
  const release = lockPageScroll({ overflow: '', overscrollBehavior: '' }, page);
  page.scrollY = 412;
  release();
  assert.deepEqual(page.moves, [[0, 149]]);
});

test('two modules that cover the screen release in turn to the site\'s own values', () => {
  const style = { overflow: 'auto', overscrollBehavior: '' };
  const first = lockPageScroll(style, view(0, 0));
  const second = lockPageScroll(style, view(0, 0));
  second();
  assert.equal(style.overflow, 'hidden');
  first();
  assert.deepEqual(style, { overflow: 'auto', overscrollBehavior: '' });
});

test('the layer follows the visual viewport and lets go of it on release', () => {
  const properties = new Map<string, string>();
  const style = {
    setProperty: (name: string, value: string) => void properties.set(name, value),
    removeProperty: (name: string) => {
      properties.delete(name);
      return '';
    },
  };
  fitToViewport(style, { offsetTop: 0, height: 740 });
  fitToViewport(style, { offsetTop: 96, height: 412.5 });
  assert.deepEqual(Object.fromEntries(properties), { [VIEWPORT_TOP]: '96px', [VIEWPORT_HEIGHT]: '412.5px' });
  releaseViewport(style);
  assert.equal(properties.size, 0);
});
