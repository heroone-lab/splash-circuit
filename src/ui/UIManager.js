import { COURSES, parseCourseId, getCourse, courseDifficulty, courseIndex } from '../data/courses.js';
import { THEMES } from '../data/themes.js';
import { ATHLETES, OUTFITS, COSTUMES } from '../data/characters.js';
import { StarSystem } from '../game/systems.js';
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SVG = (d, vb = '0 0 24 24') => '<svg class="ic" viewBox="' + vb + '" aria-hidden="true"><path fill="currentColor" d="' + d + '"/></svg>';
const ICONS = {
'★': SVG('M12 2l2.9 6.6 7.1.6-5.4 4.8 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z'),
'◎': SVG('M12 3a9 9 0 100 18 9 9 0 000-18zm0 4a5 5 0 110 10 5 5 0 010-10z'),
'🔒': SVG('M7 10V7a5 5 0 0110 0v3h1v11H6V10zm2 0h6V7a3 3 0 00-6 0z'),
'⟲': SVG('M12 4a8 8 0 11-7.7 10h2.1A6 6 0 1012 6v3L7 5l5-4z'),
'⇤': SVG('M4 4h2v16H4zm4 8l6-6v4h6v4h-6v4z'),
'❚❚': SVG('M6 4h4v16H6zm8 0h4v16h-4z'),
'✓': SVG('M9 16.2l-4.2-4.2L3.4 13.4 9 19 21 7l-1.4-1.4z'),
'▶': SVG('M7 4l13 8-13 8z'),
'‹': SVG('M15.4 5.4L14 4l-8 8 8 8 1.4-1.4L8.8 12z'),
};
const ico = (h) => String(h).replace(/★|◎|🔒|⟲|⇤|❚❚|✓|▶|‹/g, (m) => ICONS[m]);
const fmt = (t) => (t === null || t === undefined || !isFinite(t) ? '--.--' : t.toFixed(2) + 's');
const starStr = (n, max = 3) => '<span class="stars">' + Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('') + '</span>';
export class UIManager {
constructor(root, build, platform) {
this.root = root; this.build = build; this.platform = platform; this.stack = []; this.current = null;
root.innerHTML = ico(`
<div id="screen" class="screen hidden"></div>
<div id="loading" class="loading hidden"><div class="load-card"><div class="load-title"></div><div class="load-sub"></div><div class="bar"><div class="fill"></div></div><div class="load-msg"></div></div></div>
<div id="hud" class="hud hidden"></div>
<div id="overlay" class="overlay hidden"></div>
<div id="countdown" class="countdown"></div>
<div id="toasts" class="toasts"></div>
<div id="flash" class="flash"></div>
<pre id="debug" class="debug hidden"></pre>`);
this.screen = $('#screen', root); this.loading = $('#loading', root); this.hud = $('#hud', root); this.overlay = $('#overlay', root);
root.addEventListener('pointerover', (e) => { if (e.target.closest && e.target.closest('button:not([disabled])') && this.game) this.game.audio.play('uiHover'); });
}
attach(game) { this.game = game; }
click(fn) { return () => { this.game.audio.unlock(); this.game.audio.play('uiClick'); fn(); }; }
setLoading(p, msg) {
const bar = document.getElementById('bootBar'); if (bar) bar.style.width = Math.round(p * 100) + '%';
const bm = document.getElementById('bootMsg'); if (bm) bm.textContent = msg;
$('.fill', this.loading).style.width = Math.round(p * 100) + '%'; $('.load-msg', this.loading).textContent = msg;
}
bootDone() { const b = document.getElementById('boot'); if (b) { b.classList.add('fade'); setTimeout(() => b.remove(), 600); } this.showScreen('menu'); this.applySettings(this.game.settings, this.game); }
fatal(msg) { const b = document.getElementById('bootMsg'); if (b) b.innerHTML = ico(`<b>Unable to start:</b> ${esc(msg)}<br>This game needs WebGL 2 (Chrome, Edge, Firefox, Safari 15+).`); }
showCourseLoading(c) {
const th = THEMES[c.environment];
$('.load-title', this.loading).textContent = c.id; $('.load-sub', this.loading).textContent = `${th.label} · ${c.chunks.length} obstacle chunks`;
this.hideScreen(); this.loading.classList.remove('hidden'); this.overlay.classList.add('hidden');
}
showScreen(name, arg, push = true) {
if (push && this.current && this.current.name !== name) this.stack.push(this.current);
if (name === 'menu') this.stack = [];
this.current = { name, arg };
this.loading.classList.add('hidden');
this.screen.classList.remove('hidden');
this.screen.className = 'screen screen-' + name;
this.screen.innerHTML = ico(this['render_' + name](arg));
this['bind_' + name] && this['bind_' + name](arg);
this.screen.querySelectorAll('[data-back]').forEach(b => b.onclick = this.click(() => this.back()));
const first = this.screen.querySelector('button:not([disabled])'); if (first && !this.platform.touch) first.focus({ preventScroll: true });
}
hideScreen() { this.screen.classList.add('hidden'); }
back() {
if (this.overlay && !this.overlay.classList.contains('hidden') && this.overlayKind === 'settings') { this.showPause(true); return; }
const prev = this.stack.pop();
if (prev) this.showScreen(prev.name, prev.arg, false); else if (this.current && this.current.name !== 'menu') this.showScreen('menu');
}
header(title) { return `<div class="hdr"><button class="btn-back" data-back aria-label="Back">‹</button><h2>${title}</h2><div class="hdr-stats">★ ${this.game.progress.totalStars()} / 135 · ◎ ${this.game.save.data.coins}</div></div>`; }
render_menu() {
const P = this.game.progress, next = P.nextPlayable();
const items = ['PLAY', 'SEASONS', 'COURSES', 'CHARACTER', 'COSTUMES', 'SETTINGS', 'TUTORIAL', 'CREDITS'];
return `<div class="menu-panel">
<div class="logo"><span>SPLASH</span><span>CIRCUIT</span><small>3D obstacle-course championship</small></div>
<div class="menu-list">${items.map(i => `<button class="mbtn ${i === 'PLAY' ? 'primary' : ''}" data-m="${i}">${i}${i === 'PLAY' ? `<small>${next.id} · ${THEMES[next.environment].label}</small>` : ''}</button>`).join('')}</div>
<div class="menu-foot">★ ${P.totalStars()} / 135 · ${Object.values(this.game.save.data.courses).filter(c => c.completed).length} / 45 courses · v${esc(this.build.version)} ${this.build.mode !== 'release' ? '(' + esc(this.build.mode) + ')' : ''}</div>
</div>`;
}
bind_menu() {
this.screen.querySelectorAll('[data-m]').forEach(b => b.onclick = this.click(() => {
const m = b.dataset.m;
if (m === 'PLAY') this.play(this.game.progress.nextPlayable().id);
else this.showScreen(m.toLowerCase());
}));
}
async play(id) { this.hideScreen(); try { await this.game.loadCourse(id); } catch (e) { console.error(e); this.toast(e.message, 'bad'); this.game.quitToMenu('menu'); } }
render_seasons() {
const P = this.game.progress;
return this.header('Seasons') + `<div class="grid seasons">${[1, 2, 3, 4, 5].map(s => {
const m = P.seasonSummary(s);
const envs = [...new Set(COURSES.filter(c => parseCourseId(c.id).season === s).map(c => c.environment))];
return `<button class="card season ${m.unlocked ? '' : 'locked'}" data-s="${s}" ${m.unlocked ? '' : 'disabled'}>
<div class="card-title">Season ${s}</div><div class="muted">${envs.map(e => THEMES[e].label).join(' · ')}</div>
<div class="prog"><div style="width:${(m.done / m.total * 100).toFixed(0)}%"></div></div>
<div class="row"><span>${m.done}/${m.total} complete</span><span>★ ${m.stars}/${m.maxStars}</span></div>
<div class="muted">${m.episodesUnlocked}/3 episodes unlocked ${m.unlocked ? '' : '· 🔒 locked'}</div></button>`;
}).join('')}</div>`;
}
bind_seasons() { this.screen.querySelectorAll('[data-s]').forEach(b => b.onclick = this.click(() => this.showScreen('episodes', +b.dataset.s))); }
courseCard(c) {
const P = this.game.progress, r = P.record(c.id), un = P.isUnlocked(c.id);
return `<button class="card course ${un ? '' : 'locked'} ${r.completed ? 'done' : ''} env-${c.environment}" data-c="${c.id}" ${un ? '' : 'disabled'}>
<div class="card-title">${c.id}</div><div class="muted">${THEMES[c.environment].label}</div>
${starStr(r.stars)}<div class="row small"><span>Best ${fmt(r.best)}</span><span>${un ? (r.completed ? '✓' : 'NEW') : '🔒'}</span></div></button>`;
}
render_episodes(s) {
const P = this.game.progress;
return this.header('Season ' + s) + `<div class="episodes">${[1, 2, 3].map(e => {
const list = COURSES.filter(c => { const p = parseCourseId(c.id); return p.season === s && p.episode === e; });
const un = P.isEpisodeUnlocked(s, e);
return `<div class="episode ${un ? '' : 'locked'}"><h3>Episode ${e} ${un ? '' : '🔒'}<span class="muted"> · ${THEMES[list[0].environment].label}</span></h3><div class="grid courses">${list.map(c => this.courseCard(c)).join('')}</div></div>`;
}).join('')}</div>`;
}
bind_episodes() { this.screen.querySelectorAll('[data-c]').forEach(b => b.onclick = this.click(() => this.showScreen('course', b.dataset.c))); }
render_courses() {
return this.header('All Courses') + [1, 2, 3, 4, 5].map(s => `<h3 class="sec">Season ${s}</h3><div class="grid courses all">${COURSES.filter(c => parseCourseId(c.id).season === s).map(c => this.courseCard(c)).join('')}</div>`).join('');
}
bind_courses() { this.bind_episodes(); }
render_course(id) {
const c = getCourse(id), P = this.game.progress, r = P.record(id), un = P.isUnlocked(id), th = THEMES[c.environment];
return this.header('Course ' + c.id) + `<div class="course-detail">
<div class="info">
<table class="kv">
<tr><th>Course ID</th><td>${c.id}</td></tr><tr><th>Course code</th><td>${c.code}</td></tr>
<tr><th>Environment</th><td>${c.environment} — ${th.label}</td></tr><tr><th>Layout</th><td>${c.layout}</td></tr>
<tr><th>Difficulty</th><td>${courseDifficulty(c)} (hardest chunk)</td></tr><tr><th>Chunk count</th><td>${c.chunks.length}</td></tr>
<tr><th>Star targets</th><td>★★★ ${c.stars[0].toFixed(1)}s · ★★ ${c.stars[1].toFixed(1)}s · ★ ${c.stars[2].toFixed(1)}s (max times)</td></tr>
<tr><th>Best time</th><td>${fmt(r.best)}</td></tr><tr><th>Completion</th><td>${r.completed ? 'Completed (' + r.plays + ' runs)' : 'Not completed'}</td></tr>
<tr><th>Stars</th><td>${starStr(r.stars)}</td></tr>
</table>
<button class="mbtn primary play" id="playCourse" ${un ? '' : 'disabled'}>${un ? '▶ PLAY' : '🔒 LOCKED'}</button>
</div>
<div class="chunks"><h3>Obstacle sequence</h3><ol>${c.chunks.map(([cid, name, fam, dif]) => `<li><b>${cid}</b> ${esc(name)} <span class="muted">${fam || 'source-defined'} · ${dif || '—'}</span></li>`).join('')}</ol></div>
</div>`;
}
bind_course(id) { const b = $('#playCourse', this.screen); if (b) b.onclick = this.click(() => this.play(id)); }
render_character() {
const d = this.game.save.data.character, P = this.game.progress;
return this.header('Character') + `<div class="side-panel">
<h3>Athlete</h3><div class="grid pick">${ATHLETES.map(a => `<button class="card pick ${a.id === d.athlete ? 'sel' : ''}" data-a="${a.id}"><div class="swatch" style="background:#${a.skin.toString(16).padStart(6, '0')}"></div><b>${esc(a.name)}</b><div class="muted">${a.height.toFixed(2)} m · lean athlete</div></button>`).join('')}</div>
<h3>Outfit</h3><div class="grid pick">${OUTFITS.map(o => { const un = P.isCosmeticUnlocked(o); return `<button class="card pick ${o.id === d.outfit ? 'sel' : ''} ${un ? '' : 'locked'}" data-o="${o.id}" ${un ? '' : 'disabled'}><div class="swatch" style="background:linear-gradient(90deg,#${o.shirt.toString(16).padStart(6, '0')} 60%,#${o.shorts.toString(16).padStart(6, '0')} 60%)"></div><b>${esc(o.name)}</b><div class="muted">${un ? 'Unlocked' : '🔒 ' + o.cost + ' ★'}</div></button>`; }).join('')}</div></div>`;
}
bind_character() {
const d = this.game.save.data.character;
this.screen.querySelectorAll('[data-a]').forEach(b => b.onclick = this.click(() => { d.athlete = b.dataset.a; this.commitCharacter('character'); }));
this.screen.querySelectorAll('[data-o]').forEach(b => b.onclick = this.click(() => { d.outfit = b.dataset.o; this.commitCharacter('character'); }));
}
render_costumes() {
const d = this.game.save.data.character, P = this.game.progress;
return this.header('Costumes') + `<div class="side-panel"><p class="muted">Cosmetic accessories unlock with total stars. They never change the athlete's lean build or physics.</p>
<div class="grid pick">${COSTUMES.map(o => { const un = P.isCosmeticUnlocked(o); return `<button class="card pick ${o.id === d.costume ? 'sel' : ''} ${un ? '' : 'locked'}" data-k="${o.id}" ${un ? '' : 'disabled'}><div class="swatch" style="background:#${(o.color || 0x444444).toString(16).padStart(6, '0')}"></div><b>${esc(o.name)}</b><div class="muted">${un ? 'Unlocked' : '🔒 ' + o.cost + ' ★'}</div></button>`; }).join('')}</div></div>`;
}
bind_costumes() { const d = this.game.save.data.character; this.screen.querySelectorAll('[data-k]').forEach(b => b.onclick = this.click(() => { d.costume = b.dataset.k; this.commitCharacter('costumes'); })); }
commitCharacter(screen) { this.game.save.save(); this.game.refreshCharacter(); this.showScreen(screen, null, false); }
render_settings() {
const s = this.game.settings, g = this.game.gfx;
const sl = (k, label, min, max, step) => `<label class="set"><span>${label}</span><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${s[k]}"><output>${(+s[k]).toFixed(2)}</output></label>`;
const tg = (k, label) => `<label class="set"><span>${label}</span><input type="checkbox" data-t="${k}" ${s[k] ? 'checked' : ''}></label>`;
return this.header('Settings') + `<div class="side-panel settings">
<label class="set"><span>Graphics quality</span><select data-q>${['auto', 'low', 'medium', 'high'].map(q => `<option value="${q}" ${s.quality === q ? 'selected' : ''}>${q.toUpperCase()}${q === 'auto' ? ' (' + g.level + ')' : ''}</option>`).join('')}</select></label>
${sl('brightness', 'Brightness', 0.8, 1.2, 0.01)}
${sl('master', 'Master volume', 0, 1, 0.01)}${sl('music', 'Music volume', 0, 1, 0.01)}${sl('sfx', 'SFX volume', 0, 1, 0.01)}
${tg('touchButtons', 'On-screen jump/slide buttons')}${tg('ghost', 'Show best-run ghost')}${tg('shake', 'Camera shake')}
${this.build.debug ? tg('debug', 'Developer overlay (F3)') : ''}
<button class="mbtn danger" id="resetSave">Reset progress</button>
<p class="muted small">Controls — Keyboard: A/D or ←/→ move · Space/W/↑ jump · S/↓ slide · Shift walk · R rewind · T teleport · Esc pause. Touch: drag on the left 40% to run, swipe up = jump, swipe down = slide, tap = jump. Gamepad: stick/D-pad, A jump, B/X slide, LB rewind, RB teleport, Start pause.</p></div>`;
}
bind_settings() {
const s = this.game.settings, save = () => { this.game.save.save(); this.game.applySettings(); };
this.screen.querySelectorAll('input[type=range]').forEach(i => i.oninput = () => { s[i.dataset.k] = +i.value; i.nextElementSibling.textContent = (+i.value).toFixed(2); save(); });
this.screen.querySelectorAll('input[type=checkbox]').forEach(i => i.onchange = () => { s[i.dataset.t] = i.checked; save(); });
$('[data-q]', this.screen).onchange = (e) => { s.quality = e.target.value; save(); };
$('#resetSave', this.screen).onclick = this.click(() => { if (confirm('Reset all progress, stars and best times?')) { this.game.save.reset(); this.game.applySettings(); this.game.refreshCharacter(); this.showScreen('menu'); } });
}
applySettings(s) {
document.body.classList.toggle('touch-buttons', !!s.touchButtons);
$('#debug', this.root).classList.toggle('hidden', !(s.debug && this.build.debug) || !this.game || this.game.state !== 'playing');
}
render_tutorial() {
return this.header('Tutorial') + `<div class="side-panel"><div class="tut">
<div><h3>Run</h3><p>Keyboard: <kbd>D</kbd>/<kbd>→</kbd> forward, <kbd>A</kbd>/<kbd>←</kbd> backward, hold <kbd>Shift</kbd> to walk.<br>Touch: press and drag right on the left side of the screen.</p></div>
<div><h3>Jump</h3><p><kbd>Space</kbd>/<kbd>W</kbd>/<kbd>↑</kbd> or swipe up / tap on the right side. Trampolines launch you automatically.</p></div>
<div><h3>Slide</h3><p><kbd>S</kbd>/<kbd>↓</kbd> or swipe down while running to slide under high sweepers and low ceilings. Slides speed up downhill and slow uphill.</p></div>
<div><h3>Wipeouts</h3><p>Big hits and water falls cost <b>+5 s</b>. You recover automatically at a safe spot or the last checkpoint.</p></div>
<div><h3>Power-ups</h3><p>Energy drinks boost speed. <kbd>R</kbd> rewinds the last 3 s, <kbd>T</kbd> teleports to your checkpoint (2 charges each per run). Collect rings for rewards.</p></div>
<div><h3>Stars</h3><p>Each course has its own ★★★/★★/★ time targets. Finish to unlock the next course.</p></div>
</div><button class="mbtn primary" id="playTut">▶ PLAY TUTORIAL COURSE (S01E01C1)</button></div>`;
}
bind_tutorial() { $('#playTut', this.screen).onclick = this.click(() => this.play('S01E01C1')); }
render_credits() {
return this.header('Credits') + `<div class="side-panel"><h3>Splash Circuit</h3>
<p>All 3D models, the lean athlete, environments, obstacles, animations, textures, VFX, sound effects and music are original and generated procedurally at runtime by this project's own code.</p>
<p>No proprietary third-party game assets are used or redistributed. The 45 embedded course definitions are used as gameplay/layout data only.</p>
<p class="muted">Engine: custom WebGL 2 renderer · Physics: custom 2.5D controller + Verlet ragdoll · Audio: Web Audio synthesis.<br>Build ${esc(this.build.version)} · ${esc(this.build.target)} · ${esc(this.build.mode)}</p></div>`;
}
startHud(S, game) {
this.hideScreen(); this.loading.classList.add('hidden'); this.overlay.classList.add('hidden');
const c = S.course, rec = game.progress.record(c.id), L = S.build.finishX - S.build.spawn.x;
const tick = (x) => ((x - S.build.spawn.x) / L * 100).toFixed(2) + '%';
this.hud.innerHTML = ico(`
<div class="hud-tl"><div class="time" id="hTime">0.00</div><div class="sub">Best <b>${fmt(rec.best)}</b></div><div class="sub" id="hTarget"></div></div>
<div class="hud-tc"><div class="cid">${c.id} · ${THEMES[c.environment].label}</div><div class="track">${S.build.chunks.map(ch => `<span class="seg" style="left:${tick(ch.x0)};width:calc(${tick(ch.x1)} - ${tick(ch.x0)})"></span>`).join('')}
${S.build.checkpoints.map((cp, i) => `<span class="cp" id="hCp${i}" style="left:${tick(cp.x)}"></span>`).join('')}<span class="me" id="hMe"></span></div>
<div class="sub" id="hCpTxt">Checkpoint 0/${S.build.checkpoints.length}</div></div>
<div class="hud-tr"><div class="rings">◎ <b id="hRings">0</b>/${S.rings.total}</div><div id="hStars">${starStr(3)}</div><button class="hbtn" id="hPause" aria-label="Pause">❚❚</button></div>
<div class="hud-br"><button class="pbtn" id="hRewind">⟲<small id="hRw">2</small></button><button class="pbtn" id="hTele">⇤<small id="hTp">2</small></button><div class="energy" id="hEnergy"><div></div></div></div>
<div class="touch-btns"><button class="tbtn" id="tSlide">SLIDE</button><button class="tbtn big" id="tJump">JUMP</button></div>
<div class="hint" id="hHint"></div>`);
$('#hPause', this.hud).onclick = () => game.pause(true);
$('#hRewind', this.hud).onclick = () => game.onAction('rewind');
$('#hTele', this.hud).onclick = () => game.onAction('teleport');
const tb = (id, a) => { const b = $(id, this.hud); b.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); game.input.press(a); }, { passive: false }); b.onmousedown = () => game.input.press(a); };
tb('#tJump', 'jump'); tb('#tSlide', 'slide');
this.hud.classList.remove('hidden'); document.body.classList.add('in-game');
this.hudT = 0; this.lastHint = null; this.lastStarKey = -1;
this.applySettings(game.settings);
}
stopHud() { this.hud.classList.add('hidden'); this.hud.innerHTML = ''; document.body.classList.remove('in-game'); $('#debug', this.root).classList.add('hidden'); this.overlay.classList.add('hidden'); }
updateHud(S) {
const t = S.timer.time;
const el = $('#hTime', this.hud); if (!el) return;
el.textContent = t.toFixed(2);
const nt = StarSystem.nextTarget(t, S.course.stars);
const key = nt ? nt.stars : 0;
if (key !== this.lastStarKey) { this.lastStarKey = key;
$('#hTarget', this.hud).innerHTML = ico(nt ? `${'★'.repeat(nt.stars)} under ${nt.time.toFixed(1)}s` : 'Finish the course!');
$('#hStars', this.hud).innerHTML = ico(starStr(nt ? nt.stars : 0));
}
$('#hMe', this.hud).style.left = (S.progress * 100).toFixed(2) + '%';
$('#hRings', this.hud).textContent = S.rings.count;
$('#hRw', this.hud).textContent = S.powerups.rewinds; $('#hTp', this.hud).textContent = S.powerups.teleports;
$('#hRewind', this.hud).classList.toggle('off', S.powerups.rewinds <= 0);
$('#hTele', this.hud).classList.toggle('off', S.powerups.teleports <= 0);
const e = $('#hEnergy', this.hud); e.classList.toggle('on', S.powerups.energyT > 0); e.firstElementChild.style.width = (S.powerups.energyT / 4 * 100) + '%';
$('#hCpTxt', this.hud).textContent = `Checkpoint ${S.checkpoints.reached}/${S.build.checkpoints.length}`;
for (let i = 0; i < S.build.checkpoints.length; i++) { const c = $('#hCp' + i, this.hud); if (c) c.classList.toggle('on', i <= S.checkpoints.current); }
const ch = S.build.chunks[S.chunkIndex];
const hint = ch && ch.meta.hint ? HINTS[ch.meta.hint] : null;
if (hint !== this.lastHint) { this.lastHint = hint; const h = $('#hHint', this.hud); h.textContent = hint || ''; h.classList.toggle('show', !!hint); }
}
showCountdown(txt) { const c = $('#countdown', this.root); c.textContent = txt; c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); }
toast(msg, kind = 'info') { const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg; const box = $('#toasts', this.root); box.appendChild(t); while (box.children.length > 3) box.firstChild.remove(); setTimeout(() => t.remove(), 2200); }
flash(kind) { const f = $('#flash', this.root); f.className = 'flash ' + kind; void f.offsetWidth; f.classList.add('go'); }
debug(text) { const d = $('#debug', this.root); d.classList.remove('hidden'); d.textContent = text; }
showPause(p) {
this.overlayKind = 'pause';
if (!p) { this.overlay.classList.add('hidden'); return; }
this.overlay.innerHTML = ico(`<div class="modal"><h2>Paused</h2><div class="menu-list">
<button class="mbtn primary" id="pResume">RESUME</button><button class="mbtn" id="pRestart">RESTART</button>
<button class="mbtn" id="pSettings">SETTINGS</button><button class="mbtn" id="pCourses">COURSE SELECT</button><button class="mbtn" id="pMenu">MAIN MENU</button></div></div>`);
this.overlay.classList.remove('hidden');
const g = this.game, id = g.session.course.id;
$('#pResume', this.overlay).onclick = this.click(() => g.pause(false));
$('#pRestart', this.overlay).onclick = this.click(() => this.play(id));
$('#pSettings', this.overlay).onclick = this.click(() => { this.overlayKind = 'settings'; this.overlay.innerHTML = ico(`<div class="modal wide">${this.render_settings()}</div>`); const scr = this.screen; this.screen = this.overlay; this.bind_settings(); this.screen = scr; this.overlay.querySelectorAll('[data-back]').forEach(b => b.onclick = this.click(() => this.showPause(true))); });
$('#pCourses', this.overlay).onclick = this.click(() => { const s = parseCourseId(id).season; g.quitToMenu('menu'); this.showScreen('seasons'); this.showScreen('episodes', s); });
$('#pMenu', this.overlay).onclick = this.click(() => g.quitToMenu('menu'));
$('#pResume', this.overlay).focus({ preventScroll: true });
}
showResults({ result: r, prog, course: c }, g) {
this.overlayKind = 'results';
const idx = courseIndex(c.id), next = COURSES[idx + 1];
const nextOk = next && g.progress.isUnlocked(next.id);
this.overlay.innerHTML = ico(`<div class="modal results"><h2>${r.stars > 0 ? 'COURSE COMPLETE' : 'FINISHED'}</h2><div class="muted">${c.id} · ${THEMES[c.environment].label}</div>
<div class="big-stars">${Array.from({ length: 3 }, (_, i) => `<i class="${i < r.stars ? 'on' : ''}" style="animation-delay:${0.3 + i * 0.35}s">★</i>`).join('')}</div>
<div class="rtime">${fmt(r.time)} ${prog.newRecord ? '<span class="badge">NEW RECORD</span>' : ''}</div>
<table class="kv"><tr><th>Best time</th><td>${fmt(prog.newRecord ? r.time : prog.prevBest)}</td></tr>
<tr><th>Targets</th><td>★★★ ${c.stars[0].toFixed(1)}s · ★★ ${c.stars[1].toFixed(1)}s · ★ ${c.stars[2].toFixed(1)}s</td></tr>
<tr><th>Rings</th><td>${r.rings} / ${r.ringsTotal}</td></tr><tr><th>Wipeouts</th><td>${r.wipeouts} (+${r.penalty.toFixed(0)}s penalty)</td></tr>
<tr><th>Checkpoints</th><td>${r.checkpoints} / ${r.checkpointsTotal}</td></tr><tr><th>Rewards</th><td>+${prog.reward} ◎ ${prog.unlockedNext && next ? '· Unlocked ' + next.id : ''}</td></tr></table>
<div class="menu-list row4"><button class="mbtn" id="rReplay">REPLAY</button><button class="mbtn primary" id="rNext" ${nextOk ? '' : 'disabled'}>NEXT COURSE</button>
<button class="mbtn" id="rCourses">COURSE SELECT</button><button class="mbtn" id="rMenu">MAIN MENU</button></div></div>`);
this.overlay.classList.remove('hidden');
r.stars && setTimeout(() => { for (let i = 0; i < r.stars; i++) setTimeout(() => g.audio.play('star'), i * 350); }, 300);
$('#rReplay', this.overlay).onclick = this.click(() => this.play(c.id));
if (nextOk) $('#rNext', this.overlay).onclick = this.click(() => this.play(next.id));
$('#rCourses', this.overlay).onclick = this.click(() => { g.quitToMenu('menu'); this.showScreen('seasons'); this.showScreen('episodes', parseCourseId(c.id).season); });
$('#rMenu', this.overlay).onclick = this.click(() => g.quitToMenu('menu'));
}
}
const HINTS = {
RUN: 'Run: hold D or the Right arrow (touch: drag right on the left side). Small steps are climbed automatically.',
JUMP: 'Jump the gaps and hurdle: Space / ↑ (touch: swipe up or tap right side).',
SLIDE: 'Slide under the low ceiling: S / ↓ while running (touch: swipe down).',
TIMING: 'Time your run past the sweeper — jump its arm. Conveyors push you along.',
};