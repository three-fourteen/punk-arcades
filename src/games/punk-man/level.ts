import { add, DIRECTIONS, key, walkable } from './map.ts';
import type { Point } from './map.ts';

export type PickupKind = 'pulse' | 'bolt' | 'shove' | 'jaw';
export type DroneKind = 'chaser' | 'ambusher' | 'sentry';
export type LevelDefinition = {
  version: 1;
  name: string;
  author?: string;
  maze: string[];
  start: Point;
  exit: Point;
  charges: Point[];
  pickups: { kind: PickupKind; position: Point }[];
  drones: { kind: DroneKind; home: Point; patrol?: Point[] }[];
  requiredCharges: number;
  alarmMs: number;
};
export type LevelIssue = { path: string; message: string };
export type LevelResult = { ok: true; level: LevelDefinition; errors: LevelIssue[]; warnings: string[] } |
  { ok: false; errors: LevelIssue[]; warnings: string[] };
export const MAX_LEVEL_BYTES = 65536;

// The same structural contract is used by the validator and WebMCP discovery.
type Schema = {
  type?: string; const?: unknown; enum?: string[]; minimum?: number; maximum?: number;
  minLength?: number; maxLength?: number; pattern?: string; minItems?: number; maxItems?: number;
  items?: Schema; properties?: Record<string, Schema>; required?: string[]; additionalProperties?: boolean;
};
const point: Schema = { type: 'object', properties: { x: { type: 'integer', minimum: 0, maximum: 40 }, y: { type: 'integer', minimum: 0, maximum: 30 } }, required: ['x', 'y'], additionalProperties: false };
export const LEVEL_SCHEMA: Schema = {
  type: 'object', additionalProperties: false,
  required: ['version', 'name', 'maze', 'start', 'exit', 'charges', 'pickups', 'drones', 'requiredCharges', 'alarmMs'],
  properties: {
    version: { type: 'integer', const: 1 },
    name: { type: 'string', minLength: 1, maxLength: 80, pattern: '\\S' },
    author: { type: 'string', maxLength: 80 },
    maze: { type: 'array', minItems: 3, maxItems: 31, items: { type: 'string', minLength: 3, maxLength: 41, pattern: '^[#.]+$' } },
    start: point, exit: point,
    charges: { type: 'array', minItems: 1, maxItems: 1271, items: point },
    pickups: { type: 'array', maxItems: 128, items: { type: 'object', additionalProperties: false, required: ['kind', 'position'], properties: { kind: { type: 'string', enum: ['pulse', 'bolt', 'shove', 'jaw'] }, position: point } } },
    drones: { type: 'array', maxItems: 16, items: { type: 'object', additionalProperties: false, required: ['kind', 'home'], properties: { kind: { type: 'string', enum: ['chaser', 'ambusher', 'sentry'] }, home: point, patrol: { type: 'array', minItems: 1, maxItems: 16, items: point } } } },
    requiredCharges: { type: 'integer', minimum: 1, maximum: 1271 },
    alarmMs: { type: 'integer', minimum: 1000, maximum: 300000 },
  },
};

// Intentionally limited to the schema vocabulary above; not a general JSON Schema engine.
function check(value: unknown, schema: Schema, path: string, errors: LevelIssue[]) {
  if (errors.length >= 30) return;
  const error = (message: string) => errors.push({ path, message });
  const matches = schema.type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value)
    : schema.type === 'array' ? Array.isArray(value)
    : schema.type === 'integer' ? typeof value === 'number' && Number.isSafeInteger(value)
    : typeof value === schema.type;
  if (!matches) { error(`Expected ${schema.type}.`); return; }
  if (schema.const !== undefined && value !== schema.const) error(`Expected version ${schema.const}.`);
  if (schema.enum && !schema.enum.includes(value as string)) error(`Choose one of: ${schema.enum.join(', ')}.`);
  if (typeof value === 'number' && (value < schema.minimum! || value > schema.maximum!)) error(`Must be between ${schema.minimum} and ${schema.maximum}.`);
  if (typeof value === 'string') {
    if (value.length < (schema.minLength ?? 0) || value.length > (schema.maxLength ?? Infinity)) error(`Text length must be ${schema.minLength ?? 0}–${schema.maxLength} characters.`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) error(path.startsWith('maze') ? 'Use only # (wall) and . (floor).' : 'Text must not be blank.');
  }
  if (Array.isArray(value)) {
    if (value.length < (schema.minItems ?? 0) || value.length > (schema.maxItems ?? Infinity)) { error(`Provide ${schema.minItems ?? 0}–${schema.maxItems} entries.`); return; }
    value.forEach((item, i) => check(item, schema.items!, `${path}[${i}]`, errors));
  } else if (schema.type === 'object') {
    const record = value as Record<string, unknown>;
    for (const name of schema.required ?? []) if (!Object.hasOwn(record, name)) errors.push({ path: path ? `${path}.${name}` : name, message: 'Required field is missing.' });
    for (const [name, item] of Object.entries(record)) {
      const child = path ? `${path}.${name}` : name;
      if (Object.hasOwn(schema.properties!, name)) check(item, schema.properties![name], child, errors);
      else errors.push({ path: child, message: 'Unsupported field.' });
      if (errors.length >= 30) break;
    }
  }
}

