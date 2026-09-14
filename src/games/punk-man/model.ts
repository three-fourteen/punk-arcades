import { MAZE, START, EXIT, REQUIRED_CHARGES, ALARM_MS, DIRECTIONS, add, distance, key, pathTo, walkable } from './map.ts';
import type { Direction, Point } from './map.ts';

export type Weapon = 'pulse' | 'bolt' | 'shove';
export type Phase = 'ready' | 'playing' | 'paused' | 'won' | 'lost';
export type Drone = { kind: 'chaser' | 'ambusher' | 'sentry'; position: Point; home: Point; stunned: number; removed: number; clock: number; patrol: number };
export type GameEvent = 'charge' | 'pickup' | 'fire' | 'bite' | 'hit' | 'alarm' | 'won' | 'lost';
export const WEAPONS: Weapon[] = ['pulse', 'bolt', 'shove'];
export const WEAPON_NAMES = { pulse: 'EMP pulse', bolt: 'Scrap bolt', shove: 'Ram blast' };
export class Run {
  phase: Phase = 'ready';
  player = { ...START };
  direction: Direction = 'right';
  requested: Direction | null = null;
  charges = new Set<string>();
  pickups = new Map<string, Weapon | 'jaw'>();
  collected = 0;
  score = 0;
  health = 3;
  elapsed = 0;
  alarmRemaining = ALARM_MS;
  alarm = false;
  jaw = 0;
  invulnerable = 0;
  selected: Weapon = 'pulse';
  ammo = { pulse: 1, bolt: 0, shove: 0 };
  drones: Drone[];
  events: GameEvent[] = [];
  message = 'Find 30 charges. Make your own way out.';
  private playerClock = 0;
  constructor() {
    this.drones = ([
      { kind: 'chaser', home: { x: 19, y: 9 } },
      { kind: 'ambusher', home: { x: 9, y: 7 } },
      { kind: 'sentry', home: { x: 15, y: 15 } },
    ] satisfies Pick<Drone, 'kind' | 'home'>[]).map(d => ({ ...d, position: { ...d.home }, stunned: 0, removed: 0, clock: 0, patrol: 0 }));
    this.pickups.set('3,3', 'bolt');
    this.pickups.set('1,9', 'pulse');
    this.pickups.set('9,5', 'shove');
    this.pickups.set('17,5', 'bolt');
    this.pickups.set('7,15', 'shove');
    this.pickups.set('15,11', 'pulse');
    this.pickups.set('11,13', 'jaw');
    MAZE.forEach((row, y) => [...row].forEach((cell, x) => {
      const p = { x, y };
      if (cell === '.' && (x + y) % 2 === 0 && !this.pickups.has(key(p))) this.charges.add(key(p));
    }));
  }
  start() { if (this.phase === 'ready') this.phase = 'playing'; }
  pause() { if (this.phase === 'playing') this.phase = 'paused'; else if (this.phase === 'paused') this.phase = 'playing'; }
  steer(direction: Direction) { this.requested = direction; }
  select(weapon: Weapon) { this.selected = weapon; }
  cycle() { this.selected = WEAPONS[(WEAPONS.indexOf(this.selected) + 1) % 3]; }
  fire() {
    if (this.phase !== 'playing') return;
    if (this.ammo[this.selected] <= 0) { this.message = 'Empty. Scavenge a weapon or switch with Q.'; return; }
    this.ammo[this.selected]--;
    this.events.push('fire');
    this.message = `${WEAPON_NAMES[this.selected]} fired.`;
    const forward = DIRECTIONS[this.direction];
    const ray: string[] = [];
    let p = this.player;
    for (let i = 0; i < 5; i++) { p = add(p, forward); if (!walkable(p)) break; ray.push(key(p)); }
    for (const drone of this.drones) {
      if (drone.removed > 0) continue;
      if (this.selected === 'pulse' && distance(drone.position, this.player) <= 3) drone.stunned = 3500;
      if (this.selected === 'bolt' && ray.includes(key(drone.position))) { drone.removed = 6500; this.score += 150; }
      if (this.selected === 'shove' && ray.slice(0, 2).includes(key(drone.position))) {
        for (let i = 0; i < 3; i++) { const next = add(drone.position, forward); if (walkable(next)) drone.position = next; else break; }
        drone.stunned = 2500;
      }
    }
  }
  update(delta: number) {
    if (this.phase !== 'playing') return;
    // Bound each simulation slice so a long frame cannot skip collision checks.
    let remaining = Math.min(delta, 250);
    while (remaining > 0 && this.phase === 'playing') { const step = Math.min(remaining, 16); this.tick(step); remaining -= step; }
  }
  private tick(dt: number) {
    this.elapsed += dt;
    this.jaw = Math.max(0, this.jaw - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    if (this.alarm) {
      this.alarmRemaining -= dt;
      if (this.alarmRemaining <= 0) { this.finish(false, 'Lockdown. The corporation wins this round.'); return; }
    }
    this.playerClock += dt;
    if (this.playerClock >= 135) {
      this.playerClock -= 135;
      if (this.requested && walkable(add(this.player, DIRECTIONS[this.requested]))) this.direction = this.requested;
      if (this.requested) {
        const next = add(this.player, DIRECTIONS[this.direction]);
        if (walkable(next)) this.player = next;
      }
      this.collect();
      this.collide();
      if (this.phase !== 'playing') return;
    }
    for (const drone of this.drones) {
      if (drone.removed > 0) { drone.removed = Math.max(0, drone.removed - dt); if (drone.removed === 0) { drone.position = { ...drone.home }; drone.stunned = 900; } continue; }
      if (drone.stunned > 0) { drone.stunned = Math.max(0, drone.stunned - dt); continue; }
      drone.clock += dt;
      const speed = ({ chaser: 270, ambusher: 310, sentry: 360 }[drone.kind]) * (this.alarm ? 0.7 : 1);
      if (drone.clock >= speed) { drone.clock -= speed; this.moveDrone(drone); this.collide(); }
      if (this.phase !== 'playing') return;
    }
  }
  private collect() {
    const tile = key(this.player);
    if (this.charges.delete(tile)) { this.collected++; this.score += 25; this.events.push('charge'); }
    const pickup = this.pickups.get(tile);
    if (pickup) {
      this.pickups.delete(tile);
      if (pickup === 'jaw') { this.jaw = 8000; this.message = 'JAW ONLINE · 8 seconds. Touch drones to consume them.'; }
      else { this.ammo[pickup] += 2; this.selected = pickup; this.message = `${WEAPON_NAMES[pickup]} +2. Space to fire.`; }
      this.events.push('pickup');
    }
    this.checkAlarm();
    if (tile === key(EXIT)) {
      if (this.alarm) this.finish(true, 'You broke the system. Now disappear.');
      else this.message = `Exit sealed. Find ${REQUIRED_CHARGES - this.collected} more charges.`;
    }
  }
  private checkAlarm() {
    if (this.collected >= REQUIRED_CHARGES && !this.alarm) {
      this.alarm = true;
      this.message = 'ALARM! Exit unlocked. Reach the top-right gate in 45 seconds.';
      this.events.push('alarm');
    }
  }
  private moveDrone(drone: Drone) {
    let target = this.player;
    if (drone.kind === 'ambusher') {
      for (let i = 0; i < 4; i++) { const ahead = add(target, DIRECTIONS[this.direction]); if (walkable(ahead)) target = ahead; else break; }
    }
    if (drone.kind === 'sentry' && distance(this.player, drone.home) > 5) {
      const patrol = [{ x: 15, y: 15 }, { x: 19, y: 15 }, { x: 19, y: 17 }, { x: 11, y: 17 }];
      target = patrol[drone.patrol];
      if (key(drone.position) === key(target)) { drone.patrol = (drone.patrol + 1) % patrol.length; target = patrol[drone.patrol]; }
    }
    const next = pathTo(drone.position, target)[0];
    if (next) drone.position = next;
  }
  private collide() {
    for (const drone of this.drones) {
      if (drone.removed > 0 || key(drone.position) !== key(this.player)) continue;
      if (this.jaw > 0) {
        drone.removed = 8000; this.score += 200; this.collected += 2; this.events.push('bite'); this.checkAlarm();
      } else if (this.invulnerable === 0 && drone.stunned === 0) {
        this.health--; this.events.push('hit'); this.invulnerable = 2400;
        this.message = 'Hit! Keep moving. Brief shield active.';
        drone.stunned = 1400;
        if (this.health <= 0) { this.finish(false, 'Busted. Pick a different route. Start a new riot.'); return; }
      }
    }
  }
  private finish(won: boolean, message: string) {
    this.phase = won ? 'won' : 'lost'; this.message = message;
    if (won) this.score += Math.ceil(this.alarmRemaining / 1000) * 10 + this.health * 100;
    this.events.push(won ? 'won' : 'lost');
  }
}
