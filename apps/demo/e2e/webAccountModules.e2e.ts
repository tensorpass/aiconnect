// A module's chat with a web account, the gateway played: a TensorPass account without a plan gets the offer
// to subscribe and is answered once the plan is active, the badge names the plan's level in full on a phone,
// Sign out brings the connection step back, the question box grows without a scrollbar for one line, and an
// answer's addresses become short links above the site's own line under the question box.

import { expect, test } from '@playwright/test';
import type { BrowserContext, Page, Route } from '@playwright/test';

const SITE_KEY = 'tpk_e2eSiteKeyOfTheDemo0000';
const GATEWAY = 'https://plan.tensorpass.app';
const CORS = {
  'access-control-allow-origin': 'http://localhost:4615',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET, POST',
};
const PLANS = [
  { id: 'light', name: 'Light', levels: ['quick'], price: { amount: 500, currency: 'usd' } },
  { id: 'pro', name: 'Pro', levels: ['quick', 'smart'], price: { amount: 2000, currency: 'usd' } },
  { id: 'max', name: 'Max', levels: ['quick', 'smart', 'expert'], price: { amount: 5000, currency: 'usd' } },
];
const BILLING_PAGE = `${GATEWAY}/billing?ticket=t1&view=subscribe&plan=pro&from=site`;

interface Plan {
  active: boolean;
  // What the played model answers, 'Try Piranesi.' unless the test sets it.
  answer?: string;
}

const streamed = (content: string) => (
  `data: ${JSON.stringify({ choices: [{ delta: { content }, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n`
);

function answerChat(route: Route, plan: Plan) {
  if (!plan.active) {
    const error = { type: 'plan_error', code: 'plan_inactive', message: 'This plan has no active subscription.' };
    return route.fulfill({ status: 402, headers: CORS, json: { error } });
  }
  return route.fulfill({
    headers: { ...CORS, 'content-type': 'text/event-stream' }, body: streamed(plan.answer ?? 'Try Piranesi.'),
  });
}

// TensorPass's gateway for an account whose plan the test turns on, with every route answering its preflight.
async function playGateway(context: BrowserContext, plan: Plan) {
  await context.route(`${GATEWAY}/**`, (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS });
    }
    if (url.pathname === '/v1/chat/completions') {
      return answerChat(route, plan);
    }
    if (url.pathname === '/_plan/web/subscription') {
      return route.fulfill({ headers: CORS, json: { status: plan.active ? 'active' : 'none', plans: PLANS } });
    }
    if (url.pathname === '/_plan/web/billing-page') {
      return route.fulfill({ headers: CORS, json: { url: BILLING_PAGE } });
    }
    if (url.pathname === '/billing') {
      return route.fulfill({ contentType: 'text/html', body: '<title>TensorPass billing</title>' });
    }
    return route.fulfill({ headers: CORS, json: {} });
  });
}

// A visitor who signed in with TensorPass on an earlier visit: the token waits in the site's storage.
async function signedIn(page: Page) {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e-seeded')) {
      sessionStorage.setItem('e2e-seeded', '1');
      localStorage.setItem('aiconnect:web-account', JSON.stringify({
        account: 'tensorpass', accessToken: 'tpp-1', refreshToken: 'tpr-1', expiresAt: Date.now() + 600_000,
      }));
    }
  });
}

async function ask(page: Page, question: string) {
  await page.getByRole('textbox', { name: 'Ask a question' }).fill(question);
  await page.getByRole('button', { name: 'Send' }).click();
}

test('an account without a plan gets the plans, and the question is answered once the plan is active', async ({
  page, context,
}) => {
  const plan = { active: false };
  await playGateway(context, plan);
  await signedIn(page);
  await page.goto(`/?module=inline&siteKey=${SITE_KEY}`);
  await ask(page, 'A calm book');
  const offer = page.locator('.aic-plan-offer');
  await expect(offer).toContainText('Your TensorPass account has no plan yet');
  await expect(offer.locator('.aic-plan-price')).toHaveText(['$5.00 a month', '$20.00 a month', '$50.00 a month']);
  await expect(offer.locator('.aic-plan-levels').nth(2)).toHaveText('Quick, Smart, Expert');
  await expect(page.locator('.aic-error')).toHaveCount(0);

  const billing = context.waitForEvent('page');
  await offer.getByRole('button', { name: 'Choose Pro' }).click();
  await expect(await billing).toHaveURL(BILLING_PAGE);
  plan.active = true;
  await page.bringToFront();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('.aic-answer')).toHaveText('Try Piranesi.');
  await expect(page.locator('.aic-question')).toHaveCount(1);
  await expect(offer).toHaveCount(0);
});

