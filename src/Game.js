// Game client: owns renderer, camera, environment, water, VFX, audio, UI,
// input & save, and drives a GameSession per course. Shared by Web and Android.
import { CONFIG } from './config.js';
import { Renderer, RenderCamera, hex } from './engine/renderer.js';
import { GeomLib } from './engine/geomLib.js';
import { mergeGeometries } from './engine/geometry.js';
import { mat4, compose, clamp } from './core/math.js';
import { Emitter } from './core/events.js';
import { GameSession } from './game/GameSession.js';
import { GameCamera } from './game/Camera.js';
import { CharacterModel } from './game/CharacterModel.js';
import { PlayerAnimation, makeJoints, J } from './game/PlayerAnimation.js';
import { buildEnvironment, lightingEnv } from './game/EnvironmentSystem.js';
import { WaterSystem, WaterSplashTrigger } from './game/WaterSystem.js';
import { VFXSystem } from './game/VFXSystem.js';
import { BuildContext } from './game/CourseBuilder.js';
import { PhysicsWorld } from './game/PhysicsWorld.js';
import { ANIM_IDS, sampleGhost } from './game/systems.js';
import { THEMES } from './data/themes.js';
import { COURSES, getCourse, parseCourseId, courseIndex } from './data/courses.js';
import { ATHLETES, OUTFITS, COSTUMES } from './data/characters.js';
import { GraphicsManager } from './gfx/GraphicsManager.js';
import { AudioSystem, MENU_MUSIC } from './audio/AudioSystem.js';
import { SaveManager, ProgressionManager } from './save/SaveManager.js';
import { botInput } from './debug/bot.js';

const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));

export class Game {
  constructor({ canvas, platform, storage, input, ui, build }) {
    this.canvas = canvas; this.platform = platform; this.input = input; this.ui = ui; this.build = build;
    this.save = new SaveManager(storage); this.progress = new ProgressionManager(this.save);
    this.audio = new AudioSystem();
    this.state = 'boot'; this.paused = false; this.session = null; this.view = null;
    this.cam = new GameCamera(); this.rcam = new RenderCamera();
    this.acc = 0; this.last = 0; this.fps = 60; this.fpsFrames = 0; this.fpsT = 0;
    this.pendingEdges = { jump: false, slide: false }; this.bot = false; this.timeSinceStart = 0;
    this.identity = mat4();
  }

  get settings() { return this.save.data.settings; }
  appearance() {
    const c = this.save.data.character;
    return { athlete: ATHLETES.find(a => a.id === c.athlete) || ATHLETES[0], outfit: OUTFITS.find(o => o.id === c.outfit) || OUTFITS[0], costume: COSTUMES.find(o => o.id === c.costume) || COSTUMES[0] };
  }

  async boot() {
    const ui = this.ui;
    ui.setLoading(0.05, 'Starting graphics…'); await nextFrame();
    this.renderer = new Renderer(this.canvas);
    this.gfx = new GraphicsManager(this.renderer, this.platform);
    this.applySettings();
    ui.setLoading(0.25, 'Compiling shaders…'); await nextFrame();
    this.geom = new GeomLib(this.gfx.preset.lodBias);
    for (const k of ['box', 'rbox', 'rbox2', 'sphere', 'sphereLo', 'cyl', 'cone', 'frustum', 'torus', 'disc']) this.geom.mesh(k, this.renderer);
    ui.setLoading(0.5, 'Building athlete…'); await nextFrame();
    this.vfx = new VFXSystem(this.gfx.preset.particles);
    this.player3d = new CharacterModel(this.renderer, this.appearance());
    ui.setLoading(0.75, 'Preparing arena…'); await nextFrame();
    this.buildMenuScene();
    ui.setLoading(1, 'Ready'); await nextFrame();
    this.input.onAction = (a) => this.onAction(a);
    window.addEventListener('resize', () => this.renderer && this.renderer.resize());
    document.addEventListener('visibilitychange', () => { if (document.hidden) { if (this.state === 'playing') this.pause(true); this.audio.suspend(); } else this.audio.resume(); });
    window.addEventListener('blur', () => { if (this.state === 'playing') this.pause(true); });
    this.state = 'menu';
    requestAnimationFrame((t) => this.frame(t));
  }

