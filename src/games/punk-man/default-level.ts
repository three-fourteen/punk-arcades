import { MAZE, START, EXIT, REQUIRED_CHARGES, ALARM_MS, key } from './map.ts';
import type { LevelDefinition } from './level.ts';

const pickups: LevelDefinition['pickups'] = [
  { kind: 'bolt', position: { x: 3, y: 3 } }, { kind: 'pulse', position: { x: 1, y: 9 } },
  { kind: 'shove', position: { x: 9, y: 5 } }, { kind: 'bolt', position: { x: 17, y: 5 } },
  { kind: 'shove', position: { x: 7, y: 15 } }, { kind: 'pulse', position: { x: 15, y: 11 } },
  { kind: 'jaw', position: { x: 11, y: 13 } },
];
const pickupTiles = new Set(pickups.map(p => key(p.position)));
export const DEFAULT_LEVEL: LevelDefinition = {
  version: 1, name: 'Escape Riot', author: 'Punk Arcade',
  maze: MAZE.map(row => row.replace(/[PE]/g, '.')), start: START, exit: EXIT,
  charges: MAZE.flatMap((row, y) => [...row].flatMap((c, x) => c === '.' && (x + y) % 2 === 0 && !pickupTiles.has(key({ x, y })) ? [{ x, y }] : [])),
  pickups,
  drones: [
    { kind: 'chaser', home: { x: 19, y: 9 } },
    { kind: 'ambusher', home: { x: 9, y: 7 } },
    { kind: 'sentry', home: { x: 15, y: 15 }, patrol: [{ x: 15, y: 15 }, { x: 19, y: 15 }, { x: 19, y: 17 }, { x: 11, y: 17 }] },
  ],
  requiredCharges: REQUIRED_CHARGES, alarmMs: ALARM_MS,
};
