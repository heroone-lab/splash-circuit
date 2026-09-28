import { CONFIG } from '../config.js';
import { damp, clamp, smooth } from '../core/math.js';
export class GameCamera {
constructor() { this.reset(0, 0); this.shakeT = 0; this.shakeAmt = 0; this.wipeW = 0; this.wipeTarget = 0; this.enabledShake = true; this.state = 'follow'; }
reset(x, y) { this.x = x + CONFIG.camera.lookAhead; this.y = y; this.dist = CONFIG.camera.distance; }
shake(amount) {
if (!this.enabledShake) return;
const C = CONFIG.camera;
this.shakeAmt = clamp(C.shakeMax * amount, C.shakeMin, C.shakeMax); this.shakeT = C.shakeDuration;
}
setWipeout(on) { this.wipeTarget = on ? 1 : 0; this.state = on ? 'wipeout' : 'follow'; }
/** focus: {x, y}; aspect of viewport; returns eye & target. */
update(dt, focus, aspect, floorY = 0) {
const C = CONFIG.camera;
const step = dt / C.wipeoutTransition;
this.wipeW = this.wipeTarget > this.wipeW ? Math.min(this.wipeTarget, this.wipeW + step) : Math.max(this.wipeTarget, this.wipeW - step);
const w = smooth(this.wipeW);
const look = C.lookAhead * (1 - w * 0.8);
this.x = damp(this.x, focus.x + look, C.followX, dt);
const ty = clamp(focus.y, floorY - 0.5, floorY + C.floorHeightLimit);
this.y = damp(this.y, ty, C.followY, dt);
const fov = C.fov * Math.PI / 180;
const hfovTan = Math.tan(fov / 2) * aspect;
const need = C.minHalfWidth / hfovTan;
const base = Math.max(C.distance, need);
const target = base + (Math.min(base, C.wipeoutDistance) - base) * w;
this.dist = damp(this.dist, target, 4, dt);
let sx = 0, sy = 0;
if (this.shakeT > 0) {
this.shakeT -= dt;
const k = Math.max(0, this.shakeT / C.shakeDuration);
sx = (Math.random() * 2 - 1) * this.shakeAmt * k; sy = (Math.random() * 2 - 1) * this.shakeAmt * k;
}
const h = C.height * (1 - w * 0.3);
const eye = [this.x + sx, this.y + h + 0.9 + sy, this.dist];
const target3 = [this.x + sx, this.y + h * 0.55 + sy, 0];
return { eye, target: target3, fov };
}
}