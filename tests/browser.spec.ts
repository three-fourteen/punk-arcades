import { test, expect, devices } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { LEVEL_PRESETS } from '../src/games/punk-man/default-level';
import { Run } from '../src/games/punk-man/model';
import { pathTo, DIRECTIONS } from '../src/games/punk-man/map';
import type { Direction } from '../src/games/punk-man/map';

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
  await page.locator('#level-file').setInputFiles({ name: 'danger.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...customLevel, pickups: [], drones: [{ kind: 'chaser', home: { x: 3, y: 1 } }] })) });
  await page.getByRole('button', { name: 'Play level', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'BUSTED.' })).toBeVisible({ timeout: 35000 });
  await page.getByRole('button', { name: 'Replay' }).click();
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
  await expect(page.locator('#level-active')).toHaveText('First Spark');
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
  await page.getByRole('button', { name: 'Replay' }).click();
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
  await expect(page.locator('#level-active')).toHaveText('First Spark');
  await expect(page.locator('#progress')).toHaveAttribute('max', String(LEVEL_PRESETS[0].level.requiredCharges));
  expect(errors).toEqual([]);
});

test('JSON editing repairs validation errors and agent fallback is usable', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(document, 'modelContext', { value: undefined, configurable: true }));
  await page.goto('/games/punk-man');
  await page.getByText('Levels & Level Lab', { exact: true }).click();
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
  await page.getByText('Levels & Level Lab', { exact: true }).click();
  await page.getByRole('button', { name: 'Create with an agent', exact: true }).click();
  await expect(page.locator('#level-agent-status')).toContainText('tools are ready');
  const call = (name: string, args = {}) => page.evaluate(async ({ name, args }) => {
    const context = (document as unknown as { modelContext: { executeTool: (tool: { name: string }, args: object) => Promise<string> } }).modelContext;
    return JSON.parse(await context.executeTool({ name: `punk_man_${name}` }, args));
  }, { name, args });
  expect((await call('get_level_context')).presets).toHaveLength(5);
  expect((await call('use_level_preset', { presetId: 'escape-riot' })).ok).toBe(true);
  await expect(page.locator('#level-summary')).toContainText('Escape Riot');
  await expect(page.locator('#level-active')).toHaveText('First Spark');
  expect((await call('create_level', { level: { ...customLevel, exit: { x: 0, y: 0 } } })).ok).toBe(false);
  await expect(page.locator('#level-feedback')).toContainText('floor tile');
  expect((await call('create_level', { level: customLevel })).ok).toBe(true);
  expect((await call('preview_level')).summary.name).toBe('Pocket Riot');
  expect(JSON.parse((await call('export_level')).json)).toEqual(customLevel);
  await expect(page.locator('#level-active')).toHaveText('First Spark');
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
  await expect(page.getByText('Levels & Level Lab', { exact: true })).toBeVisible();
  await page.getByText('Levels & Level Lab', { exact: true }).click();
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