  applySettings() {
    const s = this.settings;
    const prev = this.gfx.level;
    this.gfx.apply(s.quality);
    if (this.geom) this.geom.setLod(this.gfx.preset.lodBias);
    if (this.vfx) this.vfx.setMax(this.gfx.preset.particles);
    if (this.view && this.view.water) this.view.water.setQuality(this.gfx.preset);
    if (prev !== this.gfx.level && this.view && this.geom) { for (const o of this.view.dynamics) o.mesh = this.geom.mesh(o.geom, this.renderer); }
    this.audio.setVolumes({ master: s.master, music: s.music, sfx: s.sfx });
    this.cam.enabledShake = s.shake;
    if (this.view) this.view.env = lightingEnv(this.view.theme, s.brightness);
    this.ui.applySettings && this.ui.applySettings(s, this);
  }

  // ------------------------------------------------------------------ views
  disposeView() {
    const v = this.view; if (!v) return;
    for (const b of v.batches) this.renderer.deleteMesh(b.mesh);
    if (v.water) this.renderer.deleteMesh(v.water.mesh);
    this.view = null; this.vfx.clear();
  }

  makeBatches(statics) {
    const groups = new Map();
    for (const s of statics) {
      const bucket = typeof s.chunk === 'number' ? 'c' + Math.floor(s.chunk * 2) : 'e' + Math.floor(s.cx / 24);
      const m = s.mat;
      const key = `${bucket}|${m.pattern}|${m.patScale}|${m.patColor.join(',')}|${m.rough}|${s.shadow}`;
      let g = groups.get(key); if (!g) { g = { items: [], m, shadow: s.shadow }; groups.set(key, g); }
      g.items.push({ geom: this.geom.get(s.geom), matrix: s.matrix, color: m.color, extra: m.emissive || 0 });
    }
    const batches = [];
    for (const g of groups.values()) {
      const merged = mergeGeometries(g.items);
      let mn = Infinity, mx = -Infinity; for (let i = 0; i < merged.pos.length; i += 3) { const x = merged.pos[i]; if (x < mn) mn = x; if (x > mx) mx = x; }
      batches.push({ mesh: this.renderer.createMesh(merged), color: [1, 1, 1], pattern: g.m.pattern, patColor: g.m.patColor, patScale: g.m.patScale, rough: g.m.rough, castShadow: g.shadow, visible: true, cx: (mn + mx) / 2, rad: (mx - mn) / 2 + 1 });
    }
    return batches;
  }

  buildMenuScene() {
    this.disposeView();
    const theme = THEMES.Tiki;
    const ctx = new BuildContext(new PhysicsWorld(), theme, null);
    ctx.chunkIndex = 0;
    ctx.platform(-6, 6, 0, { mat: 'deck' });
    ctx.statBox(-1.2, 1.2, 0, 0.25, -1.1, 0.9, 'trim', { round: true });
    const statics = ctx.statics.concat(buildEnvironment(theme, -30, 30, this.gfx.preset.propDensity, 7));
    this.view = { theme, env: lightingEnv(theme, this.settings.brightness), batches: this.makeBatches(statics), dynamics: [], extra: [], water: new WaterSystem(this.renderer, theme, this.gfx.preset), menu: true };
    this.menuAnim = new PlayerAnimation(this.appearance().athlete.height / 1.78);
    this.menuT = 0;
    this.audio.setMusic(MENU_MUSIC); this.audio.setAmbience('lagoon');
  }

  refreshCharacter() { this.player3d.setAppearance(this.appearance()); if (this.menuAnim) this.menuAnim.scale = this.appearance().athlete.height / 1.78; }

