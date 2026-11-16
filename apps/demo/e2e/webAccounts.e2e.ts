// A visitor without AI Wallet signs in on the page: OpenRouter, offered to every site, and the TensorPass plan,
// offered with a site key. OpenRouter and TensorPass's gateway are played by the test: each sign in page sends
// the popup straight back to the site with a code, the code becomes a credential, and the chat streams a tool
// call and then an answer built from the demo's catalog.

import { expect, test } from '@playwright/test';
import type { BrowserContext, Page, Route } from '@playwright/test';

const SITE_KEY = 'tpk_e2eSiteKeyOfTheDemo0000';
const ISOLATING_PAGE = 'https://accounts.isolating.test/signin';
const GATEWAY = 'https://plan.tensorpass.app';
const CORS = {
  'access-control-allow-origin': 'http://localhost:4615',
  'access-control-allow-headers': 'authorization, content-type, http-referer, x-title',
  'access-control-allow-methods': 'GET, POST',
};

interface Played {
  // The sign in addresses the popup opened, and the chat calls with their headers and bodies.
  signIns: URL[];
  chats: { authorization: string | null; body: Record<string, unknown> }[];
}

const stream = (events: unknown[]) => events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('')
  + 'data: [DONE]\n\n';

const TOOL_CALL = [{ choices: [{ delta: { tool_calls: [{
  index: 0, id: 'call_1', function: { name: 'search_books', arguments: '{"query":"calm"}' },
}] }, finish_reason: 'tool_calls' }] }];
const ANSWER = [
  { model: 'played/model', choices: [{ delta: { content: 'Try Piranesi, ' } }] },
  { choices: [{ delta: { content: 'a calm and strange book.' }, finish_reason: 'stop' }] },
];

// A sign in page that sends the window back to the address the site gave, as the provider does once the
// visitor approves, or declines.
function signInPage(back: string): string {
  return `<!doctype html><title>Sign in</title><script>location.replace(${JSON.stringify(back)});</script>`;
}

async function answerChat(route: Route, played: Played) {
  if (route.request().method() === 'OPTIONS') {
    await route.fulfill({ status: 204, headers: CORS });
    return;
  }
  const request = route.request();
  const body = request.postDataJSON() as Record<string, unknown>;
  played.chats.push({ authorization: request.headers().authorization ?? null, body });
  const events = played.chats.length % 2 === 1 ? TOOL_CALL : ANSWER;
  await route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'text/event-stream' }, body: stream(events) });
}

// OpenRouter as it answered live on 16 November 2026: back to the callback address with the code alone,
// any query of the address dropped. With `isolate`, its page first passes through a page of another origin
// that sets a Cross-Origin-Opener-Policy, as a sign in with Google does, which cuts the popup from its opener.
async function playOpenRouter(context: BrowserContext, played: Played, isolate = false) {
  await context.route('https://openrouter.ai/auth**', async (route) => {
    const url = new URL(route.request().url());
    played.signIns.push(url);
    const back = new URL(url.searchParams.get('callback_url')!);
    back.search = '?code=c1';
    const next = isolate ? `${ISOLATING_PAGE}?back=${encodeURIComponent(back.toString())}` : back.toString();
    await route.fulfill({ contentType: 'text/html', body: signInPage(next) });
  });
  await context.route(`${ISOLATING_PAGE}**`, (route) => route.fulfill({
    contentType: 'text/html',
    headers: { 'cross-origin-opener-policy': 'same-origin' },
    body: signInPage(new URL(route.request().url()).searchParams.get('back')!),
  }));
  await context.route('https://openrouter.ai/api/v1/auth/keys', (route) => (route.request().method() === 'OPTIONS'
    ? route.fulfill({ status: 204, headers: CORS })
    : route.fulfill({ headers: CORS, json: { key: 'sk-or-v1-played' } })));
  await context.route('https://openrouter.ai/api/v1/chat/completions', (route) => answerChat(route, played));
}

async function playGateway(context: BrowserContext, played: Played, outcome: 'approve' | 'decline') {
  await context.route(`${GATEWAY}/signin**`, async (route) => {
    const url = new URL(route.request().url());
    played.signIns.push(url);
    const back = new URL(url.searchParams.get('redirect_uri')!);
    back.searchParams.set('state', url.searchParams.get('state')!);
    if (outcome === 'approve') {
      back.searchParams.set('code', 'c2');
    } else {
      back.searchParams.set('error', 'access_denied');
    }
    await route.fulfill({ contentType: 'text/html', body: signInPage(back.toString()) });
  });
  const tokens = {
    access_token: 'tpp-played', token_type: 'Bearer', expires_in: 900, refresh_token: 'tpr-1', scope: 'chat',
  };
  await context.route(`${GATEWAY}/oauth/**`, (route) => route.fulfill({ headers: CORS, json: tokens }));
  await context.route(`${GATEWAY}/v1/chat/completions`, (route) => answerChat(route, played));
}

