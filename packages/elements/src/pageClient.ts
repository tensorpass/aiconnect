// The one AiConnect client the elements of a page share, so every element follows the same connection
// to the visitor's AI. The first element on the page creates it, with the site's TensorPass site key: the
// element's `site-key` attribute, or `data-site-key` on the script tag that loads the elements or the
// loader. Without a key, a visitor without the wallet is offered OpenRouter alone.

import { AiConnect } from '@tensorpass/aiconnect';

let client: AiConnect | null = null;

function siteKeyOf(element: HTMLElement): string | undefined {
  const fromScript = document.querySelector<HTMLScriptElement>('script[data-site-key]')?.dataset.siteKey;
  return element.getAttribute('site-key') || fromScript || undefined;
}

export function pageClient(element: HTMLElement): AiConnect {
  client ??= new AiConnect({ siteKey: siteKeyOf(element) });
  return client;
}