  async loadCourse(id) {
    const course = getCourse(id);
    if (!course) throw new Error('Unknown course ' + id);
    if (!this.progress.isUnlocked(id)) throw new Error('Course locked');
    this.state = 'loading'; this.paused = false;
    const ui = this.ui;
    ui.showCourseLoading(course);
    ui.setLoading(0.05, 'Loading course ' + id); await nextFrame();
    this.disposeView(); this.audio.stopLoops();
    const events = new Emitter();
    const app = this.appearance();
    const session = new GameSession(course, { events, scale: app.athlete.height / 1.78 });
    ui.setLoading(0.35, `Building ${course.chunks.length} obstacle chunks`); await nextFrame();
    const theme = session.theme;
    const statics = session.build.statics.concat(buildEnvironment(theme, -12, session.build.length + 6, this.gfx.preset.propDensity, courseIndex(id) + 1));
    const batches = this.makeBatches(statics);
    ui.setLoading(0.6, 'Preparing ' + theme.label); await nextFrame();
    for (const o of session.build.dynamics) o.mesh = this.geom.mesh(o.geom, this.renderer);
    const view = { theme, env: lightingEnv(theme, this.settings.brightness), batches, dynamics: session.build.dynamics, water: new WaterSystem(this.renderer, theme, this.gfx.preset) };
    view.splash = new WaterSplashTrigger(this.vfx, this.audio);
    // rings, pickups, checkpoint flags
    const gold = hex(0xE8B83A);
    view.rings = session.build.rings.map(r => ({ r, o: { mesh: this.geom.mesh('torus', this.renderer), matrix: mat4(), color: gold, rough: 0.3, emissive: 0.22, visible: true, cx: r.x, rad: 1 } }));
    view.pickups = session.build.pickups.map(p => ({ p, can: { mesh: this.geom.mesh('cyl', this.renderer), matrix: mat4(), color: hex(0x2E8BD8), pattern: 1, patColor: hex(0xDDE6EE), patScale: 6, patSpace: 1, rough: 0.25, emissive: 0.12, visible: true, cx: p.x, rad: 1 },
      top: { mesh: this.geom.mesh('cyl', this.renderer), matrix: mat4(), color: hex(0xC9CED3), rough: 0.2, visible: true, cx: p.x, rad: 1 } }));
    const flagMat = theme.mats.gate;
    view.flags = session.build.checkpoints.map(c => ({ c, o: { mesh: this.geom.mesh('box', this.renderer), matrix: compose(mat4(), c.x + 0.25, 2.2, -1.5, 0, 0, 0, 0.5, 0.35, 0.03), color: hex(0x8A9099), rough: 0.7, emissive: 0.02, visible: true, cx: c.x, rad: 1 }, active: false, flagColor: hex(flagMat.color) }));
    view.blob = { mesh: this.geom.mesh('disc', this.renderer), matrix: mat4(), color: [0, 0, 0], opacity: 0.3, rough: 1, visible: true, castShadow: false };
    // ghost
    view.ghostData = this.settings.ghost ? this.save.getGhost(id) : null;
    if (view.ghostData) { view.ghost = new CharacterModel(this.renderer, app, { ghost: true, opacity: CONFIG.ghost.opacity }); view.ghostJoints = makeJoints(); }
    this.player3d.setAppearance(app);
    ui.setLoading(0.85, 'Tuning water & lighting'); await nextFrame();
    this.session = session; this.view = view;
    this.cam.reset(session.player.x, 0); this.cam.setWipeout(false);
    this.wireEvents(events);
    this.acc = 0; this.stepCount = 0; this.lastCountdown = 4; this.footPhase = 0; this.resultShown = false;
    this.audio.setMusic(theme.music); this.audio.setAmbience(theme.ambience);
    ui.setLoading(1, 'GO!'); await nextFrame();
    ui.startHud(session, this);
    this.state = 'playing';
    return session;
  }

