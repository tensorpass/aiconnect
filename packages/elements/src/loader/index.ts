// The small script a page loads in place of the Web Components script when its script budget is
// tight, such as a Shopify app embed, which allows 10 KB. It draws the button of each chat that opens
// over the page at once, in the module's own look, and loads the Web Components script only when the
// visitor reaches for a chat: pointing at its button, focusing it, pressing it, or the site opening
// the chat. A chat or a search bar in the page's flow loads it as it nears the screen. The page puts
// the Web Components script's address on its elements, in `data-elements-src`.

import { MOUNT_CLASS } from '../mount.ts';
import { addPageTokens } from '../pageTokens.ts';
import { loadElements } from './elementsScript.ts';
import { drawStandIn } from './standIn.ts';
import type { StandIn } from './standIn.ts';

const NAMES = ['aiconnect-chat', 'aiconnect-search'];
const OVERLAYS = new Set(['panel', 'popup', 'page']);
const NEAR_SCREEN = '400px';

const report = (error: Error) => console.error(error.message);

// Settles once the element, now defined, has drawn its module, so its own button replaces the
// stand-in with no gap between the two.
function whenDrawn(element: HTMLElement): Promise<void> {
  const mount = element.shadowRoot?.querySelector(`.${MOUNT_CLASS}`);
  if (!mount || mount.childElementCount > 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (mount.childElementCount > 0) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(mount, { childList: true });
  });
}

function loadNearScreen(element: HTMLElement, src: string): void {
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      loadElements(src).catch(report);
    }
  }, { rootMargin: NEAR_SCREEN });
  observer.observe(element);
}

// Whatever starts the load, the element's own button takes the stand-in's place once drawn. A press on
// the stand-in opens the chat once the element is drawn, through its `open` attribute, so the chat opens
// as from its own button, at its question field. A site that opens the chat itself sets the attribute,
// often from its own button, and the element opens on its first drawing. A load that fails leaves the
// stand-in, whose next press tries again.
function prepareOverlay(element: HTMLElement, src: string, variant: string): void {
  const standIn: StandIn | null = element.hasAttribute('hide-launcher') ? null : drawStandIn(element, variant);
  const observer = new MutationObserver(() => {
    if (element.hasAttribute('open')) {
      fetchChat().catch(report);
    }
  });
  const fetchChat = () => loadElements(src).then(() => whenDrawn(element)).then(() => {
    observer.disconnect();
    standIn?.remove();
  });
  if (element.hasAttribute('open')) {
    fetchChat().catch(report);
    return;
  }
  observer.observe(element, { attributes: true, attributeFilter: ['open'] });
  if (!standIn) {
    return;
  }
  for (const intent of ['pointerenter', 'focus', 'touchstart']) {
    standIn.button.addEventListener(intent, () => fetchChat().catch(report), { once: true, passive: true });
  }
  standIn.button.addEventListener('click', () => {
    standIn.busy(true);
    fetchChat().then(() => element.setAttribute('open', ''), (error: Error) => {
      standIn.busy(false);
      report(error);
    });
  });
}

function prepare(element: HTMLElement): void {
  const src = element.dataset.elementsSrc;
  if (!src) {
    console.error(`<${element.localName}> needs data-elements-src, the address of the Web Components script.`);
    return;
  }
  const variant = element.getAttribute('variant') ?? 'inline';
  if (element.localName === 'aiconnect-chat' && OVERLAYS.has(variant)) {
    prepareOverlay(element, src, variant);
  } else {
    loadNearScreen(element, src);
  }
}

function start(): void {
  if (NAMES.every((name) => customElements.get(name))) {
    return;
  }
  const elements = document.querySelectorAll<HTMLElement>(NAMES.join(','));
  if (elements.length > 0) {
    addPageTokens();
    elements.forEach(prepare);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
