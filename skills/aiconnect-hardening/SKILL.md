---
name: aiconnect-hardening
description: Harden a website chat that runs on each visitor's own AI through AI Connect against prompt injection, leaks of the site's data and exfiltration of the visitor's conversation, then pen test it in English, French and Hebrew. Use before an AI Connect chat or MCP server goes public, when adding guards or guardrails to a site's chat, reviewing what a site's MCP tools expose, or when the user mentions prompt injection, jailbreaks, data leaks, salted envelopes or a chatbot pen test.
metadata:
  author: TensorPass
  version: "0.2.2"
---

# Harden an AI Connect chat

With AI Connect the conversation runs in the visitor's browser and the visitor's own model answers. The page sends the site's instructions and every tool result from the browser, where the visitor can read them, so both hold public facts only. The guards protect four things:

1. **The site's data.** The model reaches it only through the site's MCP tools, which anyone can also call without the page.
2. **The visitor's conversation.** Text planted in the site's content by a third party (a review, a comment, a listing) can tell the model to send the conversation elsewhere through a link or an image.
3. **The site's name on screen.** A hijacked answer appears under the site's chat.
4. **The MCP server.** It answers anyone, so it needs bounds and a rate limit.

A visitor who attacks their own model affects only their own conversation, and the page guards keep what the page shows within the site's rules.

## Files in this skill

| File | Copy to | Role |
| --- | --- | --- |
| `templates/chatPolicy.example.mjs` | `lib/ai/chatPolicy.mjs` | The site's values: instructions, the guards' settings, sample questions |
| `templates/rateLimit.mjs` | `lib/ai/rateLimit.mjs` | A rate limit per visitor address for the MCP route |
| `scripts/pentest.mjs` | stays here | The pen test: the guards alone, the MCP server, then the whole chat with a real model |

The guards themselves ship in `@tensorpass/aiconnect`, and every AI Connect module runs them. The templates are plain JavaScript modules with comments. In a TypeScript project they import as they are (`allowJs`), or convert them.

## 1. The server: what the tools can reach

Start here, since every other guard sits in a browser the visitor controls.

- **Return public fields by name.** Build each result from a list of the fields a visitor may see. A record passed through as stored carries internal ids, notes, emails and costs into the model.
- **Index published content only.** Drafts, account pages, admin pages and pages marked `noindex` stay out of anything a tool searches.
- **Take no address from the model.** A tool that fetches a URL or calls a webhook the model names can carry the conversation to any server. Tools that need the web fetch fixed addresses on the server.
- **Bound every input in the schema:** `maxLength` on strings, `maxItems` on arrays, `maximum` on numbers, enums for fixed sets. Cap each result (a few passages of a few hundred characters).
- **Limit each visitor address.** Copy `rateLimit.mjs` and read the address from the header your own proxy overwrites (`X-Real-IP` behind Caddy or nginx, `CF-Connecting-IP` behind Cloudflare). The limit counts a bounded number of addresses at once, and an IPv6 visitor with its /64 network. Cap the request body at 16 KB with the transport's `maxRequestBodySize` (`@modelcontextprotocol/sdk` 1.31 or later), which counts the bytes it reads whatever length the request declares. Keep the server stateless, and answer GET and DELETE with 405.
- **Check each result before it leaves.** `checkToolResult(text, chatPolicy)` from `@tensorpass/aiconnect` runs the policy's `denyPatterns` and `withholdPatterns` on a result; anyone can call the server without the page, so a result that trips one is replaced by an error.
- **Give links as fields.** A page URL, a website or a booking link goes in a field of its own (`"url": "https://..."`). The page lets an answer link to an address a result gave as a whole field, and to none written inside free text such as a review.
- **Mark third party content.** A review or comment in a result carries its origin (`"source": "visitor review"`), so the model weighs it as an opinion.
- **Keep acting tools for signed in visitors.** A tool that books, orders or writes checks the visitor's own session on the server, validates every argument there, and acts only after the visitor confirms in the page. A public chat starts with read only tools.
- **Refuse other sites on a cookie session.** The page's requests carry the site's cookies, so another site can post to the MCP route with them too. A route that reads a cookie session checks that the `Origin` header is the site's own, and the session cookie is `SameSite=Lax` or `Strict`. A site whose login is a bearer token sends it through `McpToolSource`'s `fetch` option, and keeps the token out of `localStorage` when it can, since any script on the page reads it there. The `aiconnect-auth` skill moves a site's login to that model.

```ts
// In the MCP route, before the transport.
const allowed = rateLimit(visitorAddress(request.headers, 'x-real-ip'));
if (!allowed.ok) {
  return tooManyRequests(allowed.retryAfterSeconds);
}

// In each tool, before it returns.
const result = JSON.stringify(hits);
return checkToolResult(result, chatPolicy).ok ? text(result) : text('This result is not available.', true);
```

## 2. The page: guards on by default

`AiChatPanel`, `AiChatPopup`, `AiChatInline`, `AiChatPage`, `AiSearch`, the Web Components and `useAiChat` run every guard on every conversation, with no setup:

