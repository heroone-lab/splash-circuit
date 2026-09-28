// GameSession: one run of one course. Pure simulation (no DOM / WebGL) so the
// exact same code runs in the browser, in the Android WebView and in the
// Node verification harness.
import { CONFIG } from '../config.js';
import { Emitter } from '../core/events.js';
import { buildCourse } from './CourseBuilder.js';
import { Player } from './Player.js';
import { PlayerAnimation, makeJoints, J, JOINT_COUNT } from './PlayerAnimation.js';
import { PlayerRagdoll } from './PlayerRagdoll.js';
import { TimerSystem, StarSystem, CheckpointManager, RingSystem, SlowMotion, PowerupSystem, RewindBuffer, GhostRecorder } from './systems.js';
import { THEMES } from '../data/themes.js';
import { clamp, lerp } from '../core/math.js';

export class GameSession {
  constructor(course, opts = {}) {
    this.course = course;
    this.events = opts.events || new Emitter();
    this.theme = THEMES[course.environment];
    this.scale = opts.scale || 1;
    this.build = buildCourse(course, this.theme, this.events);
    this.world = this.build.world;
    this.player = new Player(this.world, this.events);
    this.anim = new PlayerAnimation(this.scale);
    this.ragdoll = new PlayerRagdoll(this.world, this.scale);
    this.timer = new TimerSystem();
    this.checkpoints = new CheckpointManager(this.build.checkpoints, this.build.spawn);
    this.rings = new RingSystem(this.build.rings);
    this.powerups = new PowerupSystem(this.build.pickups);
    this.slowmo = new SlowMotion();
    this.rewind = new RewindBuffer(CONFIG.powerups.rewindSeconds);
    this.ghostRec = new GhostRecorder();
    this.t = 0;                   // obstacle/simulation clock
    this.phase = 'countdown';     // countdown | playing | finished
    this.countdown = CONFIG.course.countdown;
    this.wipeouts = 0; this.wipe = null; this.invulnT = 0;
    this.renderJoints = makeJoints();
    this.stuck = { t: 0, x: 0 }; this.noControlT = 0;
    this.rewindPlay = null; this.result = null; this.hazardsEnabled = opts.hazards !== false;
    this.player.reset(this.build.spawn.x, this.build.spawn.y);
    this.player.state = 'frozen';
    this.stunnedT = 0;
    // pre-run obstacle updaters once so everything is posed at t=0
    for (const u of this.build.updaters) u(0, CONFIG.sim.fixedDt);
    this.events.on('checkpoint', () => { this.anim.checkpointT = 0; });
    this.events.on('land', (e) => { this.anim.landT = 0; void e; });
  }

  get timeScale() { return this.slowmo.scale; }
  get chunkIndex() {
    const x = this.player.x;
    for (const c of this.build.chunks) if (x < c.x1) return c.index;
    return this.build.chunks.length;
  }
  get progress() { return clamp((this.player.x - this.build.spawn.x) / (this.build.finishX - this.build.spawn.x), 0, 1); }

