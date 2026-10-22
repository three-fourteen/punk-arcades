import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Campaign, CAMPAIGN_STORAGE_KEY } from '../src/games/punk-man/campaign.ts';
import { LEVEL_PRESETS } from '../src/games/punk-man/default-level.ts';
import { Run } from '../src/games/punk-man/model.ts';
import type { LevelDefinition } from '../src/games/punk-man/level.ts';
import { DIRECTIONS, pathTo } from '../src/games/punk-man/map.ts';
import type { Direction } from '../src/games/punk-man/map.ts';

function memory(initial = '') {
  let value = initial;
  return { getItem: () => value, setItem: (key: string, next: string) => { assert.equal(key, CAMPAIGN_STORAGE_KEY); value = next; } };
}
test('campaign unlocks sequentially, persists, replays, and ends at level five', () => {
  const storage = memory(), campaign = new Campaign(storage);
  assert.equal(campaign.activeId, LEVEL_PRESETS[0].id);
  assert.equal(campaign.select(LEVEL_PRESETS[1].id), false);
  for (const [index, preset] of LEVEL_PRESETS.entries()) {
    assert.equal(campaign.select(preset.id), true);
    campaign.win(); campaign.win();
    assert.equal(campaign.next()?.id, LEVEL_PRESETS[index + 1]?.id);
    assert.equal(new Campaign(storage).activeId, (LEVEL_PRESETS[index + 1] ?? preset).id);
  }
  campaign.select(LEVEL_PRESETS[0].id);
  assert.equal(campaign.isComplete(LEVEL_PRESETS[4].id), true);
});
test('custom wins never unlock campaign stages; broken storage retains session progress', () => {
  const campaign = new Campaign(); campaign.custom(); campaign.win();
  assert.equal(campaign.next(), undefined);
  assert.equal(campaign.isUnlocked(LEVEL_PRESETS[1].id), false);
  for (const value of ['{', '{}', '{"version":2,"completed":["first-spark"]}', '{"version":1,"completed":["escape-riot"]}']) {
    assert.equal(new Campaign(memory(value)).activeId, LEVEL_PRESETS[0].id);
  }
  const unavailable = new Campaign({ getItem() { throw Error('blocked'); }, setItem() { throw Error('full'); } });
  unavailable.win(); assert.equal(unavailable.isUnlocked(LEVEL_PRESETS[1].id), true);
});

const corridor = (): LevelDefinition => ({
  version: 1, name: 'Projectile fixture', maze: ['#############', '#...........#', '#...........#', '#############'],
  start: { x: 1, y: 1 }, exit: { x: 11, y: 1 }, charges: [{ x: 11, y: 2 }], pickups: [],
  drones: [{ kind: 'sentry', home: { x: 4, y: 1 } }, { kind: 'sentry', home: { x: 5, y: 1 } }], requiredCharges: 1, alarmMs: 90000,
  startingAmmo: { pulse: 0, bolt: 3, shove: 0 },
});
function armed(level = corridor()) {
  const run = new Run(level); run.start(); run.select('bolt');
  run.drones.forEach(d => d.stunned = 10000); return run;
}
test('bolt travels at 12 tiles/second, hits only the first drone, and spends ammo once', () => {
  const run = armed(); run.fire();
  assert.equal(run.drones[0].removed, 0); assert.equal(run.ammo.bolt, 2);
  run.update(100); assert.ok(Math.abs(run.projectiles[0].position.x - 2.2) < 0.001);
  run.update(150);
  assert.ok(run.drones[0].removed > 0); assert.equal(run.drones[1].removed, 0);
  assert.equal(run.projectiles.length, 0); assert.equal(run.score, 150);
});
test('walls and range stop shots, including a long frame, without passing through targets', () => {
  const level = corridor(); level.maze[1] = '#..#........#';
  const blocked = armed(level); blocked.fire(); blocked.update(250);
  assert.equal(blocked.projectiles.length, 0); assert.equal(blocked.drones[0].removed, 0);
  const run = armed(); run.drones.forEach(d => d.position.x = 8); run.fire(); run.update(250); run.update(250);
  assert.equal(run.projectiles.length, 0); assert.equal(run.score, 0);
});
test('shots hit enemies moving into their path and freeze on pause; restart clears shots and effects', () => {
  const run = armed(); run.drones.forEach(d => d.position.y = 2); run.fire(); run.update(100);
  const shot = structuredClone(run.projectiles); run.pause(); run.update(250); assert.deepEqual(run.projectiles, shot);
  run.pause(); run.drones[0].position = { x: 3, y: 1 }; run.update(100); assert.ok(run.drones[0].removed > 0);
  run.fire(); run.fire(); run.fire(); assert.equal(run.ammo.bolt, 0); assert.equal(run.projectiles.length, 2);
  const restart = new Run(run.level); assert.deepEqual(restart.projectiles, []); assert.deepEqual(restart.effects, []);
  assert.equal(restart.ammo.bolt, 3); assert.equal(restart.health, 3); assert.equal(restart.score, 0);
});