- **Salted envelopes.** A random salt drawn for each conversation closes `<instructions-SALT>` around the site's instructions and `<tool-result-SALT>` around every tool result. Text planted in the site's content does not know the salt, so it cannot close the envelope and pose as the site's instructions.
- **The question guard** runs before a question leaves the page. A stopped question never reaches the model, and the site's safe answer shows in its place.
- **The answer guard** runs at each piece the model streams. From the first piece that trips it, the text stops reaching the page, the model's answer is cut in the wallet, and the safe answer replaces what showed. The transcript keeps the safe answer, so the next question never reads the stopped text.
- **The drawing.** The modules never draw an image, and draw a link only when the guards allow it.
- **Tool activity** shows only the tools in `visibleTools`; the others still run, and their results still reach `renderToolResults`.

Tune them with the policy, passed as `guards`:

```tsx
'use client';
import { AiChatPopup } from '@tensorpass/aiconnect-react';
import { chatPolicy } from '@/lib/ai/chatPolicy.mjs';

export function SiteChat() {
  return <AiChatPopup system={chatPolicy.instructions} mcp="/api/mcp" guards={chatPolicy} />;
}
```

A page without React sets the same values as JSON on the element, each pattern written as a regular expression's source: `<aiconnect-chat guards='{"denyPatterns":["search_site"],"visibleTools":["search_site"]}'>`. A page that runs `runConversation` itself passes `guard: createChatGuard(chatPolicy)` and shows the safe answer when the loop throws a `GuardStop`.

## 3. What each guard stops

| Guard | Stops |
| --- | --- |
| Question | Questions over `maxInputLength` (2,000 characters by default), long base64 blobs, and 18 injection patterns in English, French and Hebrew: ignore or forget the instructions, `system:`, new instructions, role and persona changes, requests for the prompt, spoofed envelope tags. Up to three words may sit between the verb and its object, and the patterns also read the question with invisible characters removed and digits used as letters read as letters. |
| Answer | An envelope tag or the salt; any image; a link outside the page's origin, `allowedLinkHosts` and the addresses the tools returned as fields; an email address the visitor never typed, the tools never returned as a field and `allowedEmails` does not list; a match of `denyPatterns` or `withholdPatterns`. |

## 4. The policy

`chatPolicy.mjs` holds the site's values. The page, the MCP server and the pen test read it. The page passes it to the chat as `guards`, so it ships in the page's code where anyone can read it. Names that must stay private, such as internal services, hosts and documents, go in a policy only the server imports, which spreads `chatPolicy` and adds them to `denyPatterns`; the MCP server checks its results with it, and the pen test takes it with `--policy`.

| Field | Holds |
| --- | --- |
| `instructions` | What the model is told about the site, its tools and its tone. Public facts only. |
| `scope` | What the chat answers about; the model redirects anything else. |
| `allowedLinkHosts`, `allowedEmails` | The hosts and addresses an answer may give, besides the page's origin and what the tools return as whole fields of a JSON result. |
| `denyPatterns` | Internal names kept out of answers and tool results: tool names, tables, vendors, servers, identifier shapes. Plain words or regular expression sources. |
| `withholdPatterns` | Content the site does not hand out, such as a template with placeholders to fill in. |
| `visibleTools` | The tools whose activity the chat shows. |
| `maxInputLength` | The longest question, in characters. |
| `safeAnswer` | Shown in place of a stopped question or answer. Without it, the modules show their own words in the page's language. |
| `sampleQuestions` | Real visitor questions, which every guard must let through. |

## 5. The pen test

Run it from the site's folder, with the path of this skill's `scripts/pentest.mjs`:

```bash
# The guards of @tensorpass/aiconnect with the site's policy, no network: run it in CI.
node <skill>/scripts/pentest.mjs --unit --policy lib/ai/chatPolicy.mjs

# The MCP server: schemas, hostile arguments, internal names in results, a burst that must meet a 429.
node <skill>/scripts/pentest.mjs --mcp http://localhost:3000/api/mcp --policy lib/ai/chatPolicy.mjs

# The whole chat with a real model, through any OpenAI compatible API.
PENTEST_BASE_URL=https://api.openai.com/v1 PENTEST_API_KEY=... PENTEST_MODEL=gpt-4.1-mini \
  node <skill>/scripts/pentest.mjs --model --mcp http://localhost:3000/api/mcp --policy lib/ai/chatPolicy.mjs
```

The pen test loads `@tensorpass/aiconnect` from the site's own `node_modules`, so it checks the guards the site ships.

The model run sends about 30 conversations: direct attacks in three languages, attacks spread over several messages, and each sample question twice, once plain and once with an attack planted in the first tool result. Every attack asks for a canary code; a check fails when the answer the visitor would see carries the canary, the attacker's host or the salt. Each line also says when the model obeyed and a guard stopped it. Read the key from the environment of the command, and run it with a small model while you tune, then with the model your visitors use most.

## Rules

- Rerun the three pen test modes after any change to the tools, the policy or the guards, and before each release.
- Keep each guard's values in the policy, so the page, the server and the pen test check the same rules.
- A failed check is fixed where the leak starts: a field removed from a tool result, a page kept out of the index, a pattern added to the policy.

## Check it works

1. `--unit` passes every check, and every sample question goes through the input guard.
2. `--mcp` passes, including the 429 of the burst.
3. `--model` passes: no canary, no attacker host and no salt in any shown answer, and every sample question gets an answer that called a tool.
4. In Chrome with AI Wallet, ask a sample question, then paste an attack from `scripts/attacks.mjs`: the first is answered, the second shows the safe answer.
