// The base of the AI Connect elements: an open shadow root holding the modules' stylesheet and a
// React root, drawn again whenever an observed attribute or the `tools` property changes. The shadow
// root keeps the page's own element styles out of the module, while the page's --aic-* tokens reach
// in by inheritance. Every element of the page shares one connection to the visitor's AI.

import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import type { ToolSource } from '@tensorpass/aiconnect';
import { AiConnectProvider } from '@tensorpass/aiconnect-react';
import moduleStyles from '@tensorpass/aiconnect-react/styles.css';
import hostStyles from './host.css';
import { localeOf } from './moduleAttributes.ts';
import { MOUNT_CLASS } from './mount.ts';
import { pageClient } from './pageClient.ts';
import { addPageTokens } from './pageTokens.ts';

export abstract class ModuleElement extends HTMLElement {
  #root: Root | null = null;
  #tools: ToolSource | undefined;
  readonly #mount: HTMLDivElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `${moduleStyles}\n${hostStyles}`;
    this.#mount = document.createElement('div');
    this.#mount.className = MOUNT_CLASS;
    shadow.append(style, this.#mount);
  }

  // The site's tools as an object with `listTools` and `callTool`, for a page without an MCP server.
  get tools(): ToolSource | undefined {
    return this.#tools;
  }

  set tools(source: ToolSource | undefined) {
    this.#tools = source;
    this.render();
  }

  connectedCallback(): void {
    // A page that set `tools` before this script defined the element left it on the element itself.
    if (Object.hasOwn(this, 'tools')) {
      const { tools } = this;
      delete (this as { tools?: ToolSource }).tools;
      this.#tools = tools;
    }
    addPageTokens();
    this.#root ??= createRoot(this.#mount);
    this.render();
  }

  disconnectedCallback(): void {
    this.#root?.unmount();
    this.#root = null;
  }

  attributeChangedCallback(): void {
    this.render();
  }

  protected abstract module(tools: ToolSource | undefined): ReactNode;

  protected render(): void {
    this.#root?.render(
      <AiConnectProvider client={pageClient()} locale={localeOf(this)}>
        {this.module(this.#tools)}
      </AiConnectProvider>,
    );
  }
}
