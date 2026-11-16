// The one AiConnect client the elements of a page share, so every element follows the same connection
// to the visitor's AI. The first element on the page creates it, with the site's TensorPass site key and
// its sign in return page: the element's `site-key` and `sign-in-callback` attributes, or `data-site-key`
// and `data-sign-in-callback` on the script tag that loads the elements or the loader. Without a key, a
// visitor without the wallet is offered OpenRouter alone; without a return page, the sign ins come back
// to the page itself.

import { AiConnect } from '@tensorpass/aiconnect';

let client: AiConnect | null = null;

// The element's attribute, or else the data attribute of the same name on a script tag of the page.
function settingOf(element: HTMLElement, attribute: string): string | undefined {
  const fromScript = document.querySelector(`script[data-${attribute}]`)?.getAttribute(`data-${attribute}`);
  return element.getAttribute(attribute) || fromScript || undefined;
}

export function pageClient(element: HTMLElement): AiConnect {
  client ??= new AiConnect({
    siteKey: settingOf(element, 'site-key'),
    signInCallback: settingOf(element, 'sign-in-callback'),
  });
  return client;
}
