---
name: aiconnect-rag-chatbot
description: Build a chatbot that answers a website's visitors from the site's own pages, running on each visitor's own AI through AI Connect so the site pays no inference. Indexes the site's pages, serves the search as MCP tools on the site, and plugs AI Connect's chat with salted envelopes. Use when adding a site assistant, a docs or FAQ chatbot, an "ask this site" box or retrieval augmented generation (RAG) to a Next.js or React site with AI Connect, or when the user mentions a RAG chatbot, answering from the site's content, or site search for AI.
metadata:
  author: TensorPass
  version: "0.2.0"
---

# Build a RAG chatbot on the visitor's own AI

The chatbot has three parts:

1. **The index.** The site's pages, cut into passages under their headings, ranked with BM25. It is a JSON file built from the pages and committed with the site.
2. **The MCP server.** `search_site` and `read_page` on the site's own origin (`/api/mcp`), reading the index in memory.
3. **The chat.** An AI Connect module in the page. The visitor's own model writes the searches, reads the passages and answers with links to the pages.

The site runs no model and no search service: each question costs it one in memory search.

**Why keyword search is enough here.** The visitor's model writes the queries and searches again with other words when a search comes back empty, which covers most of what embeddings add on a site of a few hundred pages. Add embeddings for thousands of pages, for questions asked in a language the pages are not written in, or when the logs show searches that miss. Embed the passages when the index is built and the query at search time with the site's embeddings provider, keep the vectors in pgvector or Qdrant, and merge their ranking with BM25 by reciprocal rank fusion behind the same `search_site` tool. Embeddings run on the site's key, so they are the one cost the site then pays.

## Before you start

- AI Connect is set up in the site: the packages, one `AiConnect` client and `AiConnectProvider` (the `aiconnect-integrate` skill).
- The `aiconnect-hardening` skill is installed, from the same site as this skill (`npx skills add <site> --skill aiconnect-hardening`). The chat uses its policy, its rate limit and its pen test.
- The site serves `/sitemap.xml`, or its content lives in files or a CMS the code can read.
- Next.js App Router for the templates as written. Another framework keeps the same files and serves the MCP server from its own route.

## Files in this skill

| File | Copy to | Role |
| --- | --- | --- |
| `templates/siteIndex.mjs` | `lib/ai/siteIndex.mjs` | Passages, BM25 index and search; pure functions |
| `templates/collectPages.mjs` | `lib/ai/collectPages.mjs` | Reads the pages from the sitemap and keeps their main content as text |
| `templates/build-index.mjs` | `scripts/build-index.mjs` | Writes the index JSON |
| `templates/mcp-route.ts` | `app/api/mcp/route.ts` | The MCP server: `search_site`, `read_page`, rate limit, size caps, results checked against the policy |
| `templates/SiteChat.tsx` | `components/SiteChat.tsx` | The chat popup, under AI Connect's guards tuned by the policy |

From `aiconnect-hardening`, copy `templates/rateLimit.mjs` and `templates/chatPolicy.example.mjs` (as `chatPolicy.mjs`) into `lib/ai/`.

## Steps

1. **Copy the files** above. Adjust the `@/` import alias in `mcp-route.ts` and `SiteChat.tsx` if the project uses another one.
2. **Write the policy** in `lib/ai/chatPolicy.mjs`. The instructions say what the site is, ask the model to call `search_site` before answering, to answer from the passages it returns, to link each page it uses by its path, and to point to the contact page when nothing matches. List the site's host in `allowedLinkHosts`, the site's public email in `allowedEmails`, and `search_site`, `read_page` and any internal name in `denyPatterns`. Write three to five `sampleQuestions` a real visitor asks, answered by the pages.
3. **Build the index.** Start the site, then:

   ```bash
   node scripts/build-index.mjs --origin http://localhost:3000 --out data/site-index.json --exclude /account,/admin
   ```

   Add it to `package.json` as `"index:site"`, commit `data/site-index.json`, and run it again when the content changes (or in the deploy, once the new version answers). Pages marked `noindex` and the excluded paths stay out. When the content lives in Markdown, MDX or a CMS, build the pages list from that source instead (`[{ url, title, text }]`, with `#` headings in `text`) and pass it to `buildIndex`.
4. **Serve the tools.** `mcp-route.ts` answers POST only, in JSON, with no session. It needs `@modelcontextprotocol/sdk` 1.31 or later, whose transport counts the bytes of a request as it reads them and refuses one over 16 KB. Set the header `visitorAddress` reads to the one your proxy overwrites. Each search returns at most 8 passages of 700 characters; `read_page` returns at most 6,000 characters of a page in the index and refuses any other path.
5. **Add the chat.** Render `<SiteChat />` once in the root layout, inside `AiConnectProvider`. The popup draws a salt for each conversation, wraps the instructions and every tool result in envelopes closed by that salt, checks each question and each answer as it streams, and opens the connect window for a visitor who has not connected AI Wallet yet.
6. **Pen test it** with `aiconnect-hardening` (section 5): `--unit`, `--mcp` and `--model` all pass before the chat goes public.

## Rules

- Index what the site publishes and nothing else. The chat can repeat any passage it finds.
- Keep the tool results short: each one counts against the visitor's plan.
- Cite pages by their path, or by the `url` field a result gives: the answer guard lets those links through, and stops any other.

## Check it works

1. `build-index.mjs` reports the expected number of pages, and a word from a page you know appears in `data/site-index.json`.
2. The tools answer:

   ```bash
   curl -s http://localhost:3000/api/mcp -H 'content-type: application/json' \
     -H 'accept: application/json, text/event-stream' \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_site","arguments":{"query":"delivery"}}}'
   ```

   returns passages with their paths, and a query with no match returns `[]`. The `aiconnect-mcp-tools` skill's `scripts/mcp-check.mjs` reviews both tools and calls them.
3. In Chrome with AI Wallet and a connected account, ask a sample question: the chat shows the search running, then answers from the page with a link to it.
4. The three pen test modes pass.