test('campaign win unlocks next level, Next starts immediately, and reload resumes', async ({ page }, testInfo) => {
  await page.goto('/games/punk-man');
  await expect(page.locator('#campaign-level')).toBeEnabled();
  await expect(page.locator('#campaign-level option[value="first-contact"]')).toHaveJSProperty('disabled', true);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.getByRole('button', { name: 'Start the riot' }).click();
  // Keep a small frame margin, then drive the real game along a computed route.
  await page.clock.runFor(32);
  const run = new Run(LEVEL_PRESETS[0].level); run.start();
  for (let i = 0; run.phase === 'playing' && i < 300; i++) {
    const targets = run.alarm ? [run.level.exit] : [...run.charges].map(k => { const [x, y] = k.split(',').map(Number); return { x, y }; });
    targets.sort((a, b) => pathTo(run.player, a, run.level.maze).length - pathTo(run.player, b, run.level.maze).length);
    const next = pathTo(run.player, targets[0], run.level.maze)[0];
    const direction = (Object.keys(DIRECTIONS) as Direction[]).find(d => run.player.x + DIRECTIONS[d].x === next.x && run.player.y + DIRECTIONS[d].y === next.y)!;
    run.steer(direction); run.update(135);
    await page.keyboard.press({ up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[direction]);
    await page.clock.runFor(135);
  }
  await expect(page.getByRole('heading', { name: 'YOU GOT OUT.' })).toBeVisible();
  await expect(page.locator('#campaign-level option[value="first-contact"]')).toHaveJSProperty('disabled', false);
  await expect(page.locator('#next-level')).toBeVisible();
  await page.getByRole('button', { name: 'Next level' }).click();
  await expect(page.locator('#level-active')).toHaveText('First Contact');
  await expect(page.locator('#overlay')).toBeHidden();
  await expect(page.locator('#arena')).toBeFocused();
  await expect(page.locator('#pause')).toBeEnabled();
  await expect(page.locator('#charges')).toHaveText('00');
  await expect(page.locator('#ammo-pulse')).toHaveText('0');
  await page.keyboard.press('ArrowRight');
  await page.clock.runFor(600);
  await expect(page.locator('#charges')).not.toHaveText('00');
  await page.clock.resume();
  await page.reload();
  await expect(page.locator('#level-active')).toHaveText('First Contact');
  await expect(page.locator('#overlay')).toBeVisible();
  await expect(page.locator('#game-help')).not.toHaveAttribute('open', '');
  await page.locator('.campaign-bar').screenshot({ path: testInfo.outputPath('campaign-dropdown.png') });
});

test('custom level named like a campaign stage cannot unlock it', async ({ page }) => {
  await page.goto('/games/punk-man');
  await page.locator('#level-file').setInputFiles({ name: 'copy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...customLevel, name: 'First Spark' })) });
  await page.getByRole('button', { name: 'Play level', exact: true }).click();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { name: 'YOU GOT OUT.' })).toBeVisible();
  await expect(page.locator('#next-level')).toBeHidden();
  await expect(page.locator('#campaign-level option[value="first-contact"]')).toHaveJSProperty('disabled', true);
  await page.reload(); await expect(page.locator('#level-active')).toHaveText('First Spark');
});

for (const mobile of [false, true]) {
  test(`play all five stages with optional help closed (${mobile ? 'iPhone 13 touch' : 'desktop keyboard'})`, async ({ browser }, testInfo) => {
    const context = await browser.newContext(mobile ? { ...devices['iPhone 13'] } : { viewport: { width: 1280, height: 1000 } });
    // Seed completed progress only to exercise every built-in stage through its real picker.
    await context.addInitScript(ids => localStorage.setItem('punk-man:campaign:v1', JSON.stringify({ version: 1, completed: ids })), LEVEL_PRESETS.map(p => p.id));
    const page = await context.newPage(); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('/games/punk-man');
    await expect(page.locator('#campaign-level')).toBeEnabled();
    for (const [index, preset] of LEVEL_PRESETS.entries()) {
      await page.locator('#campaign-level').selectOption(preset.id);
      await expect(page.locator('#level-active')).toHaveText(preset.level.name);
      if (mobile) await page.getByRole('button', { name: 'Start the riot' }).tap();
      else await page.getByRole('button', { name: 'Start the riot' }).click();
      await expect(page.locator('#overlay')).toBeHidden();
      if (mobile) {
        const box = (await page.locator('#stick').boundingBox())!;
        await page.touchscreen.tap(box.x + box.width - 12, box.y + box.height / 2);
      } else await page.keyboard.press('ArrowRight');
      if (index > 0 && index < 4) {
        const weapon = index === 1 ? 'bolt' : index === 2 ? 'pulse' : 'shove';
        await expect(page.locator(`#ammo-${weapon}`)).toHaveText('2');
        if (mobile) await page.locator('#touch-fire').tap(); else await page.keyboard.press('Space');
        await expect(page.locator(`#ammo-${weapon}`)).toHaveText(weapon === 'bolt' ? /^[13]$/ : '1');
      }
      await expect(page.locator('#charges')).not.toHaveText('00');
      if (index === 4) await expect(page.locator('#jaw-label')).toContainText('JAW ONLINE');
      await expect.poll(async () => {
        const arena = (await page.locator('#arena').boundingBox())!, canvas = (await page.locator('#game-canvas canvas').boundingBox())!;
        return canvas.x >= arena.x - 1 && canvas.y >= arena.y - 1 && canvas.x + canvas.width <= arena.x + arena.width + 1 && canvas.y + canvas.height <= arena.y + arena.height + 1;
      }).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`level-${index + 1}.png`) });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator('#game-help')).not.toHaveAttribute('open', '');
      if (mobile) await page.getByRole('button', { name: 'Pause game', exact: true }).tap(); else await page.keyboard.press('p');
      await expect(page.getByRole('heading', { name: 'LAY LOW.' })).toBeVisible();
    }
    expect(errors).toEqual([]); await context.close();
  });
}

test('reset campaign supports cancellation, clears unlocks, preserves the draft, and survives reload', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('reset-test-seeded')) {
      localStorage.setItem('punk-man:campaign:v1', JSON.stringify({ version: 1, completed: ['first-spark', 'first-contact'] }));
      sessionStorage.setItem('reset-test-seeded', 'yes');
    }
  });
  await page.goto('/games/punk-man');
  await expect(page.locator('#level-active')).toHaveText('Crowd Control');
  await page.locator('#level-file').setInputFiles({ name: 'draft.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(customLevel)) });
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Reset campaign', exact: true }).click();
  await expect(page.locator('#level-active')).toHaveText('Crowd Control');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Reset campaign', exact: true }).click();
  await expect(page.locator('#level-active')).toHaveText('First Spark');
  await expect(page.locator('#campaign-level option[value="first-contact"]')).toHaveJSProperty('disabled', true);
  await expect(page.locator('#level-summary')).toContainText('Pocket Riot');
  await expect(page.locator('#charges')).toHaveText('00');
  await expect(page.locator('#next-level')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Start the riot' })).toBeVisible();
  await page.reload();
  await expect(page.locator('#level-active')).toHaveText('First Spark');
  await expect(page.locator('#campaign-level option[value="first-contact"]')).toHaveJSProperty('disabled', true);
});
