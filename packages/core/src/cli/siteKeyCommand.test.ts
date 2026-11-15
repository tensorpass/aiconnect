import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import type { CliFetch } from './loopbackSignIn.ts';
import { runSiteKey } from './siteKeyCommand.ts';
import type { SiteKeyRun } from './siteKeyCommand.ts';
import { detectStack, placementOf } from './siteKeyPlacement.ts';

const GATEWAY = 'https://gateway.test';

interface Call {
  url: string;
  fields: Record<string, string>;
  authorization: string | null;
}

// The gateway: the token endpoint trades the code it issued when the verifier matches the challenge of the
// sign in, then the site keys route creates the key.
function playedGateway(): { fetch: CliFetch; calls: Call[]; challenge: { value: string } } {
  const calls: Call[] = [];
  const challenge = { value: '' };
  const fetch: CliFetch = async (url, init) => {
    const body = String(init.body ?? '');
    const fields = body.startsWith('{') ? JSON.parse(body) : Object.fromEntries(new URLSearchParams(body));
    calls.push({ url, fields, authorization: new Headers(init.headers).get('authorization') });
    if (url.endsWith('/oauth/token')) {
      const matches = createHash('sha256').update(fields.code_verifier).digest('base64url') === challenge.value;
      return matches && fields.code === 'code-1'
        ? Response.json({ access_token: 'tps-1', scope: 'sites' })
        : Response.json({ error: 'invalid_grant' }, { status: 400 });
    }
    return Response.json({
      key: 'tpk_abcdefghijklmnopqrstuvwx', domain: fields.domain,
      origins: [`https://${fields.domain}`, 'http://localhost:*', 'http://127.0.0.1:*'], createdAt: 1,
    });
  };
  return { fetch, calls, challenge };
}

// Plays the developer's browser: it reads the sign in's address, then comes back to the command's callback
// with the answers given, in order.
function playedBrowser(answers: Record<string, string>[], challenge: { value: string }) {
  const opened: string[] = [];
  const replies: { status: number; text: string }[] = [];
  let done: Promise<void> = Promise.resolve();
  const openBrowser = (address: string) => {
    opened.push(address);
    const url = new URL(address);
    challenge.value = url.searchParams.get('code_challenge') ?? '';
    const state = url.searchParams.get('state') ?? '';
    done = (async () => {
      for (const answer of answers) {
        const back = new URL(url.searchParams.get('redirect_uri')!);
        back.search = new URLSearchParams({ state, ...answer }).toString();
        const response = await fetch(back);
        replies.push({ status: response.status, text: await response.text() });
      }
    })();
  };
  return { openBrowser, opened, replies, finished: () => done };
}

function project(manifest: object | null): string {
  const directory = mkdtempSync(path.join(import.meta.dirname, '.project-'));
  if (manifest) {
    writeFileSync(path.join(directory, 'package.json'), JSON.stringify(manifest));
  }
  return directory;
}

function run(overrides: Partial<SiteKeyRun> & Pick<SiteKeyRun, 'fetch' | 'openBrowser'>): Promise<unknown> {
  return runSiteKey({ domain: 'shop.example', gateway: GATEWAY, directory: '.', print: () => undefined, ...overrides });
}

test('the command signs in through its loopback callback and prints the key for Next.js', async (t) => {
  const directory = project({ dependencies: { next: '16.4.6' } });
  t.after(() => rmSync(directory, { recursive: true }));
  const { fetch, calls, challenge } = playedGateway();
  const browser = playedBrowser([{ state: 'another', code: 'stray' }, { code: 'code-1' }], challenge);
  const lines: string[] = [];
  const siteKey = await runSiteKey({
    domain: 'shop.example', gateway: GATEWAY, directory, fetch, print: (line) => lines.push(line),
    openBrowser: browser.openBrowser,
  });
  await browser.finished();
  const opened = new URL(browser.opened[0]);
  const redirectUri = opened.searchParams.get('redirect_uri')!;
  assert.equal(`${opened.origin}${opened.pathname}`, `${GATEWAY}/signin`);
  assert.equal(opened.searchParams.get('client_id'), 'aiconnect-cli');
  assert.equal(opened.searchParams.get('code_challenge_method'), 'S256');
  assert.match(redirectUri, /^http:\/\/127\.0\.0\.1:\d+\/callback$/);
  assert.deepEqual(browser.replies.map((reply) => reply.status), [404, 200], 'a stray request leaves it waiting');
  assert.match(browser.replies[1].text, /The terminal continues/);
  assert.deepEqual({ ...calls[0].fields, code_verifier: 'x' }, {
    grant_type: 'authorization_code', client_id: 'aiconnect-cli', code: 'code-1', code_verifier: 'x',
    redirect_uri: redirectUri,
  });
  assert.deepEqual([calls[1].url, calls[1].authorization], [`${GATEWAY}/_plan/site-keys`, 'Bearer tps-1']);
  assert.deepEqual(calls[1].fields, { domain: 'shop.example' });
  assert.equal(siteKey.key, 'tpk_abcdefghijklmnopqrstuvwx');
  assert.ok(lines.some((line) => line.includes(browser.opened[0])));
  assert.ok(lines.includes('  NEXT_PUBLIC_TENSORPASS_SITE_KEY=tpk_abcdefghijklmnopqrstuvwx'));
  await assert.rejects(globalThis.fetch(redirectUri), 'the server closed after its one sign in');
});

test('a declined sign in stops the command with the reason, and one that never comes back times out', async () => {
  const declined = playedGateway();
  await assert.rejects(run({
    fetch: declined.fetch, openBrowser: playedBrowser([{ error: 'access_denied' }], declined.challenge).openBrowser,
  }), { message: 'The sign in was declined on TensorPass.' });
  const silent = playedGateway();
  await assert.rejects(run({ fetch: silent.fetch, openBrowser: () => undefined, timeoutMs: 50 }), {
    message: 'No sign in came back within 10 minutes. Run the command again.',
  });
  assert.equal(silent.calls.length, 0);
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
