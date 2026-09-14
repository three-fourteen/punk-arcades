export type Point = { x: number; y: number };
export const MAZE = [
  '#####################',
  '#P....#.......#....E#',
  '#.##.#.#.###.#.#.##.#',
  '#....#...#...#......#',
  '###.###.#.#.###.###.#',
  '#...#...#.#...#.....#',
  '#.###.###.###.#.###.#',
  '#.....#.......#...#.#',
  '#.###.#.#####.###.#.#',
  '#...#...#...#.......#',
  '#.#.###.#.#.###.###.#',
  '#.#.....#.#.....#...#',
  '#.#####.#.#####.#.#.#',
  '#.......#.......#.#.#',
  '#.###.#####.###.#.#.#',
  '#...#.......#...#...#',
  '#.#.###.###.#.#####.#',
  '#...................#',
  '#####################',
];
export const START: Point = { x: 1, y: 1 };
export const EXIT: Point = { x: 19, y: 1 };
export const REQUIRED_CHARGES = 30;
export const ALARM_MS = 45000;
export const key = (p: Point) => `${p.x},${p.y}`;
export const walkable = (p: Point) => Boolean(MAZE[p.y]?.[p.x] && MAZE[p.y][p.x] !== '#');
export const distance = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const DIRECTIONS = { up: { x: 0, y: -1 }, right: { x: 1, y: 0 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 } } as const;
export type Direction = keyof typeof DIRECTIONS;
export const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
export function pathTo(from: Point, target: Point): Point[] {
  const queue: Point[][] = [[from]];
  const visited = new Set([key(from)]);
  for (let i = 0; i < queue.length; i++) {
    const path = queue[i];
    const last = path[path.length - 1];
    if (key(last) === key(target)) return path.slice(1);
    for (const direction of Object.values(DIRECTIONS)) {
      const next = add(last, direction);
      if (walkable(next) && !visited.has(key(next))) {
        visited.add(key(next));
        queue.push([...path, next]);
      }
    }
  }
  return [];
}