  /** Advance one fixed simulation step. realDt = unscaled wall-clock time this step represents. */
  step(input, realDt) {
    const dt = CONFIG.sim.fixedDt;
    const P = this.player;
    this.slowmo.tick(realDt);
    if (this.phase === 'countdown') {
      this.countdown -= realDt;
      if (this.countdown <= 0) { this.phase = 'playing'; P.state = 'control'; this.timer.start(); this.events.emit('go', {}); }
    }
    this.timer.tick(realDt);
    this.t += dt;
    for (const u of this.build.updaters) u(this.t, dt);

    if (this.rewindPlay) this.stepRewind(realDt);
    else if (P.state === 'ragdoll' || P.state === 'recover' || this.wipe) this.stepWipeout(dt, realDt);
    else {
      P.step(dt, this.phase === 'countdown' ? {} : input);
      if (this.phase === 'playing' && this.hazardsEnabled && this.invulnT <= 0 && P.canControl()) this.checkHazards();
    }
    this.invulnT -= dt;
    this.stunnedT = Math.max(0, this.stunnedT - dt);
    P.stunnedT = this.stunnedT;

    if (P.state !== 'ragdoll' && !this.wipe) {
      if (P.y < CONFIG.physics.waterLevel) this.startWipeout('water');
    }
    if (this.phase === 'playing' && P.canControl()) {
      this.checkpoints.update(P.x, this.events);
      this.rings.update(P.x, P.y, this.events, this.t);
      this.powerups.update(P, realDt, this.events, this.t);
      if (P.x >= this.build.finishX) this.finish();
      this.checkStuck(input, realDt);
      this.rewind.record(realDt, P, this.anim, this.checkpoints.current);
    }
    if (this.phase === 'finished') {
      this.anim.override = this.finishT < 1.6 ? 'finish' : (this.result && this.result.stars > 0 ? 'victory' : 'defeat');
      this.finishT += realDt;
    }
    // animation + render joints
    if (P.state === 'ragdoll') this.composeRagdollJoints();
    else {
      P.recoverT = this.wipe && this.wipe.phase === 'recover' ? this.wipe.rt / CONFIG.wipeout.recovery : 0;
      const j = this.anim.update(P, dt);
      if (this.wipe && this.wipe.phase === 'recover' && this.wipe.snapshot) {
        const w = clamp(this.wipe.rt / CONFIG.ragdoll.blend, 0, 1);
        for (let i = 0; i < JOINT_COUNT; i++) for (let k = 0; k < 3; k++) this.renderJoints[i][k] = lerp(this.wipe.snapshot[i][k], j[i][k], w);
      } else for (let i = 0; i < JOINT_COUNT; i++) { this.renderJoints[i][0] = j[i][0]; this.renderJoints[i][1] = j[i][1]; this.renderJoints[i][2] = j[i][2]; }
    }
    if (this.phase === 'playing') this.ghostRec.record(realDt, this.timer.time, P, this.anim, this.chunkIndex, P.state === 'ragdoll');
  }

  composeRagdollJoints() {
    const rj = this.ragdoll.p, w = clamp(this.ragdoll.t / CONFIG.ragdoll.blend, 0, 1);
    const snap = this.wipe && this.wipe.impactPose;
    if (snap && w < 1) {
      const dp = [rj[J.pelvis][0] - snap[J.pelvis][0], rj[J.pelvis][1] - snap[J.pelvis][1], rj[J.pelvis][2] - snap[J.pelvis][2]];
      for (let i = 0; i < JOINT_COUNT; i++) for (let k = 0; k < 3; k++) this.renderJoints[i][k] = lerp(snap[i][k] + dp[k], rj[i][k], w);
    } else for (let i = 0; i < JOINT_COUNT; i++) for (let k = 0; k < 3; k++) this.renderJoints[i][k] = rj[i][k];
    const pv = rj[J.pelvis]; this.player.x = pv[0]; this.player.y = pv[1] - 0.95;
  }

  checkHazards() {
    const P = this.player, cap = P.capsule();
    const hit = this.world.hazardHit(cap.a, cap.b, cap.r, this.t);
    if (!hit) return;
    const h = hit.h;
    const last = P.hitCooldowns.get(h.id) || -99;
    if (this.t - last < CONFIG.impact.cooldown) return;
    P.hitCooldowns.set(h.id, this.t);
    if (h.onHit) h.onHit();
    let nx = hit.playerPoint[0] - hit.point[0], ny = hit.playerPoint[1] - hit.point[1];
    let F;
    const I = CONFIG.impact;
    if (h.force === 'ball') {
      const B = CONFIG.bigBall;
      const rel = Math.hypot(h.vel[0] - P.vx, h.vel[1] - P.vy, h.vel[2]);
      F = Math.max(B.minBounceForce, rel * 1.3 + 2);
      // bounce-back direction limited to ±bounceAngle around the horizontal away from the ball
      const dir = Math.sign(nx || (P.x - h.a[0]) || -1);
      let ang = Math.atan2(ny, Math.abs(nx) + 1e-3);
      const lim = B.bounceAngle * Math.PI / 180; ang = clamp(ang, 0.25, lim);
      nx = Math.cos(ang) * dir * B.horizontalDamping; ny = Math.sin(ang) * B.verticalDamping;
    } else {
      F = h.force === 'small' ? I.small : I.medium;
      if (h.knock) { nx = h.knock[0]; ny = h.knock[1]; }
      else {
        const l = Math.hypot(nx, ny);
        if (l < 0.15) { nx = h.vel[0] !== 0 ? Math.sign(h.vel[0]) : -1; ny = 0.6; }
        // blend hazard sweep direction in (sweepers push along their motion)
        const hv = Math.hypot(h.vel[0], h.vel[1]);
        if (hv > 0.5) { nx = nx * 0.5 + h.vel[0] / hv * 0.5; ny = Math.max(ny, 0) * 0.5 + 0.45; }
        ny = Math.max(ny, 0.35);
      }
    }
    const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    this.events.emit('impact', { x: hit.point[0], y: hit.point[1], force: F, sound: h.sound, kind: h.force });
    const wipe = F >= I.medium - 0.01;
    this.events.emit('shake', { amount: wipe ? 1 : 0.5 });
    if (wipe) this.startWipeout('hit', [nx * F, ny * F, (h.vel[2] || 0) * 0.15]);
    else { P.applyImpact(nx, ny, F, true); this.anim.setState('impact'); }
  }

