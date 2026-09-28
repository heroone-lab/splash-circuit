// Build script (zero dependencies).
//   node tools/build.mjs web [debug|release]      -> dist/web
//   node tools/build.mjs android [debug|release]  -> android/app/src/main/assets/www
// Both targets receive the identical shared game code + course database;
// only build-config.js (flags) differs.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2] || 'web';
const mode = process.argv[3] || 'release';
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const out = target === 'android' ? path.join(ROOT, 'android/app/src/main/assets/www') : path.join(ROOT, 'dist', target === 'web' ? 'web' : target);

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

// strip line comments/indentation conservatively (keeps code semantics, smaller payload)
function minifyJs(src) {
  return src.split('\n').map(l => l.replace(/^\s+/, '')).filter(l => l && !/^\/\/(?!#)/.test(l)).join('\n');
}
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else if (mode === 'release' && e.name.endsWith('.js')) fs.writeFileSync(d, minifyJs(fs.readFileSync(s, 'utf8')));
    else fs.copyFileSync(s, d);
  }
}
copyDir(path.join(ROOT, 'src'), path.join(out, 'src'));
for (const f of ['index.html', 'icon.svg', 'manifest.webmanifest']) fs.copyFileSync(path.join(ROOT, f), path.join(out, f));
const flags = { mode, target, debug: mode !== 'release', version: pkg.version, builtAt: new Date().toISOString() };
fs.writeFileSync(path.join(out, 'build-config.js'), `window.__BUILD__ = ${JSON.stringify(flags)};\n`);

// pre-compressed assets for web servers that support static gzip
let raw = 0, gz = 0, files = 0;
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    const buf = fs.readFileSync(p); raw += buf.length; files++;
    if (target === 'web' && /\.(js|css|html|svg|webmanifest)$/.test(e.name)) { const z = zlib.gzipSync(buf, { level: 9 }); fs.writeFileSync(p + '.gz', z); gz += z.length; }
  }
})(out);
console.log(`✓ ${target} (${mode}) build -> ${path.relative(ROOT, out)}  ${files} files, ${(raw / 1024).toFixed(0)} KB${gz ? `, gzip ${(gz / 1024).toFixed(0)} KB` : ''}`);