  wireEvents(ev) {
    const A = this.audio, V = this.vfx, ui = this.ui, s = () => this.session;
    ev.on('sfx', e => A.play(e.name, { x: e.x }));
    ev.on('jump', e => { A.play('jump'); V.dust(e.x, e.y); });
    ev.on('land', e => { if (e.speed > 3) { A.play('land', { gain: clamp(e.speed / 12, 0.3, 1) }); V.landing(e.x, e.y, clamp(e.speed / 10, 0.4, 1.2)); } });
    ev.on('slide', e => { A.play('slide'); V.dust(e.x, e.y); });
    ev.on('bounce', e => { A.play('bounce', { x: e.x }); V.landing(e.x, e.y, 0.6); });
    ev.on('bonk', () => A.play('bonk'));
    ev.on('impact', e => { A.play(e.sound || 'impact', { x: e.x }); A.play('impact', { x: e.x, gain: 0.6 }); V.impact(e.x, e.y); V.debris(e.x, e.y, [0.9, 0.9, 0.85, 0.9]); });
    ev.on('shake', e => this.cam.shake(e.amount));
    ev.on('wipeout', e => { A.play('wipeout'); V.wipeout(e.x, e.y); this.cam.setWipeout(true); ui.toast(`WIPEOUT! +${e.penalty.toFixed(0)}s`, 'bad'); });
    ev.on('splash', e => this.view && this.view.splash.onSplash(e.x, e.y, e.big));
    ev.on('recover', () => { this.cam.setWipeout(false); });
    ev.on('respawn', () => {});
    ev.on('checkpoint', e => { A.play('checkpoint'); V.checkpoint(e.cp.x, 0); const f = this.view.flags[e.index]; if (f) { f.active = true; f.o.color = f.flagColor; f.o.emissive = 0.3; } ui.toast(`CHECKPOINT ${e.index + 1}/${e.total}`, 'good'); });
    ev.on('ring', e => { A.play('ring'); V.ringPickup(e.ring.x, e.ring.y); });
    ev.on('energy', e => { A.play('energy'); V.energy(e.x, e.y); ui.toast('ENERGY DRINK! Speed boost', 'good'); });
    ev.on('rewind', () => { A.play('rewind'); ui.flash('rewind'); });
    ev.on('teleport', e => { A.play('teleport'); V.teleport(e.from.x, e.from.y); V.teleport(e.to.x, e.to.y); if (e.auto) ui.toast('Recovered to checkpoint', 'info'); });
    ev.on('go', () => { A.play('go'); ui.showCountdown('GO!'); });
    ev.on('finish', r => { A.play('finish'); V.checkpoint(this.session.build.finishX, 0); setTimeout(() => A.play(r.stars > 0 ? 'victory' : 'defeat'), 900); this.onFinish(r); });
    void s;
  }

  onFinish(result) {
    const prog = this.progress.complete(result);
    this.lastResult = { result, prog, course: this.session.course };
    setTimeout(() => { if (this.session && this.session.result === result) { this.resultShown = true; this.ui.showResults(this.lastResult, this); } }, 2200);
  }

  onAction(a) {
    this.audio.unlock();
    if (a === 'debug' && this.build.debug) { this.settings.debug = !this.settings.debug; this.ui.applySettings(this.settings, this); return; }
    if (this.state === 'playing') {
      if (a === 'pause' || a === 'back') { this.pause(!this.paused); return; }
      if (this.paused || !this.session) return;
      if (a === 'rewind') { if (!this.session.useRewind()) this.ui.toast('Rewind unavailable', 'info'); }
      if (a === 'teleport') { if (!this.session.useTeleport()) this.ui.toast('Teleport unavailable', 'info'); }
      if (a === 'jump') this.pendingEdges.jump = true;
      if (a === 'slide') this.pendingEdges.slide = true;
    } else if (a === 'back' || a === 'pause') this.ui.back();
  }

  pause(p) {
    if (this.state !== 'playing' || !this.session || this.session.phase === 'finished') return;
    this.paused = p; this.ui.showPause(p);
    if (p) this.audio.stopLoops();
  }

  quitToMenu(screen = 'menu') {
    this.session = null; this.paused = false; this.audio.stopLoops();
    this.buildMenuScene(); this.state = 'menu'; this.ui.stopHud(); this.ui.showScreen(screen);
  }

