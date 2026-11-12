# Security

## Report a vulnerability

Write to security@tensorpass.app. Please do not open a public issue or a public pull request for a vulnerability, since both are visible to everyone before a fix exists.

A useful report holds:

1. The package and the version or the commit you tested.
2. What an attacker can do, and from which position: a web page, a site that the visitor approved, a model's answer, a tool's result, or another extension.
3. The steps that reproduce it, with the smallest page or script that shows it.
4. What you think the fix is, when you have an idea.

Reports sent there reach the maintainers.

## What is in scope

1. The SDK packages of this repository: `@tensorpass/aiconnect`, `@tensorpass/aiconnect-react`, `@tensorpass/aiconnect-elements` and `@tensorpass/aiconnect-design`.
2. The wallet protocol, `window.aiwallet`, as https://tensorpass.app/docs/protocol/wallet-provider describes it: what a page can ask the wallet, and what the wallet lets a page read.
3. The guards of the conversation loop, as https://tensorpass.app/docs/modules/guards describes them.
4. The WordPress plugin of this repository.

AI Wallet, the extension, lives in its own repository. A vulnerability in the wallet goes to the same address.

The security model, https://tensorpass.app/docs/security, says what the wallet stores, how it is encrypted and what an approved site can do. A behaviour that page describes as intended is by design. Tell us when you think the design itself is wrong.

## What is out of scope

1. A provider's own service, such as its sign in pages or its API. Report those to the provider.
2. A site that uses the SDK. Its MCP server and its own pages belong to that site.
