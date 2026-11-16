// The web sign in of a visitor without AI Wallet, on the plugin's return page. The chat opens OpenRouter's sign
// in in a popup with the plugin's sign-in.html as its callback_url, the popup comes back there with a code, hands
// it to the chat and closes, and the chat trades the code at OpenRouter's real key exchange. The code is made up,
// so OpenRouter refuses it and the chat says the sign in did not finish. scripts/e2e.sh runs this file with
// pretty permalinks, then with plain ones, and names the setting in WP_PERMALINKS. Two more passes bring the code
// back in a tab the browser keeps open, and in a popup that went through Google's sign in first, whose
// Cross-Origin-Opener-Policy cuts it from the chat's page.

import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';
import type { Page, Request } from '@playwright/test';

const SITE = 'http://localhost:5046';
const RETURN_PAGE = `${SITE}/wp-content/plugins/aiconnect/sign-in.html`;
const AUTHORIZE_URL = 'https://openrouter.ai/auth';
const KEY_EXCHANGE_URL = 'https://openrouter.ai/api/v1/auth/keys';
// Google's OAuth page, which a sign in with Google opens and which sends Cross-Origin-Opener-Policy: same-origin.
// https://accounts.google.com/ sent the policy as report only on 16 November 2026, and kept the opener.
const GOOGLE_SIGN_IN = 'https://accounts.google.com/o/oauth2/v2/auth';
const CODE = 'qa-not-a-real-code';
const FAILURE = 'OpenRouter did not finish the sign in. Try again.';
const PERMALINKS = process.env.WP_PERMALINKS;

interface KeyExchange {
  code: string;
  code_verifier: string;
  code_challenge_method: string;
}

const challengeOf = (verifier: string) => createHash('sha256').update(verifier).digest('base64url');

// The page with the inline chat, at its address in the permalink setting of the run. The chat's MCP server
// shows the setting WordPress applies: /wp-json/ with pretty permalinks, ?rest_route= with plain ones.
async function openChat(page: Page) {
  await page.goto(PERMALINKS === 'plain' ? `${SITE}/?pagename=ask` : `${SITE}/ask/`);
  const mcp = PERMALINKS === 'plain' ? /\?rest_route=\/aiconnect\/v1\/mcp$/ : /\/wp-json\/aiconnect\/v1\/mcp$/;
  await expect(page.locator('aiconnect-chat')).toHaveAttribute('mcp', mcp);
  const chat = page.locator('aiconnect-chat[variant="inline"]');
  await expect(chat).toHaveAttribute('sign-in-callback', RETURN_PAGE);
  await expect(chat.getByRole('button', { name: 'Sign in with OpenRouter' })).toBeVisible();
  return chat;
}

// Clicks Sign in with OpenRouter and answers the popup and the address OpenRouter's sign in was sent to.
async function startSignIn(page: Page) {
  const popupOpened = page.waitForEvent('popup');
  // The popup opens empty and goes to OpenRouter as soon as the PKCE challenge is ready.
  const authorizeSent = page.context().waitForEvent('request', (request) => (
    request.url().startsWith(`${AUTHORIZE_URL}?`)
  ));
  await page.getByRole('button', { name: 'Sign in with OpenRouter' }).click();
  const [popup, authorize] = await Promise.all([popupOpened, authorizeSent]);
  expect(authorize.frame().page()).toBe(popup);
  await popup.waitForLoadState();
  return { popup, authorize: new URL(authorize.url()) };
}

// Sends the popup to the return page with OpenRouter's code, as OpenRouter does, and waits for it to close.
async function returnWithCode(page: Page, popup: Page): Promise<Request> {
  const exchange = page.waitForRequest(KEY_EXCHANGE_URL);
  const closed = popup.waitForEvent('close');
  await popup.evaluate((address) => location.assign(address), `${RETURN_PAGE}?code=${CODE}`);
  await closed;
  return exchange;
}