  // ------------------------------------------------------------------ frame
  frame(ts) {
    requestAnimationFrame((t) => this.frame(t));
    const now = ts / 1000;
    let dt = this.last ? now - this.last : 1 / 60; this.last = now;
    dt = Math.min(dt, 0.1);
    this.fpsFrames++; this.fpsT += dt; if (this.fpsT >= 0.5) { this.fps = this.fpsFrames / this.fpsT; this.fpsFrames = 0; this.fpsT = 0; }
    if (!this.renderer || this.renderer.lost) return;
    const aspect = this.renderer.resize();
    if (this.state === 'playing' && this.session) this.updateGame(dt, now, aspect);
    else if (this.view && this.view.menu) this.updateMenu(dt, aspect);
    else return;
    this.renderScene();
  }

  updateMenu(dt, aspect) {
    this.menuT += dt;
    const j = this.menuAnim.update({ x: 0, y: 0.25, vx: 0, vy: 0, grounded: true, state: 'control', moveInput: 0, speedMul: 1, facing: 1, ground: null, sliding: false }, dt);
    this.player3d.update(j);
    const sway = Math.sin(this.menuT * 0.25) * 0.6;
    this.rcam.fov = 34 * Math.PI / 180;
    this.rcam.update([1.6 + sway, 1.55, 5.2], [0.7 + sway * 0.5, 1.05, 0], aspect);
    this.rcam.focusX = 0; this.rcam.focusY = 1;
    this.view.water.update(0);
    this.vfx.update(dt);
    this.sceneObjects = this.player3d.objects.slice();
    this.sceneTransparent = [];
    this.view.env.plPos = [1.5, 2.5, 3];
  }

