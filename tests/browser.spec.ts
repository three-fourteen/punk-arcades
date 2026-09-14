import { test, expect } from '@playwright/test';

test('catalogue and credits are usable and do not load the game runtime', async ({ page }) => {
  const gameRequests: string[] = [];
  page.on('request', r => { if (/phaser|game\.[\w-]+\.js/.test(r.url())) gameRequests.push(r.url()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('BIG TROUBLE');
  await expect(page.getByRole('link', { name: 'Enter the arcade' })).toHaveAttribute('href', '/games/punk-man');
  await page.getByRole('link', { name: 'Credits', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Art & sound' })).toBeVisible();
  expect(gameRequests).toEqual([]);
});

test('keyboard play, weapon use, pause, sound and automatic pause', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/games/punk-man');
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Start the riot' }).click();
  await expect(page.locator('#overlay')).toBeHidden();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#charges')).not.toHaveText('00');
  await page.keyboard.press('Space');
  await expect(page.locator('#ammo-pulse')).toHaveText('0');
  await page.keyboard.press('2');
  await expect(page.locator('[data-weapon="bolt"]')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('p');
  await expect(page.getByRole('heading', { name: 'LAY LOW.' })).toBeVisible();
  const score = await page.locator('#score').textContent();
  await page.waitForTimeout(400);
  await expect(page.locator('#score')).toHaveText(score!);
  await page.getByRole('button', { name: 'Resume riot' }).press('Space');
  await expect(page.locator('#overlay')).toBeHidden();
  await page.getByRole('button', { name: 'Sound on' }).click();
  await expect(page.getByRole('button', { name: 'Sound off' })).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('heading', { name: 'LAY LOW.' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('a real unattended run loses and restart resets the entire run', async ({ page }) => {
  await page.goto('/games/punk-man');
  await page.getByRole('button', { name: 'Start the riot' }).click();
  await expect(page.getByRole('heading', { name: 'BUSTED.' })).toBeVisible({ timeout: 35000 });
  await page.getByRole('button', { name: 'Run it back' }).click();
  await expect(page.locator('#overlay')).toBeHidden();
  await expect(page.locator('#health')).toHaveAttribute('aria-label', '3 of 3 integrity');
  await expect(page.locator('#charges')).toHaveText('00');
  await expect(page.locator('#ammo-pulse')).toHaveText('1');
});

for (const width of [320, 768, 1024, 1440]) {
  test(`layout fits at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of ['/', '/games/punk-man', '/credits']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  });
}

test('touch stick steers and touch fire uses ammunition', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('/games/punk-man');
  await page.getByRole('button', { name: 'Start the riot' }).tap();
  await expect(page.locator('#stick')).toBeVisible();
  const box = await page.locator('#stick').boundingBox();
  await page.touchscreen.tap(box!.x + box!.width - 12, box!.y + box!.height / 2);
  await expect(page.locator('#charges')).not.toHaveText('00');
  await page.locator('#touch-fire').tap();
  await expect(page.locator('#ammo-pulse')).toHaveText('0');
  await context.close();
});