// Opens the connect window, checks the sign ins it offers in their order, and signs in to the account.
async function signIn(page: Page, account: string, offered: string[]) {
  await page.getByRole('button', { name: 'Connect your AI' }).click();
  const dialog = page.getByRole('dialog', { name: 'Connect your AI' });
  await expect(dialog.getByText('Use your ChatGPT, Claude or Gemini plan here')).toBeVisible();
  await expect(dialog.getByText('No extension? Use an account here')).toBeVisible();
  await expect(dialog.getByRole('button', { name: /^Sign in with/ })).toHaveText(offered.map((name) => `Sign in with ${name}`));
  const popup = page.waitForEvent('popup');
  await dialog.getByRole('button', { name: `Sign in with ${account}` }).click();
  return { dialog, popup: await popup };
}

async function askForABook(page: Page) {
  await page.getByPlaceholder('A calm book for tonight').fill('A calm book for tonight');
  await page.getByRole('button', { name: 'Ask' }).click();
  await expect(page.locator('.tool')).toContainText('search_books({"query":"calm"})');
  await expect(page.locator('.answer')).toHaveText('Try Piranesi, a calm and strange book.');
}

test('OpenRouter signs in through its popup, answers with a tool call, and signs out', async ({ page, context }) => {
  const played: Played = { signIns: [], chats: [] };
  await playOpenRouter(context, played);
  await page.goto('/');
  const { popup } = await signIn(page, 'OpenRouter', ['OpenRouter']);
  await popup.waitForEvent('close');
  await expect(page.getByText('Connected with OpenRouter (openrouter/auto)')).toBeVisible();

  const authorize = played.signIns[0];
  expect(authorize.searchParams.get('code_challenge_method')).toBe('S256');
  expect(authorize.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(authorize.searchParams.get('callback_url')).toBe('http://localhost:4615/callback.html');
  expect(authorize.searchParams.get('state')).toMatch(/^[A-Za-z0-9_-]{22}$/);

  await askForABook(page);
  expect(played.chats[0].authorization).toBe('Bearer sk-or-v1-played');
  expect(played.chats[0].body.model).toBe('openrouter/auto');
  expect(JSON.stringify(played.chats[1].body.messages)).toContain('Piranesi');

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Connect your AI' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('aiconnect:web-account'))).toBeNull();
});

test('with a site key, the TensorPass plan comes first and answers through the gateway', async ({ page, context }) => {
  const played: Played = { signIns: [], chats: [] };
  await playGateway(context, played, 'approve');
  await page.goto(`/?siteKey=${SITE_KEY}`);
  const { popup } = await signIn(page, 'TensorPass', ['TensorPass', 'OpenRouter']);
  await popup.waitForEvent('close');
  await expect(page.getByText('Connected with TensorPass (quick)')).toBeVisible();
  expect(played.signIns[0].searchParams.get('client_id')).toBe(SITE_KEY);

  await askForABook(page);
  expect(played.chats[0].authorization).toBe('Bearer tpp-played');
  expect(played.chats[0].body.model).toBe('quick');
});

test('a TensorPass sign in the visitor declines says so in the connect window', async ({ page, context }) => {
  await playGateway(context, { signIns: [], chats: [] }, 'decline');
  await page.goto(`/?siteKey=${SITE_KEY}`);
  const { dialog, popup } = await signIn(page, 'TensorPass', ['TensorPass', 'OpenRouter']);
  await popup.waitForEvent('close');
  await expect(dialog.getByRole('alert')).toHaveText('You cancelled the sign in to TensorPass.');
  await expect(dialog.getByRole('button', { name: 'Sign in with OpenRouter' })).toBeVisible();
});

test('a module offers the same sign ins under its install step, in the page\'s language', async ({ page }) => {
  await page.goto(`/?module=inline&lang=fr&siteKey=${SITE_KEY}`);
  const offer = page.locator('.aic-web');
  await expect(offer.getByText('Sans extension ? Utilisez un compte ici')).toBeVisible();
  await expect(offer.getByRole('button')).toHaveText(['Se connecter avec TensorPass', 'Se connecter avec OpenRouter']);
});

test('a popup a provider page cut from its opener still hands the sign in back and closes', async ({
  page, context,
}) => {
  const played: Played = { signIns: [], chats: [] };
  await playOpenRouter(context, played, true);
  await page.goto('/');
  const { popup } = await signIn(page, 'OpenRouter', ['OpenRouter']);
  await popup.waitForEvent('close');
  await expect(page.getByText('Connected with OpenRouter (openrouter/auto)')).toBeVisible();
});
