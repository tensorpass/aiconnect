// `<aiconnect-search>`: the search bar that answers, with the answer streaming in a card under it.

import type { ToolSource } from '@tensorpass/aiconnect';
import { AiSearch } from '@tensorpass/aiconnect-react';
import { moduleProps, SHARED_ATTRIBUTES } from './moduleAttributes.ts';
import { ModuleElement } from './ModuleElement.tsx';

export class SearchElement extends ModuleElement {
  static observedAttributes = SHARED_ATTRIBUTES;

  protected module(tools: ToolSource | undefined) {
    return <AiSearch {...moduleProps(this)} tools={tools} />;
  }
}
