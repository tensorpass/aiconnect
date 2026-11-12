// How a module that floats over the page opens and closes: the open state, kept by the site or by
// the module; Escape to close, which the connect window takes first while it is open; focus moved
// to the question box on open and back to the module's button on close. The full page mode also
// holds the page's scroll and keeps the focus inside while it is open.

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useAiConnect } from '../AiConnectProvider.tsx';
import type { AiOverlayProps } from './types.ts';

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, [tabindex]:not([tabindex="-1"])';

export interface OverlayRefs {
  layerRef: RefObject<HTMLElement | null>;
  fieldRef: RefObject<HTMLTextAreaElement | null>;
  launcherRef: RefObject<HTMLButtonElement | null>;
}

function useOpenState({ open, defaultOpen = false, onOpenChange }: AiOverlayProps) {
  const [own, setOwn] = useState(defaultOpen);
  const setOpen = useCallback((next: boolean) => {
    setOwn(next);
    onOpenChange?.(next);
  }, [onOpenChange]);
  return [open ?? own, setOpen] as const;
}

function useEscape(open: boolean, close: () => void) {
  const { isPickerOpen } = useAiConnect();
  useEffect(() => {
    if (!open || isPickerOpen) {
      return undefined;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, isPickerOpen, close]);
}

// On open the focus moves to the question box; on close it goes back to the module's button, or, for a
// module the site opened from its own control, to the element that held it before.
function useFocusOnOpen(open: boolean, { layerRef, fieldRef, launcherRef }: OverlayRefs) {
  const wasOpen = useRef(open);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open === wasOpen.current) {
      return;
    }
    wasOpen.current = open;
    if (open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      (fieldRef.current ?? layerRef.current)?.focus();
    } else {
      (launcherRef.current ?? opener.current)?.focus();
    }
  }, [open, layerRef, fieldRef, launcherRef]);
}

// The element with focus, read from the layer's own root so it works inside a shadow root too.
function activeElement(layer: HTMLElement): Element | null {
  return (layer.getRootNode() as Document | ShadowRoot).activeElement;
}

export function useFocusTrap(layerRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const layer = layerRef.current;
    if (!enabled || !layer) {
      return undefined;
    }
    const onKey = (event: KeyboardEvent) => {
      const focusable = [...layer.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (event.key !== 'Tab' || focusable.length === 0) {
        return;
      }
      const edge = event.shiftKey ? focusable[0] : focusable[focusable.length - 1];
      if (activeElement(layer) === edge) {
        event.preventDefault();
        (event.shiftKey ? focusable[focusable.length - 1] : focusable[0]).focus();
      }
    };
    layer.addEventListener('keydown', onKey);
    return () => layer.removeEventListener('keydown', onKey);
  }, [layerRef, enabled]);
}

export function useScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = previous;
    };
  }, [enabled]);
}

export function useOverlay(props: AiOverlayProps) {
  const [open, setOpen] = useOpenState(props);
  const layerRef = useRef<HTMLElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const layerId = useId();
  const show = useCallback(() => setOpen(true), [setOpen]);
  const close = useCallback(() => setOpen(false), [setOpen]);
  const toggle = useCallback(() => setOpen(!open), [setOpen, open]);
  useEscape(open, close);
  useFocusOnOpen(open, { layerRef, fieldRef, launcherRef });
  return { open, show, close, toggle, layerRef, fieldRef, launcherRef, titleId, layerId };
}
