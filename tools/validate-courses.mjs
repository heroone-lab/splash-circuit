// Validates the embedded 45-course database for structural and data integrity.
import { COURSES, ENVIRONMENTS, parseCourseId, computeCourseCode } from '../src/data/courses.js';
import { CHUNK_LIBRARY, resolveChunk } from '../src/data/chunkLibrary.js';

let errors = 0;
const fail = (m) => { errors++; console.error('  ✗ ' + m); };

if (COURSES.length !== 45) fail(`expected 45 courses, got ${COURSES.length}`);
const ids = new Set();
const names = new Map();
for (let s = 1; s <= 5; s++) for (let e = 1; e <= 3; e++) for (let c = 1; c <= 3; c++) {
  const id = `S0${s}E0${e}C${c}`;
  if (!COURSES.find(x => x.id === id)) fail(`missing course ${id}`);
}
for (const course of COURSES) {
  if (ids.has(course.id)) fail(`duplicate ${course.id}`);
  ids.add(course.id);
  if (!parseCourseId(course.id)) fail(`bad id ${course.id}`);
  if (!ENVIRONMENTS.includes(course.environment)) fail(`${course.id}: bad environment`);
  const code = computeCourseCode(course);
  if (code !== course.code) fail(`${course.id}: code ${course.code} != layout+chunks ${code}`);
  const [s3, s2, s1] = course.stars;
  if (!(s3 < s2 && s2 < s1)) fail(`${course.id}: star thresholds not ascending`);
  for (const [cid, name] of course.chunks) {
    if (!/^\d{3}$/.test(cid)) fail(`${course.id}: bad chunk id ${cid}`);
    if (names.has(cid) && names.get(cid) !== name) fail(`chunk ${cid} name mismatch ${names.get(cid)} vs ${name}`);
    names.set(cid, name);
    const def = resolveChunk(cid);
    if (!def) fail(`${course.id}: chunk ${cid} has no implementation asset`);
  }
}
console.log(`Courses: ${COURSES.length}, unique chunk IDs: ${names.size}, chunk assets: ${Object.keys(CHUNK_LIBRARY).length}`);
if (errors) { console.error(`FAILED with ${errors} error(s)`); process.exit(1); }
console.log('✓ course database valid (ids, codes, environments, chunk order, names, star thresholds)');