test('on a phone the badge names the level in full, and Sign out brings the connection step back', async ({
  page, context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await playGateway(context, { active: true });
  await signedIn(page);
  await page.goto(`/?module=inline&siteKey=${SITE_KEY}`);
  const model = page.locator('.aic-account-model');
  await expect(model).toHaveText('Quick');
  expect(await model.evaluate((chip) => chip.scrollWidth <= chip.clientWidth)).toBe(true);
  await ask(page, 'A calm book');
  await expect(page.locator('.aic-answer')).toHaveText('Try Piranesi.');
  await ask(page, 'Another one');
  await expect(page.locator('.aic-answer')).toHaveCount(2);

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.locator('.aic-question')).toHaveCount(0);
  await expect(page.getByText('Use your ChatGPT, Claude or Gemini plan here')).toBeVisible();
  await expect(page.locator('.aic-web').getByRole('button')).toHaveText(['Sign in with TensorPass',
    'Sign in with OpenRouter']);
  await ask(page, 'A third question');
  await expect(page.locator('.aic-question')).toContainText('A third question');
  await expect(page.locator('.aic-turn .aic-web').getByRole('button', { name: 'Sign in with OpenRouter' }))
    .toBeVisible();
});

test('the question box shows no scrollbar for one line, grows to six, then scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?module=inline');
  const field = page.getByRole('textbox', { name: 'Ask a question' });
  const measure = () => field.evaluate((box) => ({
    height: box.clientHeight, scrolls: box.scrollHeight > box.clientHeight, overflow: getComputedStyle(box).overflowY,
  }));
  await field.fill('One line');
  const one = await measure();
  expect(one).toMatchObject({ scrolls: false, overflow: 'hidden' });
  await field.fill(Array.from({ length: 6 }, (_, line) => `Line ${line + 1}`).join('\n'));
  const six = await measure();
  expect(six.height).toBeGreaterThan(one.height);
  expect(six.overflow).toBe('hidden');
  await field.fill(Array.from({ length: 14 }, (_, line) => `Line ${line + 1}`).join('\n'));
  expect(await measure()).toMatchObject({ scrolls: true, overflow: 'auto' });
  const send = await page.getByRole('button', { name: 'Send' }).boundingBox();
  const box = await page.locator('.aic-field').boundingBox();
  expect(send!.x + send!.width).toBeLessThanOrEqual(box!.x + box!.width);
});

test('an answer\'s bare address and bold link become links, above the site\'s line under the question box', async ({
  page, context,
}) => {
  const answer = 'Read it at http://localhost:4615/books/piranesi. Or open **[Gilead](/books/gilead)**.';
  await playGateway(context, { active: true, answer });
  await signedIn(page);
  await page.goto(`/?module=inline&siteKey=${SITE_KEY}`);
  await ask(page, 'A calm book');
  const links = page.locator('.aic-answer a');
  await expect(links).toHaveText(['localhost:4615/books/piranesi', 'Gilead']);
  await expect(links.first()).toHaveAttribute('href', 'http://localhost:4615/books/piranesi');
  await expect(page.locator('.aic-answer strong a')).toHaveAttribute('href', '/books/gilead');

  const credit = page.locator('.aic-module-foot').getByRole('link', { name: 'AI features powered by TensorPass' });
  await expect(credit).toHaveAttribute('href', /utm_source=demo/);
  const composer = await page.locator('.aic-composer').boundingBox();
  const foot = await page.locator('.aic-module-foot').boundingBox();
  expect(foot!.y).toBeGreaterThanOrEqual(composer!.y + composer!.height);
});
