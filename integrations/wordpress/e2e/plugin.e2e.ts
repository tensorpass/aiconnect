// The plugin on a real WordPress: its MCP server serves the published posts to an MCP client, the editor
// inserts the chat block with its settings, and a page with the chat answers a visitor through AI Wallet, the
// visitor's model calling search_posts on the site. Only the provider is played by the test: Mistral asks for a
// search, then answers with the post the search returned.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { expect, test } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';

const SITE = 'http://localhost:5046';
const MCP_URL = `${SITE}/wp-json/aiconnect/v1/mcp`;
const MISTRAL_CHAT = 'https://api.mistral.ai/v1/chat/completions';
const POST_TITLE = 'Feeding a sourdough starter';
const QUESTION = 'How often should I feed my starter?';
const ANSWER = 'Twice a day, with equal weights of flour and water.';

// The built wallet: the aiwallet repository next to this one, or the folder AIWALLET_DIST names.
const WALLET_DIR = process.env.AIWALLET_DIST
  ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../aiwallet/dist');

interface WireRequest {
  messages: { role: string; content?: unknown }[];
  tools?: { function: { name: string } }[];
}

const chunk = (delta: Record<string, unknown>, finish?: string) => (
  `data: ${JSON.stringify({ choices: [{ index: 0, delta, finish_reason: finish ?? null }] })}\n\n`
);

const SEARCH_STREAM = [
  chunk({ tool_calls: [{ index: 0, id: 'call_posts', type: 'function', function: { name: 'search_posts' } }] }),
  chunk({ tool_calls: [{ index: 0, function: { arguments: '{"query":"sourdough starter"}' } }] }),
  chunk({}, 'tool_calls'),
  'data: [DONE]\n\n',
].join('');

