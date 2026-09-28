import { segSegClosest } from '../core/math.js';
let NEXT_ID = 1;
export class PhysicsWorld {
constructor() { this.clear(); }
clear() { this.solids = []; this.ramps = []; this.hazards = []; this.triggers = []; this.balls = []; }
addSolid(s) {
const o = Object.assign({ id: NEXT_ID++, walk: true, conveyor: 0, bounce: 0, moving: false, dx: 0, dy: 0, surface: 'default', z0: -1.5, z1: 1.5, chunk: -1 }, s);
this.solids.push(o); return o;
}
addRamp(r) { const o = Object.assign({ id: NEXT_ID++, conveyor: 0, surface: 'default', ramp: true, chunk: -1 }, r); this.ramps.push(o); return o; }
addHazard(h) {
const o = Object.assign({ id: NEXT_ID++, active: true, vel: [0, 0, 0], force: 'medium', a: [0, 0, 0], b: [0, 0, 0], r: 0.3, kind: 'sphere', lastHit: -99, sound: 'impact', chunk: -1 }, h);
this.hazards.push(o); return o;
}
addTrigger(t) { const o = Object.assign({ id: NEXT_ID++, done: false }, t); this.triggers.push(o); return o; }
/** Move a solid and record its delta (used for carrying the player). */
moveSolid(s, x0, y0) {
const w = s.x1 - s.x0, h = s.y1 - s.y0;
s.dx = x0 - s.x0; s.dy = y0 - s.y0;
s.x0 = x0; s.x1 = x0 + w; s.y0 = y0; s.y1 = y0 + h;
}
/** Highest walkable surface under x whose top is <= yMax. */
groundBelow(x, yMax, hw = 0) {
let best = -Infinity, ref = null;
for (const s of this.solids) {
if (!s.walk || x < s.x0 - hw || x > s.x1 + hw) continue;
if (s.y1 <= yMax && s.y1 > best) { best = s.y1; ref = s; }
}
for (const r of this.ramps) {
if (x < r.x0 || x > r.x1) continue;
const y = r.y0 + (r.y1 - r.y0) * (x - r.x0) / (r.x1 - r.x0);
if (y <= yMax && y > best) { best = y; ref = r; }
}
return ref ? { y: best, ref } : null;
}
rampY(r, x) { const t = Math.max(0, Math.min(1, (x - r.x0) / (r.x1 - r.x0))); return r.y0 + (r.y1 - r.y0) * t; }
/** Test a capsule (a,b,r) against all active hazards. Returns first hit. */
hazardHit(a, b, r, time) {
for (const h of this.hazards) {
if (!h.active) continue;
let res;
if (h.kind === 'sphere') res = segSegClosest(a, b, h.a, h.a);
else res = segSegClosest(a, b, h.a, h.b);
const rr = r + h.r;
if (res.d2 < rr * rr) return { h, point: res.c2, playerPoint: res.c1, dist: Math.sqrt(res.d2) };
}
void time; return null;
}
}