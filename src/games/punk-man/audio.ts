// Original mono PCM sounds, generated locally. Phaser owns playback and mute.
function wav(seconds: number, sample: (t: number) => number): string {
  const rate = 22050, length = Math.floor(seconds * rate);
  const buffer = new ArrayBuffer(44 + length * 2), view = new DataView(buffer);
  const text = (offset: number, value: string) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, 36 + length * 2, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, length * 2, true);
  for (let i = 0; i < length; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample(i / rate))) * 20000, true);
  let binary = ''; const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return `data:audio/wav;base64,${btoa(binary)}`;
}
const wave = (t: number, hz: number) => Math.sin(t * hz * Math.PI * 2);
export function sounds() {
  const notes = [55, 55, 82.41, 55, 65.41, 55, 98, 73.42];
  return {
    music: wav(4, t => {
      const beat = t % .25, note = notes[Math.floor(t / .25) % notes.length];
      const bass = Math.sign(wave(t, note)) * Math.exp(-beat * 12) * .17;
      const kick = wave(beat, 65 - beat * 100) * Math.exp(-beat * 36) * .4;
      const hat = wave(t, 6200) * Math.exp(-(t % .125) * 100) * .05;
      return bass + kick + hat;
    }),
    charge: wav(.09, t => wave(t, 880 + t * 5000) * (1 - t / .09) * .25),
    pickup: wav(.3, t => wave(t, 330 * (1 + Math.floor(t * 15))) * Math.exp(-t * 8) * .4),
    fire: wav(.22, t => Math.sign(wave(t, 180 - t * 500)) * Math.exp(-t * 20) * .3),
    bite: wav(.18, t => wave(t, 70 + t * 900) * Math.exp(-t * 14) * .5),
    hit: wav(.35, t => Math.sign(wave(t, 110 - t * 180)) * Math.exp(-t * 9) * .35),
    alarm: wav(1, t => wave(t, 480 + Math.sin(t * Math.PI * 2) * 160) * .15),
    won: wav(.8, t => wave(t, [330, 440, 550, 660][Math.min(3, Math.floor(t * 5))]) * Math.exp(-t * 2) * .3),
    lost: wav(.8, t => wave(t, 220 - t * 170) * Math.exp(-t * 3) * .35),
  };
}
