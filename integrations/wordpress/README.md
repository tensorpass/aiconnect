# AI Connect for WordPress

A WordPress plugin that adds the AI Connect chat to a site, as the **AI Connect Chat** block and the `[aiconnect_chat]` shortcode, and serves the site's published posts and pages as an MCP server at `/wp-json/aiconnect/v1/mcp`. The chat answers on each visitor's own AI account through AI Wallet, or, for a visitor without the extension, through an account they sign in to in the chat. The guide for site owners is https://tensorpass.app/docs/quickstart/wordpress.

| Path | Role |
| --- | --- |
| `aiconnect/aiconnect.php` | The plugin's header and its hooks. |
| `aiconnect/includes/class-aiconnect-script.php` | Registers the Web Components script, loaded deferred by the pages that show a chat, and gives the address of the sign in return page. |
| `aiconnect/includes/class-aiconnect-chat.php` | The shortcode and the block's server render, which write the `<aiconnect-chat>` element with the return page as `sign-in-callback`. |
| `aiconnect/sign-in.html` | The return page of the web sign ins, a static page that loads `aiconnect-callback.js`. The web server serves it without WordPress, at `/wp-content/plugins/aiconnect/sign-in.html`, an address without a query string in both permalink settings. |
| `aiconnect/includes/class-aiconnect-mcp.php` | The MCP server: `search_posts` and `get_post`, over the posts any visitor can read. |
| `aiconnect/includes/class-aiconnect-settings.php` | Settings, AI Connect: the site's TensorPass site key, written on every chat so a visitor without AI Wallet can sign in to the TensorPass plan. Without it, those visitors are offered OpenRouter. |
| `aiconnect/blocks/chat` | The block's `block.json` and its editor script, a plain script with no build step. |
| `scripts/package.sh` | Copies `aiconnect-elements.js` and `aiconnect-callback.js` from `packages/elements/dist` into `aiconnect/assets` and zips the plugin into `dist/aiconnect.zip`. |
| `scripts/e2e.sh`, `compose.yaml`, `e2e` | The end to end tests on WordPress and MariaDB in Docker, with the built AI Wallet. |

`aiconnect/assets` and `dist` hold build output and are ignored by Git.

## Build

```bash
npm run build                                 # at the repository root: the SDK, Web Components included
integrations/wordpress/scripts/package.sh     # writes integrations/wordpress/dist/aiconnect.zip
```

## Test

```bash
integrations/wordpress/scripts/e2e.sh
```

It starts WordPress at http://localhost:5046 with the plugin mounted, publishes a post, a draft and two pages with the chat, then runs the Playwright tests: the MCP server serves the published posts only, the editor inserts the block with its settings, and a visitor with AI Wallet gets an answer built from the site's posts, with Mistral played by the test. The wallet comes from `../aiwallet/dist`, next to this repository, or from the folder `AIWALLET_DIST` names.

`e2e/signIn.e2e.ts` runs with pretty permalinks, then again with plain ones. A visitor without the wallet clicks Sign in with OpenRouter, the popup opens `https://openrouter.ai/auth` with the return page as `callback_url`, and the test sends the popup to the return page with a made up code. The popup closes and the chat trades the code at OpenRouter's real key exchange with its PKCE verifier; OpenRouter refuses it, and the chat says the sign in did not finish. The same holds when the popup passes through Google's OAuth page, whose Cross-Origin-Opener-Policy cuts it from the chat, and when the return page stays open in a tab. Each run keeps its screenshots in `test-results/pretty` and `test-results/plain`, which Git ignores. The stack and its volumes are removed when the script ends.

The PHP follows the WordPress coding standards; the editor script and the tests follow the repository's style.
