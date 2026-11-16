# Releasing the SDK

The four public packages share one version. The workspace root and the demo are private.

## npm authentication

Each package trusts the GitHub Actions workflow `publish.yml` in `tensorpass/aiwallet-sdk`, with permission to publish. The workflow runs on GitHub-hosted Ubuntu with OIDC (`id-token: write`), so no npm token is stored in GitHub. The repository must be public for npm provenance.

An npm maintainer with two-factor authentication configures each package once:

```bash
npm trust github @tensorpass/aiconnect-design --repo tensorpass/aiwallet-sdk --file publish.yml --allow-publish
npm trust github @tensorpass/aiconnect --repo tensorpass/aiwallet-sdk --file publish.yml --allow-publish
npm trust github @tensorpass/aiconnect-react --repo tensorpass/aiwallet-sdk --file publish.yml --allow-publish
npm trust github @tensorpass/aiconnect-elements --repo tensorpass/aiwallet-sdk --file publish.yml --allow-publish
```

## Version and validate

1. Update the root, demo and four package versions, their internal dependency versions, and `package-lock.json` together. Published versions cannot be replaced.
2. Run `npm ci`, `npm audit --audit-level=high`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm test` and `npm run release:check`.
3. Check the packed packages in a fresh consumer, including the `aiconnect` CLI, Node imports, React and the Web Components bundles.
4. Commit and push to `main`, and wait for CI to pass. A manual run of `publish.yml` on `main` also validates without publishing.

## Publish

Tag the checked commit as `v<version>` and push that tag. `publish.yml` verifies the tag, versions, metadata, packed files and tests before publishing design, core, React and elements in order, with provenance. Inspect the workflow and npm registry to confirm all four packages arrived.

Version 0.1.0 was first published manually. Version 0.1.1 adds repository metadata and the automated release setup; provenance applies to versions published through the workflow.
