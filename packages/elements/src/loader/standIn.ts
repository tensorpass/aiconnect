// The button a chat that opens over the page shows before the Web Components script arrives: the
// button the module itself draws, from the module's stylesheet and copy, in a shadow root of its own
// placed just before the element. The floating button of a popup sits at the page's corner; the
// button of a side panel or a full page sits where the site renders the element.

import { builtInLauncherMessages, WAVE_ARCS, WAVE_STROKE_WIDTH } from '@tensorpass/aiconnect-react/launcher';
import type { LauncherLocale, LauncherMessages } from '@tensorpass/aiconnect-react/launcher';
import launcherStyles from '@tensorpass/aiconnect-react/launchers.css';

const HOST_STYLE = ':host{display:inline-block}:host([data-variant=popup]){display:contents}';
const SVG = 'http://www.w3.org/2000/svg';

export interface StandIn {
  button: HTMLButtonElement;
  // Shows that the chat is on its way: the popup's ripples, or a busy launcher.
  busy(on: boolean): void;
  remove(): void;
}

function copyOf(element: HTMLElement): LauncherMessages {
  const locale = element.getAttribute('locale') ?? 'en';
  return builtInLauncherMessages[locale in builtInLauncherMessages ? locale as LauncherLocale : 'en'];
}

function labelOf(element: HTMLElement, variant: string, copy: LauncherMessages): string {
  const own = element.getAttribute('launcher-label');
  if (own) {
    return own;
  }
  if (variant === 'popup') {
    return copy.openChat;
  }
  return element.getAttribute('heading') ?? (variant === 'page' ? copy.pageTitle : copy.title);
}

function waveMark(size: number, className: string): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  const attributes = {
    class: className, width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    'stroke-width': WAVE_STROKE_WIDTH, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'aria-hidden': 'true', focusable: 'false',
  };
  for (const [name, value] of Object.entries(attributes)) {
    svg.setAttribute(name, String(value));
  }
  for (const arc of WAVE_ARCS) {
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', arc);
    svg.append(path);
  }
  return svg;
}

function buttonFor(element: HTMLElement, variant: string): HTMLButtonElement {
  const copy = copyOf(element);
  const label = labelOf(element, variant, copy);
  const button = document.createElement('button');
  button.type = 'button';
  button.dir = copy.dir;
  button.setAttribute('aria-expanded', 'false');
  if (variant === 'popup') {
    button.className = 'aic-fab';
    button.title = label;
    button.setAttribute('aria-label', label);
    button.append(waveMark(26, 'aic-fab-wave'));
  } else {
    button.className = 'aic-launcher';
    button.append(waveMark(18, 'aic-launcher-mark'), label);
  }
  return button;
}

export function drawStandIn(element: HTMLElement, variant: string): StandIn {
  const host = document.createElement('span');
  host.dataset.variant = variant;
  const style = document.createElement('style');
  style.textContent = `${launcherStyles}${HOST_STYLE}`;
  const button = buttonFor(element, variant);
  host.attachShadow({ mode: 'open' }).append(style, button);
  element.before(host);
  return {
    button,
    busy(on) {
      if (variant === 'popup') {
        button.toggleAttribute('data-live', on);
      } else {
        button.setAttribute('aria-busy', String(on));
      }
    },
    remove: () => host.remove(),
  };
}