const ANSWER_STREAM = [chunk({ content: ANSWER }), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');

async function mcpClient(): Promise<Client> {
  const client = new Client({ name: 'plugin-e2e', version: '0.1.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(MCP_URL)));
  return client;
}

function toolText(result: Awaited<ReturnType<Client['callTool']>>): string {
  return (result.content as { type: string; text: string }[]).map((part) => part.text).join('');
}

async function createWallet(context: BrowserContext): Promise<void> {
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const wallet = await context.newPage();
  await wallet.goto(`chrome-extension://${new URL(worker.url()).host}/wallet.html`);
  await wallet.getByLabel('Password', { exact: true }).fill('e2e wordpress password');
  await wallet.getByLabel('Repeat the password').fill('e2e wordpress password');
  await wallet.getByRole('button', { name: 'Create my wallet' }).click();
  await wallet.getByRole('button', { name: /^Mistral/ }).click();
  await wallet.getByLabel('Mistral API key').fill('e2e-mistral-key');
  await wallet.getByRole('button', { name: 'Connect' }).click();
  await expect(wallet.getByRole('heading', { name: 'Mistral is connected' })).toBeVisible();
  await wallet.close();
}

async function playMistral(context: BrowserContext): Promise<WireRequest[]> {
  const received: WireRequest[] = [];
  await context.route(MISTRAL_CHAT, async (route) => {
    const body = route.request().postDataJSON() as WireRequest;
    received.push(body);
    const searched = body.messages.some((message) => message.role === 'tool');
    await route.fulfill({
      status: 200, contentType: 'text/event-stream', body: searched ? ANSWER_STREAM : SEARCH_STREAM,
    });
  });
  return received;
}

test('the MCP server serves the published posts and pages only', async () => {
  const client = await mcpClient();
  const { tools } = await client.listTools();
  expect(tools.map((tool) => tool.name)).toEqual(['search_posts', 'get_post']);

  const found = JSON.parse(toolText(await client.callTool({ name: 'search_posts', arguments: { query: 'starter' } })));
  expect(found.map((post: { title: string }) => post.title)).toEqual([POST_TITLE]);
  expect(found[0].url).toBe(`${SITE}/feeding-a-sourdough-starter/`);

  const post = JSON.parse(toolText(await client.callTool({ name: 'get_post', arguments: { id: found[0].id } })));
  expect(post.content).toBe('Feed the starter twice a day with equal weights of flour and water.');

  const draft = await client.callTool({ name: 'search_posts', arguments: { query: 'rye' } });
  expect(toolText(draft)).toContain('No post or page matches');
  const missing = await client.callTool({ name: 'get_post', arguments: { id: 999999 } });
  expect(missing.isError).toBe(true);
  await client.close();
});

test('the block writes the chat with the site\'s MCP server and return page, and loads its script', async ({
  page,
}) => {
  await page.goto(`${SITE}/ask-block/`);
  const element = page.locator('aiconnect-chat');
  await expect(element).toHaveAttribute('variant', 'popup');
  await expect(element).toHaveAttribute('mcp', MCP_URL);
  await expect(element).toHaveAttribute('launcher-label', 'Ask the club');
  await expect(element).toHaveAttribute('sign-in-callback', `${SITE}/wp-content/plugins/aiconnect/sign-in.html`);
  await expect(page.getByRole('button', { name: 'Ask the club', exact: true })).toBeVisible();
  await expect(page.locator('script[src*="aiconnect-elements.js"]')).toHaveAttribute('defer', '');
});

test('the editor inserts the chat block and shows its settings', async ({ page }) => {
  await page.goto(`${SITE}/wp-login.php`);
  await page.getByLabel('Username or Email Address').fill('admin');
  await page.getByLabel('Password', { exact: true }).fill(process.env.WP_ADMIN_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Log In' }).click();
  await page.goto(`${SITE}/wp-admin/post-new.php`);
  const welcome = page.getByRole('dialog', { name: /Welcome/ });
  if (await welcome.isVisible({ timeout: 5000 }).catch(() => false)) {
    await welcome.getByRole('button', { name: 'Close' }).click();
  }
  await page.getByRole('button', { name: 'Block Inserter', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search' }).fill('AI Connect');
  await page.getByRole('option', { name: 'AI Connect Chat' }).click();
  const canvas = page.frameLocator('iframe[name="editor-canvas"]');
  await expect(canvas.getByText('Popup, opened from a button')).toBeVisible();
  await page.getByRole('radio', { name: 'Panel at the page edge' }).check();
  await expect(canvas.getByText('Panel at the page edge')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Button label' })).toBeVisible();
});

test('a visitor with AI Wallet asks the chat and their model answers from the posts', async ({ playwright }) => {
  const context = await playwright.chromium.launchPersistentContext('', {
    channel: 'chromium',
    args: [`--disable-extensions-except=${WALLET_DIR}`, `--load-extension=${WALLET_DIR}`],
  });
  await createWallet(context);
  const received = await playMistral(context);
  const site: Page = await context.newPage();
  await site.goto(`${SITE}/ask/`);

  const chat = site.locator('aiconnect-chat[variant="inline"]');
  await chat.getByRole('textbox', { name: 'Ask a question' }).fill(QUESTION);
  // A question asked before the connection opens the wallet's window at once.
  const approval = context.waitForEvent('page', { predicate: (page) => page.url().includes('/wallet.html#') });
  await chat.getByRole('button', { name: 'Send' }).click();
  await (await approval).getByRole('button', { name: 'Approve' }).click();

  await expect(chat.locator('.aic-answer').last()).toHaveText(ANSWER);
  await expect(chat.locator('.aic-tool').last()).toHaveAttribute('data-status', 'done');
  await expect(chat.locator('.aic-account')).toContainText('Answers with Mistral');
  expect(received[0].tools?.map((tool) => tool.function.name)).toEqual(['search_posts', 'get_post']);
  const toolResult = received[1].messages.find((message) => message.role === 'tool');
  expect(JSON.stringify(toolResult?.content)).toContain(POST_TITLE);
  await context.close();
});
