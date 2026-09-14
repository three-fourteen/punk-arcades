import Phaser from 'phaser';
import { MAZE, EXIT } from './map';
import type { Run } from './model';
import { drawPunk } from './punk';
export const TILE = 32;
export const WIDTH = 672;
export const HEIGHT = 608;
const horizontalFacing = new WeakMap<Run, number>();
const center = (n: number) => n * TILE + TILE / 2;
export function drawMaze(g: Phaser.GameObjects.Graphics) {
  g.fillStyle(0x10170e); g.fillRect(0, 0, WIDTH, HEIGHT);
  MAZE.forEach((row, y) => [...row].forEach((cell, x) => {
    const px = x * TILE, py = y * TILE;
    if (cell === '#') {
      g.fillStyle(0x202b19); g.fillRoundedRect(px + 3, py + 3, 26, 26, 3);
      g.lineStyle(1, 0x657d30, .85); g.strokeRoundedRect(px + 3, py + 3, 26, 26, 3);
      g.lineStyle(1, 0xa4b458, .3); g.lineBetween(px + 7, py + 7, px + 15, py + 7);
      g.fillStyle(0x10170e); g.fillRect(px + 23, py + 23, 2, 2);
    } else {
      g.lineStyle(1, 0x293321, .4); g.strokeRect(px, py, TILE, TILE);
      if ((x * 7 + y * 11) % 9 === 0) { g.lineStyle(1, 0x707954, .2); g.lineBetween(px + 4, py + 22, px + 14, py + 19); }
    }
  }));
}
export function drawActors(g: Phaser.GameObjects.Graphics, run: Run, time: number, reduced: boolean) {
  g.clear();
  const pulse = reduced ? 1 : .8 + Math.sin(time / 200) * .2;
  for (const tile of run.charges) {
    const [x, y] = tile.split(',').map(Number);
    g.fillStyle(0xd7f542, .09); g.fillCircle(center(x), center(y), 7);
    g.fillStyle(0xd7f542, pulse); g.fillRect(center(x) - 2, center(y) - 3, 4, 6);
  }
  for (const [tile, pickup] of run.pickups) {
    const [x, y] = tile.split(',').map(Number), px = center(x), py = center(y);
    const color = pickup === 'jaw' ? 0xf4e3a1 : 0x70dacd;
    g.fillStyle(color, .12); g.fillRoundedRect(px - 11, py - 11, 22, 22, 4);
    g.lineStyle(1, color, .9); g.strokeRoundedRect(px - 10, py - 10, 20, 20, 3);
    g.lineStyle(2, color);
    if (pickup === 'pulse') { g.strokeCircle(px, py, 5); g.lineBetween(px, py - 8, px, py + 8); }
    if (pickup === 'bolt') { g.lineBetween(px - 3, py - 7, px + 2, py); g.lineBetween(px + 2, py, px - 3, py + 7); }
    if (pickup === 'shove') { g.lineBetween(px - 5, py - 5, px, py); g.lineBetween(px, py, px - 5, py + 5); g.lineBetween(px + 1, py - 5, px + 6, py); g.lineBetween(px + 6, py, px + 1, py + 5); }
    if (pickup === 'jaw') { g.strokeRect(px - 6, py - 4, 12, 9); for (let i = -3; i <= 3; i += 3) g.lineBetween(px + i, py - 4, px + i, py + 2); }
  }
  const ex = center(EXIT.x), ey = center(EXIT.y);
  g.fillStyle(run.alarm ? 0xd7f542 : 0x465039, run.alarm ? pulse : 1); g.fillRoundedRect(ex - 13, ey - 13, 26, 26, 2);
  g.lineStyle(2, run.alarm ? 0x10170e : 0xb0b9a2); g.lineBetween(ex - 7, ey, ex + 7, ey); g.lineBetween(ex + 2, ey - 5, ex + 7, ey); g.lineBetween(ex + 2, ey + 5, ex + 7, ey);
  for (const drone of run.drones) {
    if (drone.removed > 0) continue;
    const px = center(drone.position.x), py = center(drone.position.y) + (reduced || drone.stunned ? 0 : Math.sin(time / 170 + drone.home.x) * 1.5);
    const color = drone.stunned ? 0x6a7862 : { chaser: 0xff735c, ambusher: 0x70dacd, sentry: 0xb69be8 }[drone.kind];
    g.fillStyle(color, .08); g.fillCircle(px, py, 17);
    g.fillStyle(color); g.fillRoundedRect(px - 11, py - 11, 22, 23, { tl: 10, tr: 10, bl: 0, br: 0 });
    g.fillTriangle(px - 11, py + 12, px - 5, py + 12, px - 8, py + 7); g.fillTriangle(px + 5, py + 12, px + 11, py + 12, px + 8, py + 7);
    g.fillStyle(0x11190f); g.fillRoundedRect(px - 8, py - 5, 16, 9, 2);
    const dx = Math.sign(run.player.x - drone.position.x), dy = Math.sign(run.player.y - drone.position.y);
    g.fillStyle(0xf4f4db); g.fillRect(px - 5 + dx, py - 3 + dy, 3, 5); g.fillRect(px + 2 + dx, py - 3 + dy, 3, 5);
    if (drone.kind === 'chaser') { g.lineStyle(2, color); g.lineBetween(px, py - 12, px, py - 16); }
    if (drone.kind === 'sentry') { g.lineStyle(2, 0x6a508a); g.lineBetween(px - 10, py + 7, px + 10, py + 7); }
    if (drone.stunned > 0) { g.lineStyle(1, 0xf4f4db); g.lineBetween(px - 4, py - 15, px, py - 18); g.lineBetween(px, py - 18, px + 4, py - 15); }
  }
  const px = center(run.player.x), py = center(run.player.y);
  if (run.invulnerable > 0 || run.jaw > 0) { g.lineStyle(2, run.jaw > 0 ? 0xf4e3a1 : 0xffffff, pulse); g.strokeCircle(px, py, 15); }
  if (run.direction === 'left' || run.direction === 'right') horizontalFacing.set(run, run.direction === 'left' ? -1 : 1);
  // One chomp every 600 ms, starting at pickup. The remaining-duration clock
  // freezes on pause and resets on a new run, keeping the animation in sync.
  const jawOpening = run.jaw > 0
    ? reduced ? 3 : 2 * (1 - Math.cos((8000 - run.jaw) / 600 * Math.PI * 2))
    : 0;
  drawPunk(g, px, py, horizontalFacing.get(run) ?? 1, run.jaw > 0, jawOpening);
}
