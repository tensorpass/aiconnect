// AI Connect's interface modules as custom elements, for pages without React such as WordPress
// pages: `<aiconnect-chat>` in its four forms and `<aiconnect-search>`. The one script tag that
// loads this file defines both, once, however many times the page includes it.

import { ChatElement } from './ChatElement.tsx';
import { SearchElement } from './SearchElement.tsx';

const ELEMENTS: [string, CustomElementConstructor][] = [
  ['aiconnect-chat', ChatElement],
  ['aiconnect-search', SearchElement],
];

for (const [name, element] of ELEMENTS) {
  if (!customElements.get(name)) {
    customElements.define(name, element);
  }
}