async function expectRefusedExchange(page: Page, exchange: Request, authorize: URL) {
  const body = exchange.postDataJSON() as KeyExchange;
  expect(body.code).toBe(CODE);
  expect(body.code_challenge_method).toBe('S256');
  expect(body.code_verifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
  expect(challengeOf(body.code_verifier)).toBe(authorize.searchParams.get('code_challenge'));
  const response = await exchange.response();
  expect(response?.ok(), `OpenRouter answered ${response?.status()}`).toBe(false);
  const failure = page.getByText(FAILURE);
  await expect(failure).toBeVisible();
  await failure.scrollIntoViewIfNeeded();
}

test.describe(`the sign in with ${PERMALINKS} permalinks`, () => {
  test.skip(!PERMALINKS, 'scripts/e2e.sh names the permalink setting in WP_PERMALINKS');

  test('the return page is the plugin\'s static page, without WordPress', async ({ page }) => {
    const response = await page.goto(`${RETURN_PAGE}?code=${CODE}`);
    expect(response?.headers()['content-type']).toContain('text/html');
    expect(response?.headers()['link'], 'WordPress adds a Link header to the pages it renders').toBeUndefined();
    await expect(page).toHaveTitle('Signing in');
    const scripts = await page.locator('script').evaluateAll((tags) => (
      tags.map((tag) => (tag as HTMLScriptElement).src)
    ));
    expect(scripts).toEqual([`${SITE}/wp-content/plugins/aiconnect/assets/aiconnect-callback.js`]);
    await expect(page.locator('link[rel="stylesheet"], style')).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath('return-page.png') });
  });

  test('the popup comes back to the return page, closes, and the chat trades the code', async ({ page }) => {
    const chat = await openChat(page);
    await chat.screenshot({ path: test.info().outputPath('card.png') });
    const { popup, authorize } = await startSignIn(page);
    expect(authorize.searchParams.get('callback_url')).toBe(RETURN_PAGE);
    expect(authorize.searchParams.get('code_challenge_method')).toBe('S256');
    // OpenRouter sends a visitor who is not signed in to its Sign Up or Sign In page.
    await expect(popup.getByRole('heading', { name: /^Sign (up|in)/i })).toBeVisible({ timeout: 20_000 });
    await popup.screenshot({ path: test.info().outputPath('openrouter.png') });

    const exchange = await returnWithCode(page, popup);
    await expectRefusedExchange(page, exchange, authorize);
    await chat.screenshot({ path: test.info().outputPath('result.png') });
  });

  test('a return page the browser keeps open hands the code back and says the window can close', async ({
    page, context,
  }) => {
    await openChat(page);
    const { popup, authorize } = await startSignIn(page);
    // A tab the visitor's browser opened and navigated twice, which a script may not close.
    const kept = await context.newPage();
    await kept.goto(`${SITE}/`);
    const exchange = page.waitForRequest(KEY_EXCHANGE_URL);
    await kept.goto(`${RETURN_PAGE}?code=${CODE}`);
    await expect(kept.getByText('You are signed in. You can close this window.')).toBeVisible();
    await kept.screenshot({ path: test.info().outputPath('return-page-kept-open.png') });
    await expectRefusedExchange(page, await exchange, authorize);
    await popup.close();
  });

  test('a popup cut from the chat by Google\'s sign in still hands the code back', async ({ page }) => {
    const chat = await openChat(page);
    const { popup, authorize } = await startSignIn(page);
    await popup.goto(GOOGLE_SIGN_IN);
    expect(await popup.evaluate(() => window.opener === null), 'Google\'s page cut the popup from its opener')
      .toBe(true);
    await popup.screenshot({ path: test.info().outputPath('google.png') });

    const exchange = await returnWithCode(page, popup);
    await expectRefusedExchange(page, exchange, authorize);
    await chat.screenshot({ path: test.info().outputPath('result-after-google.png') });
  });
});
