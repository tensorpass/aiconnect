// What a visitor without AI Wallet is offered on a phone, in the connect window and in a module: Safari on an
// iPhone gets the AI Wallet app, another iPhone browser hands the page to Safari or to the app, and Android
// keeps the wallet's page.

import { devices, expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const IPHONE = devices['iPhone 15'];
const CHROME_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) '
  + 'CriOS/142.0.7444.77 Mobile/15E148 Safari/604.1';
const APP_LINK = 'https://tensorpass.app/open?url=';
const ORIGIN = 'http://localhost:4615';

// Phones are emulated in Chromium, whatever browser the device list names.
const phone = (device: typeof IPHONE, userAgent = device.userAgent) => ({
  userAgent,
  viewport: device.viewport,
  deviceScaleFactor: device.deviceScaleFactor,
  isMobile: device.isMobile,
  hasTouch: device.hasTouch,
});

async function openConnectWindow(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Connect your AI' }).click();
  return page.getByRole('dialog', { name: 'Connect your AI' });
}

test.describe('Safari on an iPhone', () => {
  test.use(phone(IPHONE));

  test('the connect window offers the AI Wallet app', async ({ page }) => {
    const dialog = await openConnectWindow(page);
    await expect(dialog.getByText('Use your AI on this iPhone')).toBeVisible();
    const app = dialog.getByRole('link', { name: 'Get the AI Wallet app' });
    await expect(app).toHaveAttribute('href', 'https://tensorpass.app/wallet?browser=safari');
    await expect(dialog.getByRole('link')).toHaveCount(1);
  });
});

test.describe('Chrome on an iPhone with iOS 17', () => {
  test.use(phone(IPHONE, CHROME_IOS));

  test('the connect window opens the page in Safari or in AI Wallet, in the same tab', async ({ page }) => {
    const dialog = await openConnectWindow(page);
    await expect(dialog.getByText('Continue in Safari or in AI Wallet')).toBeVisible();
    const safari = dialog.getByRole('link', { name: 'Open in Safari' });
    await expect(safari).toHaveAttribute('href', `x-safari-${ORIGIN}/`);
    await expect(safari).not.toHaveAttribute('target');
    const app = dialog.getByRole('link', { name: 'Open in AI Wallet' });
    await expect(app).toHaveAttribute('href', `${APP_LINK}${encodeURIComponent(`${ORIGIN}/`)}`);
    await expect(app).not.toHaveAttribute('target');
  });

  test('a module offers the same two links in its language', async ({ page }) => {
    const address = `${ORIGIN}/?module=inline&lang=fr`;
    await page.goto(address);
    await expect(page.getByText('Continuez dans Safari ou dans AI Wallet')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ouvrir dans Safari' }))
      .toHaveAttribute('href', `x-safari-${address}`);
    await expect(page.getByRole('link', { name: 'Ouvrir dans AI Wallet' }))
      .toHaveAttribute('href', `${APP_LINK}${encodeURIComponent(address)}`);
  });

  test('a Web Components module offers the same two links', async ({ page }) => {
    await page.goto('/elements.html');
    const inline = page.locator('aiconnect-chat[variant=inline]');
    await expect(inline.getByRole('link', { name: 'Open in Safari' }).first()).toBeVisible();
    await expect(inline.getByRole('link', { name: 'Open in AI Wallet' }).first())
      .toHaveAttribute('href', `${APP_LINK}${encodeURIComponent(`${ORIGIN}/elements.html`)}`);
  });
});

test.describe('Chrome on an iPhone with iOS 16', () => {
  test.use(phone(IPHONE, CHROME_IOS.replace('OS 17_5', 'OS 16_7')));

  test('the connect window opens the page in AI Wallet alone', async ({ page }) => {
    const dialog = await openConnectWindow(page);
    await expect(dialog.getByText('Continue in AI Wallet')).toBeVisible();
    await expect(dialog.getByRole('link')).toHaveCount(1);
    await expect(dialog.getByRole('link', { name: 'Open in AI Wallet' })).toBeVisible();
  });
});

test.describe('Chrome on Android', () => {
  test.use(phone(devices['Pixel 7']));

  test('the connect window keeps the wallet\'s page', async ({ page }) => {
    const dialog = await openConnectWindow(page);
    await expect(dialog.getByText('Add AI Wallet to your browser')).toBeVisible();
    const install = dialog.getByRole('link', { name: 'Install AI Wallet' });
    await expect(install).toHaveAttribute('href', 'https://tensorpass.app/wallet');
    await expect(install).toHaveAttribute('target', '_blank');
  });
});
