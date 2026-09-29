import { DEFAULT_LEVEL } from './default-level.ts';
import { LEVEL_SCHEMA, MAX_LEVEL_BYTES, parseLevel, serializeLevel } from './level.ts';
import type { LevelDefinition, LevelResult } from './level.ts';

export class LevelDraft {
  source = serializeLevel(DEFAULT_LEVEL);
  brief = '';
  revision = 0;
  result: LevelResult = parseLevel(this.source);
  update(source: string) {
    this.source = source;
    this.revision++;
    this.result = parseLevel(source);
    return this.report();
  }
  report() {
    const result = this.result;
    return {
      ok: result.ok, revision: this.revision, errors: result.errors, warnings: result.warnings,
      ...(result.ok ? { summary: {
        name: result.level.name, author: result.level.author ?? '',
        width: result.level.maze[0].length, height: result.level.maze.length,
        charges: result.level.charges.length, requiredCharges: result.level.requiredCharges,
        pickups: result.level.pickups.length, drones: result.level.drones.length,
        alarmMs: result.level.alarmMs,
      } } : {}),
    };
  }
  export() {
    return this.result.ok ? { ok: true, json: serializeLevel(this.result.level) } : this.report();
  }
}

export type LabTool = {
  name: string; description: string; inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: Record<string, unknown>) => Promise<string>;
};
export type ModelContext = { registerTool: (tool: LabTool, options: { signal: AbortSignal }) => void | Promise<void> };

export function levelTools(draft: LevelDraft, show: () => void): LabTool[] {
  const empty = { type: 'object', properties: {}, additionalProperties: false };
  const tool = (name: string, description: string, inputSchema: object, readOnlyHint: boolean, execute: (input: Record<string, unknown>) => unknown): LabTool => ({
    name, description, inputSchema, annotations: { readOnlyHint, untrustedContentHint: true },
    execute: async input => JSON.stringify(execute(input)),
  });
  return [
    tool('punk_man_get_level_context', 'Read the player design brief, current draft JSON, format schema, and a working example. Coordinates are zero-based. # is wall, . is empty floor; charges are explicit coordinates. The player starts the level using Play level.', empty, true,
      () => ({ brief: draft.brief, draft: draft.source, schema: LEVEL_SCHEMA, example: DEFAULT_LEVEL, ...draft.report() })),
    tool('punk_man_create_level', 'Create or replace the local level draft with a complete level definition, then validate and preview it. Does not load or start a run. Repair validation errors by submitting the full corrected definition.', { type: 'object', properties: { level: LEVEL_SCHEMA }, required: ['level'], additionalProperties: false }, false,
      input => {
        const source = JSON.stringify(input.level);
        if (typeof source !== 'string' || new TextEncoder().encode(source).length > MAX_LEVEL_BYTES) return { ok: false, errors: [{ path: 'level', message: 'Provide a level object no larger than 64 KiB.' }] };
        draft.update(JSON.stringify(input.level, null, 2)); show(); return draft.report();
      }),
    tool('punk_man_validate_level', 'Return validation errors and warnings for the current draft. Valid means structurally playable, not difficulty-balanced.', empty, true, () => draft.report()),
    tool('punk_man_preview_level', 'Show the current draft and its validation feedback in Level Lab. The player can then choose Play level.', empty, false, () => { show(); return draft.report(); }),
    tool('punk_man_export_level', 'Return valid draft JSON for saving or sharing. Does not trigger a browser download. The player can use Download JSON in Level Lab.', empty, true, () => draft.export()),
  ];
}

export async function registerLevelTools(context: ModelContext | undefined, tools: LabTool[], signal: AbortSignal) {
  if (!context || typeof context.registerTool !== 'function') return false;
  for (const tool of tools) {
    if (signal.aborted) return false;
    await context.registerTool(tool, { signal });
  }
  return true;
}

