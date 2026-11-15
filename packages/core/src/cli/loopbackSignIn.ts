// The command line's sign in to TensorPass, the way a native app signs in (RFC 8252): it serves one request on
// the computer's loopback, on a port the system picks, and opens TensorPass's sign in in the developer's
// browser with a PKCE challenge, a state and that address. Once the developer approves, the browser comes back
// to the address with a code, which the command trades with its verifier for a token of scope `sites`. The
// server answers that one request and closes. A sign in that does not come back within ten minutes ends the
// command, through one timer.

import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

export const CLI_CLIENT_ID = 'aiconnect-cli';
export const SIGN_IN_MS = 10 * 60_000;

export type CliFetch = (input: string, init: RequestInit) => Promise<Response>;

export interface SignInDeps {
  gateway: string;
  fetch: CliFetch;
  print: (line: string) => void;
  // Opens the sign in in the developer's browser, where the computer has one.
  openBrowser: (url: string) => void;
  timeoutMs?: number;
}

interface Callback {
  redirectUri: string;
  code: Promise<string>;
}

const DONE_PAGE = 'You are signed in to TensorPass. The terminal continues, and you may close this tab.\n';
const DECLINED = 'The sign in was declined on TensorPass.';
const TIMED_OUT = 'No sign in came back within 10 minutes. Run the command again.';

const base64Url = (bytes: Buffer) => bytes.toString('base64url');

function pkcePair(): { verifier: string; challenge: string } {
  const verifier = base64Url(randomBytes(32));
  return { verifier, challenge: base64Url(createHash('sha256').update(verifier).digest()) };
}

// The code of a request that answers this sign in, the refusal it carries, or null for any other request.
function callbackResult(params: URLSearchParams, state: string): string | Error | null {
  if (params.get('state') !== state) {
    return null;
  }
  const code = params.get('code');
  if (code) {
    return code;
  }
  return new Error(params.get('error') === 'access_denied' ? DECLINED : 'TensorPass sent back no code.');
}

// Serves the one `/callback` request that carries this sign in's state, then closes.
async function listenForCallback(state: string, timeoutMs: number): Promise<Callback> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address() as AddressInfo;
  const code = new Promise<string>((resolve, reject) => {
    const finish = (outcome: string | Error) => {
      clearTimeout(timer);
      server.close();
      if (typeof outcome === 'string') {
        resolve(outcome);
      } else {
        reject(outcome);
      }
    };
    const timer = setTimeout(() => finish(new Error(TIMED_OUT)), timeoutMs);
    server.on('request', (request, response) => {
      const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
      const result = url.pathname === '/callback' ? callbackResult(url.searchParams, state) : null;
      const headers = { 'Content-Type': 'text/plain; charset=utf-8', Connection: 'close' };
      if (result === null) {
        response.writeHead(404, headers).end('This address answers the TensorPass sign in of the command line.\n');
        return;
      }
      response.writeHead(200, headers).end(typeof result === 'string' ? DONE_PAGE : `${result.message}\n`);
      finish(result);
    });
  });
  return { redirectUri: `http://127.0.0.1:${port}/callback`, code };
}

function authorizeUrl(gateway: string, fields: Record<string, string>): string {
  const url = new URL(`${gateway}/signin`);
  url.search = new URLSearchParams({
    response_type: 'code', client_id: CLI_CLIENT_ID, code_challenge_method: 'S256', scope: 'sites', ...fields,
  }).toString();
  return url.toString();
}

async function tradeCode(deps: SignInDeps, fields: Record<string, string>): Promise<string> {
  const response = await deps.fetch(`${deps.gateway}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'authorization_code', client_id: CLI_CLIENT_ID, ...fields }).toString(),
  });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok || typeof body.access_token !== 'string') {
    throw new Error(`TensorPass refused the sign in (${response.status} ${String(body.error ?? '')})`.trim());
  }
  return body.access_token;
}

// The access token of scope `sites`, once the developer signs in and approves in the browser.
export async function signIn(deps: SignInDeps): Promise<string> {
  const { verifier, challenge } = pkcePair();
  const state = base64Url(randomBytes(16));
  const callback = await listenForCallback(state, deps.timeoutMs ?? SIGN_IN_MS);
  const url = authorizeUrl(deps.gateway, { redirect_uri: callback.redirectUri, code_challenge: challenge, state });
  deps.print(`Sign in to TensorPass and approve in your browser: ${url}`);
  deps.openBrowser(url);
  const code = await callback.code;
  return tradeCode(deps, { code, code_verifier: verifier, redirect_uri: callback.redirectUri });
}
