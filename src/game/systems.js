import { CONFIG } from '../config.js';
import { clamp, lerp } from '../core/math.js';
export class TimerSystem {
constructor() { this.time = 0; this.running = false; this.penalty = 0; }
start() { this.running = true; }
stop() { this.running = false; }
tick(realDt) { if (this.running) this.time += realDt; }
addPenalty(s) { this.time += s; this.penalty += s; }
}
export const StarSystem = {
/** Exact per-course thresholds: [3★ max, 2★ max, 1★ max]. */
stars(time, thresholds) {
const [s3, s2, s1] = thresholds;
if (time <= s3) return 3; if (time <= s2) return 2; if (time <= s1) return 1; return 0;
},
nextTarget(time, thresholds) {
for (let i = 0; i < 3; i++) if (time <= thresholds[i]) return { stars: 3 - i, time: thresholds[i] };
return null;
},
};
export class CheckpointManager {
constructor(checkpoints, spawn) { this.list = checkpoints; this.spawn = spawn; this.current = -1; this.reached = 0; }
update(x, events) {
const next = this.list[this.current + 1];
if (next && x >= next.x) { this.current++; this.reached = this.current + 1; events.emit('checkpoint', { index: this.current, cp: next, total: this.list.length }); }
}
recoveryPoint() { return this.current >= 0 ? { x: this.list[this.current].x, y: this.list[this.current].y } : { ...this.spawn }; }
}
export class RingSystem {
constructor(rings) { this.rings = rings; this.count = 0; this.total = rings.length; }
update(px, py, events, t) {
for (const r of this.rings) {
if (r.taken) continue;
const dx = r.x - px, dy = r.y - (py + 0.95);
if (dx * dx + dy * dy < 0.9 * 0.9) { r.taken = true; r.takenT = t; this.count++; events.emit('ring', { ring: r, count: this.count }); }
}
}
}
export class SlowMotion {
constructor() { this.t = -1; }
trigger() { this.t = 0; }
get active() { return this.t >= 0; }
tick(realDt) { if (this.t >= 0) { this.t += realDt; const S = CONFIG.slowmo; if (this.t > S.fadeIn + S.duration + S.fadeOut) this.t = -1; } }
get scale() {
if (this.t < 0) return 1;
const S = CONFIG.slowmo, t = this.t;
if (t < S.fadeIn) return lerp(1, S.factor, t / S.fadeIn);
if (t < S.fadeIn + S.duration) return S.factor;
return lerp(S.factor, 1, clamp((t - S.fadeIn - S.duration) / S.fadeOut, 0, 1));
}
}
export class PowerupSystem {
constructor(pickups) {
this.pickups = pickups; this.energyT = 0;
this.rewinds = CONFIG.powerups.rewindCharges; this.teleports = CONFIG.powerups.teleportCharges;
this.used = { energy: 0, rewind: 0, teleport: 0 };
}
update(player, dt, events, t) {
for (const p of this.pickups) {
if (p.taken) continue;
const dx = p.x - player.x, dy = p.y - (player.y + 0.9);
if (dx * dx + dy * dy < 0.8 * 0.8) { p.taken = true; p.takenT = t; this.activateEnergy(events, player); }
}
if (this.energyT > 0) {
this.energyT -= dt;
if (this.energyT <= 0) { this.energyT = 0; events.emit('energyEnd', {}); }
}
player.speedMul = this.energyT > 0 ? CONFIG.powerups.energySpeedMul : 1;
}
activateEnergy(events, player) { this.energyT = CONFIG.powerups.energyDuration; this.used.energy++; events.emit('energy', { x: player.x, y: player.y }); }
}
/** Ring buffer of recent player states used by Rewind. */
export class RewindBuffer {
constructor(seconds, rate = 20) { this.rate = rate; this.max = Math.ceil(seconds * rate) + 2; this.buf = []; this.acc = 0; }
record(dt, p, anim, cpIndex) {
this.acc += dt; if (this.acc < 1 / this.rate) return; this.acc = 0;
this.buf.push({ x: p.x, y: p.y, ctrlVx: p.ctrlVx, extVx: p.extVx, vy: p.vy, facing: p.facing, sliding: p.sliding, anim: anim.state, phase: anim.phase, cp: cpIndex });
if (this.buf.length > this.max) this.buf.shift();
}
clear() { this.buf.length = 0; }
get ready() { return this.buf.length >= this.rate; }
}
/** Ghost recording: position, rotation(facing), timing, animation, course progress. */
export class GhostRecorder {
constructor(rate = CONFIG.ghost.sampleRate) { this.rate = rate; this.frames = []; this.acc = 0; }
record(realDt, time, p, anim, chunkIndex, wipeout) {
this.acc += realDt; if (this.acc < 1 / this.rate) return; this.acc = 0;
this.frames.push([+time.toFixed(3), +p.x.toFixed(3), +p.y.toFixed(3), p.facing, ANIM_IDS.indexOf(wipeout ? 'fall' : anim.state), +anim.phase.toFixed(2), chunkIndex]);
}
data() { return { rate: this.rate, frames: this.frames }; }
}
export const ANIM_IDS = ['idle', 'walk', 'run', 'sprint', 'backward', 'jump', 'fall', 'land', 'slide', 'stumble', 'impact', 'stunned', 'recovery', 'finish', 'victory', 'defeat'];
export function sampleGhost(g, time) {
const f = g.frames; if (!f || !f.length) return null;
if (time <= f[0][0]) return f[0];
if (time >= f[f.length - 1][0]) return f[f.length - 1];
let lo = 0, hi = f.length - 1;
while (hi - lo > 1) { const m = (lo + hi) >> 1; if (f[m][0] <= time) lo = m; else hi = m; }
const a = f[lo], b = f[hi], k = (time - a[0]) / Math.max(1e-6, b[0] - a[0]);
return [time, lerp(a[1], b[1], k), lerp(a[2], b[2], k), a[3], a[4], lerp(a[5], b[5], k), a[6]];
}