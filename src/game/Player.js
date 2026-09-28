// Player + PlayerPhysics: kinematic character controller on the 2.5D lane.
import { CONFIG } from '../config.js';
import { clamp, lerp } from '../core/math.js';

export class Player {
  constructor(world, events) {
    this.world = world; this.events = events;
    this.reset(0, 0);
  }

  reset(x, y) {
    this.x = x; this.y = y; this.px = x; this.py = y;
    this.ctrlVx = 0; this.extVx = 0; this.vy = 0;
    this.grounded = true; this.ground = null; this.slope = 0;
    this.coyote = 0; this.jumpBuf = 0;
    this.sliding = false; this.slideT = 0; this.slideSpeed = 0;
    this.state = 'control';      // control | stumble | ragdoll | recover | frozen | rewind | finished
    this.stunT = 0; this.speedMul = 1; this.facing = 1;
    this.airT = 0; this.lastLandSpeed = 0; this.moveInput = 0; this.walkMode = false;
    this.distance = 0; this.hitCooldowns = new Map();
  }

  get vx() { return this.ctrlVx + this.extVx; }
  get height() { return this.sliding ? CONFIG.physics.slideHeight : CONFIG.physics.height; }

  capsule() {
    const r = 0.26;
    const top = this.sliding ? CONFIG.physics.slideHeight : CONFIG.physics.height;
    return { a: [this.x, this.y + 0.28, 0], b: [this.x, this.y + top - 0.28, 0], r };
  }

  canControl() { return this.state === 'control' || this.state === 'stumble'; }

  step(dt, input) {
    const P = CONFIG.physics, S = CONFIG.slide, W = this.world;
    this.px = this.x; this.py = this.y;
    if (this.state === 'frozen' || this.state === 'ragdoll' || this.state === 'rewind' || this.state === 'recover') return;
    if (this.stunT > 0) { this.stunT -= dt; if (this.stunT <= 0 && this.state === 'stumble') this.state = 'control'; }

    // --- carried by moving ground
    if (this.grounded && this.ground && this.ground.moving) { this.x += this.ground.dx; this.y += this.ground.dy; }

    // --- target horizontal speed
    const inp = this.state === 'finished' ? { move: 0.6, walk: true } : input;
    const m = inp.move || 0;
    let target = 0;
    const th = CONFIG.touch.moveThreshold;
    if (m > th) target = (inp.walk || m < 0.6 ? P.walkSpeed : P.runSpeed) * this.speedMul;
    else if (m < -CONFIG.touch.backThreshold) target = -P.backwardSpeed;
    if (this.state === 'stumble') target *= 0.35;
    this.moveInput = m; this.walkMode = target > 0 && target < P.runSpeed * this.speedMul - 0.01;

    // --- jump / slide requests
    if (inp.jumpPressed && this.canControl()) this.jumpBuf = P.jumpBuffer;
    else this.jumpBuf = Math.max(0, this.jumpBuf - dt);
    if (inp.slidePressed && this.canControl() && this.grounded && !this.sliding && this.ctrlVx > 2) {
      this.sliding = true; this.slideT = 0; this.slideSpeed = Math.max(this.ctrlVx, P.walkSpeed) * S.entryBoost;
      this.events.emit('slide', { x: this.x, y: this.y });
    }

    const conveyor = this.grounded && this.ground ? (this.ground.conveyor || 0) : 0;

    if (this.sliding) {
      this.slideT += dt;
      let slopeMul = 1;
      if (this.grounded && this.slope !== 0) {
        const k = Math.min(1, Math.abs(this.slope) * 3);
        slopeMul = this.slope < 0 ? lerp(1, S.downhill, k) : lerp(1, S.uphill, k);
      }
      this.slideSpeed *= Math.pow(S.friction * slopeMul, dt / 0.25);
      this.slideSpeed = Math.min(this.slideSpeed, P.maxVelocity);
      this.ctrlVx = this.slideSpeed;
      const wantsEnd = this.slideT > S.duration || this.slideSpeed < S.minSpeed || (!this.grounded && this.airT > 0.2);
      if (wantsEnd && this.headroom()) this.sliding = false;
    } else if (this.grounded) {
      const accel = Math.abs(target) > Math.abs(this.ctrlVx) || Math.sign(target) !== Math.sign(this.ctrlVx) ? P.groundAccel : P.groundDecel;
      const d = target - this.ctrlVx, mx = accel * dt;
      this.ctrlVx += clamp(d, -mx, mx);
    } else {
      this.ctrlVx += (target - this.ctrlVx) * (1 - Math.exp(-P.airControlReaction * dt));
    }
    // external momentum (impacts, conveyors)
    if (this.grounded) {
      if (conveyor) this.extVx += (conveyor - this.extVx) * Math.min(1, 12 * dt);
      else this.extVx *= Math.exp(-7 * dt);
    } else this.extVx *= Math.exp(-0.6 * dt);

    // --- jump
    if (this.jumpBuf > 0 && (this.grounded || this.coyote > 0) && this.canControl() && this.headroomJump()) {
      this.vy = P.jumpImpulse; this.grounded = false; this.coyote = 0; this.jumpBuf = 0; this.ground = null;
      if (this.sliding) this.sliding = false;
      this.events.emit('jump', { x: this.x, y: this.y });
    }

    // --- gravity + velocity cap
    this.vy += P.gravity * dt;
    let vx = this.vx;
    const sp = Math.hypot(vx, this.vy);
    if (sp > P.maxVelocity) { const k = P.maxVelocity / sp; this.ctrlVx *= k; this.extVx *= k; this.vy *= k; vx = this.vx; }

    this.integrate(dt, vx);
    this.distance += Math.abs(this.x - this.px);
  }

