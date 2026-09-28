import * as G from '../engine/geometry.js';
import { hex } from '../engine/renderer.js';
import { J } from './PlayerAnimation.js';
import { mat4, segmentMatrix, fromBasis, sub, norm, cross, scale, add, len, dot } from '../core/math.js';
const bump = (t, c, w) => Math.exp(-((t - c) * (t - c)) / (w * w));
const PROFILES = {
thigh: (t) => 0.074 - 0.024 * t + 0.006 * bump(t, 0.3, 0.25),
shin: (t) => 0.05 - 0.018 * t + 0.009 * bump(t, 0.28, 0.18),
upperArm: (t) => 0.043 - 0.008 * t + 0.004 * bump(t, 0.45, 0.2),
forearm: (t) => 0.037 - 0.012 * t + 0.003 * bump(t, 0.2, 0.2),
neck: (t) => 0.05 - 0.006 * t,
hand: (t) => 0.03 - 0.008 * t,
shortsLeg: (t) => 0.083 - 0.02 * t,
sleeve: (t) => 0.05 - 0.003 * t,
};
function torsoSections(sex) {
const f = sex === 'f';
return {
lower: [{ t: 0.0, w: f ? 0.168 : 0.158, d: 0.105, zo: 0.012 }, { t: 0.45, w: f ? 0.15 : 0.145, d: 0.1, zo: 0.01 }, { t: 1.0, w: f ? 0.125 : 0.135, d: 0.092, zo: -0.004 }],
upper: [{ t: 0.0, w: f ? 0.125 : 0.135, d: 0.092, zo: -0.004 }, { t: 0.35, w: f ? 0.14 : 0.152, d: f ? 0.108 : 0.104, zo: -0.012 }, { t: 0.62, w: f ? 0.152 : 0.168, d: 0.104, zo: -0.01 },
{ t: 0.84, w: f ? 0.165 : 0.185, d: 0.085, zo: 0.0 }, { t: 1.0, w: 0.07, d: 0.06, zo: 0.004 }],
};
}
export class CharacterModel {
constructor(renderer, appearance, opts = {}) {
this.r = renderer; this.objects = []; this.ghost = !!opts.ghost; this.opacity = opts.opacity ?? 1;
this.m = new Map();
this.setAppearance(appearance);
}
setAppearance(a) {
this.a = a; this.s = a.athlete.height / 1.78; this.b = a.athlete.build;
for (const o of this.objects) if (o.ownMesh) this.r.deleteMesh(o.mesh);
this.objects = [];
const R = this.r, ath = a.athlete, out = a.outfit;
const lib = CharacterModel.lib || (CharacterModel.lib = {});
const mesh = (key, fn) => { if (!lib[key]) lib[key] = R.createMesh(fn()); return lib[key]; };
const sec = torsoSections(ath.sex);
const lowerM = mesh('torsoL' + ath.sex, () => G.torso(sec.lower));
const upperM = mesh('torsoU' + ath.sex, () => G.torso(sec.upper));
const limbM = (k) => mesh('limb_' + k, () => G.limb(PROFILES[k], 12, 10, 3));
const sphereM = mesh('sph', () => G.sphere(18));
const rboxM = mesh('rbox', () => G.roundedBox(0.2, 2));
const torusM = mesh('torus', () => G.torus(0.4, 0.07, 22, 8));
const cylM = mesh('cyl', () => G.cylinder(16, 0.5, 0.5));
const ghost = this.ghost;
const mat = (color, kind) => {
const c = ghost ? [0.55, 0.8, 1.0] : hex(color);
const base = { mesh: null, matrix: mat4(), color: c, visible: true, castShadow: !ghost, opacity: this.opacity, rough: 0.8, pattern: 0 };
if (ghost) return Object.assign(base, { emissive: 0.35, rough: 0.6, rim: 0.6 });
if (kind === 'skin') return Object.assign(base, { pattern: 7, patScale: 1, rough: 0.58, wrap: 0.35, rim: 0.12 });
if (kind === 'cloth') return Object.assign(base, { pattern: 6, patScale: 1, rough: 0.88, wrap: 0.1 });
if (kind === 'hair') return Object.assign(base, { rough: 0.5, wrap: 0.1 });
if (kind === 'eye') return Object.assign(base, { rough: 0.15 });
return base;
};
const add = (name, m, material, fn) => { const o = Object.assign(material, { mesh: m, name, update: fn }); this.objects.push(o); return o; };
const S = this.s, B = this.b;
const limb = (name, k, a, b, color, kind, rs = 1, part = 1, rx = 1, rz = 1) =>
add(name, limbM(k), mat(color, kind), (o, j, lat) => {
const pa = j[a], pb = part === 1 ? j[b] : add3(pa, scale(sub(j[b], pa), part));
segmentMatrix(o.matrix, pa, pb, S * B * rs * rx, S * B * rs * rz, lat);
});
add('torsoLower', lowerM, mat(out.shorts, 'cloth'), (o, j, lat) => this.torsoMatrix(o.matrix, j[J.pelvis], j[J.spine], sub(j[J.lHip], j[J.rHip]), lat));
add('torsoUpper', upperM, mat(out.shirt, 'cloth'), (o, j, lat) => this.torsoMatrix(o.matrix, j[J.spine], j[J.neck], sub(j[J.lSh], j[J.rSh]), lat));
limb('neck', 'neck', J.neck, J.head, ath.skin, 'skin', 1, 0.55);
for (const [L, hip, knee, foot, toe] of [['l', J.lHip, J.lKnee, J.lFoot, J.lToe], ['r', J.rHip, J.rKnee, J.rFoot, J.rToe]]) {
limb(L + 'thigh', 'thigh', hip, knee, ath.skin, 'skin');
limb(L + 'shorts', 'shortsLeg', hip, knee, out.shorts, 'cloth', 1, 0.5);
limb(L + 'shin', 'shin', knee, foot, ath.skin, 'skin');
add(L + 'shoe', rboxM, mat(out.shoes, 'shoe'), (o, j) => this.footMatrix(o.matrix, j[foot], j[toe], j[knee]));
}
for (const [L, sh, el, ha] of [['l', J.lSh, J.lElb, J.lHand], ['r', J.rSh, J.rElb, J.rHand]]) {
limb(L + 'upperArm', 'upperArm', sh, el, ath.skin, 'skin');
limb(L + 'sleeve', 'sleeve', sh, el, out.shirt, 'cloth', 1, 0.36);
limb(L + 'forearm', 'forearm', el, ha, ath.skin, 'skin');
add(L + 'hand', limbM('hand'), mat(ath.skin, 'skin'), (o, j, lat) => {
const d = norm(sub(j[ha], j[el]));
segmentMatrix(o.matrix, j[ha], add3(j[ha], scale(d, 0.085 * S)), S * 1.25, S * 0.62, lat);
});
}
const headPart = (name, m, material, off, sc) => add(name, m, material, (o, j, lat) => this.headMatrix(o.matrix, j, lat, off, sc));
headPart('head', sphereM, mat(ath.skin, 'skin'), [0, 0.02, 0.0], [0.152, 0.222, 0.198]);
headPart('jaw', sphereM, mat(ath.skin, 'skin'), [0, -0.045, -0.02], [0.12, 0.11, 0.14]);
const hs = ath.hairStyle;
const hairScale = hs === 'buzz' ? [0.158, 0.205, 0.2] : [0.165, 0.215, 0.212];
headPart('hair', sphereM, mat(ath.hair, 'hair'), hs === 'buzz' ? [0, 0.034, 0.008] : [0, 0.042, 0.014], hairScale);
if (hs === 'ponytail') headPart('pony', limbM('neck'), mat(ath.hair, 'hair'), null, null).update = (o, j, lat) => {
const b = this.headBasis(j, lat); const p0 = add3(b.o, add3(scale(b.y, 0.05), scale(b.z, 0.1))); const p1 = add3(b.o, add3(scale(b.y, -0.13), scale(b.z, 0.15)));
segmentMatrix(o.matrix, p0, p1, S * 0.5, S * 0.5, lat); };
if (hs === 'bun') headPart('bun', sphereM, mat(ath.hair, 'hair'), [0, 0.09, 0.085], [0.075, 0.07, 0.075]);
for (const sx of [-1, 1]) {
headPart('eyeW' + sx, sphereM, mat(0xECE8E2, 'eye'), [sx * 0.031, 0.022, -0.083], [0.022, 0.014, 0.012]);
headPart('eye' + sx, sphereM, mat(0x2A1E16, 'eye'), [sx * 0.031, 0.022, -0.089], [0.011, 0.011, 0.006]);
headPart('brow' + sx, sphereM, mat(ath.brows, 'hair'), [sx * 0.032, 0.041, -0.084], [0.03, 0.007, 0.012]);
headPart('ear' + sx, sphereM, mat(ath.skin, 'skin'), [sx * 0.077, 0.012, 0.008], [0.018, 0.05, 0.032]);
}
headPart('nose', sphereM, mat(ath.skin, 'skin'), [0, 0.0, -0.1], [0.022, 0.045, 0.03]);
headPart('lips', sphereM, mat(0x9A5A50, 'skin'), [0, -0.035, -0.088], [0.036, 0.011, 0.014]);
this.addCostume(a.costume, mat, headPart, torusM, sphereM, cylM, rboxM);
}
addCostume(c, mat, headPart, torusM, sphereM, cylM, rboxM) {
if (!c || c.kind === 'none') return;
const col = c.color;
switch (c.kind) {
case 'headband': headPart('band', torusM, mat(col, 'cloth'), [0, 0.05, 0.005], [0.215, 0.17, 0.26]); break;
case 'cap': headPart('capTop', sphereM, mat(col, 'cloth'), [0, 0.06, 0.01], [0.172, 0.17, 0.215]);
headPart('capBrim', rboxM, mat(col, 'cloth'), [0, 0.07, -0.12], [0.13, 0.014, 0.1]); break;
case 'bandana': headPart('band', sphereM, mat(col, 'cloth'), [0, 0.05, 0.012], [0.172, 0.2, 0.216]);
headPart('knot', sphereM, mat(col, 'cloth'), [0, 0.02, 0.115], [0.05, 0.04, 0.04]); break;
case 'helmet': headPart('helm', sphereM, Object.assign(mat(col, 'shoe'), { rough: 0.35 }), [0, 0.06, 0.005], [0.2, 0.2, 0.235]);
headPart('helmRim', torusM, mat(0x333333, 'shoe'), [0, 0.03, 0.0], [0.25, 0.12, 0.29]); break;
case 'lei': this.objects.push(Object.assign(mat(col, 'cloth'), { mesh: torusM, name: 'lei', update: (o, j, lat) => {
const n = j[J.neck]; const y = norm(sub(j[J.neck], j[J.spine])); const x = norm(lat); const z = cross(x, y);
fromBasis(o.matrix, scale(x, 0.36 * this.s), scale(y, 0.35 * this.s), scale(z, 0.3 * this.s), add3(n, scale(y, -0.035)));
} })); break;
case 'crown': headPart('crown', cylM, Object.assign(mat(col, 'shoe'), { rough: 0.3, emissive: 0.05 }), [0, 0.1, 0.0], [0.17, 0.035, 0.19]); break;
case 'wreath': headPart('wreath', torusM, mat(col, 'cloth'), [0, 0.075, 0.0], [0.22, 0.4, 0.26]); break;
}
}
headBasis(j, lat) {
let y = norm(sub(j[J.head], j[J.neck]));
let x = sub(lat, scale(y, dot(lat, y))); x = norm(x);
const z = cross(x, y); // backwards
return { x, y, z, o: j[J.head] };
}
headMatrix(out, j, lat, off, sc) {
const b = this.headBasis(j, lat), S = this.s;
const o = add3(b.o, add3(add3(scale(b.x, off[0] * S), scale(b.y, off[1] * S)), scale(b.z, off[2] * S)));
fromBasis(out, scale(b.x, sc[0] * S), scale(b.y, sc[1] * S), scale(b.z, sc[2] * S), o);
}
torsoMatrix(out, a, b, latv, fallbackLat) {
const yv = sub(b, a); const L = len(yv) || 1e-4; const y = scale(yv, 1 / L);
let x = len(latv) > 1e-4 ? latv : fallbackLat; x = sub(x, scale(y, dot(x, y))); x = norm(x);
const z = cross(x, y); const k = this.s * this.b;
fromBasis(out, scale(x, k), yv, scale(z, k), a);
}
footMatrix(out, ankle, toe, knee) {
const fwd = sub(toe, ankle); const L = len(fwd) || 0.2; const x = scale(fwd, 1 / L);
let up = sub(knee, ankle); up = norm(sub(up, scale(x, dot(up, x))));
const z = norm(cross(x, up)); const S = this.s;
const c = add3(add3(ankle, scale(x, L * 0.42)), scale(up, -0.045 * S));
fromBasis(out, scale(x, L + 0.07 * S), scale(up, 0.085 * S), scale(z, 0.098 * S), c);
}
update(joints) {
let lat = sub(joints[J.lHip], joints[J.rHip]);
const lat2 = sub(joints[J.lSh], joints[J.rSh]);
lat = norm(add3(lat, lat2)); if (!isFinite(lat[0])) lat = [0, 0, 1];
for (const o of this.objects) { o.update(o, joints, lat); o.cx = joints[0][0]; o.rad = 2; }
}
setVisible(v) { for (const o of this.objects) o.visible = v; }
setOpacity(a) { for (const o of this.objects) o.opacity = a; }
}
function add3(a, b) { return add(a, b); }