// WaterSystem: WaterBase / WaterSimple / WaterTile + splash triggers.
// Reflections are strength-capped per quality (never bright/over-reflective).
import { grid } from '../engine/geometry.js';
import { mat4, compose } from '../core/math.js';
import { hex } from '../engine/renderer.js';
import { CONFIG } from '../config.js';

export class WaterBase {
  constructor(theme) { this.level = CONFIG.physics.waterLevel + 0.15; this.deep = hex(theme.water.deep); this.shallow = hex(theme.water.shallow); this.tiles = []; }
}

/** One streamed tile of the water surface (recycled as the camera moves). */
export class WaterTile {
  constructor(mesh, size) { this.mesh = mesh; this.size = size; this.matrix = mat4(); this.x = 0; }
  place(x, level, depth) { this.x = x; compose(this.matrix, x, level, -depth / 2 + 6, 0, 0, 0, this.size, 1, depth); }
}

/** Low quality: flat, single-quad tiles, no vertex waves. */
export class WaterSimple extends WaterBase {}

export class WaterSystem extends WaterBase {
  constructor(renderer, theme, quality) {
    super(theme);
    this.renderer = renderer; this.size = 40; this.depth = 80;
    this.setQuality(quality);
  }
  setQuality(q) {
    if (this.mesh) this.renderer.deleteMesh(this.mesh);
    const res = q.waterWaves ? q.waterRes : 1;
    this.mesh = this.renderer.createMesh(grid(res));
    this.tiles = [0, 1, 2, 3].map(() => new WaterTile(this.mesh, this.size + 0.2));
    this.simple = !q.waterWaves;
  }
  update(camX) {
    const base = Math.floor(camX / this.size) * this.size - this.size * 1.5;
    this.tiles.forEach((t, i) => t.place(base + i * this.size + this.size / 2, this.level, this.depth));
  }
}

/** Detects objects crossing the water surface and fires splash VFX/SFX. */
export class WaterSplashTrigger {
  constructor(vfx, audio) { this.vfx = vfx; this.audio = audio; this.dripT = 0; }
  onSplash(x, y, big) { this.vfx.splash(x, CONFIG.physics.waterLevel + 0.15, big); this.audio && this.audio.play('splash', { x, gain: big ? 1 : 0.6 }); this.dripT = big ? 3 : 0; }
  update(dt, player) { // DrippingVFX after leaving the water
    if (this.dripT > 0 && player) { this.dripT -= dt; if (Math.random() < dt * 14) this.vfx.drip(player.x, player.y + 1.0 + Math.random() * 0.5); }
  }
}
