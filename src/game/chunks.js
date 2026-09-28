import { rng, TAU, clamp } from '../core/math.js';
import { DIFF_LEVEL } from '../data/chunkLibrary.js';
import { CONFIG } from '../config.js';
const seedOf = (id) => { let h = 2166136261; for (const c of 'chunk-' + id) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const FORCE = (lvl) => (lvl === 0 ? 'small' : 'medium');
function Sweepers(ctx, x0, r, lvl, compact) {
const L = compact ? 4.6 : r.range(6.3, 7.0);
ctx.platform(x0, x0 + L, 0);
const hx = x0 + L / 2, hz = compact ? -1.45 : -1.8, R = compact ? 2.5 : 3.05;
ctx.stat('cyl', 'metal', hx, 0.95, hz, 0, 0, 0, 0.7, 1.9, 0.7);
ctx.stat('disc', 'deckAlt', hx, -0.05, hz, 0, 0, 0, 2 * R + 0.6, 0.08, 2 * R + 0.6, { shadow: false });
const cap = ctx.dyn('cyl', 'hazard', { cx: hx });
const n = compact ? 1 : [1, 1, 2, 3][lvl];
const w = (compact ? 1.5 : [1.2, 1.5, 1.8, 2.1][lvl]) * (r.chance(0.5) ? 1 : -1) * r.range(0.95, 1.06);
const ph0 = r.range(0, TAU);
const heights = n === 3 ? [0.5, 1.3, 0.5] : Array.from({ length: n }, () => (lvl === 0 ? 0.5 : r.pick([0.5, 0.5, 1.3])));
const arms = heights.map((h, i) => ({
h, off: i * TAU / n, rod: ctx.dyn('cyl', 'metal', { cx: hx, rad: R }), pad: ctx.dyn('cyl', 'pad', { cx: hx, rad: R, patSpace: 1, patScale: 3 }),
hz: ctx.hazard({ kind: 'capsule', r: 0.2, force: FORCE(lvl), sound: 'thud' }), lastZ: 0,
}));
ctx.update((t) => {
const base = ph0 + w * t;
ctx.pose(cap, hx, 1.95, hz, 0, base, 0, 0.9, 0.2, 0.9);
for (const a of arms) {
const th = base + a.off, c = Math.cos(th), s = Math.sin(th);
const p0 = [hx + c * 0.35, a.h, hz + s * 0.35], p1 = [hx + c * R, a.h, hz + s * R], pm = [hx + c * R * 0.35, a.h, hz + s * R * 0.35];
ctx.seg(a.rod, p0, pm, 0.07);
ctx.seg(a.pad, pm, p1, 0.2);
ctx.setHazard(a.hz, pm, p1);
if (Math.sign(p1[2]) !== Math.sign(a.lastZ)) ctx.sfx('whoosh', p1[0]);
a.lastZ = p1[2];
}
});
ctx.ring(hx - (R - 0.5), 1.6); ctx.ring(hx + (R - 0.5), 1.6);
return L;
}
function Trampolines(ctx, x0, r, lvl, compact) {
const lead = 0.5;
ctx.platform(x0, x0 + lead, 0);
const padX = x0 + lead;
ctx.trampoline(padX, padX + 1.0, 0.18);
const gapEnd = padX + 1.0 + r.range(1.6, 2.1) + (lvl >= 2 ? 0.4 : 0);
let L;
if (lvl <= 1 || compact) {
L = compact ? 8.2 : 8.2 + r.range(0, 0.3);
const h = lvl === 1 && !compact ? 0.7 : 0;
ctx.platform(gapEnd, x0 + L - (h ? 1.2 : 0), h);
if (h) ctx.platform(x0 + L - 1.2, x0 + L, 0);
} else {
L = 9.0;
const h = 1.4;
if (lvl === 2) {
ctx.platform(gapEnd, x0 + L - 1.2, h); // elevated landing, then drop
ctx.platform(x0 + L - 1.2, x0 + L, 0);
} else {
const plat = ctx.movingPlatform(gapEnd + 0.2, x0 + L - 1.6, h, { ax: 0.55, ay: 0, period: 3.2, phase: r.range(0, TAU) });
void plat;
ctx.platform(x0 + L - 1.5, x0 + L, 0);
}
}
ctx.ring(padX + 3.2, 3.3); ctx.ring(padX + 4.2, 3.0);
return L;
}
function Crankshafts(ctx, x0, r, lvl, compact) {
const L = compact ? 4.4 : r.range(6.4, 7.2);
ctx.platform(x0, x0 + L, 0);
const ay = 3.75, armL = 3.2;
ctx.stat('cyl', 'metal', x0 + L / 2, ay, 0, 0, 0, Math.PI / 2, 0.26, L - 0.6, 0.26);
ctx.solidOnly(x0 + 0.3, x0 + L - 0.3, ay - 0.14, ay + 0.14, -0.14, 0.14, { walk: false });
for (const px of [x0 + 0.25, x0 + L - 0.25]) {
ctx.stat('box', 'frame', px, ay / 2 + 0.1, -1.7, 0, 0, 0, 0.22, ay + 0.4, 0.22);
ctx.stat('box', 'frame', px, ay + 0.15, -0.85, 0, 0, 0, 0.18, 0.18, 1.8);
}
const n = compact ? 2 : [2, 3, 3, 4][lvl];
const w = (compact ? 1.8 : [1.5, 1.8, 2.1, 2.5][lvl]) * (r.chance(0.5) ? 1 : -1);
const spacing = (L - 1.6) / Math.max(1, n - 1);
const dual = lvl === 3;
const cranks = [];
for (let i = 0; i < n; i++) {
const cx = x0 + 0.8 + i * spacing;
const ph = lvl <= 1 ? i * Math.PI * 0.62 : r.range(0, TAU);
const arms = (dual ? [0, Math.PI] : [0]).map(o => ({ o, rod: ctx.dyn('cyl', 'metal', { cx }), paddle: ctx.dyn('rbox', 'pad', { cx, patSpace: 1, patScale: 3 }),
h1: ctx.hazard({ kind: 'capsule', r: 0.24, force: FORCE(lvl), sound: 'clank' }), h2: ctx.hazard({ kind: 'capsule', r: 0.08, force: FORCE(lvl), sound: 'clank' }) }));
const collar = ctx.dyn('cyl', 'hazardAlt', { cx });
cranks.push({ cx, ph, arms, collar, lastTop: 0 });
}
ctx.update((t) => {
for (const c of cranks) {
const base = c.ph + w * t;
ctx.pose(c.collar, c.cx, ay, 0, base, 0, Math.PI / 2, 0.55, 0.35, 0.55);
for (const a of c.arms) {
const th = base + a.o, s = Math.sin(th), co = Math.cos(th);
const tip = [c.cx, ay - armL * co, armL * s];
ctx.seg(a.rod, [c.cx, ay, 0], tip, 0.07);
const tan = [0, s, co];
const p0 = [tip[0], tip[1] - tan[1] * 0.55, tip[2] - tan[2] * 0.55], p1 = [tip[0], tip[1] + tan[1] * 0.55, tip[2] + tan[2] * 0.55];
ctx.box3(a.paddle, tip, [1, 0, 0], tan, 0.6, 1.3, 0.34);
ctx.setHazard(a.h1, p0, p1);
ctx.setHazard(a.h2, [c.cx, ay, 0], tip);
}
const top = Math.cos(base) < -0.99 ? 1 : 0;
if (top && !c.lastTop) ctx.sfx('clank', c.cx);
c.lastTop = top;
}
});
ctx.ring(x0 + L * 0.3, 1.2); ctx.ring(x0 + L * 0.7, 1.2);
return L;
}
function Conveyors(ctx, x0, r, lvl, compact) {
const L = compact ? 4.4 : lvl === 3 ? 7.5 : r.range(6.4, 7.4);
const S = CONFIG.conveyor.speed;
let segs;
if (compact) segs = [[L, r.chance(0.5) ? 1 : -1]];
else if (lvl === 0) segs = [[L, 1]];
else if (lvl === 1) segs = [[L * 0.5, 1], [L * 0.5, -1]];
else if (lvl === 2) segs = [[L * 0.36, -1], ['gap', 1.1], [L - L * 0.36 - 1.1, r.chance(0.5) ? 1 : -1]];
else segs = [[1.8, -1], ['gap', 1.1], [1.8, 1], ['gap', 1.0], [L - 5.7, -1]];
let x = x0, belts = [];
for (const [a, b] of segs) {
if (a === 'gap') { x += b; continue; }
const len = a, dir = b;
belts.push(ctx.conveyor(x, x + len, 0, dir * S));
x += len;
}
if (lvl >= 2 && !compact) { // hurdle blocks riding on the belts (static frames)
const hx = lvl === 2 ? x0 + L * 0.36 + 1.1 + 1.3 : x0 + 3.8;
ctx.box(hx - 0.18, hx + 0.18, 0, 0.5, -1.2, 1.2, 'hazard', { patSpace: 1, patScale: 3 });
ctx.ring(hx, 1.7);
}
if (lvl === 1) ctx.box(x0 + L * 0.72 - 0.18, x0 + L * 0.72 + 0.18, 0, 0.42, -1.2, 1.2, 'hazard', { patSpace: 1, patScale: 3 });
ctx.ring(x0 + L * 0.45, 1.1); ctx.ring(x0 + L * 0.85, 1.1);
void belts;
return L;
}
function Pendulums(ctx, x0, r, lvl, compact) {
const L = compact ? 4.2 : r.range(6.4, 7.2);
const n = compact ? 1 : [2, 2, 3, 3][lvl];
const spacing = L / n;
const py = 5.6, len = 4.35;
const hammer = lvl === 3;
if (lvl >= 2 && !compact) {
let x = x0;
for (let i = 0; i < n; i++) {
const end = i === n - 1 ? x0 + L : x0 + (i + 1) * spacing - 0.45;
ctx.platform(x, end, 0); x = end + 0.9;
}
} else ctx.platform(x0, x0 + L, 0);
const pends = [];
for (let i = 0; i < n; i++) {
const px = x0 + spacing * (i + 0.5);
const plane = r.chance(0.5) ? 'xy' : 'yz';
const T = [3.2, 2.9, 2.6, 2.3][lvl] * r.range(0.95, 1.05);
const A = r.range(0.95, 1.1);
ctx.stat('box', 'frame', px, py / 2 + 0.2, -2.5, 0, 0, 0, 0.25, py + 0.8, 0.25);
ctx.stat('box', 'frame', px, py + 0.3, -1.25, 0, 0, 0, 0.22, 0.22, 2.7);
const p = { px, plane, w: TAU / T, A, ph: r.range(0, TAU), rod: ctx.dyn('cyl', 'metal', { cx: px, rad: 5 }),
bob: ctx.dyn(hammer ? 'cyl' : 'sphere', 'hazard', { cx: px, rad: 5, patSpace: 1, patScale: hammer ? 3 : 2, pattern: hammer ? 1 : 10 }),
h: ctx.hazard({ kind: hammer ? 'capsule' : 'sphere', r: hammer ? 0.4 : 0.52, force: FORCE(lvl), sound: 'thud' }),
hr: ctx.hazard({ kind: 'capsule', r: 0.06, force: 'small', sound: 'thud' }), lastS: 0 };
pends.push(p);
}
ctx.update((t) => {
for (const p of pends) {
const th = p.A * Math.sin(p.w * t + p.ph), s = Math.sin(th), c = Math.cos(th);
const piv = [p.px, py, 0];
const bob = p.plane === 'xy' ? [p.px + s * len, py - c * len, 0] : [p.px, py - c * len, s * len];
ctx.seg(p.rod, piv, bob, 0.05);
ctx.setHazard(p.hr, piv, bob);
if (hammer) {
const ax = p.plane === 'xy' ? [0, 0, 1] : [1, 0, 0];
const a = [bob[0] - ax[0] * 0.6, bob[1], bob[2] - ax[2] * 0.6], b = [bob[0] + ax[0] * 0.6, bob[1], bob[2] + ax[2] * 0.6];
ctx.seg(p.bob, a, b, 0.4); ctx.setHazard(p.h, a, b);
} else { ctx.pose(p.bob, bob[0], bob[1], bob[2], th * 2, 0, p.plane === 'xy' ? th : 0, 1.04, 1.04, 1.04); ctx.setHazard(p.h, bob, bob); }
const sg = Math.sign(s); if (sg !== p.lastS && Math.abs(s) < 0.3) ctx.sfx('whoosh', bob[0]); p.lastS = sg;
}
});
for (const p of pends) ctx.ring(p.px, 0.9);
return L;
}
function Platforms(ctx, x0, r, lvl, compact) {
const target = compact ? 4.4 : r.range(6.4, 7.4);
let x = x0, y = 0;
const first = compact ? 1.0 : r.range(1.2, 1.6);
ctx.platform(x, x + first, 0); x += first;
const gapBase = [1.0, 1.25, 1.5, 1.75][lvl];
let guard = 0;
while (x < x0 + target - 1.3 && guard++ < 8) {
const gap = gapBase * r.range(0.85, 1.12);
const left = x0 + target - (x + gap);
let len = clamp(r.range(1.2, 2.2) - lvl * 0.15, 1.0, 2.4);
if (left - len < 1.2) len = left; // last platform reaches the chunk end
const last = x + gap + len >= x0 + target - 0.01;
let ny = last ? 0 : clamp(y + r.pick([-0.5, 0, 0.45, 0.8]) * (lvl >= 1 ? 1 : 0.6), 0, 1.5);
const moving = !last && lvl >= 2 && r.chance(lvl === 3 ? 0.55 : 0.35);
if (moving) {
const vert = r.chance(0.35);
ctx.movingPlatform(x + gap, x + gap + len, ny, { ax: vert ? 0 : 0.5, ay: vert ? 0.5 : 0, period: r.range(2.8, 3.6), phase: r.range(0, TAU) });
} else ctx.platform(x + gap, x + gap + len, ny);
ctx.ring(x + gap / 2, Math.max(y, ny) + 1.9);
x += gap + len; y = ny;
}
if (x < x0 + target) { ctx.platform(x, x0 + target, 0); x = x0 + target; }
return x - x0;
}
function Bumpers(ctx, x0, r, lvl, compact) {
const L = compact ? 4.4 : r.range(6.4, 7.2);
ctx.platform(x0, x0 + L, 0);
const n = compact ? 2 : [2, 3, 3, 4][lvl];
const types = lvl === 0 ? ['post', 'popper'] : ['post', 'piston', 'popper', 'piston'];
const list = [];
for (let i = 0; i < n; i++) {
const bx = x0 + L * (i + 0.6) / (n + 0.2);
const type = compact ? types[i % 2] : r.pick(types);
const b = { type, bx, T: r.range(1.8, 2.4) - lvl * 0.15, ph: r.range(0, 3), squash: 0 };
if (type === 'post') {
b.vis = ctx.dyn('cyl', 'rubber', { cx: bx }); b.cap = ctx.dyn('sphere', 'rubber', { cx: bx });
b.h = ctx.hazard({ kind: 'capsule', a: [bx, 0.1, 0], b: [bx, 0.55, 0], r: 0.36, force: 'small', knock: [-0.6, 0.8], sound: 'boing', onHit: () => { b.squash = 1; } });
ctx.stat('disc', 'metal', bx, 0.02, 0, 0, 0, 0, 0.95, 0.05, 0.95);
} else if (type === 'piston') {
ctx.stat('box', 'frame', bx, 1.0, -2.3, 0, 0, 0, 0.7, 2.0, 0.5);
b.rod = ctx.dyn('cyl', 'metal', { cx: bx }); b.pad = ctx.dyn('rbox2', 'rubber', { cx: bx });
b.h = ctx.hazard({ kind: 'capsule', r: 0.42, force: lvl >= 3 ? 'medium' : 'small', knock: [-0.55, 0.85], sound: 'boing' });
} else {
ctx.stat('disc', 'metal', bx, 0.02, 0, 0, 0, 0, 1.1, 0.05, 1.1);
b.pad = ctx.dyn('disc', 'rubber', { cx: bx });
b.h = ctx.hazard({ kind: 'sphere', r: 0.45, force: 'small', knock: [-0.35, 1.0], sound: 'boing' });
}
list.push(b);
}
ctx.update((t, dt) => {
for (const b of list) {
const cyc = ((t + b.ph) % b.T) / b.T;
if (b.type === 'post') {
b.squash = Math.max(0, b.squash - dt * 4);
const sq = 1 + 0.25 * b.squash * Math.sin(t * 40), pulse = 1 + 0.04 * Math.sin(t * 5 + b.ph);
ctx.pose(b.vis, b.bx, 0.35, 0, 0, 0, 0, 0.72 * pulse * sq, 0.7 / sq, 0.72 * pulse * sq);
ctx.pose(b.cap, b.bx, 0.7 / sq, 0, 0, 0, 0, 0.72 * pulse * sq, 0.3, 0.72 * pulse * sq);
} else if (b.type === 'piston') {
let e;
if (cyc < 0.5) e = 0; else if (cyc < 0.57) e = (cyc - 0.5) / 0.07; else if (cyc < 0.72) e = 1; else e = 1 - (cyc - 0.72) / 0.28;
const z = -2.05 + e * 2.05;
ctx.seg(b.rod, [b.bx, 1.0, -2.3], [b.bx, 1.0, z - 0.2], 0.08);
ctx.pose(b.pad, b.bx, 1.0, z, 0, 0, 0, 0.9, 0.9, 0.35);
ctx.setHazard(b.h, [b.bx, 0.75, z], [b.bx, 1.25, z]);
b.h.vel = [0, 0, e > 0 && e < 1 && cyc < 0.57 ? 30 : 0];
if (cyc >= 0.5 && b.lastC < 0.5) ctx.sfx('piston', b.bx);
b.lastC = cyc;
} else {
let e; if (cyc < 0.6) e = 0; else if (cyc < 0.66) e = (cyc - 0.6) / 0.06; else if (cyc < 0.8) e = 1; else e = 1 - (cyc - 0.8) / 0.2;
const y = -0.35 + e * 0.75;
ctx.pose(b.pad, b.bx, y + 0.1, 0, 0, 0, 0, 0.95, 0.2, 0.95);
ctx.setHazard(b.h, [b.bx, y - 0.1, 0], [b.bx, y - 0.1, 0]);
b.h.active = e > 0.05;
if (cyc >= 0.6 && b.lastC < 0.6) ctx.sfx('pop', b.bx);
b.lastC = cyc;
}
}
});
for (const b of list) ctx.ring(b.bx, 1.9);
return L;
}
function BigBalls(ctx, x0, r, lvl, compact, variant) {
const B = CONFIG.bigBall, g = CONFIG.physics.gravity;
const v = compact ? 'drop' : variant;
const balls = [];
const mkBall = (rad) => { const b = { r: rad, active: false, p: [0, -20, 0], v: [0, 0, 0], rot: 0, vis: ctx.dyn('sphere', 'ball', { cx: x0, rad: 12, patSpace: 1, patScale: 1, pattern: 10 }), h: ctx.hazard({ kind: 'sphere', r: rad, force: 'ball', sound: 'ballhit', active: false }) }; b.vis.visible = false; balls.push(b); return b; };
let L, spawn, stepBall;
if (v === 'ramp') {
L = r.range(6.8, 7.4);
const top = 1.3, rs = x0 + 1.2, re = x0 + L - 1.6;
ctx.platform(x0, rs, 0);
ctx.ramp(rs, 0, re, top);
ctx.platform(re, x0 + L - 0.7, top);
ctx.platform(x0 + L - 0.7, x0 + L, 0);
ctx.stat('box', 'frame', re + 0.5, top + 0.9, -1.2, 0, 0, 0, 1.4, 1.8, 0.4); // ball chute
const rad = lvl >= 3 ? 0.85 : 0.7;
for (let i = 0; i < 4; i++) mkBall(rad);
const every = [2.8, 2.5, 2.2, 1.7][lvl];
let k = 0;
spawn = (t) => { const idx = Math.floor(t / every); if (idx !== k) { k = idx; const b = balls.find(b => !b.active); if (b) { b.active = true; b.p = [re + 0.4, top + b.r, -0.9]; b.v = [-1.5, 0, 0.9]; } } };
stepBall = (b, dt) => {
const slope = top / (re - rs);
const x = b.p[0];
let groundY = x >= re ? top : x >= rs ? (x - rs) * slope : 0;
if (b.p[2] < 0) b.p[2] = Math.min(0, b.p[2] + b.v[2] * dt);
if (x < rs + 0.8) { b.v[2] += 16 * dt; }
b.v[1] += g * dt;
if (x < re && x >= rs) b.v[0] -= 9 * slope * dt;
b.v[0] = Math.max(b.v[0], -[5, 5.5, 6, 7][lvl]);
b.p[0] += b.v[0] * dt; b.p[1] += b.v[1] * dt; if (b.p[2] >= 0) b.p[2] += b.v[2] * dt;
if (b.p[2] < 1.4 && b.p[1] < groundY + b.r) { b.p[1] = groundY + b.r; if (b.v[1] < -3) b.v[1] = Math.max(B.minBounceForce * 0.6, -b.v[1] * B.restitution) * B.verticalDamping; else b.v[1] = 0; }
return b.p[1] < -3;
};
} else if (v === 'drop') {
L = compact ? 4.6 : r.range(6.4, 7.0);
ctx.platform(x0, x0 + L, 0);
const rad = compact ? 0.6 : 0.7;
for (let i = 0; i < 3; i++) mkBall(rad);
const every = [2.2, 2.0, 1.7, 1.4][lvl];
let k = 0; const seq = rng(seedOf('drop' + x0.toFixed(0)));
spawn = (t) => { const idx = Math.floor(t / every); if (idx !== k) { k = idx; const b = balls.find(b => !b.active); if (b) { b.active = true; b.p = [x0 + 0.8 + seq() * (L - 1.2), 9, 0]; b.v = [-1.2 - seq(), 0, 0]; b.bounces = 0; } } };
stepBall = (b, dt) => {
b.v[1] += g * dt; b.p[0] += b.v[0] * dt; b.p[1] += b.v[1] * dt; b.p[2] += b.v[2] * dt;
const onDeck = b.p[0] > x0 - 0.3 && b.p[0] < x0 + L + 0.3 && Math.abs(b.p[2]) < 1.5;
if (onDeck && b.p[1] < b.r && b.v[1] < 0) {
b.p[1] = b.r; b.bounces++;
b.v[1] = Math.max(B.minBounceForce, -b.v[1] * B.restitution) * B.verticalDamping; b.v[0] *= B.horizontalDamping;
ctx.sfx('ballbounce', b.p[0]);
if (b.bounces >= 3) b.v[2] = 2.2; // roll off the front of the course
}
return b.p[1] < -3;
};
} else { // 'cross': balls roll across the lane from the back
L = r.range(6.4, 7.0);
const tut = variant === 'crossTut';
ctx.platform(x0, x0 + L, 0);
const lanes = tut ? 2 : [2, 2, 3, 3][lvl];
const rad = tut ? 0.55 : 0.75;
const speed = tut ? 2.6 : [3.2, 3.6, 4.2, 5.0][lvl];
const every = tut ? 3.2 : [3.0, 2.7, 2.4, 2.0][lvl];
const laneX = Array.from({ length: lanes }, (_, i) => x0 + L * (i + 0.7) / (lanes + 0.4));
for (const lx of laneX) { ctx.ramp3d(lx, rad); for (let i = 0; i < 2; i++) mkBall(rad); }
const phases = laneX.map((_, i) => i * every / lanes + r.range(0, 0.4));
const last = laneX.map(() => -1);
spawn = (t) => {
laneX.forEach((lx, i) => { const idx = Math.floor((t + phases[i]) / every); if (idx !== last[i]) { last[i] = idx; const b = balls.find(b => !b.active); if (b) { b.active = true; b.p = [lx, 1.4 + rad, -6]; b.v = [0, 0, speed]; } } });
};
stepBall = (b, dt) => {
b.p[2] += b.v[2] * dt;
if (b.p[2] < -1.5) b.p[1] = rad + (-1.5 - b.p[2]) * 0.3; // rolling down the chute
else if (b.p[2] < 1.5) b.p[1] = rad; else { b.v[1] += g * dt; b.p[1] += b.v[1] * dt; }
return b.p[1] < -3;
};
}
ctx.update((t, dt) => {
spawn(t);
for (const b of balls) {
if (!b.active) continue;
const done = stepBall(b, dt);
b.rot += (Math.hypot(b.v[0], b.v[2]) / b.r) * dt;
b.h.a = b.p; b.h.b = b.p; b.h.vel = b.v.slice(); b.h.active = true;
b.vis.visible = true;
ctx.pose(b.vis, b.p[0], b.p[1], b.p[2], b.v[2] !== 0 ? b.rot : 0, 0, b.v[2] === 0 ? b.rot : 0, b.r * 2, b.r * 2, b.r * 2);
b.vis.cx = b.p[0];
if (done) { ctx.sfx('splash', b.p[0]); b.active = false; b.h.active = false; b.vis.visible = false; b.p = [0, -20, 0]; }
}
});
ctx.ring(x0 + L * 0.5, 1.9);
return L;
}
function Tutorial(ctx, x0, r, lvl, compact, name) {
if (name === 'TutorialBalls') return BigBalls(ctx, x0, r, 0, false, 'crossTut');
let L = 9.5;
if (name === 'Tutorial01') { // run + small steps
ctx.platform(x0, x0 + L, 0);
ctx.box(x0 + 3.0, x0 + 4.4, 0, 0.3, -1.4, 1.4, 'deckAlt');
ctx.box(x0 + 6.0, x0 + 7.2, 0, 0.3, -1.4, 1.4, 'deckAlt');
ctx.sign(x0 + 1.2, 'RUN');
for (let i = 0; i < 4; i++) ctx.ring(x0 + 2 + i * 2, 1.1);
} else if (name === 'Tutorial02') { // jumping gaps + hurdle
ctx.platform(x0, x0 + 2.2, 0); ctx.platform(x0 + 3.3, x0 + 5.4, 0); ctx.platform(x0 + 6.8, x0 + L, 0);
ctx.box(x0 + 8.2, x0 + 8.5, 0, 0.5, -1.2, 1.2, 'hazard', { patSpace: 1, patScale: 3 });
ctx.sign(x0 + 1.0, 'JUMP');
ctx.ring(x0 + 2.75, 1.9); ctx.ring(x0 + 6.1, 1.9); ctx.ring(x0 + 8.35, 1.9);
} else if (name === 'Tutorial03') { // slide tunnel + jump
ctx.platform(x0, x0 + L, 0);
ctx.box(x0 + 3.2, x0 + 5.4, 1.05, 1.5, -1.4, 1.4, 'hazard', { patSpace: 1, patScale: 2 });
ctx.stat('box', 'frame', x0 + 3.3, 0.8, -1.35, 0, 0, 0, 0.2, 1.6, 0.2);
ctx.stat('box', 'frame', x0 + 5.3, 0.8, -1.35, 0, 0, 0, 0.2, 1.6, 0.2);
ctx.box(x0 + 7.4, x0 + 7.7, 0, 0.45, -1.2, 1.2, 'hazard', { patSpace: 1, patScale: 3 });
ctx.sign(x0 + 1.0, 'SLIDE');
ctx.ring(x0 + 4.3, 0.5); ctx.ring(x0 + 7.55, 1.9);
} else { // Tutorial04: slow sweeper + conveyor
L = 10;
ctx.platform(x0, x0 + 6, 0);
const hx = x0 + 3, hz = -1.8, R = 3.0;
ctx.stat('cyl', 'metal', hx, 0.95, hz, 0, 0, 0, 0.7, 1.9, 0.7);
ctx.stat('disc', 'deckAlt', hx, -0.05, hz, 0, 0, 0, 6.6, 0.08, 6.6, { shadow: false });
const rod = ctx.dyn('cyl', 'pad', { cx: hx, patSpace: 1, patScale: 3 });
const h = ctx.hazard({ kind: 'capsule', r: 0.2, force: 'small', sound: 'thud' });
ctx.update((t) => { const th = 0.9 * t + 1.0; const c = Math.cos(th), s = Math.sin(th); const a = [hx + c * 0.4, 0.45, hz + s * 0.4], b = [hx + c * R, 0.45, hz + s * R]; ctx.seg(rod, a, b, 0.2); ctx.setHazard(h, a, b); });
ctx.conveyor(x0 + 6, x0 + L, 0, CONFIG.conveyor.speed);
ctx.sign(x0 + 0.8, 'TIMING');
ctx.ring(x0 + 3 - 2.4, 1.5); ctx.ring(x0 + 3 + 2.4, 1.5); ctx.ring(x0 + 8, 1.1);
}
return L;
}
function Mix(ctx, x0, r, lvl) {
const pool = ['Sweepers', 'Pendulums', 'Bumpers', 'Conveyors', 'Platforms', 'Crankshafts', 'Big Balls'];
const a = r.pick(pool); let b = r.pick(pool); while (b === a) b = r.pick(pool);
const L1 = FAMILIES[a](ctx, x0, r, lvl, true);
const L2 = FAMILIES[b](ctx, x0 + L1, r, lvl, true);
ctx.meta.mix = [a, b];
return L1 + L2;
}
export const FAMILIES = { Tutorial, Sweepers, Trampolines, Crankshafts, Conveyors, Mix, Platforms, Bumpers, Pendulums, 'Big Balls': BigBalls };
const BALL_VARIANT = { '000': 'ramp', '001': 'drop', '002': 'cross', '097': 'ramp' };
/** Build the implementation asset for a ChunkID at x0; returns its length. */
export function buildChunk(ctx, def, x0) {
const r = rng(seedOf(def.id));
const lvl = DIFF_LEVEL[def.tuning] ?? 2;
const fam = def.assetKind;
ctx.meta = { id: def.id, family: fam };
if (fam === 'Tutorial') return Tutorial(ctx, x0, r, lvl, false, def.name);
if (fam === 'Big Balls') return BigBalls(ctx, x0, r, lvl, false, BALL_VARIANT[def.id] || 'drop');
const f = FAMILIES[fam];
if (!f) throw new Error('No builder for chunk ' + def.id + ' (' + fam + ')');
const L = f(ctx, x0, r, lvl, false);
if (r.chance(0.34)) ctx.pickup(x0 + 0.35, 0.95, 'energy');
return L;
}