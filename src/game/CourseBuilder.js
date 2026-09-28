// CourseBuilder (CourseManager backend + ChunkManager/ObstacleManager build API).
// Instantiates START -> Chunk 1..N (exact order from the database) -> END.
import { PhysicsWorld } from './PhysicsWorld.js';
import { buildChunk } from './chunks.js';
import { resolveChunk } from '../data/chunkLibrary.js';
import { CONFIG } from '../config.js';
import { mat4, compose, fromBasis, sub, norm, cross, scale, len, TAU } from '../core/math.js';
import { hex } from '../engine/renderer.js';

const matCache = new WeakMap();
function toMat(m) {
  let r = matCache.get(m);
  if (!r) { r = { color: hex(m.color), pattern: m.pattern, patColor: hex(m.patColor), patScale: m.patScale, rough: m.rough, emissive: m.emissive }; matCache.set(m, r); }
  return r;
}

export class BuildContext {
  constructor(world, theme, events) {
    this.world = world; this.theme = theme; this.events = events;
    this.statics = []; this.dynamics = []; this.updaters = []; this.rings = []; this.pickups = []; this.signs = [];
    this.chunkIndex = -1; this.dt = CONFIG.sim.fixedDt; this.meta = {}; this.loops = [];
  }
  mat(name) { const m = this.theme.mats[name]; if (!m) throw new Error('material ' + name); return toMat(m); }

  // ---------- static visuals
  stat(geom, matName, px, py, pz, rx, ry, rz, sx, sy, sz, opts = {}) {
    const m = compose(mat4(), px, py, pz, rx, ry, rz, sx, sy, sz);
    this.statics.push({ geom, matrix: m, mat: this.mat(matName), chunk: this.chunkIndex, shadow: opts.shadow !== false, cx: px });
  }
  statBox(x0, x1, y0, y1, z0, z1, matName, opts) { this.stat(opts && opts.round ? 'rbox' : 'box', matName, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, 0, 0, 0, x1 - x0, y1 - y0, z1 - z0, opts); }