export function validateLevel(input: unknown): LevelResult {
  const errors: LevelIssue[] = [], warnings: string[] = [];
  check(input, LEVEL_SCHEMA, '', errors);
  if (errors.length) return { ok: false, errors, warnings };
  const level = structuredClone(input) as LevelDefinition;
  const fail = (path: string, message: string) => errors.push({ path, message });
  if (level.maze.some(row => row.length !== level.maze[0].length)) fail('maze', 'Every row must have the same width.');
  const reachable = new Set<string>();
  const queue = walkable(level.start, level.maze) ? [level.start] : [];
  if (queue.length) reachable.add(key(level.start));
  for (let i = 0; i < queue.length; i++) for (const direction of Object.values(DIRECTIONS)) {
    const next = add(queue[i], direction);
    if (walkable(next, level.maze) && !reachable.has(key(next))) { reachable.add(key(next)); queue.push(next); }
  }
  const position = (p: Point, path: string) => {
    if (!walkable(p, level.maze)) fail(path, 'Position must be on a floor tile inside the maze.');
    else if (!reachable.has(key(p))) fail(path, 'Position is unreachable from the player start.');
  };
  position(level.start, 'start'); position(level.exit, 'exit');
  if (key(level.start) === key(level.exit)) fail('exit', 'Start and exit must be different tiles.');
  const occupied = new Set([key(level.start), key(level.exit)]);
  const unique = (p: Point, path: string) => {
    position(p, path);
    if (occupied.has(key(p))) fail(path, 'Tile overlaps a start, exit, charge, or pickup.');
    occupied.add(key(p));
  };
  level.charges.forEach((p, i) => unique(p, `charges[${i}]`));
  level.pickups.forEach((p, i) => unique(p.position, `pickups[${i}].position`));
  const homes = new Set<string>();
  level.drones.forEach((d, i) => {
    position(d.home, `drones[${i}].home`);
    if (key(d.home) === key(level.start) || homes.has(key(d.home))) fail(`drones[${i}].home`, 'Drone spawns must be distinct and away from the player start.');
    homes.add(key(d.home));
    d.patrol?.forEach((p, j) => position(p, `drones[${i}].patrol[${j}]`));
    if (d.patrol && d.kind !== 'sentry') fail(`drones[${i}].patrol`, 'Only sentry drones use patrol waypoints.');
  });
  if (level.requiredCharges > level.charges.length) fail('requiredCharges', `Requires ${level.requiredCharges} charges but contains only ${level.charges.length}.`);
  const floors = level.maze.join('').replaceAll('#', '').length;
  if (reachable.size < floors) warnings.push('Some empty floor tiles are disconnected from the start.');
  if (level.requiredCharges === level.charges.length) warnings.push('Every placed charge is needed to unlock the exit.');
  if (!level.drones.length) warnings.push('No drones: this level is a practice run.');
  return errors.length ? { ok: false, errors, warnings } : { ok: true, level, errors, warnings };
}

export function parseLevel(source: string): LevelResult {
  if (new TextEncoder().encode(source).length > MAX_LEVEL_BYTES) return { ok: false, errors: [{ path: '', message: 'Level files must be 64 KiB or smaller.' }], warnings: [] };
  try { return validateLevel(JSON.parse(source)); }
  catch { return { ok: false, errors: [{ path: '', message: 'Invalid JSON. Check commas, quotes, and brackets.' }], warnings: [] }; }
}
export const serializeLevel = (level: LevelDefinition) => JSON.stringify(level, null, 2) + '\n';
