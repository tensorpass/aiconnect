// `aiconnect site-key <domain>`: signs in to TensorPass with a device authorization, creates the site key of
// the domain, and prints the key with where it goes in this project. The key is public: it names the site in
// the TensorPass sign in a visitor without AI Wallet opens, and works on https://<domain> and on localhost.

import { requestDeviceCode, waitForApproval } from './deviceAuthorization.ts';
import type { CliFetch } from './deviceAuthorization.ts';
import { detectStack, placementOf } from './siteKeyPlacement.ts';

export interface SiteKeyRun {
  domain: string;
  gateway: string;
  directory: string;
  fetch: CliFetch;
  print: (line: string) => void;
  // Opens the approval page in the developer's browser, where the computer has one.
  openBrowser: (url: string) => void;
  sleep: (seconds: number) => Promise<void>;
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
  const code = await requestDeviceCode(run);
  run.print(`Approve this command in your browser: ${code.verificationUriComplete}`);
  run.print(`Check that the page shows the code ${code.userCode}, then sign in to TensorPass and approve.`);
  run.openBrowser(code.verificationUriComplete);
  const token = await waitForApproval(run, code);
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
