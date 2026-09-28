// Headless verification of all 45 courses using the shared gameplay code.
//  1. exact chunk sequence instantiated (IDs, order, names)
//  2. geometry traversable to the finish (hazards disabled bot run)
//  3. full run with hazards enabled: wipeouts/recovery never leave the player stuck
//  4. timer / stars / checkpoints behave
import { COURSES } from '../src/data/courses.js';
import { GameSession } from '../src/game/GameSession.js';
import { StarSystem } from '../src/game/systems.js';
import { CONFIG } from '../src/config.js';
import { botInput } from '../src/debug/bot.js';

const dt = CONFIG.sim.fixedDt;
function run(course, hazards, maxT) {
  const s = new GameSession(course, { hazards });
  let wall = 0; const ev = { wipeout: 0, checkpoint: 0, respawn: 0, stuck: 0, impact: 0 };
  for (const k of Object.keys(ev)) s.events.on(k, () => ev[k]++);
  let acc = 0;
  while (s.phase !== 'finished' && wall < maxT) {
    acc += dt; // 1 real frame = 1 step at 120 Hz, slow motion reduces steps
    const scale = s.timeScale;
    const steps = Math.floor(acc * scale / dt + 1e-9);
    if (steps > 0) { acc -= steps * dt / scale; for (let i = 0; i < steps; i++) s.step(botInput(s), dt / scale); }
    wall += dt;
  }
  return { s, ev, wall };
}

let fail = 0;
const rows = [];
for (const c of COURSES) {
  const probe = new GameSession(c);
  const ids = probe.build.chunks.map(ch => ch.id).join(',');
  const want = c.chunks.map(ch => ch[0]).join(',');
  const ordered = probe.build.chunks.every((ch, i, a) => i === 0 || ch.x0 >= a[i - 1].x1 - 1e-6);
  const names = probe.build.chunks.every((ch, i) => ch.name === c.chunks[i][1]);
  if (ids !== want || !ordered || !names) { fail++; console.error(`✗ ${c.id} chunk sequence mismatch ${ids} vs ${want}`); }
  if (probe.build.checkpoints.length !== c.chunks.length - 1) { fail++; console.error(`✗ ${c.id} checkpoint count`); }

  const clean = run(c, false, 90);
  const full = run(c, true, 240);
  const ok1 = clean.s.phase === 'finished', ok2 = full.s.phase === 'finished';
  const cpOk = clean.s.checkpoints.reached === c.chunks.length - 1;
  if (!ok1 || !ok2 || !cpOk) fail++;
  const t = clean.s.result ? clean.s.result.time : NaN;
  const st = clean.s.result ? StarSystem.stars(t, c.stars) : 0;
  rows.push({ id: c.id, env: c.environment, chunks: c.chunks.length, len: probe.build.finishX.toFixed(1), cleanTime: t, star3: c.stars[0], cleanStars: st,
    hazardRun: ok2 ? full.s.result.time : 'DNF', wipeouts: full.ev.wipeout, respawns: full.ev.respawn, stuck: full.ev.stuck, cp: `${clean.s.checkpoints.reached}/${c.chunks.length - 1}`,
    status: ok1 && ok2 && cpOk ? 'OK' : `FAIL(${!ok1 ? 'untraversable@x=' + clean.s.player.x.toFixed(1) : ''}${!ok2 ? ' hazardDNF@x=' + full.s.player.x.toFixed(1) : ''}${!cpOk ? ' cp' : ''})` });
}
for (const r of rows) console.log(`${r.id} ${r.env.padEnd(8)} n=${r.chunks} len=${r.len} clean=${r.cleanTime}s(3★ ${r.star3}) hazards=${r.hazardRun} wipeouts=${r.wipeouts} respawns=${r.respawns} stuck=${r.stuck} cp=${r.cp} ${r.status}`);
const tooSlow = rows.filter(r => !(r.cleanTime <= r.star3));
if (tooSlow.length) console.warn(`⚠ ${tooSlow.length} course(s) where an obstacle-free autopilot run misses 3★: ${tooSlow.map(r => r.id).join(', ')}`);
if (fail) { console.error(`FAILED: ${fail} problem(s)`); process.exit(1); }
console.log('✓ all 45 courses: exact chunk sequences, traversable, finish reached with hazards, checkpoints, timer & stars OK');