  updateGame(dt, now, aspect) {
    const S = this.session, V = this.view;
    if (!this.paused) {
      const inp = this.bot ? botInput(S) : this.input.poll(now);
      if (inp.jumpPressed) this.pendingEdges.jump = true;
      if (inp.slidePressed) this.pendingEdges.slide = true;
      const fixed = CONFIG.sim.fixedDt;
      const ts = S.timeScale;
      this.acc += dt * ts;
      let steps = Math.floor(this.acc / fixed);
      if (steps > CONFIG.sim.maxSubSteps) { steps = CONFIG.sim.maxSubSteps; this.acc = 0; } else this.acc -= steps * fixed;
      for (let i = 0; i < steps; i++) {
        const si = { move: inp.move, walk: inp.walk, jumpPressed: this.pendingEdges.jump, slidePressed: this.pendingEdges.slide };
        this.pendingEdges.jump = false; this.pendingEdges.slide = false;
        S.step(si, fixed / ts);
      }
      // countdown display
      if (S.phase === 'countdown') { const n = Math.ceil(S.countdown); if (n !== this.lastCountdown && n > 0) { this.lastCountdown = n; this.ui.showCountdown(String(n)); this.audio.play('countdown'); } }
      this.vfx.update(dt * ts);
      V.splash.update(dt, S.player);
      this.footsteps(dt);
    }
    const P = S.player;
    // camera
    const rag = P.state === 'ragdoll';
    const focus = rag ? { x: S.renderJoints[J.pelvis][0], y: S.renderJoints[J.pelvis][1] - 0.9 } : { x: P.x, y: P.y };
    const c = this.cam.update(this.paused ? 0 : dt, focus, aspect, 0);
    this.rcam.fov = c.fov; this.rcam.update(c.eye, c.target, aspect);
    this.rcam.focusX = c.target[0]; this.rcam.focusY = c.target[1];
    this.audio.listenerX = P.x;
    // character + ghost
    this.player3d.update(S.renderJoints);
    const flash = S.invulnT > 0 && Math.floor(S.invulnT * 10) % 2 === 0;
    this.player3d.setOpacity(flash ? 0.55 : 1);
    const objs = V.dynamics.slice();
    for (const o of this.player3d.objects) objs.push(o);
    const t = S.t;
    for (const { r, o } of V.rings) {
      if (r.taken) { const k = (t - r.takenT) / 0.35; if (k > 1) { o.visible = false; continue; } compose(o.matrix, r.x, r.y + k * 0.8, 0, Math.PI / 2, t * 6, 0, 0.9 * (1 + k), 0.9 * (1 + k), 0.9 * (1 + k)); o.opacity = 1 - k; }
      else compose(o.matrix, r.x, r.y + Math.sin(t * 2 + r.x) * 0.06, 0, Math.PI / 2, 0, t * 2.5 + r.x, 0.9, 0.9, 0.9);
      objs.push(o);
    }
    for (const pk of V.pickups) {
      if (pk.p.taken) { pk.can.visible = pk.top.visible = false; continue; }
      const y = pk.p.y + Math.sin(t * 3) * 0.06, ry = t * 2;
      compose(pk.can.matrix, pk.p.x, y, 0, 0.25, ry, 0.15, 0.22, 0.4, 0.22); compose(pk.top.matrix, pk.p.x + 0.03, y + 0.21, 0, 0.25, ry, 0.15, 0.2, 0.03, 0.2);
      objs.push(pk.can, pk.top);
    }
    for (const f of V.flags) { if (f.active) { compose(f.o.matrix, f.c.x + 0.25, 2.2, -1.5, 0, 0, Math.sin(t * 5) * 0.05, 0.5, 0.35, 0.03); } objs.push(f.o); }
    const transparent = [];
    if (V.ghost && V.ghostData && S.phase !== 'countdown') {
      const g = sampleGhost(V.ghostData, S.timer.time);
      if (g) {
        PlayerAnimation.sample(ANIM_IDS[g[4]] || 'run', g[5], S.timer.time, [g[1], g[2], -0.35], g[3] || 1, S.scale, V.ghostJoints);
        V.ghost.update(V.ghostJoints);
        for (const o of V.ghost.objects) transparent.push(o);
      }
    }
    // blob shadow (always helps grounding on low quality)
    if (!this.gfx.preset.shadowSize && !rag) {
      const g = S.world.groundBelow(P.x, P.y + 0.1, 0.1);
      if (g) { compose(V.blob.matrix, P.x, g.y + 0.012, 0, 0, 0, 0, 0.7, 0.01, 0.45); V.blob.opacity = clamp(0.35 - (P.y - g.y) * 0.08, 0.05, 0.35); transparent.push(V.blob); }
    }
    this.sceneObjects = objs; this.sceneTransparent = transparent;
    V.water.update(this.rcam.focusX);
    V.env.plPos = [P.x + 0.8, P.y + 2.4, 2.6];
    // energy trail + conveyor hum
    if (P.speedMul > 1 && !this.paused && Math.random() < 0.6) this.vfx.trail(P.x, P.y);
    let hum = 0; for (const l of S.build.loops) { const d = P.x < l.x0 ? l.x0 - P.x : P.x > l.x1 ? P.x - l.x1 : 0; hum = Math.max(hum, 1 - d / 8); }
    if (!this.paused) this.audio.setLoop('hum', Math.max(0, hum));
    this.ui.updateHud(S, this);
    if (this.settings.debug && this.build.debug) this.ui.debug(this.debugInfo());
  }

  footsteps() {
    const S = this.session, P = S.player, a = S.anim;
    if (!P.grounded || P.sliding || !(a.state === 'run' || a.state === 'walk' || a.state === 'sprint' || a.state === 'backward')) return;
    const ph = Math.floor(a.phase / Math.PI);
    if (ph !== this.footPhase) { this.footPhase = ph; this.audio.footstep(P.ground && P.ground.surface); if (Math.random() < 0.35) this.vfx.dust(P.x, P.y); }
  }

  renderScene() {
    const V = this.view;
    const scene = { env: V.env, batches: V.batches, objects: this.sceneObjects || [], transparent: this.sceneTransparent || [], water: V.water, particles: this.vfx, time: performance.now() / 1000, identity: this.identity };
    this.renderer.render(scene, this.rcam);
  }

