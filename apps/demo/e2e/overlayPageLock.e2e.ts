// The page behind the side panel and the popup. On a phone of 360 pixels, where they take the whole screen,
// the page holds its scroll against a site's scrollBy and a touch swipe over the module's header, the module
// sits on the visual viewport and the focus goes to the module, so the keyboard stays closed until the
// visitor taps the question box. Closing gives the page back its scroll and its position. On a screen 820
// pixels wide the page beside the module still scrolls and the focus goes to the question box. The window
// is 600 pixels tall there, since the bookshop fits a taller one without scrolling.

import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

const FORMS = [
  { form: 'panel', opener: '.aic-launcher', layer: '.aic-panel' },
  { form: 'popup', opener: '.aic-fab', layer: '.aic-popup' },
];

// The page's scroll position once the browser has run two frames, so a scroll event and the scroll the
// lock answers it with have both landed.
function settledScrollY(page: Page) {
  return page.evaluate(() => new Promise<number>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve(window.scrollY)));
  }));
}

async function scrollPageBy(page: Page, y: number) {
  await page.evaluate((distance) => window.scrollBy(0, distance), y);
  return settledScrollY(page);
}

// A finger drawn 300 pixels up over the module's header, through Chromium's own touch gestures.
async function swipeOver(page: Page, target: Locator) {
  const box = await target.boundingBox();
  const session = await page.context().newCDPSession(page);
  await session.send('Input.synthesizeScrollGesture', {
    x: Math.round(box!.x + box!.width / 2), y: Math.round(box!.y + box!.height / 2), yDistance: -300,
    gestureSourceType: 'touch', speed: 1200,
  });
  await session.detach();
  return settledScrollY(page);
}

function rootStyle(page: Page) {
  return page.evaluate(() => {
    const { overflow, overscrollBehavior } = document.documentElement.style;
    return { overflow, overscrollBehavior };
  });
}

test.describe('on a phone of 360 pixels', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });

  for (const { form, opener, layer } of FORMS) {
    test(`the ${form} holds the page behind it, and closing gives the page back`, async ({ page }) => {
      await page.goto(`/?module=${form}`);
      await scrollPageBy(page, 60);
      await page.locator(opener).click();
      const module = page.locator(layer);
      await expect(module).toBeVisible();
      await expect(module).toBeFocused();
      const held = await settledScrollY(page);
      expect(await rootStyle(page)).toEqual({ overflow: 'hidden', overscrollBehavior: 'none' });
      expect(await module.evaluate((node) => node.style.getPropertyValue('--aic-viewport-height')))
        .toBe(`${await page.evaluate(() => window.visualViewport!.height)}px`);

      expect(await scrollPageBy(page, 300)).toBe(held);
      expect(await swipeOver(page, module.locator('.aic-head'))).toBe(held);

      await module.getByRole('button', { name: 'Close' }).click();
      await expect(module).toBeHidden();
      expect(await settledScrollY(page)).toBe(held);
      expect(await rootStyle(page)).toEqual({ overflow: '', overscrollBehavior: '' });
      expect(await module.evaluate((node) => node.style.getPropertyValue('--aic-viewport-height'))).toBe('');
      expect(await scrollPageBy(page, 300)).toBeGreaterThan(held);
    });
  }
});

test.describe('on a screen of 820 pixels', () => {
  test.use({ viewport: { width: 820, height: 600 } });

  for (const { form, opener, layer } of FORMS) {
    test(`the page beside the ${form} still scrolls`, async ({ page }) => {
      await page.goto(`/?module=${form}`);
      await page.locator(opener).click();
      await expect(page.locator(layer)).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Ask a question' })).toBeFocused();
      expect(await rootStyle(page)).toEqual({ overflow: '', overscrollBehavior: '' });
      const before = await settledScrollY(page);
      expect(await scrollPageBy(page, 300)).toBeGreaterThan(before);
    });
  }
});