export function mountLevelLab(load: (level: LevelDefinition) => boolean, onOpen: () => void) {
  const node = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const panel = node<HTMLDetailsElement>('level-lab');
  const source = node<HTMLTextAreaElement>('level-source');
  const draft = new LevelDraft();
  const play = node<HTMLButtonElement>('level-play'), download = node<HTMLButtonElement>('level-download');
  const preview = node<HTMLCanvasElement>('level-preview');
  let active: LevelDefinition = DEFAULT_LEVEL;
  let readVersion = 0;
  let ready = false;
  function refresh(open = false) {
    source.value = draft.source;
    const result = draft.result;
    play.disabled = !ready || !result.ok;
    download.disabled = !result.ok;
    node('level-feedback').textContent = result.ok ? ['Ready to play.', ...result.warnings].join(' ') : result.errors.map(e => `${e.path ? e.path + ': ' : ''}${e.message}`).join('\n');
    preview.hidden = !result.ok;
    node('level-summary').textContent = '';
    if (result.ok) {
      const l = result.level;
      node('level-summary').textContent = `${l.name}${l.author ? ` by ${l.author}` : ''} · ${l.maze[0].length} × ${l.maze.length} · Collect ${l.requiredCharges} of ${l.charges.length} charges · ${l.alarmMs / 1000}s alarm · ${l.pickups.length} pickups · ${l.drones.length} drones`;
      preview.width = l.maze[0].length * 16; preview.height = l.maze.length * 16;
      const ctx = preview.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#10170e'; ctx.fillRect(0, 0, preview.width, preview.height);
        ctx.fillStyle = '#657d30'; l.maze.forEach((row, y) => [...row].forEach((c, x) => { if (c === '#') ctx.fillRect(x * 16 + 1, y * 16 + 1, 14, 14); }));
        const tile = (p: { x: number; y: number }, color: string, size: number) => { ctx.fillStyle = color; ctx.fillRect(p.x * 16 + (16 - size) / 2, p.y * 16 + (16 - size) / 2, size, size); };
        l.charges.forEach(p => tile(p, '#d7f542', 4));
        l.pickups.forEach(p => tile(p.position, p.kind === 'jaw' ? '#f4e3a1' : '#70dacd', 8));
        l.drones.forEach(d => tile(d.home, '#ff735c', 10));
        tile(l.start, '#ffffff', 12); tile(l.exit, '#d7f542', 12);
      }
    }
    if (open) panel.open = true;
  }
  const show = () => { readVersion++; refresh(true); };
  source.addEventListener('input', () => { readVersion++; draft.update(source.value); refresh(); });
  node('level-validate').addEventListener('click', () => { draft.update(source.value); refresh(); });
  node('level-edit').addEventListener('click', () => { node<HTMLDetailsElement>('level-json-editor').open = true; source.focus(); });
  node('level-template').addEventListener('click', () => { draft.update(serializeLevel(DEFAULT_LEVEL)); show(); });
  const file = node<HTMLInputElement>('level-file');
  node('level-load').addEventListener('click', () => { onOpen(); file.click(); });
  file.addEventListener('change', async () => {
    const selected = file.files?.[0]; file.value = '';
    if (!selected) return;
    const version = ++readVersion;
    if (selected.size > MAX_LEVEL_BYTES) {
      draft.update(''); draft.result = { ok: false, errors: [{ path: '', message: 'Level files must be 64 KiB or smaller.' }], warnings: [] }; refresh(true); return;
    }
    try {
      const contents = await selected.text();
      if (version !== readVersion) return;
      draft.update(contents); refresh(true);
    } catch {
      if (version !== readVersion) return;
      draft.update(''); draft.result = { ok: false, errors: [{ path: '', message: 'Could not read this file. Please select it again.' }], warnings: [] }; refresh(true);
    }
  });
  node('level-agent').addEventListener('click', () => { panel.open = true; node<HTMLDetailsElement>('level-agent-panel').open = true; onOpen(); node('level-brief').focus(); });
  node('level-brief').addEventListener('input', () => { draft.brief = node<HTMLTextAreaElement>('level-brief').value; });
  node('level-prompt').addEventListener('click', () => {
    node<HTMLTextAreaElement>('level-agent-prompt').value = `Use Punk-man Level Lab on this page. Read punk_man_get_level_context for the schema and example. Create a level for this brief: ${draft.brief || 'A compact maze with two routes and a tense escape.'} Submit it with punk_man_create_level, repair validation errors, and preview it. I will choose Play level. If WebMCP is unavailable, return a complete level JSON file using the example I provide.`;
    node<HTMLTextAreaElement>('level-agent-prompt').select();
  });
  play.addEventListener('click', () => {
    if (draft.result.ok && load(draft.result.level)) { active = structuredClone(draft.result.level); node('level-active').textContent = active.name; panel.open = false; }
  });
  const save = (level: LevelDefinition) => {
    const url = URL.createObjectURL(new Blob([serializeLevel(level)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `${level.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 60) || 'punk-man-level'}.json`;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  download.addEventListener('click', () => { if (draft.result.ok) save(draft.result.level); });
  node('level-export-active').addEventListener('click', () => save(active));
  const controller = new AbortController();
  const context = (document as Document & { modelContext?: ModelContext }).modelContext;
  void registerLevelTools(context, levelTools(draft, show), controller.signal).then(available => {
    node('level-agent-status').textContent = available ? 'WebMCP tools are ready. Open your compatible browser agent and use the prompt below.' : 'WebMCP is unavailable in this browser. Give an agent the downloaded example and your prompt, then load its JSON file here.';
  }).catch(() => { controller.abort(); node('level-agent-status').textContent = 'Agent tools could not register. You can still load and edit JSON files.'; });
  refresh();
  return { ready() { if (!ready) { ready = true; refresh(); } }, destroy() { controller.abort(); } };
}
