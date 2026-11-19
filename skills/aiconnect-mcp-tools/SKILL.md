---
name: aiconnect-mcp-tools
description: Turn a website's server, API or services into an MCP server whose tools a visitor's own AI calls through AI Connect, and design those tools so a model uses them well. Works from the site's routes and services or from an OpenAPI file. Use when building or reviewing the MCP server behind a site's AI mode or chat, exposing a catalogue, search, booking or account features to AI, converting a REST API or OpenAPI description into MCP tools, writing tool names, descriptions and input schemas, or when the user mentions McpToolSource, an AI native website, or making a site's data usable by AI.
metadata:
  author: TensorPass
  version: "0.2.1"
---

# Turn a site's server into MCP tools for AI Connect

On a site using AI Connect, the conversation runs in the page and the visitor's model answers through the AI Wallet extension. The model reaches the site's data only through tools. The page reads them from the site's MCP server with `McpToolSource`, and the SDK's tool loop calls them when the model asks. The same server works as a connector in Claude, ChatGPT and other MCP clients.

The full guide is on this site at `/docs/guides/mcp-tools` (Markdown at `/docs/guides/mcp-tools.md`).

## Files in this skill

| File | Role |
| --- | --- |
| `scripts/openapi-inventory.mjs` | Lists every operation of an OpenAPI 3 file as a table: method, path, parameters, body, authentication, read or write |
| `scripts/mcp-check.mjs` | Lists the server's tools, reviews them against the design rules below, calls them and reports each result |
| `scripts/mcpClient.mjs` | The small MCP client the check uses, with no dependency |

## 1. Inventory what the server can do

- **Routes in the codebase.** Read the route definitions: `app/**/route.ts` and server actions in Next.js, `router.get(...)` in Express or Fastify, `urls.py` in Django, `config/routes.rb` in Rails. Follow each route to the service function it calls.
- **An OpenAPI description.** `node <skill>/scripts/openapi-inventory.mjs openapi.json` prints one row per operation. Convert YAML first with `npx js-yaml openapi.yaml > openapi.json`.

Sort every capability into one of four groups:

| Group | Examples | Becomes |
| --- | --- | --- |
| Public read | Catalogue, search, availability, prices, opening hours, FAQ | Tools, first |
| The visitor's own data | Their orders, bookings, account | Tools that check the visitor's session on the server |
| Actions | Book, order, send a message | Tools added later, with server validation and a confirmation in the page |
| Internal | Admin, reports, other users' data, settings | Stays off the MCP server |

## 2. Shape the tools around what visitors ask

Each tool answers a task a visitor brings, and may draw on several endpoints. Three to eight tools cover most sites:

- one search tool with the filters visitors name (city, category, price, date), in place of several list endpoints;
- one tool that lists the accepted values of those filters;
- one tool that returns an item by its identifier, with the details the listing leaves out.

Call the service layer directly when the server lives in the same codebase: the same validation and access rules, with no HTTP round trip. When the API lives elsewhere, call it with `fetch` from the MCP server with the server's own credentials, kept in the server's environment. In both cases build each result from the public fields by name, and include the identifier the next tool takes and the item's page URL.

## 3. Serve the server

