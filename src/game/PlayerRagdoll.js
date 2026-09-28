import { J, JOINT_COUNT, SKEL, POSES, solveFK, makeJoints } from './PlayerAnimation.js';
import { CONFIG } from '../config.js';
import { segSegClosest } from '../core/math.js';
export const RAGDOLL_BONES = [
['Hips', J.pelvis, J.spine], ['Middle Spine', J.spine, J.neck], ['Head', J.neck, J.head],
['Left Hips', J.lHip, J.lKnee], ['Left Knee', J.lKnee, J.lFoot], ['Left Foot', J.lFoot, J.lToe],
['Right Hips', J.rHip, J.rKnee], ['Right Knee', J.rKnee, J.rFoot], ['Right Foot', J.rFoot, J.rToe],
['Left Arm', J.lSh, J.lElb], ['Left Elbow', J.lElb, J.lHand], ['Right Arm', J.rSh, J.rElb], ['Right Elbow', J.rElb, J.rHand],
];
const LINKS = [
[J.pelvis, J.spine], [J.spine, J.neck], [J.neck, J.head], [J.lHip, J.lKnee], [J.lKnee, J.lFoot], [J.lFoot, J.lToe],
[J.rHip, J.rKnee], [J.rKnee, J.rFoot], [J.rFoot, J.rToe], [J.lSh, J.lElb], [J.lElb, J.lHand], [J.rSh, J.rElb], [J.rElb, J.rHand],
[J.pelvis, J.lHip], [J.pelvis, J.rHip], [J.lHip, J.rHip], [J.neck, J.lSh], [J.neck, J.rSh], [J.lSh, J.rSh],
[J.spine, J.lHip], [J.spine, J.rHip], [J.spine, J.lSh], [J.spine, J.rSh], [J.pelvis, J.neck], [J.lSh, J.lHip], [J.rSh, J.rHip],
[J.lSh, J.rHip], [J.rSh, J.lHip], [J.head, J.lSh], [J.head, J.rSh], [J.head, J.spine],
[J.lKnee, J.lToe], [J.rKnee, J.rToe],
];
const MIN_LINKS = [[J.lHip, J.lFoot, 0.5], [J.rHip, J.rFoot, 0.5], [J.lSh, J.lHand, 0.22], [J.rSh, J.rHand, 0.22], [J.head, J.pelvis, 0.6], [J.lFoot, J.rFoot, 0.12], [J.lKnee, J.rKnee, 0.1]];
const RADIUS = [0.12, 0.13, 0.08, 0.12, 0.08, 0.06, 0.05, 0.08, 0.06, 0.05, 0.06, 0.05, 0.05, 0.06, 0.05, 0.05, 0.04, 0.04];
const MASS = [3, 3, 1.5, 2, 2, 1.4, 0.6, 2, 1.4, 0.6, 1.2, 0.8, 0.4, 1.2, 0.8, 0.4, 0.3, 0.3];
export class PlayerRagdoll {
constructor(world, scale = 1) {
this.world = world; this.scale = scale;
this.p = makeJoints(); this.o = makeJoints(); this.active = false; this.t = 0; this.restT = 0;
const bind = solveFK(POSES.idle(0), [0, 0, 0], 1, scale, makeJoints(), true);
this.rest = LINKS.map(([a, b]) => Math.hypot(bind[a][0] - bind[b][0], bind[a][1] - bind[b][1], bind[a][2] - bind[b][2]));
this.inWater = false; this.speed = 0;
}
/** Start from animated joints with linear velocity + impulse (spin via height). */
start(joints, vel, impulse, dt) {
this.active = true; this.t = 0; this.restT = 0;
let minY = Infinity; for (const j of joints) minY = Math.min(minY, j[1]);
for (let i = 0; i < JOINT_COUNT; i++) {
const h = joints[i][1] - minY; // higher parts get more of the impulse -> natural tumble
const k = 0.55 + 0.35 * h;
const vx = vel[0] + impulse[0] * k, vy = vel[1] + impulse[1] * (0.8 + 0.2 * h), vz = (i % 3 - 1) * 0.25 + (impulse[2] || 0);
this.p[i][0] = joints[i][0]; this.p[i][1] = joints[i][1]; this.p[i][2] = joints[i][2];
this.o[i][0] = joints[i][0] - vx * dt; this.o[i][1] = joints[i][1] - vy * dt; this.o[i][2] = joints[i][2] - vz * dt;
}
}
step(dt, hazards) {
if (!this.active) return;
this.t += dt;
const g = CONFIG.physics.gravity, wl = CONFIG.physics.waterLevel;
let sp = 0; this.inWater = false;
for (let i = 0; i < JOINT_COUNT; i++) {
const p = this.p[i], o = this.o[i];
let vx = p[0] - o[0], vy = p[1] - o[1], vz = p[2] - o[2];
let damp = 0.998, grav = g;
if (p[1] < wl) { damp = 0.95; grav = g * -0.08; this.inWater = true; }
vx *= damp; vy *= damp; vz *= damp * 0.97;
o[0] = p[0]; o[1] = p[1]; o[2] = p[2];
p[0] += vx; p[1] += vy + grav * dt * dt; p[2] += vz - p[2] * 0.02; // gently keep near the lane
sp += Math.hypot(vx, vy, vz) / dt;
}
this.speed = sp / JOINT_COUNT;
for (let it = 0; it < CONFIG.ragdoll.iterations; it++) {
for (let k = 0; k < LINKS.length; k++) this.constrain(LINKS[k][0], LINKS[k][1], this.rest[k], false);
for (const [a, b, d] of MIN_LINKS) this.constrain(a, b, d * this.scale, true);
this.collide(hazards);
}
if (this.t > CONFIG.ragdoll.minTime && this.speed < CONFIG.ragdoll.settleSpeed) this.restT += dt; else this.restT = 0;
}
constrain(a, b, rest, minOnly) {
const pa = this.p[a], pb = this.p[b];
const dx = pb[0] - pa[0], dy = pb[1] - pa[1], dz = pb[2] - pa[2];
const d = Math.hypot(dx, dy, dz) || 1e-6;
if (minOnly && d >= rest) return;
const diff = (d - rest) / d;
const wa = 1 / MASS[a], wb = 1 / MASS[b], w = wa + wb;
pa[0] += dx * diff * wa / w; pa[1] += dy * diff * wa / w; pa[2] += dz * diff * wa / w;
pb[0] -= dx * diff * wb / w; pb[1] -= dy * diff * wb / w; pb[2] -= dz * diff * wb / w;
}
collide(hazards) {
const W = this.world;
for (let i = 0; i < JOINT_COUNT; i++) {
const p = this.p[i], o = this.o[i], r = RADIUS[i] * this.scale;
for (const s of W.solids) {
if (p[0] < s.x0 - r || p[0] > s.x1 + r || p[1] < s.y0 - r || p[1] > s.y1 + r || p[2] < s.z0 - r || p[2] > s.z1 + r) continue;
const dTop = s.y1 + r - p[1], dBot = p[1] - (s.y0 - r), dL = p[0] - (s.x0 - r), dR = s.x1 + r - p[0];
const m = Math.min(dTop * 0.7, dBot, dL, dR);
if (m === dTop * 0.7) { p[1] = s.y1 + r; const fr = 0.55; o[0] = p[0] - (p[0] - o[0]) * fr - s.dx; o[2] = p[2] - (p[2] - o[2]) * fr; if (s.conveyor) p[0] += s.conveyor * CONFIG.sim.fixedDt * 0.3; }
else if (m === dBot) p[1] = s.y0 - r;
else if (m === dL) p[0] = s.x0 - r; else p[0] = s.x1 + r;
}
for (const rm of W.ramps) {
if (p[0] < rm.x0 || p[0] > rm.x1) continue;
const y = W.rampY(rm, p[0]) + r;
if (p[1] < y && p[1] > y - 0.6) { p[1] = y; o[0] = p[0] - (p[0] - o[0]) * 0.6; }
}
if (hazards) for (const h of hazards) {
if (!h.active) continue;
const res = h.kind === 'sphere' ? segSegClosest(p, p, h.a, h.a) : segSegClosest(p, p, h.a, h.b);
const rr = r + h.r;
if (res.d2 < rr * rr) {
const d = Math.sqrt(res.d2) || 1e-4; const n = [(p[0] - res.c2[0]) / d, (p[1] - res.c2[1]) / d, (p[2] - res.c2[2]) / d];
const push = rr - d; p[0] += n[0] * push; p[1] += n[1] * push; p[2] += n[2] * push;
const dt = CONFIG.sim.fixedDt; o[0] -= h.vel[0] * dt * 0.3; o[1] -= h.vel[1] * dt * 0.3; o[2] -= h.vel[2] * dt * 0.3;
}
}
}
}
pelvis() { return this.p[J.pelvis]; }
settled() { return this.restT > 0.35 || this.t > CONFIG.ragdoll.maxTime; }
onGround() {
const pv = this.p[J.pelvis];
const g = this.world.groundBelow(pv[0], pv[1] + 0.2, 0.1);
return g && pv[1] - g.y < 0.6 && !this.inWater ? g : null;
}
/** Rebuild toes/feet order etc. for rendering (joints array shared layout). */
joints() { return this.p; }
}