import Phaser from 'phaser';
import { Run } from './model';
import { sounds } from './audio';
import { drawMaze, drawActors, WIDTH, HEIGHT } from './render';
import type { Direction } from './map';
import type { Weapon } from './model';
export type GameHandle = { start: () => void; pause: () => void; steer: (d: Direction) => void; fire: () => void; select: (w: Weapon) => void; cycle: () => void; mute: (value: boolean) => void; destroy: () => void };
export function mountGame(parent: HTMLElement, onChange: (run: Run) => void): GameHandle {
  let run = new Run();
  let scene: PlayScene;
  let muted = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  class PlayScene extends Phaser.Scene {
    actors!: Phaser.GameObjects.Graphics;
    music?: Phaser.Sound.BaseSound;
    alarm?: Phaser.Sound.BaseSound;
    preload() { for (const [name, url] of Object.entries(sounds())) this.load.audio(name, url); }
    create() {
      scene = this;
      drawMaze(this.add.graphics()); this.actors = this.add.graphics();
      this.music = this.sound.add('music', { loop: true, volume: .4 });
      this.alarm = this.sound.add('alarm', { loop: true, volume: .3 });
      onChange(run);
    }
    update(_time: number, delta: number) {
      run.update(delta);
      drawActors(this.actors, run, run.elapsed, reduced);
      for (const event of run.events.splice(0)) {
        if (event !== 'alarm') this.sound.play(event, { volume: event === 'charge' ? .3 : .55 });
        if (event === 'fire') {
          const ring = this.add.circle(run.player.x * 32 + 16, run.player.y * 32 + 16, 12, 0x70dacd, .25).setStrokeStyle(2, 0x70dacd);
          this.tweens.add({ targets: ring, scale: run.selected === 'pulse' ? 8 : 3, alpha: 0, duration: reduced ? 100 : 280, onComplete: () => ring.destroy() });
        }
      }
      const active = run.phase === 'playing';
      if (active && !this.music?.isPlaying) { if (this.music?.isPaused) this.music.resume(); else this.music?.play(); }
      if (!active && this.music?.isPlaying) this.music.pause();
      if (active && run.alarm && !this.alarm?.isPlaying) this.alarm?.play();
      if ((!active || !run.alarm) && this.alarm?.isPlaying) this.alarm.stop();
      onChange(run);
    }
  }
  const game = new Phaser.Game({ type: Phaser.AUTO, parent, width: WIDTH, height: HEIGHT, backgroundColor: '#10170e', scene: PlayScene, render: { antialias: true }, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, input: { keyboard: false }, audio: { disableWebAudio: false } });
  return {
    start() {
      if (!scene) return;
      if (run.phase === 'won' || run.phase === 'lost') run = new Run();
      if (run.phase === 'paused') run.pause(); else run.start();
      const manager = scene.sound as Phaser.Sound.WebAudioSoundManager;
      if (manager.context?.state === 'suspended') void manager.context.resume().catch(() => { /* Audio is optional; gameplay remains available. */ });
      scene.sound.mute = muted;
      onChange(run);
    },
    pause() { run.pause(); onChange(run); },
    steer(direction) { run.steer(direction); }, fire() { run.fire(); }, select(weapon) { run.select(weapon); }, cycle() { run.cycle(); },
    mute(value) { muted = value; if (scene) scene.sound.mute = value; },
    destroy() { game.destroy(true); },
  };
}
