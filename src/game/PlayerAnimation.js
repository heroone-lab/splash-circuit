// PlayerAnimation: procedural, biomechanically-motivated pose generation
// (idle/walk/run/sprint/backward/jump/fall/land/slide/stumble/impact/
// stunned/recovery/checkpoint/finish/victory/defeat) + forward kinematics.
import { clamp, lerp } from '../core/math.js';

export const J = { pelvis: 0, spine: 1, neck: 2, head: 3, lHip: 4, lKnee: 5, lFoot: 6, rHip: 7, rKnee: 8, rFoot: 9, lSh: 10, lElb: 11, lHand: 12, rSh: 13, rElb: 14, rHand: 15, lToe: 16, rToe: 17 };
export const JOINT_COUNT = 18;

// Skeleton dimensions for a 1.78 m lean athlete (metres).
export const SKEL = { pelvisY: 0.985, spine: 0.23, neck: 0.5, head: 0.135, shoulderUp: 0.455, shoulderW: 0.172, hipW: 0.088, hipDown: 0.045, thigh: 0.435, shin: 0.425, ankleH: 0.075, foot: 0.19, upperArm: 0.285, forearm: 0.255 };

const PARAMS = ['pelvisY', 'bodyPitch', 'trunk', 'head', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'shL', 'shR', 'abdL', 'abdR', 'elbL', 'elbR', 'legAbd', 'flight'];
const zero = () => Object.fromEntries(PARAMS.map(k => [k, 0]));

function gaitLeg(o, side, q, hipA, hipB, kneeA, kneeB, ankA) {
  o['hip' + side] = hipA + hipB * Math.sin(q);
  o['knee' + side] = kneeA + kneeB * Math.pow(Math.max(0, Math.cos(q - 0.35)), 1.3);
  o['ankle' + side] = ankA * Math.sin(q - 1.2);
}

