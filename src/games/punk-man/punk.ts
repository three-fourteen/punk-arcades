import type Phaser from 'phaser';

/** Side-profile artwork. Mirror every facial part around the same origin. */
export function drawPunk(g: Phaser.GameObjects.Graphics, x: number, y: number, facing: number, jawActive: boolean, opening: number) {
  const polygon = (points: number[][], color: number) => {
    g.fillStyle(color);
    g.beginPath();
    points.forEach(([px, py], index) => {
      if (index === 0) g.moveTo(x + px * facing, y + py);
      else g.lineTo(x + px * facing, y + py);
    });
    g.closePath();
    g.fillPath();
  };
  const rect = (px: number, py: number, width: number, height: number, color: number) => {
    g.fillStyle(color);
    g.fillRect(x + (facing === 1 ? px : -px - width), y + py, width, height);
  };
  g.fillStyle(0xd7f542); g.fillCircle(x, y, 10);
  // A continuous red crest with a row of short, swept spikes, not separate ears.
  polygon([[-10,-5],[-11,-12],[-7,-10],[-8,-16],[-4,-13],[-3,-19],[0,-14],[3,-19],[5,-13],[9,-16],[9,-9],[5,-7],[-4,-7]], 0xef3e45);
  polygon([[-8,-9],[-5,-12],[-2,-11],[1,-14],[4,-11],[7,-12],[6,-8],[-4,-7]], 0xff7864);
  rect(1,-5,9,4,0x10170e);
  rect(6,-4,2,2,0xf5ffca);
  // Black mouth cavity, bright upper teeth and a separate hinged lower mandible.
  polygon([[-4,0],[11,0],[12,5+opening],[7,11+opening],[-3,10],[-7,5]], 0x10170e);
  rect(0,1,11,2,0xf0f2dc);
  for (const tooth of [1,5,9]) rect(tooth,2,2,2,0xf0f2dc);
  polygon([[-6,2],[-3,3],[-2,7+opening],[8,7+opening],[11,5+opening],[11,9+opening],[6,12+opening],[-3,11],[-7,6]], 0x9aa9a5);
  polygon([[-2,8+opening],[8,8+opening],[10,7+opening],[8,10+opening],[0,10+opening]], 0xe0e8df);
  for (const tooth of [0,4,8]) rect(tooth,5+opening,2,3,0xf0f2dc);
  g.fillStyle(0x526662); g.fillCircle(x - 5 * facing, y + 3, 3);
  g.fillStyle(jawActive ? 0xff735c : 0xe0e8df); g.fillCircle(x - 5 * facing, y + 3, 1.2);
}
