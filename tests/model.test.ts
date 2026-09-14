import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Run } from '../src/games/punk-man/model.ts';
import { MAZE, START, EXIT, pathTo, key, walkable, DIRECTIONS, ALARM_MS, REQUIRED_CHARGES } from '../src/games/punk-man/map.ts';
import type { Direction, Point } from '../src/games/punk-man/map.ts';
function safeRun() { const run = new Run(); run.start(); run.drones.forEach(d => d.removed = 1e8); return run; }
function advance(run: Run, ms: number) { for (let i = 0; i < ms; i += 15) run.update(Math.min(15, ms - i)); }
function go(run: Run, target: Point) {
  for (const next of pathTo(run.player, target)) {
    const direction = (Object.keys(DIRECTIONS) as Direction[]).find(d => DIRECTIONS[d].x === next.x - run.player.x && DIRECTIONS[d].y === next.y - run.player.y)!;
    run.steer(direction); advance(run, 135);
  }
}
test('maze is rectangular; every floor, pickup, drone spawn and exit is reachable', () => {
  const run = new Run(); assert.ok(run.charges.size > REQUIRED_CHARGES);
  MAZE.forEach((row,y) => { assert.equal(row.length, 21); [...row].forEach((c,x) => { if(c !== '#' && key({x,y}) !== key(START)) assert.ok(pathTo(START,{x,y}).length, `${x},${y}`); }); });
  for (const tile of run.pickups.keys()) { const [x,y] = tile.split(',').map(Number); assert.ok(walkable({x,y})); }
  for (const drone of run.drones) assert.ok(walkable(drone.home));
  assert.ok(pathTo(START, EXIT).length);
});
test('ready state does not move; walls block movement; queued turns work', () => {
  const run = new Run(); run.steer('right'); advance(run, 500); assert.deepEqual(run.player, START);
  run.start(); run.steer('up'); advance(run, 135); assert.deepEqual(run.player,{x:2,y:1});
  advance(run, 540); assert.deepEqual(run.player,{x:5,y:1});
  run.steer('left'); advance(run, 135); run.steer('down'); advance(run,135); assert.deepEqual(run.player,{x:4,y:2});
});
test('charges collect once and pickups grant scarce ammo', () => {
  const run = safeRun(); go(run,{x:3,y:3}); assert.equal(run.ammo.bolt,2); assert.equal(run.selected,'bolt');
  const count = run.collected; go(run, START); go(run,{x:3,y:3}); assert.equal(run.collected,count); assert.equal(run.ammo.bolt,2);
  run.fire(); run.fire(); run.fire(); assert.equal(run.ammo.bolt,0);
});
test('30 charges activate the alarm and the exit produces a scored win', () => {
  const run = safeRun();
  while (!run.alarm) {
    const nearest = [...run.charges].map(tile => { const [x,y] = tile.split(',').map(Number); return {x,y}; }).sort((a,b)=>pathTo(run.player,a).length-pathTo(run.player,b).length)[0];
    go(run,nearest);
  }
  assert.ok(run.collected >= REQUIRED_CHARGES); assert.ok(run.alarmRemaining <= ALARM_MS);
  go(run,EXIT); assert.equal(run.phase,'won'); assert.ok(run.score > REQUIRED_CHARGES*25);
  const score = run.score; advance(run,1000); assert.equal(run.score,score);
});
test('locked exit does not win; timeout loses; pause freezes every timer', () => {
  const run = safeRun(); run.player = {...EXIT}; advance(run,135); assert.equal(run.phase,'playing');
  run.alarm = true; run.jaw = 2000; run.pause(); advance(run,5000); assert.equal(run.alarmRemaining,ALARM_MS); assert.equal(run.jaw,2000);
  run.pause(); run.player = {...START}; advance(run,ALARM_MS); assert.equal(run.phase,'lost');
});
test('EMP stuns in radius, bolt cannot pass walls, ram pushes and stuns', () => {
  const run = safeRun(), drone = run.drones[0]; drone.removed=0; drone.position={x:3,y:1};
  run.fire(); assert.equal(drone.stunned,3500);
  run.select('bolt'); run.ammo.bolt=2; run.direction='right'; drone.position={x:7,y:1}; run.fire(); assert.equal(drone.removed,0);
  drone.position={x:4,y:1}; run.fire(); assert.equal(drone.removed,6500);
  drone.removed=0; drone.position={x:2,y:1}; run.select('shove'); run.ammo.shove=1; run.fire(); assert.deepEqual(drone.position,{x:5,y:1}); assert.equal(drone.stunned,2500);
});
test('jaw consumes on contact, rewards charges, expires and drones return', () => {
  const run = safeRun(); run.player={x:11,y:13}; advance(run,135); assert.equal(run.jaw,8000);
  const drone=run.drones[0]; drone.position={...run.player}; drone.removed=0;
  const count=run.collected; advance(run,135); assert.equal(run.collected,count+2); assert.ok(drone.removed>0); assert.equal(run.health,3);
  advance(run,8200); assert.equal(run.jaw,0); assert.equal(drone.removed,0); assert.ok(drone.stunned>0);
});
test('damage has a grace period and three hits end the run', () => {
  const run=safeRun(), drone=run.drones[0];
  for(let i=0;i<3;i++) { drone.position={...run.player}; drone.removed=0; drone.stunned=0; drone.clock=0; run.invulnerable=0; advance(run,135); assert.equal(run.health,2-i); if(i===0){ advance(run,135); assert.equal(run.health,2); } }
  assert.equal(run.phase,'lost');
});
test('three drone personalities chase, anticipate and guard differently', () => {
  const run=new Run(); run.start(); run.player={x:1,y:1}; run.direction='right'; advance(run,370);
  assert.deepEqual(run.drones[0].position,pathTo({x:19,y:9},{x:1,y:1})[0]);
  assert.deepEqual(run.drones[1].position,pathTo({x:9,y:7},{x:5,y:1})[0]);
  assert.deepEqual(run.drones[2].position,pathTo({x:15,y:15},{x:19,y:15})[0]);
});
