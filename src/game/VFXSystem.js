export class VFXSystem {
constructor(max = 160) { this.setMax(max); }
setMax(max) {
this.max = max; this.p = []; this.free = [];
for (let i = 0; i < max; i++) { const o = { alive: false }; this.p.push(o); this.free.push(o); }
this.data = new Float32Array(max * 8); this.count = 0;
}
spawn(x, y, z, vx, vy, vz, life, size, c, opts = {}) {
const o = this.free.pop(); if (!o) return null;
Object.assign(o, { alive: true, x, y, z, vx, vy, vz, life, max: life, size, r: c[0], g: c[1], b: c[2], a: c[3] ?? 1, grav: opts.grav ?? -9, drag: opts.drag ?? 1.5, grow: opts.grow ?? 0, floor: opts.floor ?? -99 });
return o;
}
burst(n, x, y, z, spread, speed, up, life, size, c, opts) {
n = Math.ceil(n * (this.max / 160));
for (let i = 0; i < n; i++) {
const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.6);
this.spawn(x + (Math.random() - 0.5) * spread, y + (Math.random() - 0.5) * spread * 0.5, z + (Math.random() - 0.5) * spread,
Math.cos(a) * s, up * (0.5 + Math.random() * 0.8), Math.sin(a) * s * 0.6, life * (0.6 + Math.random() * 0.6), size * (0.7 + Math.random() * 0.6), c, opts);
}
}
dust(x, y) { this.burst(6, x, y + 0.05, 0, 0.4, 1.2, 0.6, 0.5, 0.18, [0.72, 0.66, 0.58, 0.45], { grav: -1, drag: 3, grow: 0.3 }); }
landing(x, y, k = 1) { this.burst(10 * k, x, y + 0.05, 0, 0.5, 2 * k, 0.8, 0.55, 0.2, [0.7, 0.66, 0.6, 0.5], { grav: -2, drag: 3, grow: 0.35 }); }
impact(x, y, z = 0) {
this.burst(12, x, y, z, 0.2, 4, 3, 0.35, 0.08, [1.0, 0.85, 0.55, 0.9], { grav: -12, drag: 2 });
this.burst(6, x, y, z, 0.3, 1.5, 0.8, 0.45, 0.35, [0.95, 0.92, 0.88, 0.35], { grav: 0, drag: 4, grow: 0.8 });
}
debris(x, y, color) { this.burst(8, x, y, 0, 0.3, 3.5, 4, 0.8, 0.07, color, { grav: -16, drag: 0.6, floor: y - 1.5 }); }
splash(x, y, big = false) { // WaterSplashVFX
const n = big ? 28 : 12;
this.burst(n, x, y, 0, 0.6, big ? 3.5 : 2, big ? 7 : 4, 0.9, 0.14, [0.85, 0.92, 0.96, 0.75], { grav: -14, drag: 0.4 });
this.burst(big ? 8 : 4, x, y + 0.05, 0, 1.0, 1.2, 0.2, 1.2, 0.6, [0.9, 0.95, 0.98, 0.3], { grav: 0, drag: 2, grow: 1.2 });
}
fallingHit(x, y) { this.burst(8, x, y, 0, 0.3, 1.5, 2.5, 0.5, 0.08, [0.8, 0.9, 0.95, 0.7], { grav: -12, drag: 0.6 }); } // WaterFallingHitVFX
drip(x, y) { this.spawn(x + (Math.random() - 0.5) * 0.3, y, (Math.random() - 0.5) * 0.2, 0, -0.3, 0, 0.6, 0.05, [0.75, 0.87, 0.95, 0.7], { grav: -9, drag: 0.2 }); } // DrippingVFX
checkpoint(x, y) { this.burst(22, x, y + 1.3, 0, 1.6, 1.6, 2.2, 1.1, 0.12, [0.45, 0.9, 0.6, 0.85], { grav: -1.2, drag: 1.2 }); }
ringPickup(x, y) { this.burst(10, x, y, 0, 0.2, 2.2, 1.5, 0.5, 0.08, [1.0, 0.86, 0.35, 0.9], { grav: -2, drag: 2 }); }
energy(x, y) { this.burst(16, x, y + 0.9, 0, 0.6, 2.5, 2, 0.6, 0.1, [0.55, 0.85, 1.0, 0.8], { grav: 0, drag: 2 }); }
trail(x, y) { this.spawn(x - 0.2, y + 0.4 + Math.random() * 1.1, (Math.random() - 0.5) * 0.3, -1.5, 0, 0, 0.35, 0.12, [0.6, 0.85, 1.0, 0.4], { grav: 0, drag: 1 }); }
wipeout(x, y) { this.burst(14, x, y + 1.0, 0, 0.4, 2.5, 2.5, 0.9, 0.12, [1.0, 0.95, 0.7, 0.8], { grav: -3, drag: 1.5 }); }
teleport(x, y) { for (let i = 0; i < 18; i++) this.spawn(x + (Math.random() - 0.5) * 0.6, y + Math.random() * 1.8, (Math.random() - 0.5) * 0.6, 0, 1.5 + Math.random(), 0, 0.7, 0.1, [0.7, 0.8, 1.0, 0.8], { grav: 0, drag: 0.5 }); }
update(dt) {
let n = 0; const d = this.data;
for (const o of this.p) {
if (!o.alive) continue;
o.life -= dt;
if (o.life <= 0) { o.alive = false; this.free.push(o); continue; }
const k = Math.exp(-o.drag * dt);
o.vx *= k; o.vz *= k; o.vy = o.vy * k + o.grav * dt;
o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt;
if (o.y < o.floor) { o.y = o.floor; o.vy *= -0.3; }
o.size += o.grow * dt;
const t = o.life / o.max, a = o.a * Math.min(1, t * 2.5);
const i = n * 8;
d[i] = o.x; d[i + 1] = o.y; d[i + 2] = o.z; d[i + 3] = o.r; d[i + 4] = o.g; d[i + 5] = o.b; d[i + 6] = a; d[i + 7] = o.size;
n++;
}
this.count = n;
}
clear() { for (const o of this.p) if (o.alive) { o.alive = false; this.free.push(o); } this.count = 0; }
}