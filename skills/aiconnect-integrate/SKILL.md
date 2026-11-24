---
name: aiconnect-integrate
description: Add AI Connect to a website so its AI features run on each visitor's own AI plan (ChatGPT, Claude, Gemini and others) through the AI Wallet browser extension, or on the visitor's OpenRouter or TensorPass account without it, with no API key on the server and no inference bill. Sets up the site's public TensorPass site key through the account MCP server at plan.tensorpass.app. Use when adding an AI chat, an AI mode or an assistant to a React, Next.js or plain JavaScript site with AI Connect, when moving a site that already uses the OpenAI SDK, the Anthropic SDK, Google Gen AI, the Vercel AI SDK, LangChain, LlamaIndex or Mastra onto the visitor's own AI, or when the user mentions AI Connect, AI Wallet, AiConnectProvider, AiChatPanel, AiChatPopup, AiChatInline, AiChatPage, AiSearch, aiconnect-chat, useAiChat, McpToolSource or aiconnect.fetch.
metadata:
  author: TensorPass
  version: "0.4.9"
---

# Add AI Connect to a site

AI Connect lets a site's AI features answer on the visitor's own AI account. A visitor with the AI Wallet extension keeps their accounts there: the site sends its chat to the wallet, which answers with the visitor's AI, and the site receives no key. A visitor without the extension signs in with OpenRouter, or with the TensorPass plan when the site has a site key, in a popup the page opens; the page then calls that provider itself with a credential kept in the site's `localStorage`. On both paths the site pays no inference. The site describes what it can do as tools on an MCP server, and the visitor's model calls them.

The full docs are on this site at `/docs`, with a Markdown copy of every page at the same address followed by `.md`, and an index at `/llms.txt`.

## First, look for an AI SDK already in the project

Read the project's `package.json`. If it depends on `openai`, `@anthropic-ai/sdk`, `@google/genai`, `ai` or an `@ai-sdk/*` provider, `@langchain/openai` or another `@langchain/*` chat model, `@llamaindex/openai` or `@mastra/core`, the site already calls a model: keep that code and follow "Sites that already use an AI SDK" below. Otherwise follow "Steps".

## Before you start

- React 19 or later for the React package. Plain JavaScript works with `@tensorpass/aiconnect` alone.
- To try it: Chrome with AI Wallet installed and one account connected in the wallet.
- AI Wallet answers pages on HTTPS and on `http://localhost` or `http://127.0.0.1`.

## Steps

1. Install the packages.

   ```bash
   npm install @tensorpass/aiconnect @tensorpass/aiconnect-react
   ```

   `@tensorpass/aiconnect-react` brings `@tensorpass/aiconnect-design` with it. Plain JavaScript installs `@tensorpass/aiconnect` alone.

2. Create one client and wrap the app. Import the connect window's stylesheet once.

   ```tsx
   import { AiConnect } from '@tensorpass/aiconnect';
   import { AiConnectProvider } from '@tensorpass/aiconnect-react';
   import '@tensorpass/aiconnect-react/styles.css';

   const client = new AiConnect();

   root.render(
     <AiConnectProvider client={client}>
       <App />
     </AiConnectProvider>,
   );
   ```

   A visitor who approved the site before is connected a moment after the page loads, with no click.

