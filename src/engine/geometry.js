import { normalMatrix3 } from '../core/math.js';
function build(pos, nrm, idx) {
return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), idx: pos.length / 3 > 65535 ? new Uint32Array(idx) : new Uint16Array(idx) };
}
/** Unit cube centred at origin (bevel-free, flat normals). */
export function box() {
const P = [], N = [], I = [];
const faces = [
[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 1, 0], [0, 0, -1]],
[[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [0, 0, -1], [1, 0, 0]],
[[0, 0, 1], [0, 1, 0], [-1, 0, 0]], [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
];
for (const [n, u, v] of faces) {
const b = P.length / 3;
for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
P.push(0.5 * (n[0] + u[0] * su + v[0] * sv), 0.5 * (n[1] + u[1] * su + v[1] * sv), 0.5 * (n[2] + u[2] * su + v[2] * sv));
N.push(...n);
}
const cr = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const ok = cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] > 0;
if (ok) I.push(b, b + 1, b + 2, b, b + 2, b + 3); else I.push(b, b + 2, b + 1, b, b + 3, b + 2);
}
return build(P, N, I);
}
/** Rounded box via superellipsoid-ish sphere mapping (nicer padded obstacles). */
export function roundedBox(r = 0.12, seg = 4) {
const P = [], N = [], I = [];
const n = seg * 2 + 1; const faces = [
[[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
[[0, 1, 0], [1, 0, 0], [0, 0, -1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
[[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
];
const inner = 0.5 - r;
for (const [fn, u, v] of faces) {
const b = P.length / 3;
for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
const a = -1 + 2 * i / n, c = -1 + 2 * j / n;
const p = [fn[0] + u[0] * a + v[0] * c, fn[1] + u[1] * a + v[1] * c, fn[2] + u[2] * a + v[2] * c];
const q = p.map(x => Math.max(-1, Math.min(1, x)) * inner / 1);
const cl = [Math.max(-inner, Math.min(inner, p[0] * 0.5)), Math.max(-inner, Math.min(inner, p[1] * 0.5)), Math.max(-inner, Math.min(inner, p[2] * 0.5))];
let d = [p[0] * 0.5 - cl[0], p[1] * 0.5 - cl[1], p[2] * 0.5 - cl[2]];
let l = Math.hypot(...d); if (l < 1e-6) { d = fn.slice(); l = 1; }
d = d.map(x => x / l);
P.push(cl[0] + d[0] * r, cl[1] + d[1] * r, cl[2] + d[2] * r); N.push(...d);
void q;
}
for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
const a = b + j * (n + 1) + i, bb = a + 1, c = a + n + 1, d = c + 1;
I.push(a, bb, d, a, d, c);
}
}
return build(P, N, I);
}
export function sphere(seg = 16, rings = null) {
rings = rings || Math.max(6, Math.floor(seg * 0.6));
const P = [], N = [], I = [];
for (let j = 0; j <= rings; j++) {
const th = Math.PI * j / rings, st = Math.sin(th), ct = Math.cos(th);
for (let i = 0; i <= seg; i++) {
const ph = 2 * Math.PI * i / seg;
const x = st * Math.cos(ph), y = ct, z = st * Math.sin(ph);
P.push(x * 0.5, y * 0.5, z * 0.5); N.push(x, y, z);
}
}
for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
const a = j * (seg + 1) + i, b = a + seg + 1;
I.push(a, a + 1, b, b, a + 1, b + 1);
}
return build(P, N, I);
}
/** Cylinder along Y centred at origin, height 1, radius 0.5 (optionally tapered). */
export function cylinder(seg = 16, rTop = 0.5, rBot = 0.5, caps = true) {
const P = [], N = [], I = [];
const slope = (rBot - rTop);
for (let j = 0; j <= 1; j++) {
const y = j - 0.5, r = j ? rTop : rBot;
for (let i = 0; i <= seg; i++) {
const a = 2 * Math.PI * i / seg, c = Math.cos(a), s = Math.sin(a);
P.push(c * r, y, s * r);
const n = [c, slope, s], l = Math.hypot(...n); N.push(n[0] / l, n[1] / l, n[2] / l);
}
}
for (let i = 0; i < seg; i++) I.push(i, i + seg + 1, i + 1, i + 1, i + seg + 1, i + seg + 2);
if (caps) {
for (const [y, r, ny] of [[0.5, rTop, 1], [-0.5, rBot, -1]]) {
if (r <= 0) continue;
const c = P.length / 3; P.push(0, y, 0); N.push(0, ny, 0);
for (let i = 0; i <= seg; i++) { const a = 2 * Math.PI * i / seg; P.push(Math.cos(a) * r, y, Math.sin(a) * r); N.push(0, ny, 0); }
for (let i = 0; i < seg; i++) ny > 0 ? I.push(c, c + i + 2, c + i + 1) : I.push(c, c + i + 1, c + i + 2);
}
}
return build(P, N, I);
}
export function torus(R = 0.4, r = 0.1, seg = 24, sides = 10) {
const P = [], N = [], I = [];
for (let j = 0; j <= seg; j++) {
const u = 2 * Math.PI * j / seg, cu = Math.cos(u), su = Math.sin(u);
for (let i = 0; i <= sides; i++) {
const v = 2 * Math.PI * i / sides, cv = Math.cos(v), sv = Math.sin(v);
P.push((R + r * cv) * cu, r * sv, (R + r * cv) * su); N.push(cv * cu, sv, cv * su);
}
}
for (let j = 0; j < seg; j++) for (let i = 0; i < sides; i++) {
const a = j * (sides + 1) + i, b = a + sides + 1;
I.push(a, a + 1, b, a + 1, b + 1, b);
}
return build(P, N, I);
}
/** Subdivided XZ plane of size 1 centred at origin. */
export function grid(res = 16) {
const P = [], N = [], I = [];
for (let j = 0; j <= res; j++) for (let i = 0; i <= res; i++) { P.push(i / res - 0.5, 0, j / res - 0.5); N.push(0, 1, 0); }
for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
const a = j * (res + 1) + i, b = a + res + 1;
I.push(a, b, a + 1, a + 1, b, b + 1);
}
return build(P, N, I);
}
/**
* Tapered limb along +Y from 0..1 with rounded ends; cross section is an
* ellipse (rx, rz). Radii are profile(t) -> radius multiplier.
*/
export function limb(profile, seg = 12, rings = 10, capRings = 4) {
const P = [], N = [], I = [];
const rows = [];
for (let k = 0; k < capRings; k++) { const a = (k / capRings) * Math.PI / 2; rows.push({ y: -Math.cos(a) * profile(0) * 0.9, r: Math.sin(a) * profile(0), ny: -Math.cos(a) }); }
for (let k = 0; k <= rings; k++) { const t = k / rings; rows.push({ y: t, r: profile(t), ny: 0 }); }
for (let k = capRings - 1; k >= 0; k--) { const a = (k / capRings) * Math.PI / 2; rows.push({ y: 1 + Math.cos(a) * profile(1) * 0.9, r: Math.sin(a) * profile(1), ny: Math.cos(a) }); }
for (let j = 0; j < rows.length; j++) {
const { y, r, ny } = rows[j];
for (let i = 0; i <= seg; i++) {
const a = 2 * Math.PI * i / seg, c = Math.cos(a), s = Math.sin(a);
P.push(c * r, y, s * r);
const k = Math.sqrt(Math.max(0, 1 - ny * ny)); N.push(c * k, ny, s * k);
}
}
for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < seg; i++) {
const a = j * (seg + 1) + i, b = a + seg + 1;
I.push(a, b, a + 1, a + 1, b, b + 1);
}
return fixNormals(build(P, N, I));
}
/**
* Human torso loft along +Y (0 = pelvis, 1 = neck base), elliptical sections
* shaped as a lean athletic build (narrow waist, moderate chest/shoulders).
*/
export function torso(sections, seg = 18) {
const P = [], N = [], I = [];
const rows = [{ t: sections[0].t - 0.02, w: sections[0].w * 0.6, d: sections[0].d * 0.6, zo: 0 }, ...sections.map(s => ({ t: s.t, w: s.w, d: s.d, zo: s.zo || 0 })), { t: sections[sections.length - 1].t + 0.015, w: sections[sections.length - 1].w * 0.55, d: sections[sections.length - 1].d * 0.55, zo: 0 }];
for (const r of rows) {
for (let i = 0; i <= seg; i++) {
const a = 2 * Math.PI * i / seg, c = Math.cos(a), s = Math.sin(a);
const e = 0.8, cx = Math.sign(c) * Math.pow(Math.abs(c), e), sz = Math.sign(s) * Math.pow(Math.abs(s), e);
P.push(cx * r.w, r.t, sz * r.d + r.zo); N.push(0, 0, 0);
}
}
for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < seg; i++) {
const a = j * (seg + 1) + i, b = a + seg + 1;
I.push(a, b, a + 1, a + 1, b, b + 1);
}
for (const [row, dir] of [[0, -1], [rows.length - 1, 1]]) {
const c = P.length / 3; P.push(0, rows[row].t + dir * 0.01, 0); N.push(0, 0, 0);
for (let i = 0; i < seg; i++) { const a = row * (seg + 1) + i; dir > 0 ? I.push(c, a + 1, a) : I.push(c, a, a + 1); }
}
return fixNormals(build(P, N, I), true);
}
/** Recompute smooth normals (optionally from scratch). */
export function fixNormals(g, force = false) {
if (!force) return g;
const n = new Float32Array(g.pos.length);
const p = g.pos, idx = g.idx;
for (let i = 0; i < idx.length; i += 3) {
const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
for (const k of [a, b, c]) { n[k] += nx; n[k + 1] += ny; n[k + 2] += nz; }
}
const map = new Map();
for (let i = 0; i < p.length; i += 3) {
const key = `${p[i].toFixed(4)},${p[i + 1].toFixed(4)},${p[i + 2].toFixed(4)}`;
const e = map.get(key); if (e) e.push(i); else map.set(key, [i]);
}
for (const list of map.values()) {
if (list.length < 2) continue;
let x = 0, y = 0, z = 0; for (const i of list) { x += n[i]; y += n[i + 1]; z += n[i + 2]; }
for (const i of list) { n[i] = x; n[i + 1] = y; n[i + 2] = z; }
}
for (let i = 0; i < n.length; i += 3) { const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1; n[i] /= l; n[i + 1] /= l; n[i + 2] /= l; }
g.nrm = n; return g;
}
/** Merge a list of {geom, matrix, color} into one geometry with vertex colours. */
export function mergeGeometries(items) {
let vCount = 0, iCount = 0;
for (const it of items) { vCount += it.geom.pos.length / 3; iCount += it.geom.idx.length; }
const pos = new Float32Array(vCount * 3), nrm = new Float32Array(vCount * 3), col = new Float32Array(vCount * 4);
const idx = vCount > 65535 ? new Uint32Array(iCount) : new Uint16Array(iCount);
let vo = 0, io = 0;
for (const it of items) {
const g = it.geom, m = it.matrix, nm = normalMatrix3(m), c = it.color, ex = it.extra || 0;
const n = g.pos.length / 3;
for (let i = 0; i < n; i++) {
const x = g.pos[i * 3], y = g.pos[i * 3 + 1], z = g.pos[i * 3 + 2];
pos[(vo + i) * 3] = m[0] * x + m[4] * y + m[8] * z + m[12];
pos[(vo + i) * 3 + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
pos[(vo + i) * 3 + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
const a = g.nrm[i * 3], b = g.nrm[i * 3 + 1], d = g.nrm[i * 3 + 2];
let nx = nm[0] * a + nm[3] * b + nm[6] * d, ny = nm[1] * a + nm[4] * b + nm[7] * d, nz = nm[2] * a + nm[5] * b + nm[8] * d;
const l = Math.hypot(nx, ny, nz) || 1;
nrm[(vo + i) * 3] = nx / l; nrm[(vo + i) * 3 + 1] = ny / l; nrm[(vo + i) * 3 + 2] = nz / l;
col[(vo + i) * 4] = c[0]; col[(vo + i) * 4 + 1] = c[1]; col[(vo + i) * 4 + 2] = c[2]; col[(vo + i) * 4 + 3] = ex;
}
for (let k = 0; k < g.idx.length; k++) idx[io + k] = g.idx[k] + vo;
vo += n; io += g.idx.length;
}
return { pos, nrm, col, idx };
}