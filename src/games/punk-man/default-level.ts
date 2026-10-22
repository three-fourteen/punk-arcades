import type { DroneKind, LevelDefinition, PickupKind } from './level.ts';

export type LevelPreset = { id: string; goal: string; level: LevelDefinition };
// Authoring notation only. Exported definitions contain ordinary floor/wall tiles.
function preset(id: string, name: string, goal: string, rows: string[], requiredCharges: number, alarmMs: number): LevelPreset {
  const level: LevelDefinition = {
    version: 1, name, author: 'Punk Arcade', maze: rows.map(row => row.replace(/[^#]/g, '.')),
    start: { x: 0, y: 0 }, exit: { x: 0, y: 0 }, charges: [], pickups: [], drones: [],
    startingAmmo: { pulse: 0, bolt: 0, shove: 0 }, requiredCharges, alarmMs,
  };
  const pickups: Record<string, PickupKind> = { b: 'bolt', p: 'pulse', r: 'shove', j: 'jaw' };
  const drones: Record<string, DroneKind> = { C: 'chaser', A: 'ambusher', S: 'sentry' };
  rows.forEach((row, y) => [...row].forEach((symbol, x) => {
    const position = { x, y };
    if (symbol === 'P') level.start = position;
    if (symbol === 'E') level.exit = position;
    if (symbol === 'c') level.charges.push(position);
    if (pickups[symbol]) level.pickups.push({ kind: pickups[symbol], position });
    if (drones[symbol]) level.drones.push({ kind: drones[symbol], home: position });
  }));
  return { id, goal, level };
}

export const LEVEL_PRESETS: LevelPreset[] = [
  preset('first-spark', 'First Spark', 'Collect charges, evade two chasers using reconnecting loops, and reach the gate.', [
    '###################',
    '#P...c.......c.c..#',
    '#.#####.###.#####.#',
    '#..c#..c#..c#c.c..#',
    '#.#.#.#.#.#.#####.#',
    '#c#c..#c..#.#c...c#',
    '#.#.#######.#.###.#',
    '#.#..c....#.#.C.#.#',
    '#.#.###.#.#.###.#.#',
    '#c#.#c....#c.....c#',
    '#.#.#.#####.#####.#',
    '#c.c#..C.....c.c.E#',
    '###################',
  ], 18, 90000),
  preset('first-contact', 'First Contact', 'Use long firing lanes and retreat loops to escape two chasers.', [
    '#######################',
    '#P.b.c.b.........c....#',
    '#.###.#################',
    '#c#..b...b.....c#c...c#',
    '#.###.###.#.###.#.#.#.#',
    '#..c.b.c....#c.c.c#.#C#',
    '#####.#.###.#.#.###.#.#',
    '#c....#b#...#..c..#c#c#',
    '#.#.###.#.#####.#.#.#.#',
    '#c#c#..c#b.c.c.c.c.C#.#',
    '#.###.###.#####.#.#####',
    '#c.c.b#..c..#c.c#..c..#',
    '#.#.#.#.###.###.#####.#',
    '#b#b...c...c...c...c.E#',
    '#######################',
  ], 26, 65000),
  preset('crowd-control', 'Crowd Control', 'Choose between guarded shortcuts and longer routes; combine EMP and bolts.', [
    '#########################',
    '#P.p.c.b.......c.....c..#',
    '#.#.#########.#.#########',
    '#c..#....c.c#....p..#...#',
    '###.#.#####.#.#.###.#.#.#',
    '#p#c#.......#..c..#c.c#C#',
    '#.#.#.#.#####.#.#.###.#.#',
    '#c..#b.c.c#c.c#..b.....c#',
    '#.###.###.###.#.#.#####.#',
    '#c#c..#.#c.S#c.c.c.b.c#c#',
    '#.###.#.###.#.#####.#.###',
    '#p..#c#c#p.c#.#c.c#c.c..#',
    '###.#.#.#.#####.#.#.###.#',
    '#c.b#C.c........#c.c#..c#',
    '#.###.#.###.###.#.#.#.#.#',
    '#c.c.c#....c.c.c...p.b#E#',
    '#########################',
  ], 34, 55000),
  preset('break-through', 'Break Through', 'Read ambushes across a larger maze and use ram to reopen blocked routes.', [
    '###########################',
    '#P.r.c.b.c...........c...A#',
    '#.###.#######.#############',
    '#c..#c#c.r...c...b.c...c..#',
    '###.#.#.#######.#.#####.#.#',
    '#c.c#c#........p.......c..#',
    '#.#.#.#.#####.#####.#.###.#',
    '#c.c#c.c.c.p#c.....c#p.c#c#',
    '#.#.#####.#.#.#.#.###.#.#.#',
    '#c.c.c..#c.....c#c...C.c#c#',
    '#######.#.#####.#.#.#####.#',
    '#c.S#r..#......c#..c#b#...#',
    '#.#.#.#####.###.###.#.#.#.#',
    '#b#..p#..c...c#..r#c.c#..c#',
    '#.###.###.###.###.#####.#.#',
    '#A#c.....c#c...c#..c#..r..#',
    '#.###.#####.#.#####.#.#.#.#',
    '#c.c.c#..c..#..b.c.c...c.E#',
    '###########################',
  ], 42, 45000),
  preset('escape-riot', 'Escape Riot', 'Plan a multi-sector escape, scavenging every weapon against a mixed security team.', [
    '#############################',
    '#P.j.c.b...c.c.........c....#',
    '#.###.#######.###.###########',
    '#..c..#c.c.c.c...c.c#c...b..#',
    '#####.#####.###.#.#.#.#.#.#.#',
    '#......c.b#..c.....c#.#..j#.#',
    '#.#.###.#.###.###.#####.###.#',
    '#c.c...c#..c#c.c.c.r...S#p.b#',
    '#.#####.###.#.#######.#.#.#.#',
    '#..c..#c.c#c#c.c....#b#j.c.c#',
    '#.###.#.###.#.#####.#.#.###.#',
    '#p#c#c.....c...c.c.c#r#..c.C#',
    '#.#.#########.###.#####.#.#.#',
    '#c..#....c#A#c...c.......c#r#',
    '###.###.#.#.#.#####.#####.#.#',
    '#.#c...c#.#c.c#c.....c#..p#c#',
    '#.#.#####.#.#.#.#.#.#.#.###.#',
    '#..c.c.c#....S..#b#.#A.b#.#.#',
    '#.#.#.#.#########.###.#.#.#.#',
    '#c.c..#....c...c.c...c#c.c.E#',
    '#############################',
  ], 50, 40000),
];

// Sentries patrol their local corridor before pursuing nearby players.
for (const { level } of LEVEL_PRESETS) for (const drone of level.drones) {
  if (drone.kind !== 'sentry') continue;
  const { x, y } = drone.home;
  const end = [{ x: x + 2, y }, { x: x - 2, y }, { x, y: y + 2 }, { x, y: y - 2 }].find(p =>
    level.maze[p.y]?.[p.x] === '.' && level.maze[(p.y + y) / 2]?.[(p.x + x) / 2] === '.');
  if (end) drone.patrol = [{ ...drone.home }, end];
}
export const DEFAULT_LEVEL = LEVEL_PRESETS[0].level;
