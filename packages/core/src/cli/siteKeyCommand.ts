// `aiconnect site-key <domain>`: signs in to TensorPass in the developer's browser, creates the site key of
// the domain, and prints the key with where it goes in this project. The key is public: it names the site in
// the TensorPass sign in a visitor without AI Wallet opens, and works on https://<domain> and on localhost.

import { signIn } from './loopbackSignIn.ts';
import type { SignInDeps } from './loopbackSignIn.ts';
import { detectStack, placementOf } from './siteKeyPlacement.ts';

export interface SiteKeyRun extends SignInDeps {
  domain: string;
  directory: string;
}

export interface SiteKey {
  key: string;
  domain: string;
  origins: string[];
}

async function createSiteKey(run: SiteKeyRun, token: string): Promise<SiteKey> {
  const response = await run.fetch(`${run.gateway}/_plan/site-keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ domain: run.domain }),
  });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok || typeof body.key !== 'string') {
    const message = (body.error as { message?: string } | undefined)?.message ?? `HTTP ${response.status}`;
    throw new Error(`TensorPass did not create the key: ${message}`);
  }
  return { key: body.key, domain: String(body.domain), origins: (body.origins as string[] | undefined) ?? [] };
}

export async function runSiteKey(run: SiteKeyRun): Promise<SiteKey> {
  const token = await signIn(run);
  const siteKey = await createSiteKey(run, token);
  run.print('');
  run.print(`Site key of ${siteKey.domain}: ${siteKey.key}`);
  run.print(`It works on ${siteKey.origins.join(', ')}. It is public, so it may sit in the site's code.`);
  run.print('');
  for (const line of placementOf(detectStack(run.directory), siteKey.key)) {
    run.print(line);
  }
  return siteKey;
}
