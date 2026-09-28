export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));
export const TAU = Math.PI * 2;
export const v3 = (x = 0, y = 0, z = 0) => [x, y, z];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export function mat4() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; }
export function identity(m) { m.fill(0); m[0] = m[5] = m[10] = m[15] = 1; return m; }
export function multiply(out, a, b) {
const r = new Float32Array(16);
for (let c = 0; c < 4; c++) for (let rI = 0; rI < 4; rI++) {
let s = 0;
for (let k = 0; k < 4; k++) s += a[k * 4 + rI] * b[c * 4 + k];
r[c * 4 + rI] = s;
}
out.set(r); return out;
}
export function perspective(out, fovY, aspect, near, far) {
const f = 1 / Math.tan(fovY / 2), nf = 1 / (near - far);
out.fill(0);
out[0] = f / aspect; out[5] = f; out[10] = (far + near) * nf; out[11] = -1; out[14] = 2 * far * near * nf;
return out;
}
export function ortho(out, l, r, b, t, n, f) {
out.fill(0);
out[0] = 2 / (r - l); out[5] = 2 / (t - b); out[10] = -2 / (f - n);
out[12] = -(r + l) / (r - l); out[13] = -(t + b) / (t - b); out[14] = -(f + n) / (f - n); out[15] = 1;
return out;
}
export function lookAt(out, eye, target, up) {
const z = norm(sub(eye, target));
let x = cross(up, z); if (len(x) < 1e-6) x = [1, 0, 0]; x = norm(x);
const y = cross(z, x);
out[0] = x[0]; out[1] = y[0]; out[2] = z[0]; out[3] = 0;
out[4] = x[1]; out[5] = y[1]; out[6] = z[1]; out[7] = 0;
out[8] = x[2]; out[9] = y[2]; out[10] = z[2]; out[11] = 0;
out[12] = -dot(x, eye); out[13] = -dot(y, eye); out[14] = -dot(z, eye); out[15] = 1;
return out;
}
/** Compose T * Ry * Rx * Rz * S (euler in radians). */
export function compose(out, px, py, pz, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
const cx = Math.cos(rx), sxr = Math.sin(rx), cy = Math.cos(ry), syr = Math.sin(ry), cz = Math.cos(rz), szr = Math.sin(rz);
const m00 = cy * cz + syr * sxr * szr, m01 = -cy * szr + syr * sxr * cz, m02 = syr * cx;
const m10 = cx * szr, m11 = cx * cz, m12 = -sxr;
const m20 = -syr * cz + cy * sxr * szr, m21 = syr * szr + cy * sxr * cz, m22 = cy * cx;
out[0] = m00 * sx; out[1] = m10 * sx; out[2] = m20 * sx; out[3] = 0;
out[4] = m01 * sy; out[5] = m11 * sy; out[6] = m21 * sy; out[7] = 0;
out[8] = m02 * sz; out[9] = m12 * sz; out[10] = m22 * sz; out[11] = 0;
out[12] = px; out[13] = py; out[14] = pz; out[15] = 1;
return out;
}
/** Matrix from orthonormal-ish basis axes (already scaled) and origin. */
export function fromBasis(out, xa, ya, za, o) {
out[0] = xa[0]; out[1] = xa[1]; out[2] = xa[2]; out[3] = 0;
out[4] = ya[0]; out[5] = ya[1]; out[6] = ya[2]; out[7] = 0;
out[8] = za[0]; out[9] = za[1]; out[10] = za[2]; out[11] = 0;
out[12] = o[0]; out[13] = o[1]; out[14] = o[2]; out[15] = 1;
return out;
}
/** Matrix mapping unit Y segment [0..1] onto a->b with radii scale (rx, rz). */
export function segmentMatrix(out, a, b, rx, rz, side) {
const d = sub(b, a); const l = len(d) || 1e-5; const y = scale(d, 1 / l);
let ref = side || [0, 0, 1];
let x = cross(y, ref); if (len(x) < 1e-4) x = cross(y, [1, 0, 0]); x = norm(x);
const z = cross(x, y);
return fromBasis(out, scale(x, rx), scale(y, l), scale(z, rz), a);
}
export function transformPoint(m, p) {
return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
}
export function normalMatrix3(m) {
const a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
const det = a * A + b * B + c * C || 1e-9, id = 1 / det;
return new Float32Array([
A * id, (-(b * i - c * h)) * id, (b * f - c * e) * id,
B * id, (a * i - c * g) * id, (-(a * f - c * d)) * id,
C * id, (-(a * h - b * g)) * id, (a * e - b * d) * id,
]);
}
export function rng(seed) {
let s = seed >>> 0;
const f = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
f.range = (a, b) => a + (b - a) * f();
f.int = (a, b) => Math.floor(a + (b - a + 1) * f());
f.pick = (arr) => arr[Math.floor(f() * arr.length)];
f.chance = (p) => f() < p;
return f;
}
/** Closest points between segments p1q1 and p2q2. Returns squared distance and points. */
export function segSegClosest(p1, q1, p2, q2) {
const d1 = sub(q1, p1), d2 = sub(q2, p2), r = sub(p1, p2);
const a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r);
let s, t;
if (a <= 1e-9 && e <= 1e-9) { s = t = 0; }
else if (a <= 1e-9) { s = 0; t = clamp(f / e, 0, 1); }
else {
const c = dot(d1, r);
if (e <= 1e-9) { t = 0; s = clamp(-c / a, 0, 1); }
else {
const b = dot(d1, d2), denom = a * e - b * b;
s = denom !== 0 ? clamp((b * f - c * e) / denom, 0, 1) : 0;
t = (b * s + f) / e;
if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); } else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); }
}
}
const c1 = add(p1, scale(d1, s)), c2 = add(p2, scale(d2, t));
const dd = sub(c1, c2);
return { d2: dot(dd, dd), c1, c2 };
}