  integrate(dt, vx) {
    const P = CONFIG.physics, W = this.world, hw = P.halfWidth;
    const h = this.height;
    const wasGrounded = this.grounded;
    // ---- X
    let nx = this.x + vx * dt;
    const step = wasGrounded ? P.stepHeight : 0.04;
    for (const s of W.solids) {
      if (s.z0 > 0 || s.z1 < 0) continue;
      if (nx + hw <= s.x0 || nx - hw >= s.x1) continue;
      if (this.y >= s.y1 - step || this.y + h <= s.y0) continue;
      if (this.x + hw <= s.x0 + 0.05 + Math.abs(s.dx)) { nx = s.x0 - hw - 1e-4; if (vx > 0) { this.ctrlVx = Math.min(this.ctrlVx, 0); this.extVx = Math.min(this.extVx, 0); } }
      else if (this.x - hw >= s.x1 - 0.05 - Math.abs(s.dx)) { nx = s.x1 + hw + 1e-4; if (vx < 0) { this.ctrlVx = Math.max(this.ctrlVx, 0); this.extVx = Math.max(this.extVx, 0); } }
      else { // penetrating (a solid moved into us): pop to nearest side or on top
        if (s.y1 - this.y < 0.6) { this.y = s.y1; }
        else nx = (nx - s.x0 < s.x1 - nx) ? s.x0 - hw - 1e-4 : s.x1 + hw + 1e-4;
      }
      if (this.sliding && Math.abs(nx - this.x) < 1e-3) this.slideSpeed = 0;
    }
    this.x = nx;

    // ---- Y
    const prevFeet = this.y;
    let ny = this.y + this.vy * dt;
    if (this.vy > 0) {
      for (const s of W.solids) {
        if (s.z0 > 0 || s.z1 < 0) continue;
        if (this.x + hw - 0.03 <= s.x0 || this.x - hw + 0.03 >= s.x1) continue;
        if (prevFeet + h <= s.y0 + 0.02 && ny + h > s.y0) { ny = s.y0 - h; this.vy = 0; this.events.emit('bonk', { x: this.x, y: ny + h }); }
      }
    }
    let best = -Infinity, ref = null, slope = 0;
    if (this.vy <= 0 || wasGrounded) {
      for (const s of W.solids) {
        if (!s.walk || s.z0 > 0 || s.z1 < 0) continue;
        if (this.x + hw <= s.x0 || this.x - hw >= s.x1) continue;
        const ty = s.y1;
        const tolUp = wasGrounded ? P.stepHeight : 0.03;
        if (prevFeet >= ty - tolUp - Math.max(0, s.dy) && ny <= ty + (wasGrounded ? 0.06 : 0) && ty > best) { best = ty; ref = s; slope = 0; }
      }
      for (const r of W.ramps) {
        if (this.x < r.x0 || this.x > r.x1) continue;
        const ty = W.rampY(r, this.x);
        if (prevFeet >= ty - (wasGrounded ? 0.4 : 0.06) && ny <= ty + (wasGrounded ? 0.35 : 0) && ty > best) { best = ty; ref = r; slope = (r.y1 - r.y0) / (r.x1 - r.x0) * Math.sign(vx || 1); }
      }
    }
    if (ref && this.vy <= 0.001) {
      const impactV = -this.vy;
      this.y = best; this.vy = 0;
      if (!wasGrounded) { this.lastLandSpeed = impactV; this.events.emit('land', { x: this.x, y: best, speed: impactV, ref }); }
      this.grounded = true; this.ground = ref; this.slope = slope; this.airT = 0;
      if (ref.bounce) this.trampoline(ref, impactV);
    } else {
      this.y = ny;
      if (this.grounded) { this.grounded = false; this.ground = null; }
    }
    if (this.grounded) this.coyote = P.coyoteTime; else { this.coyote -= dt; this.airT += dt; }
  }

  trampoline(ref, impactV) {
    const T = CONFIG.trampoline, P = CONFIG.physics;
    const base = ref.bounce > 1 ? ref.bounce : T.baseLaunch;
    const ratio = lerp(T.minBounceRatio, T.maxBounceRatio, clamp(impactV / P.maxVelocity, 0, 1));
    const out = clamp(impactV * ratio * T.damping, base * T.minBouncingVelocity, base * T.maxBouncingVelocity);
    this.vy = Math.min(out, P.maxVelocity); this.grounded = false; this.ground = null; this.coyote = 0;
    if (this.sliding) this.sliding = false;
    ref.squash = 1;
    this.events.emit('bounce', { x: this.x, y: this.y, v: this.vy });
  }

  headroom() {
    const P = CONFIG.physics, hw = P.halfWidth;
    for (const s of this.world.solids) {
      if (s.z0 > 0 || s.z1 < 0 || this.x + hw <= s.x0 || this.x - hw >= s.x1) continue;
      if (s.y0 > this.y + 0.1 && s.y0 < this.y + P.height) return false;
    }
    return true;
  }
  headroomJump() { return this.sliding ? this.headroom() : true; }

  /** Knockback from an impact (force in m/s, direction in XY). */
  applyImpact(nx, ny, force, stumble = true) {
    const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    this.ctrlVx = 0; this.extVx = nx * force; this.vy = Math.max(ny * force, 2.5);
    this.grounded = false; this.ground = null; this.sliding = false;
    if (stumble) { this.state = 'stumble'; this.stunT = CONFIG.impact.stumbleTime; }
  }
}
