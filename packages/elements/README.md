# @tensorpass/aiconnect-elements

The AI Connect interface modules as custom elements, for a page without React, such as a WordPress page. One script holds React, the modules and their styles; the page writes `<aiconnect-chat>` or `<aiconnect-search>` where the module goes.

```html
<script src="https://cdn.jsdelivr.net/npm/@tensorpass/aiconnect-elements@0.1.0/dist/aiconnect-elements.js" defer></script>
<aiconnect-chat variant="popup" mcp="/api/mcp"></aiconnect-chat>
```

`dist/aiconnect-loader.js`, about 8 KB, loads the script only when the visitor reaches for a chat. `dist/aiconnect-callback.js` is the sign in return page's script.

Docs: https://tensorpass.app/docs/modules/web-components.

Apache License 2.0. The names AI Connect, AI Wallet and TensorPass and the TensorPass mark are not licensed.
