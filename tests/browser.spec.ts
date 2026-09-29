import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const customLevel = {
  version: 1, name: 'Pocket Riot', author: 'Local player',
  maze: ['#######', '#.....#', '#######'], start: { x: 1, y: 1 }, exit: { x: 5, y: 1 },
  charges: [{ x: 2, y: 1 }], pickups: [{ kind: 'bolt', position: { x: 3, y: 1 } }],
  drones: [], requiredCharges: 1, alarmMs: 90000,
};

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
  await expect(page.locator('#game-canvas canvas')).toBeVisible();
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

test('local import previews, exports, plays, wins, restarts, and survives a failed import', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/games/punk-man');
  await page.locator('#level-file').setInputFiles({ name: 'pocket.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(customLevel)) });
  await expect(page.locator('#level-summary')).toContainText('Pocket Riot');
  await expect(page.locator('#level-preview')).toBeVisible();
  await expect(page.locator('#level-active')).toHaveText('Escape Riot');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON', exact: true }).click();
  const download = await downloadEvent;
  const downloaded = await readFile((await download.path())!, 'utf8');
  expect(JSON.parse(downloaded)).toEqual(customLevel);
  await page.locator('#level-file').setInputFiles({ name: download.suggestedFilename(), mimeType: 'application/json', buffer: Buffer.from(downloaded) });
  await page.getByRole('button', { name: 'Play level', exact: true }).click();
  await expect(page.locator('#level-active')).toHaveText('Pocket Riot');
  await expect(page.locator('#progress')).toHaveAttribute('max', '1');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { name: 'YOU GOT OUT.' })).toBeVisible();
  await page.getByRole('button', { name: 'Run it back' }).click();
  await expect(page.locator('#charges')).toHaveText('00');
  await expect(page.locator('#ammo-bolt')).toHaveText('0');
  await page.locator('#level-file').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await expect(page.locator('#level-feedback')).toContainText('Invalid JSON');
  await expect(page.locator('#level-play')).toBeDisabled();
  await expect(page.locator('#level-download')).toBeDisabled();
  await expect(page.locator('#level-active')).toHaveText('Pocket Riot');
  await page.locator('#arena').focus(); await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { name: 'YOU GOT OUT.' })).toBeVisible();
  await page.getByRole('button', { name: 'Use built-in example' }).click();
  await page.getByRole('button', { name: 'Play level', exact: true }).click();
  await expect(page.locator('#level-active')).toHaveText('Escape Riot');
  await expect(page.locator('#progress')).toHaveAttribute('max', '30');
  expect(errors).toEqual([]);
});

test('JSON editing repairs validation errors and agent fallback is usable', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(document, 'modelContext', { value: undefined, configurable: true }));
  await page.goto('/games/punk-man');
  await page.getByRole('button', { name: 'Create with an agent', exact: true }).click();
  await expect(page.locator('#level-agent-status')).toContainText('unavailable');
  await page.locator('#level-brief').fill('Two routes and a bolt pickup');
  await page.getByRole('button', { name: 'Prepare agent prompt' }).click();
  await expect(page.locator('#level-agent-prompt')).toHaveValue(/Two routes and a bolt pickup/);
  await page.getByRole('button', { name: 'Edit JSON / try again' }).click();
  await page.locator('#level-source').fill(JSON.stringify({ ...customLevel, requiredCharges: 3 }));
  await expect(page.locator('#level-feedback')).toContainText('contains only 1');
  await expect(page.locator('#level-preview')).toBeHidden();
  await page.locator('#level-source').fill(JSON.stringify(customLevel));
  await expect(page.locator('#level-play')).toBeEnabled();
  await expect(page.locator('#level-summary')).toContainText('Pocket Riot');
});

test('WebMCP registration and agent draft repair use the visible player-controlled flow', async ({ page }) => {
  await page.addInitScript(() => {
    const tools = new Map<string, { name: string; execute: (args: object) => Promise<string> }>();
    Object.defineProperty(document, 'modelContext', { configurable: true, value: {
      registerTool: async (tool: { name: string; execute: (args: object) => Promise<string> }, { signal }: { signal: AbortSignal }) => {
        tools.set(tool.name, tool); signal.addEventListener('abort', () => tools.delete(tool.name));
      },
      getTools: async () => [...tools.values()].map(t => ({ name: t.name })),
      executeTool: async (tool: { name: string }, args: object) => tools.get(tool.name)!.execute(args),
    } });
  });
  await page.goto('/games/punk-man');
  await page.getByRole('button', { name: 'Create with an agent', exact: true }).click();
  await expect(page.locator('#level-agent-status')).toContainText('tools are ready');
  const call = (name: string, args = {}) => page.evaluate(async ({ name, args }) => {
    const context = (document as unknown as { modelContext: { executeTool: (tool: { name: string }, args: object) => Promise<string> } }).modelContext;
    return JSON.parse(await context.executeTool({ name: `punk_man_${name}` }, args));
  }, { name, args });
  expect((await call('create_level', { level: { ...customLevel, exit: { x: 0, y: 0 } } })).ok).toBe(false);
  await expect(page.locator('#level-feedback')).toContainText('floor tile');
  expect((await call('create_level', { level: customLevel })).ok).toBe(true);
  expect((await call('preview_level')).summary.name).toBe('Pocket Riot');
  expect(JSON.parse((await call('export_level')).json)).toEqual(customLevel);
  await expect(page.locator('#level-active')).toHaveText('Escape Riot');
  await expect(page.locator('#overlay')).toBeVisible();
  await page.getByRole('button', { name: 'Play level', exact: true }).click();
  await expect(page.locator('#overlay')).toBeHidden();
  await expect(page.locator('#level-active')).toHaveText('Pocket Riot');
});

test('custom level preview and play fit a touch viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('/games/punk-man');
  await page.locator('#level-file').setInputFiles({ name: 'pocket.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(customLevel)) });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Play level', exact: true }).tap();
  await expect(page.locator('#stick')).toBeVisible();
  await expect(page.locator('#level-lab')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Pause game', exact: true }).tap();
  await expect(page.getByRole('button', { name: 'Load level', exact: true })).toBeVisible();
  await context.close();
});

test('wide and tall custom maps keep the canvas fitted and pause controls usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/games/punk-man');
  const wide = { ...customLevel, maze: ['#'.repeat(41), '#' + '.'.repeat(39) + '#', '#'.repeat(41)] };
  const tall = { ...customLevel, maze: ['###', ...Array.from({ length: 29 }, () => '#.#'), '###'],
    exit: { x: 1, y: 29 }, charges: [{ x: 1, y: 2 }], pickups: [] };
  for (const level of [wide, tall]) {
    await page.locator('#level-file').setInputFiles({ name: 'extreme.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(level)) });
    await page.getByRole('button', { name: 'Play level', exact: true }).click();
    await page.getByRole('button', { name: 'Pause game', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Resume riot' })).toBeVisible();
    await expect.poll(async () => {
      const arena = (await page.locator('#arena').boundingBox())!, canvas = (await page.locator('#game-canvas canvas').boundingBox())!;
      return canvas.width <= arena.width + 1 && canvas.height <= arena.height + 1 && arena.height <= 844;
    }).toBe(true);
  }
});