test('all campaign gates are reachable within their alarm, and new mechanics follow safe starts', () => {
  assert.equal(LEVEL_PRESETS[0].level.drones.length, 2);
  assert.equal(LEVEL_PRESETS[0].level.pickups.length, 0);
  for (const { level } of LEVEL_PRESETS) {
    const run = new Run(level); run.start();
    assert.deepEqual(run.ammo, { pulse: 0, bolt: 0, shove: 0 });
    for (const drone of run.drones) assert.ok(pathTo(level.start, drone.home, level.maze).length >= 10);
    // Geometry/timer check independently of enemy combat balance.
    run.drones.forEach(d => d.removed = 1e8);
    for (let steps = 0; run.phase === 'playing' && steps < 300; steps++) {
      const targets = run.alarm ? [level.exit] : [...run.charges].map(k => { const [x, y] = k.split(',').map(Number); return { x, y }; });
      targets.sort((a, b) => pathTo(run.player, a, level.maze).length - pathTo(run.player, b, level.maze).length);
      const next = pathTo(run.player, targets[0], level.maze)[0];
      const direction = (Object.keys(DIRECTIONS) as Direction[]).find(d => run.player.x + DIRECTIONS[d].x === next.x && run.player.y + DIRECTIONS[d].y === next.y)!;
      run.steer(direction); run.update(135);
    }
    assert.equal(run.phase, 'won', level.name);
  }
});

test('each campaign level has a live-enemy escape route using its available weapons', () => {
  for (const { level } of LEVEL_PRESETS) {
    const run = new Run(level); run.start();
    for (let steps = 0; steps < 300 && run.phase === 'playing'; steps++) {
      for (const drone of run.drones) {
        if (drone.removed || drone.stunned) continue;
        const dx = drone.position.x - run.player.x, dy = drone.position.y - run.player.y;
        const distance = Math.abs(dx) + Math.abs(dy);
        if (distance <= 3 && run.ammo.pulse) { run.select('pulse'); run.fire(); }
        else if (distance <= 5 && (dx === 0 || dy === 0)) {
          const facing = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
          if (facing === run.direction) {
            if (run.ammo.bolt) { run.select('bolt'); run.fire(); }
            else if (distance <= 2 && run.ammo.shove) { run.select('shove'); run.fire(); }
          }
        }
      }
      const targets = run.alarm ? [level.exit] : [...run.charges, ...[...run.pickups].filter(([, kind]) => kind === 'jaw' || run.ammo[kind] < 2).map(([tile]) => tile)].map(k => { const [x, y] = k.split(',').map(Number); return { x, y }; });
      targets.sort((a, b) => pathTo(run.player, a, level.maze).length - pathTo(run.player, b, level.maze).length);
      const next = pathTo(run.player, targets[0], level.maze)[0];
      const direction = (Object.keys(DIRECTIONS) as Direction[]).find(d => run.player.x + DIRECTIONS[d].x === next.x && run.player.y + DIRECTIONS[d].y === next.y)!;
      run.steer(direction); run.update(135);
    }
    assert.equal(run.phase, 'won', `${level.name}: a live escape remains possible`);
  }
});


test('campaign reset clears completion and persists without touching other storage', () => {
  const storage = memory(), campaign = new Campaign(storage);
  for (const preset of LEVEL_PRESETS) { campaign.select(preset.id); campaign.win(); }
  campaign.custom(); assert.equal(campaign.reset(), true);
  assert.equal(campaign.activeId, LEVEL_PRESETS[0].id);
  assert.equal(campaign.next(), undefined);
  for (const preset of LEVEL_PRESETS) assert.equal(campaign.isComplete(preset.id), false);
  assert.equal(new Campaign(storage).isUnlocked(LEVEL_PRESETS[1].id), false);
  const blocked = new Campaign({ getItem() { return ''; }, setItem() { throw Error('blocked'); } });
  blocked.win(); assert.equal(blocked.reset(), false);
  assert.equal(blocked.isUnlocked(LEVEL_PRESETS[1].id), false);
});
