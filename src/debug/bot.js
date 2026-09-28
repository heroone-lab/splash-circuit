import { CONFIG } from '../config.js';
import { segSegClosest } from '../core/math.js';
export function botInput(session) {
const P = session.player, W = session.world, hw = CONFIG.physics.halfWidth;
const inp = { move: 1, walk: false, jumpPressed: false, slidePressed: false };
if (!P.canControl()) return inp;
if (!P.grounded) return inp;
const y = P.y;
let edge = null;
for (let d = 0; d <= 1.6; d += 0.05) {
const g = W.groundBelow(P.x + hw + d, y + 0.35, 0);
if (!g || g.y < y - 0.45) { edge = d; break; }
}
let wall = null, ceiling = null;
for (const s of W.solids) {
if (s.z0 > 0 || s.z1 < 0) continue;
const d = s.x0 - (P.x + hw);
if (d < -0.02 || d > 1.0) continue;
if (s.y0 <= y + 0.05 && s.y1 > y + CONFIG.physics.stepHeight && s.y1 < y + 1.7) wall = wall === null ? d : Math.min(wall, d);
if (s.y0 > y + 0.6 && s.y0 < y + CONFIG.physics.height) ceiling = ceiling === null ? d : Math.min(ceiling, d);
}
if (session.hazardsEnabled) {
let low = false, block = false, high = false;
for (const h of W.hazards) {
if (!h.active) continue;
if (h.force === 'ball' && h.vel[0] < -1 && Math.abs(h.a[2]) < 1) { const d = h.a[0] - P.x; if (d > 1.2 && d < 3.6 && h.a[1] + h.r < y + 2.4) { inp.jumpPressed = true; return inp; } if (d > -1 && d <= 1.2) continue; }
const b = h.kind === 'sphere' ? h.a : h.b;
const top = Math.max(h.a[1], b[1]) + h.r;
for (const hy of [y + 0.35, y + 1.35]) {
const r = segSegClosest([P.x + hw, hy, 0], [P.x + hw + 1.3, hy, 0], h.a, b);
if (r.d2 < (h.r + 0.3) ** 2) { const bot = Math.min(h.a[1], b[1]) - h.r; if (top < y + 1.0) low = true; else if (bot > y + 0.95) high = true; else block = true; }
}
}
if (high && !block && P.ctrlVx > 2.5) { inp.slidePressed = true; return inp; }
if (block) { inp.move = 0; return inp; }
if (low) { inp.jumpPressed = true; return inp; }
}
if (ceiling !== null && ceiling < 0.9) { inp.slidePressed = true; return inp; }
if (P.sliding) return inp;
if (edge !== null) { // a plain drop-down (ground directly below the edge) is not a gap
const below = W.groundBelow(P.x + hw + edge + 0.15, y - 0.3, 0);
if (below && below.y > y - 1.8) edge = null;
}
if (edge !== null) {
let landing = false;
for (let d = edge + 0.6; d < edge + 4.2; d += 0.1) {
const g = W.groundBelow(P.x + hw + d, y + 1.6, 0);
if (g && g.y > y - 1.6 && g.y <= y + 1.6) { landing = true; break; }
}
if (!landing) { inp.move = edge < 1.3 ? (edge < 0.4 ? -1 : 0) : 1; return inp; }
if (P.speedMul > 1 && edge < 1.2) inp.walk = true; // don't overshoot while energised
if (edge < 0.18) inp.jumpPressed = true;
}
if (wall !== null && wall < 0.45) inp.jumpPressed = true;
return inp;
}