3. Set up the site key, which turns on Sign in with TensorPass for visitors without the wallet. The wallet path and Sign in with OpenRouter work without it, so a site that does not offer the TensorPass sign in skips this step.

   - If the TensorPass account MCP server is not among your MCP servers, add it, then ask the developer to sign in when the browser opens. In Claude Code: `claude mcp add --transport http tensorpass https://plan.tensorpass.app/mcp`, then `/mcp` to sign in. In Codex: a `[mcp_servers.tensorpass]` table with `url = "https://plan.tensorpass.app/mcp"` in `~/.codex/config.toml`, then `codex mcp login tensorpass`.
   - Ask the developer for the site's production domain, such as `shop.example`, if the project does not name it. Call `create_site_key` with `{ "domain": "shop.example" }` once they approved the sign in. Call `list_site_keys` first and reuse a key the account already holds for that domain.
   - Without an MCP client, run `npx @tensorpass/aiconnect site-key shop.example`. It opens TensorPass's sign in in the developer's browser and prints the address too; give it to the developer when no browser opens. The command prints the key once they approve.
   - The developer can also create the key by hand: signed in at https://plan.tensorpass.app/sites, the page Your sites creates, copies and revokes keys. Send them there when they prefer it to the agent.
   - Write the key to the stack's env file and pass it to the client. The key starts with `tpk_` and is public, so it belongs in the browser bundle:

     | Stack | Env file line | Client |
     | --- | --- | --- |
     | Next.js | `NEXT_PUBLIC_TENSORPASS_SITE_KEY=tpk_...` in `.env.local` | `new AiConnect({ siteKey: process.env.NEXT_PUBLIC_TENSORPASS_SITE_KEY })` |
     | Vite (React, Vue, Svelte) | `VITE_TENSORPASS_SITE_KEY=tpk_...` in `.env.local` | `new AiConnect({ siteKey: import.meta.env.VITE_TENSORPASS_SITE_KEY })` |
     | Web Components | none | `site-key="tpk_..."` on each element, or `data-site-key="tpk_..."` on the elements script |
     | WordPress, Shopify | none | the plugin's or the app embed's Site key setting |

     Add the same variable to the host's environment settings for production builds, and to `.env.example` when the project keeps one.
   - Give the sign ins a return page that does nothing else, and pass it as `signInCallback`, so the popup never loads the whole site. In Next.js, add `app/aiconnect/callback/page.tsx` with `robots` set to noindex, rendering a client component that calls `finishSignIn()` from `@tensorpass/aiconnect/callback` in a `useEffect`, and build the client with `new AiConnect({ siteKey, signInCallback: '/aiconnect/callback' })`. In Vite, add a second HTML entry, such as `callback.html`, whose module script imports and calls `finishSignIn()`. For Web Components, serve a static page with `<script src="/aiconnect-callback.js"></script>` (built beside the elements script) and set `data-sign-in-callback` on the elements script.
   - The provider returns to that page with `code` and `state` (or `error` and `state`) in the query string, as OAuth 2 with PKCE does, and the page that started the sign in receives them too when the browser blocks the popup. The client removes them from the address as it reads them. A project whose rules forbid query strings records an exception for these three parameters on those pages.
   - The key works on the domain and on `http://localhost` and `http://127.0.0.1` at once. The domain proof (`start_domain_proof`, `check_domain_proof`) is for the revenue share payouts only: offer it, and skip it unless the developer wants the payouts. The proof and the balance are also on https://plan.tensorpass.app/sites.

