# @tensorpass/aiconnect

The core of AI Connect. Your site's AI features run on the AI account each visitor already pays for, through the AI Wallet browser extension, so your site pays nothing for the inference. A visitor without the extension can sign in with OpenRouter, or with the TensorPass plan when you pass a site key.

```bash
npm install @tensorpass/aiconnect
```

```ts
import { AiConnect } from '@tensorpass/aiconnect';

const client = new AiConnect();
```

The package also holds the guards (`@tensorpass/aiconnect/guards`), the sign in return page (`@tensorpass/aiconnect/callback`) and the `aiconnect` command, which creates a site key from your terminal.

Docs: https://tensorpass.app/docs. JavaScript quickstart: https://tensorpass.app/docs/quickstart/javascript.

Apache License 2.0. The names AI Connect, AI Wallet and TensorPass and the TensorPass mark are not licensed.