export const POSES = {
  idle(t) { const o = zero(); const b = Math.sin(t * 1.7);
    o.trunk = 0.03 + 0.012 * b; o.head = -0.03; o.hipL = 0.04; o.hipR = -0.02; o.kneeL = 0.08; o.kneeR = 0.03;
    o.shL = 0.05 + 0.02 * b; o.shR = 0.02 + 0.02 * b; o.abdL = 0.12; o.abdR = 0.12; o.elbL = 0.25; o.elbR = 0.2; o.legAbd = 0.05; o.pelvisY = -0.01 + 0.005 * b; return o; },
  walk(p) { const o = zero();
    gaitLeg(o, 'L', p, 0.04, 0.45, 0.08, 0.75, 0.18); gaitLeg(o, 'R', p + Math.PI, 0.04, 0.45, 0.08, 0.75, 0.18);
    o.shL = -0.38 * Math.sin(p); o.shR = -0.38 * Math.sin(p + Math.PI); o.elbL = o.elbR = 0.55; o.abdL = o.abdR = 0.08;
    o.trunk = 0.08; o.pelvisY = -0.02 + 0.025 * Math.abs(Math.cos(p)); o.legAbd = 0.03; return o; },
  run(p, sprint = 0) { const o = zero();
    const h = lerp(0.72, 0.86, sprint), k = lerp(1.35, 1.6, sprint);
    gaitLeg(o, 'L', p, 0.15, h, 0.22, k, 0.3); gaitLeg(o, 'R', p + Math.PI, 0.15, h, 0.22, k, 0.3);
    const a = lerp(0.7, 0.95, sprint);
    o.shL = -a * Math.sin(p) + 0.1; o.shR = -a * Math.sin(p + Math.PI) + 0.1;
    o.elbL = 1.25 + 0.2 * Math.sin(p); o.elbR = 1.25 + 0.2 * Math.sin(p + Math.PI);
    o.abdL = o.abdR = 0.1; o.trunk = lerp(0.17, 0.3, sprint); o.head = -0.1;
    o.flight = 0.05 * Math.max(0, Math.sin(2 * p + 0.6)); o.pelvisY = -0.04; o.legAbd = 0.02; return o; },
  backward(p) { const o = zero();
    gaitLeg(o, 'L', -p, 0.02, 0.32, 0.12, 0.6, 0.1); gaitLeg(o, 'R', -p + Math.PI, 0.02, 0.32, 0.12, 0.6, 0.1);
    o.shL = 0.25 * Math.sin(p); o.shR = -0.25 * Math.sin(p); o.elbL = o.elbR = 0.7; o.abdL = o.abdR = 0.15;
    o.trunk = -0.04; o.head = 0.05; o.pelvisY = -0.03; return o; },
  jump(t) { const o = zero();
    o.hipL = 1.05; o.kneeL = 1.35; o.hipR = 0.15; o.kneeR = 0.55; o.ankleL = 0.2; o.ankleR = -0.3;
    o.shL = 2.1; o.shR = 0.7; o.elbL = 0.5; o.elbR = 0.9; o.abdL = 0.25; o.abdR = 0.3; o.trunk = 0.12; o.head = -0.08; void t; return o; },
  fall(t, flail = 0) { const o = zero(); const w = Math.sin(t * 9) * flail;
    o.hipL = 0.55; o.kneeL = 0.85; o.hipR = -0.05; o.kneeR = 0.5; o.ankleL = 0.1;
    o.shL = 1.2 + 0.8 * w; o.shR = 1.0 - 0.8 * w; o.abdL = 0.9; o.abdR = 0.9; o.elbL = 0.4; o.elbR = 0.4; o.trunk = 0.05 - 0.1 * flail; return o; },
  land(t) { const o = zero(); const k = Math.max(0, 1 - t / 0.25);
    o.pelvisY = -0.2 * k; o.hipL = o.hipR = 0.35 + 0.65 * k; o.kneeL = o.kneeR = 0.45 + 1.0 * k; o.ankleL = o.ankleR = -0.35 * k;
    o.trunk = 0.2 + 0.3 * k; o.shL = o.shR = 0.5 * k + 0.2; o.elbL = o.elbR = 0.8; o.abdL = o.abdR = 0.35; return o; },
  slide(t) { const o = zero();
    o.bodyPitch = -0.95; o.pelvisY = -0.6; o.hipL = 2.25; o.kneeL = 0.2; o.hipR = 1.55; o.kneeR = 1.7; o.ankleL = 0.3;
    o.trunk = 0.25; o.head = 0.45; o.shL = -0.3; o.shR = 0.6; o.abdL = 0.6; o.abdR = 0.45; o.elbL = 0.3; o.elbR = 1.1; o.legAbd = 0.06;
    o.hipL += 0.03 * Math.sin(t * 30); return o; },
  stumble(t) { const o = zero();
    o.trunk = -0.28; o.head = 0.2; o.hipL = 0.45; o.kneeL = 0.5; o.hipR = -0.25; o.kneeR = 0.35;
    o.shL = 1.6 + 1.2 * Math.sin(t * 15); o.shR = 1.6 - 1.2 * Math.sin(t * 15); o.abdL = o.abdR = 0.7; o.elbL = o.elbR = 0.4; return o; },
  impact() { const o = zero();
    o.trunk = -0.45; o.head = 0.35; o.hipL = 0.5; o.hipR = 0.2; o.kneeL = 0.4; o.kneeR = 0.3;
    o.shL = 1.8; o.shR = 1.4; o.abdL = 1.1; o.abdR = 1.0; o.elbL = 0.6; o.elbR = 0.8; return o; },
  stunned(t) { const o = POSES.idle(t); const s = Math.sin(t * 3.2);
    o.trunk = 0.14 + 0.07 * s; o.head = 0.2 + 0.12 * Math.sin(t * 2.3); o.kneeL = 0.3; o.kneeR = 0.25; o.hipL = 0.18; o.hipR = 0.15;
    o.abdL = 0.25 + 0.05 * s; o.abdR = 0.25 - 0.05 * s; o.pelvisY = -0.05; return o; },
  recovery(r) { // r: 0..1
    const lying = { ...zero(), bodyPitch: -1.45, pelvisY: -0.84, hipL: 0.15, hipR: 0.1, kneeL: 0.3, kneeR: 0.2, shL: 0.3, shR: 0.5, abdL: 0.6, abdR: 0.6, elbL: 0.3, elbR: 0.3 };
    const kneel = { ...zero(), bodyPitch: 0, pelvisY: -0.42, trunk: 0.55, head: -0.2, hipL: 1.55, kneeL: 1.75, hipR: 0.3, kneeR: 1.9, ankleR: -0.7, shL: 0.7, shR: 0.5, elbL: 0.6, elbR: 0.5, abdL: 0.2, abdR: 0.2 };
    const stand = POSES.idle(0);
    return r < 0.5 ? blend(lying, kneel, smoothT(r / 0.5)) : blend(kneel, stand, smoothT((r - 0.5) / 0.5)); },
  finish(t) { const o = zero(); const b = Math.abs(Math.sin(t * 5));
    o.shL = o.shR = 2.85; o.abdL = o.abdR = 0.35; o.elbL = o.elbR = 0.25; o.trunk = -0.08; o.head = 0.25; o.flight = 0.12 * b; o.kneeL = o.kneeR = 0.3 * (1 - b); o.hipL = o.hipR = 0.2 * (1 - b); return o; },
  victory(t) { const o = zero(); const s = Math.sin(t * 6);
    o.shL = 2.7 + 0.3 * s; o.shR = 1.2 - 0.9 * s; o.elbL = 0.3; o.elbR = 1.6; o.abdL = 0.3; o.abdR = 0.5; o.trunk = -0.05; o.head = 0.15; o.hipL = 0.05; o.legAbd = 0.1; o.pelvisY = 0.01 * s; return o; },
  defeat(t) { const o = zero(); const s = Math.sin(t * 1.5);
    o.shL = o.shR = 2.35; o.abdL = o.abdR = 0.95; o.elbL = o.elbR = 2.3; o.trunk = 0.28 + 0.04 * s; o.head = -0.35; o.kneeL = 0.12; o.kneeR = 0.08; o.legAbd = 0.06; return o; },
};