  startWipeout(kind, impulse = [0, 0, 0]) {
    const P = this.player;
    if (this.wipe || this.phase === 'finished') return;
    this.wipeouts++;
    this.timer.addPenalty(this.phase === 'playing' ? CONFIG.wipeout.penalty : 0);
    this.slowmo.trigger();
    const impactPose = this.renderJoints.map(j => j.slice());
    this.wipe = { kind, phase: 'ragdoll', t: 0, rt: 0, impactPose, snapshot: null };
    this.ragdoll.start(this.renderJoints, [P.vx, P.vy, 0], impulse, CONFIG.sim.fixedDt);
    P.state = 'ragdoll'; P.sliding = false;
    this.events.emit('wipeout', { kind, x: P.x, y: P.y, penalty: CONFIG.wipeout.penalty });
    if (kind === 'water') this.events.emit('splash', { x: P.x, y: CONFIG.physics.waterLevel, big: true });
  }

  stepWipeout(dt, realDt) {
    const W = this.wipe, P = this.player;
    if (!W) { P.state = 'control'; return; }
    W.t += realDt;
    if (W.phase === 'ragdoll') {
      this.ragdoll.step(dt, this.world.hazards);
      if (this.ragdoll.inWater && !W.splashed) { W.splashed = true; this.events.emit('splash', { x: this.ragdoll.p[J.pelvis][0], y: CONFIG.physics.waterLevel, big: true }); W.waterT = W.t; }
      const inWater = W.splashed && W.t - W.waterT > 1.1;
      const stuck = W.t > CONFIG.wipeout.stuckTimeout;
      if (this.ragdoll.settled() || inWater || stuck) {
        const g = !inWater && !stuck ? this.ragdoll.onGround() : null;
        const px = this.ragdoll.p[J.pelvis][0];
        let spot = null;
        if (g && this.safeSpot(px, g.y)) spot = { x: px, y: g.y };
        if (!spot) { spot = this.checkpoints.recoveryPoint(); W.respawned = true; this.events.emit('respawn', spot); }
        W.snapshot = this.ragdoll.p.map(j => j.slice());
        if (W.respawned) { // shift the snapshot to the respawn point so the blend happens there
          const d = [spot.x - W.snapshot[J.pelvis][0], spot.y + 0.25 - W.snapshot[J.pelvis][1]];
          let minY = Infinity; for (const j of W.snapshot) minY = Math.min(minY, j[1]);
          for (const j of W.snapshot) { j[0] += d[0]; j[2] *= 0.2; }
          for (const j of W.snapshot) j[1] += spot.y + 0.1 - minY;
        }
        this.ragdoll.active = false;
        P.reset(spot.x, spot.y); P.state = 'recover'; P.grounded = true;
        this.anim.setState('recovery'); this.anim.pose = this.anim.pose; // keep
        W.phase = 'recover'; W.rt = 0;
        this.events.emit('recover', { x: spot.x, y: spot.y });
      }
    } else if (W.phase === 'recover') {
      W.rt += realDt;
      if (W.rt >= CONFIG.wipeout.recovery) {
        P.state = this.phase === 'finished' ? 'finished' : 'control';
        this.wipe = null; this.invulnT = 1.2; this.stunnedT = 0.35; this.stuck.t = 0; this.stuck.x = P.x;
        this.rewind.clear();
      }
    }
  }