4. Add an interface module where the AI feature goes. Each module runs the conversation on the visitor's AI, calls the site's MCP tools, streams the answer, shows each tool call while it runs, names the account that answers, offers Stop, and shows the connect or install step until the visitor's AI is connected. Pick the form that fits the site:

   | Form | Component |
   | --- | --- |
   | A chat docked in a side panel at the page's edge | `AiChatPanel` |
   | A floating button that opens a chat popup | `AiChatPopup` |
   | A chat inline in the page | `AiChatInline` |
   | A full page AI mode | `AiChatPage` |
   | A search bar that answers | `AiSearch` |

   ```tsx
   import { AiChatPopup } from '@tensorpass/aiconnect-react';

   const SYSTEM = 'You recommend books from this site\'s catalog. Always search the catalog before recommending.';

   export function Assistant() {
     return <AiChatPopup system={SYSTEM} mcp="/api/mcp" suggestions={['A calm book for tonight']} />;
   }
   ```

   Every module takes `system`, `mcp` (or `tools`, a tool source built once outside render functions, such as `new McpToolSource('/api/mcp', 'My site', { fetch })` when the site's login is a bearer token the page must add to each request), `title`, `intro`, `placeholder`, `suggestions`, `toolLabels` (a plain name per tool), `renderToolResults`, which draws a turn's tool results as the site's own cards, and `attachments`, which lets the visitor drop, paste or attach images, PDFs and text files and dictate a question (`attachments={{}}` takes every kind; see `/docs/modules/attachments`). The panel, the popup and the full page also take `open`, `onOpenChange` and `hideLauncher`, for a site that opens them from a button of its own. On a phone the panel and the popup take the whole screen and hold the page's scroll and position while they are open, and the full page mode does so on every screen, so the site adds no scroll lock of its own around them. The provider's `locale` (`en`, `fr`, `he`) sets their language. See `/docs/modules`.

5. For an interface the modules do not cover, build it on `useAiChat` and `useAiConnect` instead.

   ```tsx
   import { McpToolSource } from '@tensorpass/aiconnect';
   import { useAiChat, useAiConnect } from '@tensorpass/aiconnect-react';

   const tools = new McpToolSource('/api/mcp', 'My site');

   export function Chat() {
     const { state, openPicker } = useAiConnect();
     const { turns, send, busy, error, connected } = useAiChat({ system: SYSTEM, tools });
     // Render turns: each has the question, the streamed answer and every tool call with its result.
   }
   ```

   `openPicker` shows the connect window, which offers a visitor without the wallet its install and the web sign ins. `send` does not queue questions: disable the send button while `busy` is true.

6. Serve the site's tools as an MCP server on the site's own origin (for example `/api/mcp`). Use the `aiconnect-mcp-tools` skill for the server and the tool design rules, and the `aiconnect-rag-chatbot` skill for a chat that answers from the site's pages.

7. Match the modules and the connect window to the site's design system with the `--aic-*` CSS tokens (light, dark and right to left). See `/docs/guides/theming`.

## Sites that already use an AI SDK

`AiConnect` exposes `fetch`, a function the AI SDKs accept in their options. It answers the SDK's requests through the visitor's wallet, in the SDK's own protocol, streamed or whole, so the SDK's tool loop, structured output and errors keep working. The wallet ignores the model the code names and the API key, which `sdkOptions` sets to the placeholder `aiwallet`.

1. Do steps 1 to 3 above: the packages, one `AiConnect` client with `AiConnectProvider`, and the site key when the site offers the TensorPass sign in. Add an entry point that calls `openPicker` from `useAiConnect`, since a request from a site the visitor has not connected fails with status 401.
2. Find where the SDK's client is built and change only its options:

   | SDK | Client |
   | --- | --- |
   | `openai` | `new OpenAI(client.sdkOptions)` |
   | `@anthropic-ai/sdk` | `new Anthropic(client.sdkOptions)` |
   | `@google/genai` | `new GoogleGenAI({ apiKey: client.sdkOptions.apiKey, httpOptions: { fetch: client.fetch } })` |
   | `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google` | `createOpenAI({ apiKey: client.sdkOptions.apiKey, fetch: client.fetch })`, and the same two options for `createAnthropic` and `createGoogleGenerativeAI` |
   | `@langchain/openai` | `new ChatOpenAI({ model, apiKey: client.sdkOptions.apiKey, configuration: client.sdkOptions })` |
   | `@llamaindex/openai` | `new OpenAI({ model, apiKey: client.sdkOptions.apiKey, additionalSessionOptions: client.sdkOptions })`, with the tool loop on `llm.chat` |

   A Mastra agent runs in Node only, so it cannot answer in the page: serve its tools with `MCPServer` from `@mastra/mcp` and run the conversation in the page with the Vercel AI SDK.

3. When the SDK call runs on the server (a Next.js Route Handler, an Express route), move it into a client component or a browser module: `aiconnect.fetch` answers in the browser only, and the call needs no key any more. Delete the route and the provider API key it read.
4. Keep the server's data access as tools on an MCP server on the site's origin, read them with `new McpToolSource('/api/mcp')`, and declare them in the SDK's tool format; each call goes to `source.callTool(name, args)`. Use the `aiconnect-mcp-tools` skill for the server.
5. Remove the features the wallet does not take, if the code uses them: `previous_response_id` on the Responses API (send the whole input), several answers per request, files or audio in messages, and a provider's own server tools such as web search. The wallet answers chat requests only, so embeddings stay on the site's own provider.

`/docs/guides/existing-sdks` has a full example for each SDK, the settings the wallet passes on, and the error statuses each SDK raises. Each SDK also has its own page under `/docs/guides/sdks/` (`openai`, `anthropic`, `google-gen-ai`, `vercel-ai-sdk`, `langchain`, `llamaindex`) with its install command, structured output, error classes and retry setting.

## Next.js

- Put the provider and every component using the hooks in files that start with `'use client'`.
- `new AiConnect()` built during the server render sends no request and stays in the `checking` state; the provider renders `checking` on the server and in the hydration, then switches to the browser's state. No extra guard is needed.
- Relay `/api/mcp` to the MCP server when it runs on another host, so the browser only talks to the site's origin. `/docs/guides/mcp-tools` shows the relay route.

## Plain JavaScript and WordPress pages

Without React, load the modules as Web Components with one script tag, then write the elements where they go. Each element reads the tools from the site's MCP server.

```html
<script src="https://cdn.jsdelivr.net/npm/@tensorpass/aiconnect-elements@0.1.8/dist/aiconnect-elements.js" defer></script>

<aiconnect-chat variant="popup" mcp="/api/mcp"
  system="You recommend books from this site's catalog. Always search the catalog before recommending."
  suggestions='["A calm book for tonight"]'></aiconnect-chat>
<aiconnect-search mcp="/api/mcp" system="You answer questions about this site's catalog."></aiconnect-search>
```

`<aiconnect-chat>` takes `variant` (`inline`, `panel`, `popup` or `page`), and both elements take `system`, `mcp`, `heading`, `intro`, `placeholder`, `suggestions` and `tool-labels` (JSON), `locale`, and `attachments` (alone for every kind, or the policy in JSON). A page that takes attachments serves `aiconnect-pdf.js` and `aiconnect-pcm-worklet.js` beside the elements script. The script is `dist/aiconnect-elements.js` of the npm package `@tensorpass/aiconnect-elements`, served by jsDelivr as above, or hosted with the site's files next to its source map. See `/docs/modules/web-components`.

For an interface of its own, use the client directly: `client.subscribe(listener)` for the state, `client.connect()` to ask the wallet, and `runConversation` from `@tensorpass/aiconnect` to run the tool loop. See `/docs/quickstart/javascript`.

## Rules

- Do not ask the visitor for an API key and do not put one on the server. The wallet holds the visitor's sign ins, and a web account's credential comes from the provider's own sign in.
- On the wallet path, the site sees the answers, the tool calls and the name of the account that answered. On a web account, the site's page also holds the credential, so keep the pages of the chat free of scripts the site does not trust.
- The site key is public. Commit it to the env example or the code freely; it grants no access by itself.
- Keep tool results short and structured (JSON as text): they count against the visitor's plan.
- Do not invent options or methods. Check `/docs/reference/core` and `/docs/reference/react` before using an API you have not seen above.
- The modules and `useAiChat` run AI Connect's guards on every conversation: salted envelopes around the instructions and the tool results, a question guard and an answer guard. Tune them with the `guards` prop, and run the `aiconnect-hardening` skill's pen test before the chat goes public.

## Check it works

1. Start the site on `localhost` and open it in Chrome with AI Wallet and a connected account. To check the web sign ins, open it in a browser profile without the wallet: the connect window shows the install button, Sign in with TensorPass when the site key is set, and Sign in with OpenRouter.
2. Open the module, click Connect AI Wallet, and approve the site in the wallet's window.
3. Ask a question: the answer streams from the account the wallet chose for the site, the module names that account, and each tool call shows a row that turns to a check once its result is back.
4. With an AI SDK, check the browser's network panel: no request goes to the SDK's provider, and the wallet's side panel shows the site answering.