const smoothT = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export function blend(a, b, t) { const o = {}; for (const k of PARAMS) o[k] = lerp(a[k] || 0, b[k] || 0, t); return o; }

/** Forward kinematics -> joint positions (world). */
export function solveFK(pose, root, facing, scale, out, plant = true) {
  const s = scale, f = facing;
  const P = [0, SKEL.pelvisY * s + pose.pelvisY * s, 0];
  const tr = pose.trunk;
  const up = [Math.sin(tr), Math.cos(tr)];
  const j = out;
  const set = (i, x, y, z) => { j[i][0] = x; j[i][1] = y; j[i][2] = z; };
  set(J.pelvis, P[0], P[1], 0);
  set(J.spine, P[0] + up[0] * SKEL.spine * s, P[1] + up[1] * SKEL.spine * s, 0);
  const nx = P[0] + up[0] * SKEL.neck * s, ny = P[1] + up[1] * SKEL.neck * s;
  set(J.neck, nx, ny, 0);
  const ha = tr + pose.head;
  set(J.head, nx + Math.sin(ha) * SKEL.head * s, ny + Math.cos(ha) * SKEL.head * s, 0);
  const shx = P[0] + up[0] * SKEL.shoulderUp * s, shy = P[1] + up[1] * SKEL.shoulderUp * s;
  const arm = (side, iS, iE, iH, flex, abd, elb) => {
    const z = side * SKEL.shoulderW * s;
    set(iS, shx, shy, z);
    const a = flex + tr * 0.5, ca = Math.cos(abd);
    const ex = shx + Math.sin(a) * ca * SKEL.upperArm * s, ey = shy - Math.cos(a) * ca * SKEL.upperArm * s, ez = z + side * Math.sin(abd) * SKEL.upperArm * s;
    set(iE, ex, ey, ez);
    const b = a + elb;
    set(iH, ex + Math.sin(b) * ca * SKEL.forearm * s, ey - Math.cos(b) * ca * SKEL.forearm * s, ez + side * Math.sin(abd) * 0.5 * SKEL.forearm * s);
  };
  arm(1, J.lSh, J.lElb, J.lHand, pose.shL, pose.abdL, pose.elbL);
  arm(-1, J.rSh, J.rElb, J.rHand, pose.shR, pose.abdR, pose.elbR);
  const leg = (side, iH, iK, iF, iT, hip, knee, ank) => {
    const z = side * SKEL.hipW * s, hy = P[1] - SKEL.hipDown * s;
    set(iH, P[0], hy, z);
    const la = pose.legAbd * side, cl = Math.cos(pose.legAbd);
    const kx = P[0] + Math.sin(hip) * SKEL.thigh * s * cl, ky = hy - Math.cos(hip) * SKEL.thigh * s * cl, kz = z + Math.sin(la) * SKEL.thigh * s;
    set(iK, kx, ky, kz);
    const sa = hip - knee;
    const ax = kx + Math.sin(sa) * SKEL.shin * s, ay = ky - Math.cos(sa) * SKEL.shin * s;
    set(iF, ax, ay, kz);
    const fa = sa + ank;
    set(iT, ax + Math.cos(fa) * SKEL.foot * s, ay + Math.sin(fa) * SKEL.foot * s - 0.04 * s, kz);
  };
  leg(1, J.lHip, J.lKnee, J.lFoot, J.lToe, pose.hipL, pose.kneeL, pose.ankleL);
  leg(-1, J.rHip, J.rKnee, J.rFoot, J.rToe, pose.hipR, pose.kneeR, pose.ankleR);
  // whole-body pitch about the pelvis
  if (pose.bodyPitch) {
    const c = Math.cos(pose.bodyPitch), sn = Math.sin(pose.bodyPitch);
    for (let i = 0; i < JOINT_COUNT; i++) {
      const x = j[i][0] - P[0], y = j[i][1] - P[1];
      j[i][0] = P[0] + x * c + y * sn; j[i][1] = P[1] - x * sn + y * c;
    }
  }
  // foot planting (keeps contact with the ground)
  let dy = 0;
  if (plant) {
    let mn = Infinity;
    for (let i = 0; i < JOINT_COUNT; i++) {
      const pad = i === J.lFoot || i === J.rFoot ? SKEL.ankleH * s : i === J.lToe || i === J.rToe ? 0.03 * s : 0.06 * s;
      mn = Math.min(mn, j[i][1] - pad);
    }
    dy = -mn + (pose.flight || 0);
  }
  for (let i = 0; i < JOINT_COUNT; i++) {
    j[i][0] = root[0] + j[i][0] * f; j[i][1] = root[1] + j[i][1] + dy; j[i][2] = root[2] + j[i][2] * f;
  }
  return j;
}

