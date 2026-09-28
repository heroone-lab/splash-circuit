import { COURSES, parseCourseId } from '../data/courses.js';
import { OUTFITS, COSTUMES, ATHLETES } from '../data/characters.js';
const KEY = 'splashcircuit.save.v1';
const GHOST = 'splashcircuit.ghost.';
export const DEFAULT_SETTINGS = {
quality: 'auto', brightness: 1.0, master: 0.8, music: 0.55, sfx: 0.85,
touchButtons: true, ghost: true, shake: true, debug: false, leftHanded: false,
};
export class SaveManager {
constructor(storage) { this.storage = storage; this.data = this.load(); }
blank() {
return { version: 1, courses: {}, unlocked: 1, character: { athlete: ATHLETES[0].id, outfit: OUTFITS[0].id, costume: COSTUMES[1].id }, settings: { ...DEFAULT_SETTINGS }, coins: 0, stats: { runs: 0, wipeouts: 0, rings: 0 } };
}
load() {
try {
const raw = this.storage.get(KEY);
if (raw) { const d = JSON.parse(raw); const b = this.blank(); return { ...b, ...d, settings: { ...b.settings, ...(d.settings || {}) }, character: { ...b.character, ...(d.character || {}) }, stats: { ...b.stats, ...(d.stats || {}) } }; }
} catch (e) { console.warn('corrupt save – resetting', e); }
return this.blank();
}
save() { this.storage.set(KEY, JSON.stringify(this.data)); }
reset() { for (const c of COURSES) this.storage.remove(GHOST + c.id); this.data = this.blank(); this.save(); }
getGhost(id) { try { const r = this.storage.get(GHOST + id); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
setGhost(id, g) { this.storage.set(GHOST + id, JSON.stringify(g)); }
}
export class ProgressionManager {
constructor(save) { this.save = save; }
get d() { return this.save.data; }
record(id) { return this.d.courses[id] || { completed: false, stars: 0, best: null, plays: 0 }; }
isUnlocked(id) { return COURSES.findIndex(c => c.id === id) < this.d.unlocked; }
isEpisodeUnlocked(s, e) { return COURSES.some(c => { const p = parseCourseId(c.id); return p.season === s && p.episode === e && this.isUnlocked(c.id); }); }
isSeasonUnlocked(s) { return [1, 2, 3].some(e => this.isEpisodeUnlocked(s, e)); }
totalStars() { return Object.values(this.d.courses).reduce((a, r) => a + (r.stars || 0), 0); }
seasonSummary(s) {
const list = COURSES.filter(c => parseCourseId(c.id).season === s);
const done = list.filter(c => this.record(c.id).completed).length;
const stars = list.reduce((a, c) => a + this.record(c.id).stars, 0);
const eps = [1, 2, 3].filter(e => this.isEpisodeUnlocked(s, e)).length;
return { total: list.length, done, stars, maxStars: list.length * 3, episodesUnlocked: eps, unlocked: this.isSeasonUnlocked(s) };
}
nextPlayable() {
const i = Math.min(this.d.unlocked - 1, COURSES.length - 1);
for (let k = 0; k <= i; k++) if (!this.record(COURSES[k].id).completed) return COURSES[k];
return COURSES[i];
}
/** Apply a finished run. Returns {newRecord, firstClear, unlockedNext, reward}. */
complete(result) {
const id = result.courseId, prev = this.record(id);
const newRecord = prev.best === null || result.time < prev.best;
const rec = { completed: true, stars: Math.max(prev.stars, result.stars), best: newRecord ? result.time : prev.best, plays: (prev.plays || 0) + 1 };
this.d.courses[id] = rec;
const idx = COURSES.findIndex(c => c.id === id);
let unlockedNext = false;
if (idx + 2 > this.d.unlocked && idx + 1 < COURSES.length) { this.d.unlocked = idx + 2; unlockedNext = true; }
const reward = result.rings + Math.max(0, result.stars - prev.stars) * 10 + (prev.completed ? 0 : 5);
this.d.coins += reward;
this.d.stats.runs++; this.d.stats.wipeouts += result.wipeouts; this.d.stats.rings += result.rings;
if (newRecord && result.ghost) this.save.setGhost(id, result.ghost);
this.save.save();
return { newRecord, firstClear: !prev.completed, unlockedNext, reward, prevBest: prev.best };
}
isCosmeticUnlocked(item) { return this.totalStars() >= (item.cost || 0); }
}