# AI Connect

AI Connect is the SDK of TensorPass (https://tensorpass.app). Visitors use the AI plan they already pay for on any website, through AI Wallet, a browser extension that holds their AI accounts. A site connects to the wallet in one click; the wallet answers the site with the account the visitor picked for it. The site pays no inference and never sees the visitor's keys.

## Packages

| Package | Role |
| --- | --- |
| `@tensorpass/aiconnect` | The site's side: `AiConnect`, the connection to the visitor's AI through the wallet, with `AiConnect.fetch`, which lets the AI SDK a site already uses answer through the wallet; the conversation loop that runs the site's tools; `McpToolSource`, the site's tools read from its MCP server. |
| `@tensorpass/aiconnect-react` | `AiConnectProvider`, the connect window (English, French, Hebrew, Arabic, Chinese), `useAiConnect`, `useAiChat`, and the interface modules: `AiChatPanel`, `AiChatPopup`, `AiChatInline`, `AiChatPage` and `AiSearch`. Themed through `--aic-*` CSS tokens. |
| `@tensorpass/aiconnect-elements` | The interface modules as Web Components (`<aiconnect-chat>`, `<aiconnect-search>`) in one script a page loads with a script tag, for sites without React, and a loader under 10 KB that draws a chat's button and loads that script when the visitor reaches for it. |
| `@tensorpass/aiconnect-design` | The `--aic-*` tokens of the connect window, light and dark, the TensorPass mark, the providers' marks, and the key card colours shared by the wallet and the website. |
| `apps/demo` | A bookshop playground on port 4605. `?module=panel` (or `popup`, `inline`, `page`, `search`) shows each interface module, with `lang=` and `theme=`; `/elements.html` shows them as Web Components on a plain HTML page. |
| `integrations/wordpress` | The WordPress plugin: the chat as a block and a shortcode, and the site's posts as an MCP server, with its end to end tests on WordPress in Docker. |

## Use it on a site

```tsx
const client = new AiConnect();

<AiConnectProvider client={client}>…</AiConnectProvider>

const { turns, send } = useAiChat({ system, tools: new McpToolSource('/api/mcp') });
```

The site exposes its tools once, as an MCP server, and the chat reads them from it. A visitor without the wallet gets a link to the AI Wallet page, https://tensorpass.app/wallet.

A site that already uses an AI SDK keeps it and passes the client's `fetch`, which answers the OpenAI, Anthropic and Gemini protocols through the wallet:

```ts
new OpenAI(client.sdkOptions);
createOpenAI({ apiKey: client.sdkOptions.apiKey, fetch: client.fetch }); // Vercel AI SDK
```

The demo's SDK mode runs the same chat on the Vercel AI SDK, the OpenAI SDK, the Anthropic SDK, Google Gen AI and LangChain.

The documentation lives at https://tensorpass.app/docs: quickstarts, guides, the SDK reference and the wallet protocol.

## AI Wallet

AI Wallet, the browser extension, is proprietary software in its own repository. It takes the SDK packages from this repository, checked out as a Git submodule, and runs its end to end tests against the demo of this repository. No code of the extension is part of this repository.

## Licence

The SDK is open source under the Apache License, Version 2.0 (`LICENSE`, with `NOTICE`). The licence covers the whole repository: `packages/` (the four `@tensorpass` packages, each published with its own copy of the two files), `apps/demo` and `integrations/wordpress`.

The names TensorPass, AI Connect and AI Wallet and the TensorPass mark are trademarks of TensorPass. As section 6 of the licence says, it grants no right to use them, beyond naming the origin of the software.

## Commands

`npm run build`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run dev` (demo). The design package writes the TensorPass logo files into a folder given on its command line: `npm run brand -w @tensorpass/aiconnect-design -- <folder>`.
