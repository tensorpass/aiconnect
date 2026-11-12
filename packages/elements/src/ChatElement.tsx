// `<aiconnect-chat>`: the chat module in one of its four forms, chosen by `variant` (`inline`, the
// default, `panel`, `popup` or `page`). The forms that open over the page follow the `open`
// attribute, which the element sets and clears itself as the visitor opens and closes them, and
// announce each change with an `aiconnect-toggle` event.

import type { ComponentType } from 'react';
import type { ToolSource } from '@tensorpass/aiconnect';
import { AiChatInline, AiChatPage, AiChatPanel, AiChatPopup } from '@tensorpass/aiconnect-react';
import type { AiChatPanelProps } from '@tensorpass/aiconnect-react';
import { moduleProps, SHARED_ATTRIBUTES } from './moduleAttributes.ts';
import { ModuleElement } from './ModuleElement.tsx';

const OVERLAYS: Record<string, ComponentType<AiChatPanelProps>> = {
  panel: AiChatPanel,
  popup: AiChatPopup,
  page: AiChatPage,
};

export class ChatElement extends ModuleElement {
  static observedAttributes = [...SHARED_ATTRIBUTES, 'variant', 'open', 'hide-launcher', 'launcher-label'];

  get open(): boolean {
    return this.hasAttribute('open');
  }

  set open(value: boolean) {
    this.toggleAttribute('open', value);
  }

  show(): void {
    this.open = true;
  }

  hide(): void {
    this.open = false;
  }

  #openChange = (open: boolean): void => {
    this.open = open;
    this.dispatchEvent(new CustomEvent('aiconnect-toggle', { detail: { open }, bubbles: true, composed: true }));
  };

  protected module(tools: ToolSource | undefined) {
    const variant = this.getAttribute('variant') ?? 'inline';
    const props = { ...moduleProps(this), tools };
    if (variant === 'inline') {
      return <AiChatInline {...props} />;
    }
    const Overlay = OVERLAYS[variant];
    if (!Overlay) {
      console.error(`<aiconnect-chat> takes the variant inline, panel, popup or page, not ${variant}.`);
      return null;
    }
    const launcherLabel = this.getAttribute('launcher-label') ?? undefined;
    return (
      <Overlay {...props} open={this.open} onOpenChange={this.#openChange}
        hideLauncher={this.hasAttribute('hide-launcher')} launcherLabel={launcherLabel} />
    );
  }
}