  safeSpot(x, y) {
    // must be on real ground inside the course and free of hazards
    if (x < this.build.spawn.x - 3 || x > this.build.finishX + 6) return false;
    const a = [x, y + 0.3, 0], b = [x, y + 1.5, 0];
    for (const h of this.world.hazards) {
      if (!h.active) continue;
      const hx = h.kind === 'sphere' ? h.a[0] : (h.a[0] + h.b[0]) / 2;
      if (Math.abs(hx - x) < 2.2) return false; // near an active hazard -> use checkpoint
    }
    void a; void b;
    return true;
  }

  checkStuck(input, realDt) {
    const P = this.player;
    const trying = (input.move || 0) > CONFIG.touch.moveThreshold;
    if (!trying || P.x > this.stuck.x + 0.5) { this.stuck.t = 0; this.stuck.x = P.x; return; }
    this.stuck.t += realDt;
    if (this.stuck.t > CONFIG.wipeout.stuckTimeout) { this.events.emit('stuck', {}); this.teleport(true); }
  }

  // ---------------- power-ups
  useTeleport(free = false) {
    if (this.phase !== 'playing' || !this.player.canControl()) return false;
    if (!free) { if (this.powerups.teleports <= 0) return false; this.powerups.teleports--; this.powerups.used.teleport++; }
    this.teleport(false); return true;
  }
  teleport(auto) {
    const spot = this.checkpoints.recoveryPoint(), P = this.player;
    this.events.emit('teleport', { from: { x: P.x, y: P.y }, to: spot, auto });
    P.reset(spot.x, spot.y); P.state = 'control'; this.invulnT = 1.2; this.stuck.t = 0; this.stuck.x = spot.x; this.rewind.clear();
  }
  useRewind() {
    if (this.phase !== 'playing' || !this.player.canControl() || this.powerups.rewinds <= 0 || !this.rewind.ready) return false;
    this.powerups.rewinds--; this.powerups.used.rewind++;
    this.rewindPlay = { frames: this.rewind.buf.slice(), t: 0 };
    this.player.state = 'rewind';
    this.events.emit('rewind', {});
    return true;
  }
  stepRewind(realDt) {
    const R = this.rewindPlay, P = this.player, D = CONFIG.powerups.rewindPlayback;
    R.t += realDt;
    const k = clamp(R.t / D, 0, 1), f = R.frames, n = f.length - 1;
    const pos = (1 - k) * n, i = Math.floor(pos), fr = pos - i;
    const a = f[i], b = f[Math.min(n, i + 1)];
    P.x = lerp(a.x, b.x, fr); P.y = lerp(a.y, b.y, fr);
    if (k >= 1) {
      const s = f[0];
      P.x = s.x; P.y = s.y; P.ctrlVx = s.ctrlVx; P.extVx = s.extVx; P.vy = s.vy; P.facing = s.facing; P.sliding = false;
      P.grounded = false; P.ground = null; P.state = 'control';
      this.anim.phase = s.phase; this.rewindPlay = null; this.invulnT = 1.0; this.rewind.clear();
      this.events.emit('rewindEnd', {});
    }
  }

  finish() {
    if (this.phase !== 'playing') return;
    this.phase = 'finished'; this.timer.stop(); this.finishT = 0;
    this.player.state = 'finished';
    const time = +this.timer.time.toFixed(2);
    const stars = StarSystem.stars(time, this.course.stars);
    this.result = { courseId: this.course.id, time, stars, rings: this.rings.count, ringsTotal: this.rings.total, wipeouts: this.wipeouts,
      checkpoints: this.checkpoints.reached, checkpointsTotal: this.build.checkpoints.length, penalty: this.timer.penalty, ghost: this.ghostRec.data() };
    this.events.emit('finish', this.result);
  }
}