export function makeJoints() { return Array.from({ length: JOINT_COUNT }, () => [0, 0, 0]); }

/** Animation state machine driven by player state. */
export class PlayerAnimation {
  constructor(scale = 1) {
    this.scale = scale; this.state = 'idle'; this.stateT = 0; this.phase = 0; this.t = 0;
    this.pose = POSES.idle(0); this.joints = makeJoints(); this.landT = 9; this.checkpointT = 9;
    this.override = null; this.recoverT = 0;
  }
  setState(s) { if (s !== this.state) { this.state = s; this.stateT = 0; } }
  pick(p) {
    if (this.override) return this.override;
    if (p.state === 'recover') return 'recovery';
    if (p.state === 'stumble') return this.stateT < 0.15 && this.state === 'impact' ? 'impact' : 'stumble';
    if (p.stunnedT > 0) return 'stunned';
    if (p.sliding) return 'slide';
    if (!p.grounded) return p.vy > 0.5 ? 'jump' : 'fall';
    if (this.landT < 0.22 && p.lastLandSpeed > 6) return 'land';
    const v = p.vx - (p.ground && p.ground.conveyor || 0);
    if (Math.abs(v) < 0.25 && Math.abs(p.moveInput) < 0.05) return 'idle';
    if (v < -0.2) return 'backward';
    if (p.walkMode) return 'walk';
    return p.speedMul > 1.01 ? 'sprint' : 'run';
  }
  update(p, dt) {
    this.t += dt; this.stateT += dt; this.landT += dt; this.checkpointT += dt;
    const st = this.pick(p); this.setState(st);
    const v = Math.abs(p.vx - (p.ground && p.ground.conveyor || 0));
    let target;
    switch (st) {
      case 'idle': target = POSES.idle(this.t); break;
      case 'walk': this.phase += v * dt / 1.55 * Math.PI * 2 * 0.5; target = POSES.walk(this.phase); break;
      case 'run': this.phase += v * dt / 3.9 * Math.PI * 2; target = POSES.run(this.phase, 0); break;
      case 'sprint': this.phase += v * dt / 4.6 * Math.PI * 2; target = POSES.run(this.phase, 1); break;
      case 'backward': this.phase += v * dt / 1.3 * Math.PI * 2 * 0.5; target = POSES.backward(this.phase); break;
      case 'jump': target = POSES.jump(this.stateT); break;
      case 'fall': target = POSES.fall(this.t, clamp((p.airT - 0.7) * 2, 0, 1)); break;
      case 'land': target = POSES.land(this.landT); break;
      case 'slide': target = POSES.slide(this.stateT); break;
      case 'stumble': target = POSES.stumble(this.stateT); break;
      case 'impact': target = POSES.impact(); break;
      case 'stunned': target = POSES.stunned(this.t); break;
      case 'recovery': target = POSES.recovery(clamp(p.recoverT || 0, 0, 1)); break;
      case 'finish': target = POSES.finish(this.stateT); break;
      case 'victory': target = POSES.victory(this.stateT); break;
      case 'defeat': target = POSES.defeat(this.stateT); break;
      default: target = POSES.idle(this.t);
    }
    if (this.checkpointT < 0.7 && (st === 'run' || st === 'sprint' || st === 'walk' || st === 'idle')) {
      const k = Math.sin(Math.PI * this.checkpointT / 0.7);
      target.shR = lerp(target.shR, 2.9, k); target.elbR = lerp(target.elbR, 0.5, k); target.abdR = lerp(target.abdR, 0.2, k);
    }
    const rate = st === 'recovery' || st === 'slide' ? 30 : st === 'land' ? 22 : 13;
    this.pose = blend(this.pose, target, 1 - Math.exp(-rate * dt));
    const planted = p.grounded || p.state === 'recover' || this.override === 'victory' || this.override === 'defeat' || this.override === 'finish';
    const root = [p.x, planted ? p.y : p.y, 0];
    solveFK(this.pose, root, p.facing, this.scale, this.joints, planted);
    if (!planted) { // airborne: pelvis-anchored (feet hang below)
      const offs = this.joints[J.pelvis][1] - (p.y + 0.97 * this.scale);
      for (const jj of this.joints) jj[1] -= offs;
    }
    return this.joints;
  }
  /** Named sample used by ghosts: state + phase -> joints */
  static sample(state, phase, t, root, facing, scale, out) {
    let pose;
    if (state === 'run' || state === 'sprint') pose = POSES.run(phase, state === 'sprint' ? 1 : 0);
    else if (state === 'walk') pose = POSES.walk(phase);
    else if (state === 'backward') pose = POSES.backward(phase);
    else if (state === 'recovery') pose = POSES.recovery(phase);
    else if (POSES[state]) pose = POSES[state](t);
    else pose = POSES.fall(t, 1);
    const grounded = !(state === 'jump' || state === 'fall');
    solveFK(pose, root, facing, scale, out, grounded);
    if (!grounded) { const offs = out[J.pelvis][1] - (root[1] + 0.97 * scale); for (const jj of out) jj[1] -= offs; }
    return out;
  }
}
