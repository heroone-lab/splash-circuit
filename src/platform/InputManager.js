import { CONFIG } from '../config.js';
export class InputManager {
constructor(el) {
this.el = el; this.keys = new Set(); this.edges = new Set(); this.device = 'keyboard';
this.touch = new TouchInput(el, this); this.enabled = true;
this.listeners = [];
const on = (t, n, f, o) => { t.addEventListener(n, f, o); this.listeners.push([t, n, f, o]); };
on(window, 'keydown', (e) => {
if (e.repeat) { if (GAME_KEYS.has(e.code)) e.preventDefault(); return; }
this.keys.add(e.code); this.device = 'keyboard';
const a = KEYMAP[e.code]; if (a) this.edges.add(a);
if (GAME_KEYS.has(e.code) && this.enabled) e.preventDefault();
this.onAction && a && this.onAction(a);
});
on(window, 'keyup', (e) => this.keys.delete(e.code));
on(window, 'blur', () => this.keys.clear());
this.padPrev = {};
}
press(action) { this.edges.add(action); this.onAction && this.onAction(action); }
consumeEdge(a) { if (this.edges.has(a)) { this.edges.delete(a); return true; } return false; }
/** Current gameplay input (edges are consumed). */
poll(now) {
const k = this.keys;
let move = 0;
if (k.has('KeyD') || k.has('ArrowRight')) move += 1;
if (k.has('KeyA') || k.has('ArrowLeft')) move -= 1;
const walk = k.has('ShiftLeft') || k.has('ShiftRight');
const pad = this.pollGamepad();
if (pad && Math.abs(pad.move) > Math.abs(move)) { move = pad.move; }
const t = this.touch.poll(now);
if (t.active) { move = t.move; this.device = 'touch'; }
const inp = {
move, walk: walk || t.walk || (pad && pad.walk),
jumpPressed: this.consumeEdge('jump'), slidePressed: this.consumeEdge('slide'),
};
return inp;
}
pollGamepad() {
const pads = navigator.getGamepads ? navigator.getGamepads() : [];
for (const p of pads) {
if (!p || !p.connected) continue;
const btn = (i) => p.buttons[i] && p.buttons[i].pressed;
const edge = (i, a) => { const v = btn(i); if (v && !this.padPrev[i]) { this.edges.add(a); this.device = 'gamepad'; this.onAction && this.onAction(a); } this.padPrev[i] = v; };
edge(0, 'jump'); edge(1, 'slide'); edge(2, 'slide'); edge(4, 'rewind'); edge(5, 'teleport'); edge(9, 'pause'); edge(12, 'jump'); edge(13, 'slide');
let ax = p.axes[0] || 0; if (Math.abs(ax) < 0.15) ax = 0;
if (btn(15)) ax = 1; if (btn(14)) ax = -1;
if (ax) this.device = 'gamepad';
return { move: ax, walk: ax > 0 && ax < 0.6 };
}
return null;
}
destroy() { for (const [t, n, f, o] of this.listeners) t.removeEventListener(n, f, o); this.touch.destroy(); }
}
const KEYMAP = { Space: 'jump', KeyW: 'jump', ArrowUp: 'jump', KeyS: 'slide', ArrowDown: 'slide', Escape: 'pause', KeyP: 'pause', KeyR: 'rewind', KeyT: 'teleport', F3: 'debug', Enter: 'confirm', KeyE: 'energy' };
const GAME_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F3']);
/** Touch + swipe controls (shared by Android app and mobile browsers). */
export class TouchInput {
constructor(el, mgr) {
this.el = el; this.mgr = mgr; this.moveTouch = null; this.actionTouches = new Map(); this.active = false; this.enabled = true;
this.handlers = {
start: (e) => this.onStart(e), move: (e) => this.onMove(e), end: (e) => this.onEnd(e),
};
el.addEventListener('touchstart', this.handlers.start, { passive: false });
el.addEventListener('touchmove', this.handlers.move, { passive: false });
el.addEventListener('touchend', this.handlers.end, { passive: false });
el.addEventListener('touchcancel', this.handlers.end, { passive: false });
this.stick = document.getElementById('touchStick');
}
dims() { return { w: window.innerWidth, h: window.innerHeight }; }
onStart(e) {
if (!this.enabled) return;
const T = CONFIG.touch, { w } = this.dims();
for (const t of e.changedTouches) {
if (t.clientX < w * T.controlArea && !this.moveTouch) {
this.moveTouch = { id: t.identifier, ox: t.clientX, oy: t.clientY, x: t.clientX, start: performance.now() / 1000 };
this.showStick(t.clientX, t.clientY, 0);
} else {
this.actionTouches.set(t.identifier, { sx: t.clientX, sy: t.clientY, start: performance.now() / 1000, fired: false });
}
}
this.active = true; this.mgr.device = 'touch';
e.preventDefault();
}
onMove(e) {
const T = CONFIG.touch, { h, w } = this.dims();
const dim = Math.min(w, h);
for (const t of e.changedTouches) {
if (this.moveTouch && t.identifier === this.moveTouch.id) { this.moveTouch.x = t.clientX; this.showStick(this.moveTouch.ox, this.moveTouch.oy, t.clientX - this.moveTouch.ox); continue; }
const a = this.actionTouches.get(t.identifier); if (!a || a.fired) continue;
const dy = t.clientY - a.sy;
if (dy < -T.jumpSwipe * dim) { a.fired = true; this.mgr.press('jump'); }
else if (dy > T.slideSwipe * dim) { a.fired = true; this.mgr.press('slide'); }
}
e.preventDefault();
}
onEnd(e) {
for (const t of e.changedTouches) {
if (this.moveTouch && t.identifier === this.moveTouch.id) { this.moveTouch = null; this.hideStick(); continue; }
const a = this.actionTouches.get(t.identifier);
if (a && !a.fired) { a.fired = true; this.mgr.press('jump'); } // quick tap = jump
this.actionTouches.delete(t.identifier);
}
this.active = !!this.moveTouch || this.actionTouches.size > 0 || this.active;
e.preventDefault();
}
poll(now) {
const T = CONFIG.touch;
for (const a of this.actionTouches.values()) if (!a.fired && now - a.start >= T.tapJumpDelay + 0.15) { a.fired = true; this.mgr.press('jump'); }
if (!this.moveTouch) return { active: this.active, move: 0, walk: false };
const { w } = this.dims();
const axis = Math.max(-1, Math.min(1, (this.moveTouch.x - this.moveTouch.ox) / (w * 0.1)));
let move = 0;
if (axis > T.moveThreshold) move = 1; else if (axis < -T.backThreshold) move = -1;
const walk = move > 0 && (now - this.moveTouch.start < T.walkStartupDelay || axis < 0.5);
return { active: true, move, walk };
}
showStick(x, y, dx) {
if (!this.stick) this.stick = document.getElementById('touchStick');
if (!this.stick) return;
this.stick.style.display = 'block'; this.stick.style.left = x + 'px'; this.stick.style.top = y + 'px';
const knob = this.stick.firstElementChild; if (knob) knob.style.transform = `translate(${Math.max(-40, Math.min(40, dx))}px, 0)`;
}
hideStick() { if (this.stick) this.stick.style.display = 'none'; }
destroy() { const el = this.el; el.removeEventListener('touchstart', this.handlers.start); el.removeEventListener('touchmove', this.handlers.move); el.removeEventListener('touchend', this.handlers.end); el.removeEventListener('touchcancel', this.handlers.end); }
}
/** Web platform adapter. */
export class WebInput extends InputManager {}
/** Android adapter: hardware back button bridge + haptics hook. */
export class AndroidInput extends InputManager {
constructor(el) {
super(el);
window.__onAndroidBack = () => { this.press('back'); return true; };
}
}