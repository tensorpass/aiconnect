// The page behind a module that covers the screen: the full page mode always, the panel and the popup on a
// phone. While the module covers it, the page holds its scroll, so a swipe on the module's header or past
// the end of its conversation leaves the page and the browser's address bar in place under the module.
// The module also follows the visual viewport, the part of the page the keyboard leaves visible, so the
// question box stays in view once the keyboard opens.

import { useEffect } from 'react';
import type { RefObject } from 'react';

// The root's inline style the lock sets and gives back.
export interface LockableStyle {
  overflow: string;
  overscrollBehavior: string;
}

// The window whose scroll the lock holds.
export interface ScrollingView {
  scrollX: number;
  scrollY: number;
  scrollTo: (options: ScrollToOptions) => void;
  addEventListener: (type: 'scroll', listener: () => void) => void;
  removeEventListener: (type: 'scroll', listener: () => void) => void;
}

// Holds the page's scroll and returns the release. Hidden overflow stops the visitor's swipes, and no
// overscroll keeps the address bar and the pull to refresh still. A scroll the page's own code or the
// browser makes meanwhile, such as a site's scrollBy or a pan towards a focused field, is put back at
// once, since hidden overflow leaves those possible. The release gives back the inline values the
// site had set and the visitor's scroll position.
export function lockPageScroll(style: LockableStyle, view: ScrollingView): () => void {
  const previous = { overflow: style.overflow, overscrollBehavior: style.overscrollBehavior };
  const { scrollX, scrollY } = view;
  // Instant, so a site's smooth scrolling never shows the page sliding back.
  const hold = () => {
    if (view.scrollX !== scrollX || view.scrollY !== scrollY) {
      view.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
    }
  };
  style.overflow = 'hidden';
  style.overscrollBehavior = 'none';
  view.addEventListener('scroll', hold);
  return () => {
    view.removeEventListener('scroll', hold);
    style.overflow = previous.overflow;
    style.overscrollBehavior = previous.overscrollBehavior;
    hold();
  };
}

export function useScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    return lockPageScroll(document.documentElement.style, window);
  }, [enabled]);
}

// The custom properties forms.css places a covering module with. Without them, the module fills the
// layout viewport as before.
export const VIEWPORT_TOP = '--aic-viewport-top';
export const VIEWPORT_HEIGHT = '--aic-viewport-height';

type LayerStyle = Pick<CSSStyleDeclaration, 'setProperty' | 'removeProperty'>;

export function fitToViewport(style: LayerStyle, viewport: Pick<VisualViewport, 'offsetTop' | 'height'>): void {
  style.setProperty(VIEWPORT_TOP, `${viewport.offsetTop}px`);
  style.setProperty(VIEWPORT_HEIGHT, `${viewport.height}px`);
}

export function releaseViewport(style: LayerStyle): void {
  style.removeProperty(VIEWPORT_TOP);
  style.removeProperty(VIEWPORT_HEIGHT);
}

// Keeps the layer on the visual viewport while it covers the screen. The keyboard shrinks the visual
// viewport and the browser may scroll it, so both events place the layer again.
export function useViewportFit(layerRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const layer = layerRef.current;
    const viewport = window.visualViewport;
    if (!enabled || !layer || !viewport) {
      return undefined;
    }
    const fit = () => fitToViewport(layer.style, viewport);
    fit();
    viewport.addEventListener('resize', fit);
    viewport.addEventListener('scroll', fit);
    return () => {
      viewport.removeEventListener('resize', fit);
      viewport.removeEventListener('scroll', fit);
      releaseViewport(layer.style);
    };
  }, [layerRef, enabled]);
}

// Everything a module does while it covers the screen.
export function useCoveringLayer(layerRef: RefObject<HTMLElement | null>, covers: boolean) {
  useScrollLock(covers);
  useViewportFit(layerRef, covers);
}