  debugInfo() {
    const S = this.session, P = S.player, p = parseCourseId(S.course.id);
    const ch = S.build.chunks[Math.min(S.chunkIndex, S.build.chunks.length - 1)];
    return [
      `FPS ${this.fps.toFixed(0)}  draws ${this.renderer.stats.draws}  tris ${(this.renderer.stats.tris / 1000).toFixed(0)}k`,
      `Pos ${P.x.toFixed(2)}, ${P.y.toFixed(2)}  Vel ${P.vx.toFixed(2)}, ${P.vy.toFixed(2)}`,
      `Course ${S.course.id}  Season ${p.season}  Episode ${p.episode}`,
      `Chunk ${S.chunkIndex + 1}/${S.build.chunks.length} ${ch ? ch.id + ' ' + ch.name + ' (' + ch.assetKind + ')' : 'END'}`,
      `Checkpoint ${S.checkpoints.current + 1}/${S.build.checkpoints.length}  Timer ${S.timer.time.toFixed(2)}  Phase ${S.phase}`,
      `Physics ${P.state}${P.grounded ? ' grounded' : ' air'}${P.sliding ? ' slide' : ''} anim=${S.anim.state}`,
      `Ragdoll ${S.ragdoll.active ? 'active t=' + S.ragdoll.t.toFixed(2) + ' v=' + S.ragdoll.speed.toFixed(2) : 'off'}  timeScale ${S.timeScale.toFixed(2)}`,
      `Camera ${this.cam.state} dist=${this.cam.dist.toFixed(1)} y=${this.cam.y.toFixed(2)}`,
      `Graphics ${this.gfx.level.toUpperCase()}  dpr ${this.renderer.pixelRatio.toFixed(2)}  ${this.platform.name}`,
    ].join('\n');
  }

  // ------------------------------------------------------------------ test hooks
  testApi() {
    return {
      courses: () => COURSES.map(c => c.id),
      unlockAll: () => { this.save.data.unlocked = COURSES.length; this.save.save(); },
      load: (id) => this.loadCourse(id),
      bot: (on) => { this.bot = on; },
      state: () => { const S = this.session; if (!S) return { state: this.state }; return { state: this.state, phase: S.phase, x: S.player.x, y: S.player.y, time: S.timer.time, chunks: S.build.chunks.map(c => c.id), env: S.course.environment, checkpoints: S.checkpoints.reached, wipeouts: S.wipeouts, result: S.result && { ...S.result, ghost: undefined }, anim: S.anim.state, grounded: S.player.grounded, vy: S.player.vy }; },
      fastForward: (sec) => { const S = this.session; const n = Math.round(sec / CONFIG.sim.fixedDt); for (let i = 0; i < n && S.phase !== 'finished'; i++) S.step(this.bot ? botInput(S) : { move: 0 }, CONFIG.sim.fixedDt / S.timeScale); },
      quality: (q) => { this.settings.quality = q; this.applySettings(); },
      save: () => JSON.parse(JSON.stringify(this.save.data)),
      stats: () => ({ ...this.renderer.stats, fps: this.fps, level: this.gfx.level }),
      /** Render now and measure displayed luminance (brightness/visibility check). */
      luminance: () => {
        this.renderScene();
        const gl = this.renderer.gl, w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
        const px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
        let sum = 0, white = 0, black = 0, n = 0;
        for (let i = 0; i < px.length; i += 4 * 7) { const l = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255; sum += l; n++; if (l > 0.94) white++; if (l < 0.04) black++; }
        return { mean: sum / n, white: white / n, black: black / n };
      },
      /** Contrast of the player vs. the pixels around it (visibility). */
      playerOnScreen: () => {
        const S = this.session; if (!S) return null;
        const p = S.renderJoints[3]; const v = this.rcam.viewProj;
        const x = v[0] * p[0] + v[4] * p[1] + v[8] * p[2] + v[12], y = v[1] * p[0] + v[5] * p[1] + v[9] * p[2] + v[13], w = v[3] * p[0] + v[7] * p[1] + v[11] * p[2] + v[15];
        return { nx: x / w, ny: y / w, visible: Math.abs(x / w) < 1 && Math.abs(y / w) < 1 && w > 0 };
      },
    };
  }
}
