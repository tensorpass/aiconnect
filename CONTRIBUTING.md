# Contributing to AI Connect

AI Connect is the SDK of TensorPass (https://tensorpass.app). This page tells you how to set the repository up, where each part lives, which rules the code follows and how a pull request is checked.

## What you can contribute to

The Apache License 2.0 in `LICENSE` covers the whole repository: `packages/`, `apps/demo` and `integrations/wordpress`. Pull requests are welcome there.

The docs at https://tensorpass.app/docs live with the website, which is not in this repository. For a correction to the docs, open an issue that names the page and the sentence.

AI Wallet, the extension, is proprietary software in its own repository. A change to the SDK that the wallet depends on is tested against the wallet by the maintainers.

The connectors, the AI providers the wallet holds, are part of the wallet's code, so this repository has none. To propose a provider, use the form at https://tensorpass.app/connectors/propose: the team reads the provider's documentation, answers within one working day and writes the connector.

## Set up

You need Node.js 26 or later and npm. The repository is one npm workspace.

```bash
git clone https://github.com/tensorpass/aiconnect.git
cd aiconnect
npm ci
```

The commands below are the ones the continuous integration job runs, in the same order.

| Command | What it does |
| --- | --- |
| `npm audit --audit-level=high` | Stops at a dependency advisory rated high or critical. |
| `npm run lint` | ESLint on the whole repository. |
| `npm run typecheck` | TypeScript on the packages and the demo. |
| `npm run build` | Builds every workspace. |
| `npm test` | The unit tests, with Node's own test runner. |

Run `npm run build` before `npm test`. One test of `@tensorpass/aiconnect-elements` measures the loader's size and bundles the stylesheet that the build of `@tensorpass/aiconnect-react` writes.

`npm run dev` starts the demo, a bookshop playground on http://localhost:4605. It shows each interface module with `?module=panel`, `popup`, `inline`, `page` or `search`. A conversation in the demo needs AI Wallet installed in the browser, since the wallet holds the account that answers.

## Layout

| Folder | What it holds |
| --- | --- |
| `packages/core` | The site's side of the SDK: the connection to the wallet, the conversation loop, the guards, the MCP tool source and the adapter for the AI SDKs a site already uses. |
| `packages/react` | The provider, the connect window, the hooks and the interface modules. |
| `packages/elements` | The interface modules as Web Components in one script, and the small loader. |
| `packages/design` | The `--aic-*` design tokens, the TensorPass mark as geometry and the providers' marks. |
| `apps/demo` | The bookshop playground. |
| `integrations/wordpress` | The WordPress plugin. |
| `integrations/claude-code` | The Claude Code plugin. Its `skills` is a link to the `skills` folder, and `.claude-plugin/marketplace.json` at the root lists it. |

## Rules the code follows

ESLint enforces the style. `npm run lint` must pass with no error.

1. Two spaces of indentation, single quotes, semicolons, and a trailing comma on every multiline list.
2. Lines of 120 columns at most.
3. Strict equality, and braces around every block.
4. A warning marks a function longer than 60 lines, a file longer than 600 lines, more than 4 parameters and more than 4 levels of nesting. Split the code by responsibility when one appears.

Conventions the existing code keeps, which a pull request should keep too:

1. Each file opens with a comment that says what the file is responsible for.
2. A comment explains why the code does something.
3. A unit test sits beside the file it tests and is named `*.test.ts`. It uses `node:test` and `node:assert/strict`.
4. The public surface of a package is what its `src/index.ts` exports. A change to it needs the matching change in the reference docs, which a maintainer makes on the website.
5. A text a visitor reads exists in English, French, Hebrew, Arabic and simplified Chinese. The messages of the connect window and of the modules live in `packages/react/src`.

## Send a pull request

1. Open an issue first for a change of behaviour or a new feature, so the direction is agreed before the code.
2. Work on a branch of your fork, with one subject per pull request.
3. Write tests for the rule you add or change.
4. Run the commands of the table above. The same job runs on every pull request and must pass.
5. Describe what changed and why in the pull request, in your own words.

A maintainer reviews the pull request and runs the wallet's end to end tests when the change touches the wallet protocol.

## Licence of your contribution

Section 5 of the Apache License 2.0 applies: a contribution you submit for inclusion in the work is under the terms of that licence, without any additional terms. Send only work you have the right to submit.

## Security

Report a vulnerability in private, as `SECURITY.md` says. Do not open a public issue for it.