  // ---------- dynamic visuals
  dyn(geom, matName, opts = {}) {
    const m = this.mat(matName);
    const o = Object.assign({ geom, mesh: null, matrix: mat4(), color: m.color, pattern: m.pattern, patColor: m.patColor, patScale: m.patScale, rough: m.rough, emissive: m.emissive, visible: true, castShadow: true, opacity: 1, rad: 3, chunk: this.chunkIndex }, opts);
    this.dynamics.push(o); return o;
  }
  pose(o, px, py, pz, rx, ry, rz, sx, sy, sz) { compose(o.matrix, px, py, pz, rx, ry, rz, sx, sy, sz); }
  seg(o, a, b, r) {
    const y = sub(b, a); const l = len(y) || 1e-4; const yn = scale(y, 1 / l);
    let x = cross(yn, [0, 0, 1]); if (len(x) < 1e-3) x = cross(yn, [1, 0, 0]); x = norm(x);
    const z = cross(x, yn);
    fromBasis(o.matrix, scale(x, 2 * r), y, scale(z, 2 * r), [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
  }
  box3(o, c, xa, ya, sx, sy, sz) { const z = norm(cross(xa, ya)); fromBasis(o.matrix, scale(xa, sx), scale(ya, sy), scale(z, sz), c); }

  // ---------- physics
  hazard(h) { return this.world.addHazard(Object.assign({ chunk: this.chunkIndex }, h)); }
  setHazard(h, a, b) {
    if (h._pa) h.vel = [(a[0] - h._pa[0]) / this.dt, (a[1] - h._pa[1]) / this.dt, (a[2] - h._pa[2]) / this.dt];
    h._pa = a; h.a = a; h.b = b;
  }
  solidOnly(x0, x1, y0, y1, z0, z1, opts = {}) { return this.world.addSolid(Object.assign({ x0, x1, y0, y1, z0, z1, chunk: this.chunkIndex }, opts)); }
  box(x0, x1, y0, y1, z0, z1, matName, opts = {}) {
    this.statBox(x0, x1, y0, y1, z0, z1, matName, { round: true });
    return this.solidOnly(x0, x1, y0, y1, z0, z1, { surface: opts.surface || 'hard' });
  }
  update(fn) { this.updaters.push(fn); }
  sfx(name, x) { if (this.events) this.events.emit('sfx', { name, x }); }
  ring(x, y) { this.rings.push({ x, y, z: 0, chunk: this.chunkIndex, taken: false }); }
  pickup(x, y, kind) { this.pickups.push({ x, y, z: 0, kind, chunk: this.chunkIndex, taken: false }); }
  sign(x, text) {
    this.stat('box', 'frame', x, 0.7, -1.25, 0, 0, 0, 0.1, 1.4, 0.1);
    this.stat('box', 'sign', x, 1.55, -1.25, 0, 0, 0, 1.1, 0.55, 0.06);
    this.stat('box', 'arrow', x - 0.05, 1.55, -1.21, 0, 0, 0, 0.55, 0.14, 0.03);
    this.stat('box', 'arrow', x + 0.2, 1.6, -1.21, 0, 0, -Math.PI / 4, 0.22, 0.08, 0.03);
    this.stat('box', 'arrow', x + 0.2, 1.5, -1.21, 0, 0, Math.PI / 4, 0.22, 0.08, 0.03);
    this.signs.push({ x, text, chunk: this.chunkIndex });
    this.meta.hint = text;
  }

  // ---------- composite course pieces
  platform(x0, x1, top = 0, opts = {}) {
    const zd = CONFIG.course.laneHalfDepth;
    const s = this.solidOnly(x0, x1, -3, top, -zd, zd, { surface: opts.surface || 'deck' });
    this.statBox(x0, x1, top - 0.12, top, -zd, zd, opts.mat || 'deck');
    this.statBox(x0 + 0.04, x1 - 0.04, -2.6, top - 0.12, -zd + 0.06, zd - 0.06, 'pontoon', { shadow: false });
    this.statBox(x0, x1, top - 0.1, top + 0.005, zd - 0.05, zd + 0.02, 'trim');
    this.statBox(x0, x1, top - 0.1, top + 0.005, -zd - 0.02, -zd + 0.05, 'trim');
    if (x1 - x0 > 0.3) { this.statBox(x0 - 0.01, x0 + 0.05, top - 0.1, top + 0.005, -zd, zd, 'trim'); this.statBox(x1 - 0.05, x1 + 0.01, top - 0.1, top + 0.005, -zd, zd, 'trim'); }
    return s;
  }
  movingPlatform(x0, x1, top, m) {
    const zd = CONFIG.course.laneHalfDepth, w = x1 - x0;
    const s = this.solidOnly(x0, x1, top - 0.45, top, -zd, zd, { moving: true, surface: 'deck' });
    const deck = this.dyn('box', 'deck', { cx: x0, rad: w + 2 }), body = this.dyn('box', 'hazardAlt', { cx: x0, rad: w + 2 });
    const sup = this.dyn('box', 'frame', { cx: x0, rad: w + 2 });
    const bx = x0, by = top;
    const fn = (t) => {
      const o = Math.sin(TAU * t / m.period + m.phase);
      const nx = bx + m.ax * o, ny = by + m.ay * o;
      this.world.moveSolid(s, nx, ny - 0.45);
      this.pose(deck, nx + w / 2, ny - 0.06, 0, 0, 0, 0, w, 0.12, zd * 2);
      this.pose(body, nx + w / 2, ny - 0.28, 0, 0, 0, 0, w - 0.08, 0.34, zd * 2 - 0.1);
      this.pose(sup, nx + w / 2, (ny - 0.45 - 2.4) / 2, -zd + 0.2, 0, 0, 0, 0.18, ny - 0.45 + 2.4, 0.18);
      deck.cx = body.cx = sup.cx = nx + w / 2;
    };
    fn(0); s.dx = 0; s.dy = 0;
    this.update(fn);
    return s;
  }
  trampoline(x0, x1, top) {
    const zd = CONFIG.course.laneHalfDepth;
    const s = this.solidOnly(x0, x1, -3, top, -zd, zd, { bounce: CONFIG.trampoline.baseLaunch, surface: 'tramp' });
    this.statBox(x0, x1, top - 0.16, top - 0.02, -zd, zd, 'trampFrame');
    this.statBox(x0 + 0.04, x1 - 0.04, -2.6, top - 0.16, -zd + 0.1, zd - 0.1, 'pontoon', { shadow: false });
    const bed = this.dyn('box', 'tramp', { cx: (x0 + x1) / 2 });
    this.update((t, dt) => {
      s.squash = Math.max(0, (s.squash || 0) - dt * 3);
      const k = s.squash * Math.sin((1 - s.squash) * 18);
      this.pose(bed, (x0 + x1) / 2, top - 0.02 - 0.06 * k, 0, 0, 0, 0, x1 - x0 - 0.12, 0.05, zd * 2 - 0.2);
    });
    this.meta.trampolines = (this.meta.trampolines || 0) + 1;
    return s;
  }
  conveyor(x0, x1, top, speed) {
    const zd = CONFIG.course.laneHalfDepth;
    const s = this.solidOnly(x0, x1, -3, top, -zd, zd, { conveyor: speed, surface: 'belt' });
    this.statBox(x0, x1, top - 0.3, top - 0.05, -zd, zd, 'frame');
    this.statBox(x0 + 0.04, x1 - 0.04, -2.6, top - 0.3, -zd + 0.08, zd - 0.08, 'pontoon', { shadow: false });
    for (const rx of [x0 + 0.12, x1 - 0.12]) this.stat('cyl', 'metal', rx, top - 0.14, 0, Math.PI / 2, 0, 0, 0.24, zd * 2 + 0.1, 0.24);
    const belt = this.dyn('box', 'belt', { cx: (x0 + x1) / 2, rad: x1 - x0 });
    this.pose(belt, (x0 + x1) / 2, top - 0.03, 0, 0, 0, 0, x1 - x0, 0.06, zd * 2 - 0.1);
    // direction chevrons on the side rails (readability of belt direction)
    const n = Math.max(1, Math.floor((x1 - x0) / 0.9));
    for (let i = 0; i < n; i++) {
      const cx = x0 + (i + 0.5) * (x1 - x0) / n, d = Math.sign(speed);
      for (const sgn of [1, -1]) this.stat('box', 'trim', cx - d * 0.05, top - 0.17 + sgn * 0.045, zd + 0.01, 0, 0, -sgn * d * 0.75, 0.16, 0.04, 0.02);
    }
    this.update((t) => { belt.convey = t * speed; });
    this.loops.push({ name: 'hum', x0, x1 });
    return s;
  }
  ramp(x0, y0, x1, y1) {
    const zd = CONFIG.course.laneHalfDepth;
    this.world.addRamp({ x0, y0, x1, y1, chunk: this.chunkIndex });
    const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const nx = -Math.sin(a) * 0.15, ny = Math.cos(a) * 0.15;
    this.stat('box', 'deck', (x0 + x1) / 2 - nx, (y0 + y1) / 2 - ny, 0, 0, 0, a, l + 0.02, 0.3, zd * 2);
    this.statBox(x0 + 0.1, x1 - 0.1, -2.6, Math.min(y0, y1) - 0.1, -zd + 0.06, zd - 0.06, 'pontoon', { shadow: false });
    // stepped support under the ramp
    const steps = 4;
    for (let i = 0; i < steps; i++) { const sx = x0 + dx * (i + 0.5) / steps, sy = y0 + dy * (i + 0.5) / steps; this.stat('box', 'pontoon', sx, (sy - 0.3 - 0.1) / 2 - 0.05, 0, 0, 0, 0, dx / steps - 0.05, Math.max(0.05, sy - 0.2), zd * 2 - 0.12, { shadow: false }); }
    this.statBox(x0, x1, Math.min(y0, y1) - 0.02, Math.min(y0, y1) + 0.005, zd - 0.05, zd + 0.02, 'trim');
  }
  ramp3d(lx, rad) {
    const zs = -6.3, ze = -1.4, ys = 1.4, ye = 0;
    const l = Math.hypot(ze - zs, ys - ye), a = Math.atan2(ys - ye, ze - zs);
    this.stat('box', 'frame', lx, (ys + ye) / 2 - 0.2, (zs + ze) / 2, a, 0, 0, rad * 2 + 0.3, 0.15, l);
    for (const side of [-1, 1]) this.stat('box', 'hazardAlt', lx + side * (rad + 0.2), (ys + ye) / 2 + 0.05, (zs + ze) / 2, a, 0, 0, 0.1, 0.4, l);
    this.stat('box', 'frame', lx, ys / 2 - 1.2, zs + 0.6, 0, 0, 0, 0.3, ys + 2.2, 0.3);
  }
}

/** Build the full course: start zone, exact chunk sequence with connectors/checkpoints, ending zone. */
export function buildCourse(course, theme, events) {
  const world = new PhysicsWorld();
  const ctx = new BuildContext(world, theme, events);
  const C = CONFIG.course;
  const chunks = [], checkpoints = [];
  // START ZONE
  ctx.chunkIndex = -1;
  ctx.platform(-C.startLength - 1.5, 0, 0, { mat: 'deckAlt' });
  ctx.solidOnly(-C.startLength - 1.8, -C.startLength - 1.5, 0, 4, -1.5, 1.5, { walk: false });
  ctx.statBox(-C.startLength - 1.8, -C.startLength - 1.5, 0, 3.2, -1.5, 1.5, 'frame');
  startGate(ctx, -0.15, 'gate');
  let x = 0;
  course.chunks.forEach(([id], i) => {
    const def = resolveChunk(id);
    ctx.chunkIndex = i;
    const x0 = x;
    const L = buildChunk(ctx, def, x0);
    chunks.push({ index: i, position: i + 1, id, name: def.name, family: def.family, difficulty: def.difficulty, assetKind: def.assetKind, x0, x1: x0 + L, meta: { ...ctx.meta } });
    x = x0 + L;
    if (i < course.chunks.length - 1) {
      ctx.chunkIndex = i + 0.5;
      ctx.platform(x, x + C.connectorLength, 0, { mat: 'deckAlt' });
      const cx = x + C.connectorLength / 2;
      checkpointGate(ctx, cx);
      checkpoints.push({ index: checkpoints.length, x: cx, y: 0, afterChunk: i + 1 });
      world.addTrigger({ type: 'checkpoint', x0: cx - 0.1, x1: cx + 60, index: checkpoints.length - 1 });
      x += C.connectorLength;
    }
  });
  // ENDING ZONE
  ctx.chunkIndex = course.chunks.length;
  const endX = x;
  ctx.platform(endX, endX + C.endLength, 0, { mat: 'finish' });
  const finishX = endX + C.finishOffset;
  startGate(ctx, finishX, 'finish');
  world.addTrigger({ type: 'finish', x0: finishX, x1: finishX + 100 });
  ctx.solidOnly(endX + C.endLength, endX + C.endLength + 0.4, 0, 4, -1.5, 1.5, { walk: false });
  ctx.statBox(endX + C.endLength, endX + C.endLength + 0.4, 0, 3.2, -1.5, 1.5, 'frame');
  // podium
  ctx.statBox(endX + 4.5, endX + 6.5, 0, 0.35, -1.35, -0.3, 'trim');
  return {
    course, world, ctx, chunks, checkpoints, finishX, endX,
    spawn: { x: C.spawnX, y: 0 }, length: endX + C.endLength,
    statics: ctx.statics, dynamics: ctx.dynamics, updaters: ctx.updaters, rings: ctx.rings, pickups: ctx.pickups, signs: ctx.signs, loops: ctx.loops,
  };
}

function startGate(ctx, x, matName) {
  // arch placed behind/around the lane; the front leg is kept thin and low-contrast so it never hides the player
  ctx.stat('box', 'frame', x, 1.6, -1.55, 0, 0, 0, 0.22, 3.2, 0.22);
  ctx.stat('box', 'frame', x, 1.6, 1.55, 0, 0, 0, 0.12, 3.2, 0.12, { shadow: false });
  ctx.stat('box', matName === 'finish' ? 'finish' : 'gate', x, 3.25, 0, 0, 0, 0, 0.3, 0.5, 3.4);
  ctx.stat('box', matName === 'finish' ? 'finish' : 'gate', x, 0.004, 0, 0, 0, 0, 0.18, 0.02, 2.8, { shadow: false });
}

function checkpointGate(ctx, x) {
  ctx.stat('box', 'frame', x, 1.3, -1.5, 0, 0, 0, 0.14, 2.6, 0.14);
  ctx.stat('box', 'gate', x, 2.55, -1.1, 0, 0, 0, 0.5, 0.35, 0.9);
  ctx.stat('box', 'gate', x, 0.004, 0, 0, 0, 0, 0.12, 0.02, 2.8, { shadow: false });
}
