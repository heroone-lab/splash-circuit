import { mat4, compose, rng, norm, TAU } from '../core/math.js';
import { hex } from '../engine/renderer.js';
const P = (color, pattern = 0, rough = 0.8, emissive = 0, patColor = 0xffffff, patScale = 1) => ({ color: hex(color), pattern, patColor: hex(patColor), patScale, rough, emissive });
export function lightingEnv(theme, brightness = 1) {
const L = theme.light;
const sunDir = norm(L.sunDir);
return {
sunDir, sunColor: hex(L.sunColor), sunI: L.sunIntensity,
hemiSky: hex(L.hemiSky), hemiGround: hex(L.hemiGround), hemiI: L.hemiIntensity,
fillDir: norm([0.1, 0.35, 1]), fillColor: hex(L.fillColor),
plPos: [0, 2, 3], plColor: hex(L.plColor), plRange: L.plRange,
fogColor: hex(L.fogColor), fogDensity: L.fogDensity, fogStart: L.fogStart,
skyTop: hex(L.skyTop), skyHorizon: hex(L.skyHorizon),
exposure: L.exposure * brightness, saturation: L.saturation,
};
}
export function buildEnvironment(theme, x0, x1, density = 1, seed = 1) {
const out = [];
const r = rng(seed * 977 + theme.name.length * 131);
const put = (geom, mat, px, py, pz, rx, ry, rz, sx, sy, sz, shadow = false) => out.push({ geom, matrix: compose(mat4(), px, py, pz, rx, ry, rz, sx, sy, sz), mat, chunk: 'env', shadow, cx: px });
const ground = P(theme.ground, 4, 0.95);
const hill = P(shade(theme.ground, 0.8), 4, 0.95);
for (let x = x0 - 30; x < x1 + 30; x += 30) {
put('box', ground, x + 15, -1.05, -22, 0, 0, 0, 30.2, 0.5, 24);
put('sphereLo', hill, x + 15 + r.range(-6, 6), -4, -70 - r.range(0, 25), 0, 0, 0, r.range(40, 70), r.range(14, 30), 30);
}
const step = 5.5 / Math.max(0.3, density);
const gen = GENERATORS[theme.props] || GENERATORS.arena;
for (let x = x0 - 20; x < x1 + 20; x += step * r.range(0.7, 1.3)) gen(put, x, r);
LANDMARK[theme.props]?.(put, (x0 + x1) / 2, r);
return out;
}
function shade(c, k) { const r = Math.min(255, ((c >> 16) & 255) * k), g = Math.min(255, ((c >> 8) & 255) * k), b = Math.min(255, (c & 255) * k); return (r << 16) | (g << 8) | b; }
const GENERATORS = {
arena(put, x, r) {
const seat = P(0x3A4C66, 0, 0.8), crowd = [0xB8352E, 0x2F6FB3, 0xE8E4DA, 0xF2C230, 0x3F7A4A, 0x5B3C8C];
for (let row = 0; row < 4; row++) {
put('box', seat, x, -0.6 + row * 0.8, -10 - row * 1.4, 0, 0, 0, 5.6, 0.8 + row * 0.0, 1.4);
for (let k = 0; k < 6; k++) if (r.chance(0.8)) put('box', P(r.pick(crowd), 6, 0.9), x - 2.4 + k * 0.95 + r.range(-0.1, 0.1), -0.05 + row * 0.8, -10 - row * 1.4, 0, 0, 0, 0.35, 0.55, 0.3);
}
if (r.chance(0.3)) {
put('cyl', P(0x9AA3AD, 0, 0.4), x, 5, -17, 0, 0, 0, 0.4, 13, 0.4);
put('box', P(0xE8E4DA, 0, 0.3, 0.35), x, 11.5, -16.6, -0.3, 0, 0, 2.4, 1.2, 0.3);
}
if (r.chance(0.25)) put('box', P(0x2F9E5B, 6, 0.8, 0.05), x, 1.5, -5.2, 0, 0, 0, 3.2, 0.9, 0.1);
},
pirate(put, x, r) {
const wood = P(0x6B4A2E, 2, 0.85), sail = P(0xE6DCC3, 6, 0.9), rock = P(0x7D776C, 4, 0.95);
const k = r();
if (k < 0.18) { // ship
const z = -16 - r.range(0, 6);
put('rbox2', wood, x, 0.2, z, 0, 0, 0, 9, 2.4, 3);
put('box', P(0x3F2C1C, 2, 0.85), x, 1.5, z, 0, 0, 0, 9.2, 0.25, 3.1);
for (const mx of [-2.5, 1.5]) { put('cyl', wood, x + mx, 5.5, z, 0, 0, 0, 0.25, 9, 0.25); put('box', sail, x + mx, 6.5, z + 0.1, 0, 0, 0, 3.4, 3.8, 0.08); }
put('box', P(0x1C1C1C, 0, 0.8), x + 1.5, 9.6, z, 0, 0, 0, 1.2, 0.7, 0.05);
} else if (k < 0.5) {
for (let i = 0; i < 3; i++) put('cyl', P(0x7A5530, 2, 0.8), x + r.range(-1.5, 1.5), -0.35, -5 - r.range(0, 2.5), 0, 0, 0, 0.7, 1.1, 0.7);
put('box', wood, x, -0.8, -6, 0, 0, 0, 4, 0.2, 3);
} else if (k < 0.75) put('sphereLo', rock, x, -1, -8 - r.range(0, 8), 0, r.range(0, 3), 0, r.range(2, 4), r.range(1.5, 3), r.range(2, 3.5));
else { put('cyl', wood, x, -0.5, -4.6, 0, 0, 0, 0.3, 2.2, 0.3); put('torus', P(0xB3322A), x, 0.3, -4.4, Math.PI / 2, 0, 0, 1.2, 1.2, 1.2); }
},
fastfood(put, x, r) {
const k = r(), z = -8 - r.range(0, 8);
if (k < 0.3) { // giant burger
const s = r.range(1.5, 2.4);
put('cyl', P(0xC98A45, 4, 0.7), x, -0.5 + 0.3 * s, z, 0, 0, 0, 3 * s, 0.6 * s, 3 * s);
put('cyl', P(0x5A3220, 4, 0.8), x, -0.5 + 0.8 * s, z, 0, 0, 0, 3.1 * s, 0.4 * s, 3.1 * s);
put('cyl', P(0xF2C230, 0, 0.6), x, -0.5 + 1.05 * s, z, 0, 0, 0, 3.2 * s, 0.1 * s, 3.2 * s);
put('cyl', P(0x5E9E3A, 9, 0.8), x, -0.5 + 1.15 * s, z, 0, 0, 0, 3.25 * s, 0.1 * s, 3.25 * s);
put('sphere', P(0xD49A52, 4, 0.7), x, -0.5 + 1.25 * s, z, 0, 0, 0, 3 * s, 1.6 * s, 3 * s);
} else if (k < 0.55) { // fries
put('frustum', P(0xD93A3A, 0, 0.6), x, 1, z, Math.PI, 0, 0, 2.2, 3, 1.4);
for (let i = 0; i < 7; i++) put('box', P(0xF0C75E, 0, 0.7), x + r.range(-0.8, 0.8), 3 + r.range(0, 0.8), z + r.range(-0.3, 0.3), r.range(-0.2, 0.2), 0, r.range(-0.2, 0.2), 0.2, 2.2, 0.2);
} else if (k < 0.8) { // soda cup
put('frustum', P(0xE8E4DA, 3, 0.5, 0, 0x2A9D8F, 1.2), x, 1.5, z, Math.PI, 0, 0, 2.2, 4, 2.2);
put('cyl', P(0xD93A3A, 0, 0.5), x + 0.4, 4.6, z, 0, 0, 0.2, 0.2, 2.4, 0.2);
} else put('torus', P(0xE59BB5, 4, 0.6), x, 0.6, z, 1.2, 0, 0.3, 4, 8, 4);
},
medieval(put, x, r) {
const stone = P(0x9C958A, 8, 0.9, 0, 0xffffff, 1), roof = P(0x5A3A5E, 0, 0.8);
const k = r();
if (k < 0.55) {
put('box', stone, x, 2, -14, 0, 0, 0, 5.6, 6, 2);
for (let i = 0; i < 3; i++) put('box', stone, x - 2 + i * 2, 5.4, -14, 0, 0, 0, 0.9, 0.8, 2);
} else if (k < 0.8) {
put('cyl', stone, x, 3.5, -15, 0, 0, 0, 3, 9, 3);
put('cone', roof, x, 9.3, -15, 0, 0, 0, 3.6, 3, 3.6);
put('box', P(r.pick([0x8E2F2F, 0x2B4E7E, 0xC9A640]), 6, 0.9), x, 5, -13.4, 0, 0, 0, 1, 2.4, 0.05);
} else {
put('cyl', P(0x5B4330), x, 0.2, -6, 0, 0, 0, 0.12, 3, 0.12);
put('box', P(r.pick([0x8E2F2F, 0x2B4E7E]), 6, 0.9), x + 0.45, 1.3, -6, 0, 0, 0, 0.8, 0.5, 0.03);
}
},
tiki(put, x, r) {
const k = r(), z = -6 - r.range(0, 10);
if (k < 0.5) palm(put, x, z, r);
else if (k < 0.72) { // totem
const wood = P(0x7A5530, 2, 0.85);
for (let i = 0; i < 3; i++) { put('box', wood, x, 0.2 + i * 1.1, z, 0, 0, 0, 0.9, 1.0, 0.9); put('box', P(0xE0662F, 0, 0.6), x, 0.4 + i * 1.1, z + 0.46, 0, 0, 0, 0.5, 0.12, 0.05); put('box', P(0x1C1C1C), x, 0.05 + i * 1.1, z + 0.46, 0, 0, 0, 0.35, 0.2, 0.05); }
} else if (k < 0.9) { // hut
put('cyl', P(0x9A7A4E, 2, 0.9), x, 0.3, z - 3, 0, 0, 0, 3, 2.6, 3);
put('cone', P(0xB8955A, 9, 0.95), x, 2.5, z - 3, 0, 0, 0, 4.4, 2.4, 4.4);
} else put('sphereLo', P(0x8A7A60, 4, 0.95), x, -1, z, 0, 0, 0, 3, 1.5, 2.5);
},
forest(put, x, r) {
const k = r(), z = -6 - r.range(0, 12);
if (k < 0.65) {
const h = r.range(5, 9), c = r.pick([0x2F5A32, 0x365F35, 0x2A4F2E]);
put('cyl', P(0x5A4128, 2, 0.9), x, -0.8 + h * 0.2, z, 0, 0, 0, 0.45, h * 0.45, 0.45);
for (let i = 0; i < 3; i++) put('cone', P(c, 9, 0.9), x, -0.8 + h * (0.35 + i * 0.2), z, 0, r.range(0, 3), 0, h * (0.55 - i * 0.12), h * 0.35, h * (0.55 - i * 0.12));
} else if (k < 0.85) put('sphereLo', P(0x7D7A70, 4, 0.95), x, -1, z, 0, r.range(0, 3), 0, r.range(1.5, 3.5), r.range(1, 2.2), r.range(1.5, 3));
else put('cyl', P(0x6A4E32, 2, 0.9), x, -0.6, -5, 0, 0.3, Math.PI / 2, 0.8, 3.5, 0.8);
},
};
function palm(put, x, z, r) {
const trunk = P(0x8A6A45, 2, 0.9), leaf = P(0x3E7D3A, 9, 0.8);
const h = r.range(4, 6.5), lean = r.range(-0.25, 0.25);
let px = x, py = -0.8;
const seg = 5;
for (let i = 0; i < seg; i++) {
const a = lean * (i / seg) * 1.5, l = h / seg;
put('cyl', trunk, px + Math.sin(a) * l / 2, py + Math.cos(a) * l / 2, z, 0, 0, -a, 0.36 - i * 0.03, l * 1.05, 0.36 - i * 0.03);
px += Math.sin(a) * l; py += Math.cos(a) * l;
}
for (let i = 0; i < 7; i++) {
const a = i * TAU / 7 + r.range(0, 0.3);
put('box', leaf, px + Math.cos(a) * 1.2, py - 0.35, z + Math.sin(a) * 1.2, Math.sin(a) * 0.5, -a, Math.cos(a) * 0.5 * -1, 2.6, 0.06, 0.55);
}
}
const LANDMARK = {
tiki(put, x) { put('cone', P(0x6E5A4A, 4, 0.95), x + 20, 6, -110, 0, 0, 0, 90, 36, 70); put('cone', P(0x5A4A3E, 4, 0.95), x + 20, 23.5, -110, 0, 0, 0, 14, 2, 11); },
forest(put, x) { for (let i = 0; i < 4; i++) put('cone', P(0x6E7C82, 4, 0.95), x - 60 + i * 45, 12, -130, 0, 0, 0, 70, 48, 60); },
medieval(put, x) { put('box', P(0x8C867B, 8, 0.9), x, 8, -60, 0, 0, 0, 30, 20, 8); put('cyl', P(0x8C867B, 8, 0.9), x - 15, 14, -60, 0, 0, 0, 8, 30, 8); put('cone', P(0x5A3A5E), x - 15, 32, -60, 0, 0, 0, 9, 7, 9); put('cyl', P(0x8C867B, 8, 0.9), x + 15, 12, -60, 0, 0, 0, 7, 26, 7); put('cone', P(0x5A3A5E), x + 15, 28.5, -60, 0, 0, 0, 8, 6, 8); },
arena(put, x) { put('box', P(0x3A4C66, 0, 0.8), x, 10, -40, 0, 0, 0, 120, 22, 4); put('box', P(0x1C2433, 0, 0.3, 0.12), x, 16, -37.9, 0, 0, 0, 16, 7, 0.2); },
pirate(put, x) { put('sphereLo', P(0x6F7A5A, 4, 0.95), x + 30, -2, -90, 0, 0, 0, 60, 20, 30); },
fastfood(put, x) { put('box', P(0xB8934A, 3, 0.8, 0, 0x9A3A30, 0.25), x, 6, -72, 0, 0, 0, 44, 16, 6); put('box', P(0xB23A3A, 0, 0.6, 0.06), x, 15, -68.8, 0, 0, 0, 20, 3, 0.4); },
};