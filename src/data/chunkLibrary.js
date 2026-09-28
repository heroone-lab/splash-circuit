// Chunk asset catalog. Every ChunkID referenced by the course database maps to
// exactly one deterministic implementation asset (built procedurally by
// src/game/chunks/*, seeded by the ChunkID) so a given ChunkID always has the
// same geometry/timing in every course, on Web and Android.
import { COURSES } from './courses.js';

const PREFIX_FAMILY = [
  ['Tutorial', 'Tutorial'], ['sweep', 'Sweepers'], ['tramp', 'Trampolines'], ['crank', 'Crankshafts'],
  ['convey', 'Conveyors'], ['mix', 'Mix'], ['plats', 'Platforms'], ['bumper', 'Bumpers'],
  ['pendul', 'Pendulums'], ['balls', 'Big Balls'],
];

function familyFromName(name) {
  for (const [p, f] of PREFIX_FAMILY) if (name.startsWith(p)) return f;
  return null;
}

// Source-defined assets (IDs whose family label is not given by the source data).
// Their implementation is keyed by ChunkID; the asset kind is taken from the
// asset name recorded for that ChunkID, and difficulty tuning uses 'Average'.
const SOURCE_DEFINED = {
  '113': { assetKind: 'Bumpers', tuning: 'Average' },
  '114': { assetKind: 'Bumpers', tuning: 'Average' },
  '115': { assetKind: 'Conveyors', tuning: 'Average' },
  '117': { assetKind: 'Conveyors', tuning: 'Average' },
  '118': { assetKind: 'Pendulums', tuning: 'Average' },
};

export const CHUNK_LIBRARY = {};
for (const course of COURSES) {
  for (const [id, name, family, difficulty] of course.chunks) {
    if (CHUNK_LIBRARY[id]) continue;
    const src = SOURCE_DEFINED[id];
    CHUNK_LIBRARY[id] = {
      id, name,
      family,                       // exact source label (may be null)
      difficulty,                   // exact source label (may be null)
      assetKind: src ? src.assetKind : (family || familyFromName(name)),
      tuning: src ? src.tuning : (difficulty || 'Average'),
      sourceDefined: !!src,
    };
  }
}

export function resolveChunk(id) { return CHUNK_LIBRARY[id] || null; }
export const DIFF_LEVEL = { VeryEasy: 0, Easy: 1, Average: 2, Hard: 3 };
