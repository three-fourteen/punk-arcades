import type { GameHandle } from './game';
import type { Run, Weapon } from './model';
import { WEAPON_NAMES } from './model';
import type { Direction } from './map';
const element = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const arena = element('arena'), shell = element('game-shell'), overlay = element('overlay');
const start = element<HTMLButtonElement>('start'), pause = element<HTMLButtonElement>('pause'), sound = element<HTMLButtonElement>('sound');
let game: GameHandle | undefined, currentPhase = 'ready', previousMessage = '', previousOverlay = '', muted = false;
const text = (id: string, value: string) => { const node = element(id); if (node.textContent !== value) node.textContent = value; };
function render(run: Run) {
  currentPhase = run.phase;
  document.body.classList.toggle('game-active', run.phase !== 'ready');
  text('score', String(run.score).padStart(6, '0'));
  text('charges', String(run.collected).padStart(2, '0'));
  text('health', '▰'.repeat(run.health) + '▱'.repeat(3 - run.health));
  element('health').setAttribute('aria-label', `${run.health} of 3 integrity`);
  text('phase-label', run.alarm ? 'Exit open ↗' : 'Exit sealed');
  text('timer', run.alarm ? `00:${String(Math.max(0, Math.ceil(run.alarmRemaining / 1000))).padStart(2, '0')}` : '— : —');
  text('progress-label', `${run.collected} / 30`);
  element<HTMLProgressElement>('progress').value = Math.min(30, run.collected);
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
    if (run.phase === 'paused') { text('overlay-kicker', 'Signal interrupted'); text('overlay-title', 'LAY LOW.'); text('overlay-copy', 'Take a breath. The riot will wait.'); text('start', 'Resume riot ↗'); }
    if (run.phase === 'won' || run.phase === 'lost') {
      text('overlay-kicker', run.phase === 'won' ? 'Corporate control: broken' : 'Signal terminated');
      text('overlay-title', run.phase === 'won' ? 'YOU GOT OUT.' : 'BUSTED.');
      text('overlay-copy', `${run.message} Score: ${run.score.toLocaleString()}. Charges: ${run.collected}. Run: ${Math.floor(run.elapsed / 1000)}s.`);
      text('start', 'Run it back ↗'); text('overlay-hint', 'A new route. A little more trouble.');
    }
    if (run.phase === 'paused' || run.phase === 'won' || run.phase === 'lost') start.focus({ preventScroll: true });
  }
}
start.addEventListener('click', () => { game?.start(); arena.focus({ preventScroll: true }); });
pause.addEventListener('click', () => { game?.pause(); if (currentPhase === 'playing') arena.focus({ preventScroll: true }); });
sound.addEventListener('click', () => { muted = !muted; game?.mute(muted); sound.setAttribute('aria-pressed', String(muted)); sound.textContent = muted ? 'Sound off' : 'Sound on'; });
shell.querySelectorAll<HTMLButtonElement>('[data-weapon]').forEach(button => button.addEventListener('click', () => { game?.select(button.dataset.weapon as Weapon); arena.focus({ preventScroll: true }); }));
const directions: Record<string, Direction> = { ArrowUp: 'up', w: 'up', ArrowRight: 'right', d: 'right', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left' };
shell.addEventListener('keydown', event => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if ((key === 'Escape' || key === 'p') && !event.repeat) { game?.pause(); event.preventDefault(); return; }
  // Native button activation (including Space) must remain available in menus.
  if (currentPhase !== 'playing' || event.target instanceof HTMLButtonElement) return;
  if (directions[key]) { event.preventDefault(); game?.steer(directions[key]); }
  if (key === ' ') { event.preventDefault(); if (!event.repeat) game?.fire(); }
  if (key === 'q' && !event.repeat) game?.cycle();
  if (['1', '2', '3'].includes(key)) game?.select((['pulse', 'bolt', 'shove'] as Weapon[])[Number(key) - 1]);
});
const autoPause = () => { if (currentPhase === 'playing') game?.pause(); };
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
  game = mountGame(element('game-canvas'), run => { clearTimeout(loadTimeout); if (start.disabled) { start.disabled = false; text('start', 'Start the riot ↗'); } render(run); });
}).catch(error => {
  clearTimeout(loadTimeout); text('overlay-title', 'SIGNAL LOST.'); text('overlay-copy', 'The game could not load. Reload the page to reconnect.'); text('start', 'Reload game'); start.disabled = false;
  start.addEventListener('click', () => location.reload(), { once: true }); console.error('Punk-man failed to load', error);
});
window.addEventListener('pagehide', () => { game?.destroy(); game = undefined; });
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
