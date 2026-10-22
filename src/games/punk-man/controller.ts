import type { GameHandle } from './game';
import type { Run, Weapon } from './model';
import { WEAPON_NAMES } from './model';
import type { Direction } from './map';
import { mountLevelLab } from './level-lab';
import { LEVEL_PRESETS } from './default-level';
import { Campaign } from './campaign';
import type { LevelDefinition } from './level';
const element = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const arena = element('arena'), shell = element('game-shell'), overlay = element('overlay');
const start = element<HTMLButtonElement>('start'), pause = element<HTMLButtonElement>('pause'), sound = element<HTMLButtonElement>('sound');
let game: GameHandle | undefined, currentPhase = 'ready', previousMessage = '', previousOverlay = '', muted = false;
let storage: Storage | undefined;
try { storage = window.localStorage; } catch { /* Campaign works without persistence. */ }
const campaign = new Campaign(storage);
const picker = element<HTMLSelectElement>('campaign-level');
const nextButton = element<HTMLButtonElement>('next-level');
let renderedLevel: LevelDefinition | undefined;
function renderCampaign() {
  for (const [index, preset] of LEVEL_PRESETS.entries()) {
    const option = picker.options[index];
    option.disabled = !campaign.isUnlocked(preset.id);
    option.textContent = `${index + 1} · ${preset.level.name}${campaign.isComplete(preset.id) ? ' · Completed' : option.disabled ? ' · Locked' : ''}`;
  }
  picker.value = campaign.activeId ?? 'custom';
  picker.disabled = false;
  element<HTMLButtonElement>('campaign-reset').disabled = false;
}
const text = (id: string, value: string) => { const node = element(id); if (node.textContent !== value) node.textContent = value; };
function render(run: Run) {
  lab.ready();
  if (renderedLevel !== run.level) {
    renderedLevel = run.level;
    lab.setActive(run.level);
    previousOverlay = '';
    renderCampaign();
  }
  if (run.phase === 'won' && campaign.activeId && !campaign.isComplete(campaign.activeId)) {
    campaign.win(); renderCampaign();
  }
  arena.style.aspectRatio = `${run.level.maze[0].length} / ${run.level.maze.length}`;
  // Keep menus readable on shallow maps and avoid page-height arenas on tall maps.
  arena.style.minHeight = run.level.maze[0].length / run.level.maze.length > 2 ? 'min(280px, 70vh)' : '';
  arena.style.maxHeight = run.level.maze.length / run.level.maze[0].length > 2 ? '70vh' : '';
  currentPhase = run.phase;
  document.body.classList.toggle('game-active', run.phase !== 'ready');
  document.body.classList.toggle('game-playing', run.phase === 'playing');
  text('score', String(run.score).padStart(6, '0'));
  text('charges', String(run.collected).padStart(2, '0'));
  text('health', '▰'.repeat(run.health) + '▱'.repeat(3 - run.health));
  element('health').setAttribute('aria-label', `${run.health} of 3 integrity`);
  text('phase-label', run.alarm ? 'Exit open' : 'Exit sealed');
  const seconds = Math.max(0, Math.ceil(run.alarmRemaining / 1000));
  text('timer', run.alarm ? `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` : '— : —');
  text('progress-label', `${run.collected} / ${run.level.requiredCharges}`);
  const denominator = element('charges').nextElementSibling;
  if (denominator && denominator.textContent !== ` / ${run.level.requiredCharges}`) denominator.textContent = ` / ${run.level.requiredCharges}`;
  element<HTMLProgressElement>('progress').max = run.level.requiredCharges;
  element<HTMLProgressElement>('progress').value = Math.min(run.level.requiredCharges, run.collected);
  text('objective', `Collect ${run.level.requiredCharges} charges to open the marked exit. The alarm gives you ${run.level.alarmMs / 1000} seconds to escape. You have three hits.`);
  text('jaw-label', run.jaw > 0 ? `JAW ONLINE · ${Math.ceil(run.jaw / 1000)}s` : 'The robotic jaw');
  const ammoWord = (count: number) => `${count} ${count === 1 ? 'shot' : 'shots'}`;
  text('ammo-label', ammoWord(run.ammo[run.selected]));
  for (const weapon of ['pulse', 'bolt', 'shove'] as Weapon[]) {
    text(`ammo-${weapon}`, String(run.ammo[weapon]));
    const button = shell.querySelector<HTMLButtonElement>(`[data-weapon="${weapon}"]`)!;
    button.classList.toggle('selected', weapon === run.selected); button.setAttribute('aria-pressed', String(weapon === run.selected));
  }
  const weaponIcon = { pulse: '◎', bolt: 'ϟ', shove: '»' }[run.selected];
  const weaponShortName = { pulse: 'EMP', bolt: 'BOLT', shove: 'RAM' }[run.selected];
  text('weapon-status', `${weaponIcon} ${weaponShortName} · ${run.ammo[run.selected]}`);
  text('touch-weapon-icon', weaponIcon);
  text('touch-weapon-name', weaponShortName);
  text('touch-weapon-ammo', String(run.ammo[run.selected]));
  element('touch-weapon').setAttribute('aria-label', `Selected weapon: ${WEAPON_NAMES[run.selected]}, ${ammoWord(run.ammo[run.selected])}`);
  if (previousMessage !== run.message) { text('live-message', run.message); previousMessage = run.message; }
  pause.disabled = !['playing', 'paused'].includes(run.phase);
  pause.setAttribute('aria-label', run.phase === 'paused' ? 'Resume game' : 'Pause game');
  pause.textContent = run.phase === 'paused' ? '▷' : 'Ⅱ';
  overlay.hidden = run.phase === 'playing';
  if (previousOverlay !== run.phase) {
    previousOverlay = run.phase;
    nextButton.hidden = run.phase !== 'won' || !campaign.next();
    text('overlay-hint', '');
    if (run.phase === 'ready') { text('overlay-kicker', run.level.name); text('overlay-title', 'START A RIOT.'); text('overlay-copy', ''); text('start', 'Start the riot ↗'); }
    if (run.phase === 'paused') { text('overlay-kicker', 'Signal interrupted'); text('overlay-title', 'LAY LOW.'); text('overlay-copy', 'Take a breath. The riot will wait.'); text('start', 'Resume riot ↗'); }
    if (run.phase === 'won' || run.phase === 'lost') {
      text('overlay-kicker', run.phase === 'won' ? campaign.activeId === LEVEL_PRESETS.at(-1)!.id ? 'Campaign complete' : 'Corporate control: broken' : 'Signal terminated');
      text('overlay-title', run.phase === 'won' ? 'YOU GOT OUT.' : 'BUSTED.');
      text('overlay-copy', `${run.message} Score: ${run.score.toLocaleString()}. Charges: ${run.collected}. Run: ${Math.floor(run.elapsed / 1000)}s.`);
      text('start', 'Replay ↗');
    }
    if (run.phase === 'paused' || run.phase === 'won' || run.phase === 'lost') start.focus({ preventScroll: true });
  }
}
start.addEventListener('click', () => { game?.start(); arena.focus({ preventScroll: true }); });
function selectCampaign(id: string, startImmediately = false) {
  const preset = LEVEL_PRESETS.find(p => p.id === id);
  const previous = campaign.activeId;
  if (!game || !preset || !campaign.select(id)) return;
  if (!game.load(preset.level)) { campaign.activeId = previous; renderCampaign(); return; }
  resetKnob();
  if (startImmediately) {
    game.start();
    arena.focus({ preventScroll: true });
  } else start.focus({ preventScroll: true });
}
picker.addEventListener('change', () => selectCampaign(picker.value));
element('campaign-reset').addEventListener('click', () => {
  if (!game) return;
  autoPause();
  if (!window.confirm('Reset all campaign progress? This ends the current run, clears completed levels, and locks levels 2–5. Your Level Lab draft is kept.')) return;
  const saved = campaign.reset();
  selectCampaign(LEVEL_PRESETS[0].id);
  const status = element('campaign-reset-status');
  status.hidden = false;
  status.textContent = saved ? 'Campaign reset. Start again from level 1.' : 'Campaign reset for this session. Browser storage is unavailable; previous progress may return after reload.';
});
nextButton.addEventListener('click', () => {
  const next = campaign.next();
  if (next) selectCampaign(next.id, true);
});
pause.addEventListener('click', () => { game?.pause(); if (currentPhase === 'playing') arena.focus({ preventScroll: true }); });
sound.addEventListener('click', () => { muted = !muted; game?.mute(muted); sound.setAttribute('aria-pressed', String(muted)); sound.textContent = muted ? 'Sound off' : 'Sound on'; });
shell.querySelectorAll<HTMLButtonElement>('[data-weapon]').forEach(button => button.addEventListener('click', () => { game?.select(button.dataset.weapon as Weapon); arena.focus({ preventScroll: true }); }));
const directions: Record<string, Direction> = { ArrowUp: 'up', w: 'up', ArrowRight: 'right', d: 'right', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left' };
shell.addEventListener('keydown', event => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
  if ((key === 'Escape' || key === 'p') && !event.repeat) { game?.pause(); event.preventDefault(); return; }
  // Native button activation (including Space) must remain available in menus.
  if (currentPhase !== 'playing' || event.target instanceof HTMLButtonElement) return;
  if (directions[key]) { event.preventDefault(); game?.steer(directions[key]); }
  if (key === ' ') { event.preventDefault(); if (!event.repeat) game?.fire(); }
  if (key === 'q' && !event.repeat) game?.cycle();
  if (['1', '2', '3'].includes(key)) game?.select((['pulse', 'bolt', 'shove'] as Weapon[])[Number(key) - 1]);
});
const autoPause = () => { if (currentPhase === 'playing') game?.pause(); };
element<HTMLDetailsElement>('game-help').addEventListener('toggle', event => {
  if ((event.target as HTMLDetailsElement).open) autoPause();
});
const lab = mountLevelLab(level => {
  if (!game) return false;
  const previous = campaign.activeId;
  campaign.custom();
  previousOverlay = '';
  arena.style.aspectRatio = `${level.maze[0].length} / ${level.maze.length}`;
  if (!game.load(level)) { campaign.activeId = previous; return false; }
  resetKnob(); game.start(); arena.focus({ preventScroll: true }); arena.scrollIntoView({ block: 'center' });
  return true;
}, autoPause);
window.addEventListener('blur', autoPause);
document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
element('touch-fire').addEventListener('pointerdown', event => { event.preventDefault(); game?.fire(); });
element('touch-switch').addEventListener('click', () => game?.cycle());
const stick = element('stick'), knob = stick.querySelector<HTMLElement>('.stick-knob')!;
let activePointer: number | undefined;
const KNOB_RANGE = 30;
const steer = (event: PointerEvent) => {
  const bounds = stick.getBoundingClientRect(), dx = event.clientX - bounds.left - bounds.width / 2, dy = event.clientY - bounds.top - bounds.height / 2;
  const distance = Math.hypot(dx, dy) || 1;
  const reach = Math.min(distance, KNOB_RANGE) / distance;
  knob.style.transform = `translate(${dx * reach}px, ${dy * reach}px)`;
  if (distance < 10) return;
  game?.steer(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up');
};
const resetKnob = () => { activePointer = undefined; knob.style.transform = ''; stick.classList.remove('active'); };
stick.addEventListener('pointerdown', event => { if (activePointer !== undefined) return; event.preventDefault(); activePointer = event.pointerId; stick.setPointerCapture(event.pointerId); stick.classList.add('active'); steer(event); arena.focus({ preventScroll: true }); });
stick.addEventListener('pointermove', event => { if (event.pointerId === activePointer) steer(event); });
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) stick.addEventListener(name, resetKnob);
// Preserve keyboard activation on the visible touch action buttons.
element('touch-fire').addEventListener('click', event => { if (event.detail === 0) game?.fire(); });
const loadTimeout = window.setTimeout(() => { text('overlay-copy', 'Still loading. If the maze does not appear, reload this page to try again.'); }, 15000);
import('./game').then(({ mountGame }) => {
  game = mountGame(element('game-canvas'), run => { clearTimeout(loadTimeout); if (start.disabled) { start.disabled = false; text('start', 'Start the riot ↗'); } render(run); }, LEVEL_PRESETS.find(p => p.id === campaign.activeId)!.level);
}).catch(error => {
  clearTimeout(loadTimeout); text('overlay-title', 'SIGNAL LOST.'); text('overlay-copy', 'The game could not load. Reload the page to reconnect.'); text('start', 'Reload game'); start.disabled = false;
  start.addEventListener('click', () => location.reload(), { once: true }); console.error('Punk-man failed to load', error);
});
window.addEventListener('pagehide', () => { lab.destroy(); game?.destroy(); game = undefined; });
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
