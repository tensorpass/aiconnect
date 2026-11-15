import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import type { CliFetch } from './deviceAuthorization.ts';
import { runSiteKey } from './siteKeyCommand.ts';
import { detectStack, placementOf } from './siteKeyPlacement.ts';

const GATEWAY = 'https://gateway.test';

interface Call {
  url: string;
  fields: Record<string, string>;
  authorization: string | null;
}

// The gateway's device authorization: the code, two polls that wait (the second one too soon), the token,
// then the new key.
function playedGateway(tokenReplies: Record<string, unknown>[]): { fetch: CliFetch; calls: Call[] } {
  const calls: Call[] = [];
  const fetch: CliFetch = async (url, init) => {
    const body = String(init.body ?? '');
    const fields = body.startsWith('{') ? JSON.parse(body) : Object.fromEntries(new URLSearchParams(body));
    calls.push({ url, fields, authorization: new Headers(init.headers).get('authorization') });
    if (url.endsWith('/oauth/device')) {
      return Response.json({
        device_code: 'device-1', user_code: 'ABCD-EFGH', verification_uri: `${GATEWAY}/device`,
        verification_uri_complete: `${GATEWAY}/device?code=ABCD-EFGH`, expires_in: 600, interval: 5,
      });
    }
    if (url.endsWith('/oauth/token')) {
      const reply = tokenReplies.shift()!;
      return Response.json(reply, { status: reply.access_token ? 200 : 400 });
    }
    return Response.json({
      key: 'tpk_abcdefghijklmnopqrstuvwx', domain: fields.domain,
      origins: [`https://${fields.domain}`, 'http://localhost:*', 'http://127.0.0.1:*'], createdAt: 1,
    });
  };
  return { fetch, calls };
}

function project(manifest: object | null): string {
  const directory = mkdtempSync(path.join(import.meta.dirname, '.project-'));
  if (manifest) {
    writeFileSync(path.join(directory, 'package.json'), JSON.stringify(manifest));
  }
  return directory;
}

test('the command signs in with a device code, waits at the interval, and prints the key for Next.js', async (t) => {
  const directory = project({ dependencies: { next: '16.4.6' } });
  t.after(() => rmSync(directory, { recursive: true }));
  const { fetch, calls } = playedGateway([
    { error: 'authorization_pending' }, { error: 'slow_down' }, { access_token: 'tps-1', scope: 'sites' },
  ]);
  const lines: string[] = [];
  const opened: string[] = [];
  const waits: number[] = [];
  const siteKey = await runSiteKey({
    domain: 'shop.example', gateway: GATEWAY, directory, fetch, print: (line) => lines.push(line),
    openBrowser: (url) => opened.push(url), sleep: async (seconds) => void waits.push(seconds),
  });
  assert.equal(siteKey.key, 'tpk_abcdefghijklmnopqrstuvwx');
  assert.deepEqual(calls[0].fields, { client_id: 'aiconnect-cli', scope: 'sites' });
  assert.deepEqual(calls[1].fields, {
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code', device_code: 'device-1', client_id: 'aiconnect-cli',
  });
  assert.deepEqual(waits, [5, 5, 10]);
  assert.equal(calls[4].url, `${GATEWAY}/_plan/site-keys`);
  assert.equal(calls[4].authorization, 'Bearer tps-1');
  assert.deepEqual(calls[4].fields, { domain: 'shop.example' });
  assert.deepEqual(opened, [`${GATEWAY}/device?code=ABCD-EFGH`]);
  assert.ok(lines.some((line) => line.includes('ABCD-EFGH')));
  assert.ok(lines.includes('  NEXT_PUBLIC_TENSORPASS_SITE_KEY=tpk_abcdefghijklmnopqrstuvwx'));
});

test('a declined approval stops the command with the reason', async () => {
  const { fetch } = playedGateway([{ error: 'authorization_pending' }, { error: 'access_denied' }]);
  await assert.rejects(runSiteKey({
    domain: 'shop.example', gateway: GATEWAY, directory: '.', fetch, print: () => undefined,
    openBrowser: () => undefined, sleep: async () => undefined,
  }), { message: 'The sign in was declined on TensorPass.' });
});

test('the key goes where the project reads it: Vite, WordPress or a script tag', (t) => {
  const vite = project({ devDependencies: { vite: '8.3.6' } });
  const plain = project(null);
  const wordpress = project(null);
  writeFileSync(path.join(wordpress, 'wp-config.php'), '<?php');
  t.after(() => [vite, plain, wordpress].forEach((directory) => rmSync(directory, { recursive: true })));
  assert.deepEqual([detectStack(vite), detectStack(wordpress), detectStack(plain)], ['vite', 'wordpress', 'script']);
  assert.ok(placementOf('vite', 'tpk_x').includes('  VITE_TENSORPASS_SITE_KEY=tpk_x'));
  assert.match(placementOf('script', 'tpk_x').join('\n'), /data-site-key="tpk_x"/);
  assert.match(placementOf('wordpress', 'tpk_x').join('\n'), /Settings, AI Connect/);
});