1. Serve it on the site's own origin, at a path such as `/api/mcp`, so the browser needs no CORS setup. If the server runs elsewhere, relay that path to it from the site.
2. Make it stateless: for each POST, build a new `McpServer` and a `WebStandardStreamableHTTPServerTransport` (or `StreamableHTTPServerTransport` in Node frameworks) with `sessionIdGenerator: undefined` and `enableJsonResponse: true`. Answer GET and DELETE with 405.
3. Tools that read published data need no authentication. Rate limit each visitor address (60 requests a minute is a good start) and cap the request body.
4. Register each tool with `server.registerTool(name, { title, description, inputSchema, annotations }, handler)`, input schemas in zod, and `annotations: { readOnlyHint: true, openWorldHint: false }` on read only tools.
5. Serve the visitor's own data and the back office from the same server, by level. For each request, read the site's session as its other routes do and register only the tools of the caller's level (public, signed in, staff), so `tools/list` shows a visitor what they may call. The page's requests carry the site's cookies; a site whose login is a bearer token gives `McpToolSource` a `fetch` option that adds it. On a cookie session, also check that the `Origin` header is the site's own and that the cookie is `SameSite=Lax` or `Strict`, since another site can post to the route with the cookie. A tool that acts returns a proposal the page shows as a card, and the visitor's click sends it through the site's own route.
6. Check each result with `checkToolResult(text, policy)` from `@tensorpass/aiconnect` before it returns, with the policy of the `aiconnect-hardening` skill, so no internal name leaves the server. Before the server goes public, run that skill's pen test: it checks what the tools return, the bounds of every input, and the rate limit.

## 4. Design the tools for a model

The model reads only names, descriptions and input schemas. Everything it needs has to be in that text.

- **Name tools after what they do:** a verb and a noun in snake case (`search_events`, `get_event`, `list_categories`), so descriptions and the system prompt can refer to them.
- **Give the accepted values:** add a tool that lists the values the catalogue holds (cities, categories, price scale) and point the search tool's fields to it. Put fixed sets in the schema as enums.
- **Explain every value:** an enum says which values exist; its description says what each one means and when to leave the field out. An unexplained value is a common cause of empty results.
- **Ask for the filters the visitor named:** say in the description that each filter narrows the results and that only the filters the visitor asked for should be sent.
- **Bound every input:** cap string lengths, array sizes and `limit` in the schema. Return a short list by default (12, at most 25); results count against the visitor's plan.
- **Take no address from the model:** a parameter holding a URL, an endpoint or a webhook lets the model send data to any server.
- **Decide what empty means:** a search with no match returns `[]`, and its description says what to do next ("If nothing matches, relax a filter"). A lookup of a missing item returns an error result with a short reason.
- **Return what the next step needs:** include the identifiers the next tool takes (such as a slug) and the page URL of each item.

## How the SDK reads tools

- `new McpToolSource(url, clientName)`: a relative `url` resolves against the page, so build it in the browser (on the first call, in a component that also renders on the server). It connects over Streamable HTTP on first use and reuses the connection.
- `listTools()` reads the tool list once per instance. Create the source once per page.
- `callTool` returns the text parts of the result joined with line breaks; other content types are dropped. Return data as text, usually JSON.
- A result with `isError: true` reaches the model as `Tool error: ` followed by its text.
- The loop calls tools in the order the model asks, then sends the conversation back, up to 6 steps by default (`maxSteps` of `runConversation`); the last step offers no tools.

## Write the system prompt with the tools

Name the tools in the order to use them, ask the model to call the values tool once at the start, to send only the filters the visitor gave, to relax one filter after an empty search, and to answer from tool results only. AI Connect's modules wrap this prompt and every tool result in salted envelopes on their own; the `aiconnect-hardening` skill tunes those guards and checks the results on the server.

## Check it works

1. Review and call the server:

   ```bash
   node <skill>/scripts/mcp-check.mjs --url http://localhost:3000/api/mcp --calls calls.json
   ```

   `calls.json` lists realistic calls with what each should give: `[{ "tool": "search_events", "args": { "city": "Lyon" }, "expect": "results" }, { "tool": "search_events", "args": { "city": "Nowhere" }, "expect": "empty" }, { "tool": "get_event", "args": { "slug": "missing" }, "expect": "error" }]`. Every design finding and every unexpected answer fails the check.
2. On the site, with AI Wallet connected, ask questions that use each filter. Read the tool calls in the chat's turns: the model should send only the filters you asked for.
3. Ask for something the catalogue does not hold and check the model relaxes a filter and searches again.
