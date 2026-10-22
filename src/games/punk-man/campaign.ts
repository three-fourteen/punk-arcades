import { LEVEL_PRESETS } from './default-level.ts';

export const CAMPAIGN_STORAGE_KEY = 'punk-man:campaign:v1';
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;

export class Campaign {
  private completed = new Set<string>();
  private storage?: StoragePort;
  activeId: string | null;
  constructor(storage?: StoragePort) {
    this.storage = storage;
    try {
      const saved = JSON.parse(storage?.getItem(CAMPAIGN_STORAGE_KEY) ?? 'null');
      if (saved?.version === 1 && Array.isArray(saved.completed)) {
        // Only accept a contiguous prefix, not arbitrary unlocked islands.
        for (const preset of LEVEL_PRESETS) {
          if (!saved.completed.includes(preset.id)) break;
          this.completed.add(preset.id);
        }
      }
    } catch { /* Private browsing and corrupt saves must not block play. */ }
    this.activeId = (LEVEL_PRESETS.find(p => !this.completed.has(p.id)) ?? LEVEL_PRESETS.at(-1)!).id;
  }
  isComplete(id: string) { return this.completed.has(id); }
  isUnlocked(id: string) {
    const index = LEVEL_PRESETS.findIndex(p => p.id === id);
    return index >= 0 && (index === 0 || this.completed.has(LEVEL_PRESETS[index - 1].id));
  }
  select(id: string) {
    if (!this.isUnlocked(id)) return false;
    this.activeId = id;
    return true;
  }
  custom() { this.activeId = null; }
  win() {
    if (!this.activeId || this.completed.has(this.activeId)) return;
    this.completed.add(this.activeId);
    try { this.storage?.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify({ version: 1, completed: [...this.completed] })); }
    catch { /* Retain progress in memory if saving is unavailable. */ }
  }
  reset() {
    this.completed.clear();
    this.activeId = LEVEL_PRESETS[0].id;
    try {
      this.storage?.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify({ version: 1, completed: [] }));
      return Boolean(this.storage);
    } catch { return false; }
  }
  next() {
    const index = LEVEL_PRESETS.findIndex(p => p.id === this.activeId);
    return index >= 0 && this.isComplete(this.activeId!) ? LEVEL_PRESETS[index + 1] : undefined;
  }
}
