// The media conditions the modules that float over the page follow: whether the screen is narrow enough
// for the panel and the popup to cover it, and whether the visitor points by touch. A condition is read
// as a store, so a module follows a resize or a rotation while it is open.

import { useMemo, useSyncExternalStore } from 'react';

// The width under which the panel and the popup take the whole screen, the breakpoint of forms.css.
export const COVERS_SCREEN = '(max-width: 640px)';

// A touch screen, where focusing the question box opens the keyboard.
export const COARSE_POINTER = '(pointer: coarse)';

type MatchMedia = (query: string) => Pick<MediaQueryList, 'matches' | 'addEventListener' | 'removeEventListener'>;

export interface MediaQueryStore {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => boolean;
}

export function mediaQueryStore(matchMedia: MatchMedia, query: string): MediaQueryStore {
  return {
    subscribe: (onChange) => {
      const list = matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    getSnapshot: () => matchMedia(query).matches,
  };
}

// Whether the page matches the query now. A page rendered on the server matches none, and the module
// follows the browser's answer once it hydrates.
export function useMediaQuery(query: string): boolean {
  const store = useMemo(() => mediaQueryStore((text) => window.matchMedia(text), query), [query]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => false);
}

// Read once, when a module opens: a module opened by touch keeps the keyboard closed until the visitor
// taps the question box.
export function pointsByTouch(): boolean {
  return window.matchMedia(COARSE_POINTER).matches;
}
