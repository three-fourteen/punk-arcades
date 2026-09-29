import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LEVEL } from '../src/games/punk-man/default-level.ts';
import { parseLevel, serializeLevel, validateLevel } from '../src/games/punk-man/level.ts';
import type { LevelDefinition } from '../src/games/punk-man/level.ts';
import { Run } from '../src/games/punk-man/model.ts';
import { LevelDraft, levelTools, registerLevelTools } from '../src/games/punk-man/level-lab.ts';

const small = (): LevelDefinition => ({
  version: 1, name: 'Short escape', maze: ['#######', '#.....#', '#######'],
  start: { x: 1, y: 1 }, exit: { x: 5, y: 1 }, charges: [{ x: 2, y: 1 }],
  pickups: [{ kind: 'bolt', position: { x: 3, y: 1 } }], drones: [], requiredCharges: 1, alarmMs: 90000,
});

test('built-in and custom definitions survive export/import without losing placement', () => {
  for (const level of [DEFAULT_LEVEL, small()]) {
    const result = parseLevel(serializeLevel(level));
    assert.ok(result.ok);
    assert.deepEqual(result.level, level);
  }
  assert.equal(new Run().charges.size, 84);
});

test('malformed, oversized, unsupported, and out-of-bounds definitions are rejected', () => {
  assert.equal(parseLevel('{').ok, false);
  assert.equal(parseLevel(' '.repeat(65537)).ok, false);
  for (const value of [null, [], {}, { ...small(), version: 2 }, { ...small(), alarmMs: 0 },
    { ...small(), maze: ['##', '#.#', '###'] }, { ...small(), maze: ['###', '#P#', '###'] },
    { ...small(), requiredCharges: 1.5 }, { ...small(), name: ' ' }, { ...small(), script: 'alert(1)' },
    { ...small(), pickups: [{ kind: 'laser', position: { x: 3, y: 1 } }] },
    { ...small(), drones: [{ kind: 'unknown', home: { x: 4, y: 1 } }] },
    { ...small(), start: { x: -1, y: 1 } }, { ...small(), exit: { x: 30, y: 1 } },
  ]) assert.equal(validateLevel(value).ok, false, JSON.stringify(value));
});

test('reachability, collisions, charge count, and sentry patrols have actionable errors', () => {
  const cases: [LevelDefinition, string][] = [
    [{ ...small(), maze: ['#######', '#..#..#', '#######'] }, 'exit'],
    [{ ...small(), start: { x: 0, y: 0 } }, 'start'],
    [{ ...small(), requiredCharges: 2 }, 'requiredCharges'],
    [{ ...small(), charges: [{ x: 2, y: 1 }, { x: 2, y: 1 }] }, 'charges[1]'],
    [{ ...small(), pickups: [{ kind: 'jaw', position: { x: 2, y: 1 } }] }, 'pickups[0].position'],
    [{ ...small(), drones: [{ kind: 'chaser', home: { x: 1, y: 1 } }] }, 'drones[0].home'],
    [{ ...small(), drones: [{ kind: 'sentry', home: { x: 4, y: 1 }, patrol: [{ x: 0, y: 0 }] }] }, 'drones[0].patrol[0]'],
  ];
  for (const [value, path] of cases) {
    const result = validateLevel(value); assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.path === path), JSON.stringify(result));
  }
});

test('a custom run follows its own movement, pickups, objective, timer, exit, and restart data', () => {
  const source = small(), run = new Run(source);
  source.start.x = 4; source.charges.length = 0;
  assert.deepEqual(run.player, { x: 1, y: 1 });
  assert.ok(Object.isFrozen(run.level.maze));
  run.start(); run.steer('right'); run.update(135);
  assert.equal(run.collected, 1); assert.equal(run.alarm, true);
  assert.equal(run.alarmRemaining, 90000);
  run.update(135); assert.equal(run.ammo.bolt, 2);
  run.update(135); run.update(135); assert.equal(run.phase, 'won');
  const next = new Run(run.level); assert.equal(next.charges.size, 1); assert.equal(next.phase, 'ready');
  assert.throws(() => new Run({ ...small(), requiredCharges: 100 }), /charges/);
});

test('custom walls constrain weapons and sentries use authored waypoints', () => {
  const level = small();
  level.maze = ['###########', '#..#......#', '#.........#', '###########'];
  level.pickups = [];
  level.drones = [{ kind: 'sentry', home: { x: 8, y: 1 }, patrol: [{ x: 8, y: 1 }, { x: 9, y: 1 }] }];
  const run = new Run(level); run.start();
  run.ammo.bolt = 1; run.select('bolt'); run.drones[0].position = { x: 4, y: 1 }; run.fire();
  assert.equal(run.drones[0].removed, 0, 'bolt stops at the custom wall');
  run.drones[0].position = { x: 8, y: 1 };
  run.update(180); run.update(180);
  assert.deepEqual(run.drones[0].position, { x: 9, y: 1 }, 'sentry follows its authored route');
  run.steer('right'); run.update(135); run.update(135);
  assert.deepEqual(run.player, { x: 2, y: 1 }, 'player stops at the custom wall');
});

test('agent tools support invalid draft, repair, preview, and export without changing a run', async () => {
  const run = new Run(); run.start(); run.update(135);
  const before = JSON.stringify(run);
  const draft = new LevelDraft(); draft.brief = 'A tiny escape';
  let previews = 0;
  const tools = levelTools(draft, () => previews++);
  const call = async (suffix: string, input = {}) => JSON.parse(await tools.find(t => t.name === `punk_man_${suffix}`)!.execute(input));
  assert.equal((await call('get_level_context')).brief, 'A tiny escape');
  assert.equal((await call('create_level', { level: { ...small(), requiredCharges: 99 } })).ok, false);
  assert.equal((await call('validate_level')).ok, false);
  assert.equal((await call('export_level')).ok, false);
  assert.equal((await call('create_level', { level: small() })).ok, true);
  assert.equal((await call('preview_level')).summary.name, 'Short escape');
  assert.deepEqual(JSON.parse((await call('export_level')).json), small());
  assert.equal(previews, 3); assert.equal(JSON.stringify(run), before);
  assert.ok(!tools.some(t => /load|play|start/.test(t.name)));
});

test('WebMCP registration is feature-detected and tied to the page lifecycle', async () => {
  const controller = new AbortController(), tools = levelTools(new LevelDraft(), () => {});
  assert.equal(await registerLevelTools(undefined, tools, controller.signal), false);
  const registered: string[] = [];
  assert.equal(await registerLevelTools({ registerTool: async (tool, options) => {
    registered.push(tool.name); assert.equal(options.signal, controller.signal);
  } }, tools, controller.signal), true);
  assert.equal(registered.length, 5);
  controller.abort();
  assert.equal(await registerLevelTools({ registerTool: () => assert.fail('aborted registration') }, tools, controller.signal), false);
});
