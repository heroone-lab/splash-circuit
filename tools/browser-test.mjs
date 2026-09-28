// End-to-end browser verification of the built Web version (Playwright/Chromium).
//   node tools/build.mjs web release && node tools/browser-test.mjs
// Checks: boot without errors, all 45 courses load with the exact chunk
// sequence/environment and are completed by the autopilot (timer, stars,
// checkpoints, wipeout/recovery), brightness/visibility, graphics levels,
// save/load persistence, touch/swipe controls, keyboard controls and
// responsive layouts (16:9, 18:9, 19.5:9, 20:9, tablet).
import fs from 'node:fs';
import { serve } from './serve.mjs';
import { COURSES } from '../src/data/courses.js';

const PW = process.env.PLAYWRIGHT || '/root/.nvm/versions/node/v22.23.2/lib/node_modules/@playwright/mcp/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const DIR = process.argv[2] || 'dist/web', OUT = '.tmp/browser';
fs.mkdirSync(OUT, { recursive: true });
const srv = await serve(DIR, 8124);
const URL = 'http://localhost:8124/index.html?test';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
let failures = 0;
const check = (ok, msg) => { console.log((ok ? '  ✓ ' : '  ✗ ') + msg); if (!ok) failures++; };

async function open(ctxOpts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, ...ctxOpts });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') page.errors.push(m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => window.__gameReady === true, null, { timeout: 90000 });
  return { ctx, page };
}

// ------------------------------------------------------------ 1. boot + menu
console.log('1. Boot / loading / menu');
const { ctx, page } = await open();
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/menu.png` });
check(page.errors.length === 0, 'booted without console errors ' + page.errors.join(' | '));
check(await page.$('#boot') === null || await page.$eval('#boot', e => e.classList.contains('fade')), 'boot screen dismissed after loading');
check(await page.$$eval('.menu-list .mbtn', b => b.map(x => x.dataset.m).join(',')) === 'PLAY,SEASONS,COURSES,CHARACTER,COSTUMES,SETTINGS,TUTORIAL,CREDITS', 'main menu items');
for (const s of ['seasons', 'courses', 'character', 'costumes', 'settings', 'tutorial', 'credits']) {
  await page.click(`[data-m="${s.toUpperCase()}"]`); await page.waitForTimeout(150);
  check(await page.$eval('#screen', e => e.className).then(c => c.includes('screen-' + s)), `menu → ${s} screen`);
  await page.screenshot({ path: `${OUT}/screen-${s}.png` });
  await page.click('[data-back]');
}
await page.click('[data-m="SEASONS"]');
check((await page.$$('.card.season')).length === 5, 'season menu shows 5 seasons');
await page.click('[data-s="1"]');
check((await page.$$('.episode')).length === 3 && (await page.$$('.episode .card.course')).length === 9, 'season 1: 3 episodes × 3 courses');
await page.click('[data-c="S01E01C1"]');
const detail = await page.$eval('.course-detail', e => e.innerText);
check(['S01E01C1', 'Tiki', '25107108109110', '15.0s', '16.5s', '20.3s', 'Tutorial01', 'Tutorial04'].every(k => detail.includes(k)), 'course select shows ID/env/code/targets/chunks');
await page.screenshot({ path: `${OUT}/course-detail.png` });
check(await page.$eval('#playCourse', b => !b.disabled), 'first course unlocked');
await page.evaluate(() => { location.hash = ''; });

// ------------------------------------------------------------ 2. all 45 courses
console.log('2. All 45 courses (exact data + autopilot completion)');
await page.evaluate(() => window.__game.unlockAll());
const shotEnv = new Set();
const lum = [];
for (const c of COURSES) {
  await page.evaluate((id) => window.__game.load(id), c.id);
  const st = await page.evaluate(() => window.__game.state());
  const okSeq = st.chunks.join(',') === c.chunks.map(x => x[0]).join(',') && st.env === c.environment;
  await page.evaluate(() => { window.__game.bot(true); window.__game.fastForward(4.2); });
  await page.waitForTimeout(60);
  const L = await page.evaluate(() => window.__game.luminance());
  const vis = await page.evaluate(() => window.__game.playerOnScreen());
  lum.push({ id: c.id, env: c.environment, ...L, visible: vis.visible || (await page.evaluate(() => window.__game.state())).anim === undefined || (await page.evaluate(() => window.__game.state())).wipeouts > 0 });
  if (!shotEnv.has(c.environment)) { shotEnv.add(c.environment); await page.screenshot({ path: `${OUT}/play-${c.environment}.png` }); }
  await page.evaluate(() => window.__game.fastForward(240));
  const fin = await page.evaluate(() => window.__game.state());
  const r = fin.result;
  const ok = okSeq && fin.phase === 'finished' && r && r.checkpoints === c.chunks.length - 1 && r.stars === (r.time <= c.stars[0] ? 3 : r.time <= c.stars[1] ? 2 : r.time <= c.stars[2] ? 1 : 0);
  check(ok, `${c.id} ${c.environment.padEnd(8)} chunks=${st.chunks.join('-')} finished=${fin.phase === 'finished'} time=${r ? r.time.toFixed(2) : '-'}s stars=${r ? r.stars : '-'} cp=${r ? r.checkpoints : '-'} wipeouts=${r ? r.wipeouts : '-'}`);
  if (c.id === 'S01E01C3') { await page.waitForTimeout(2600); await page.screenshot({ path: `${OUT}/results.png` }); check(await page.$('.modal.results') !== null, 'results screen shown'); }
}
check(page.errors.length === 0, 'no runtime errors during 45-course run ' + page.errors.slice(0, 3).join(' | '));

// ------------------------------------------------------------ 3. brightness / visibility
console.log('3. Brightness & visibility');
for (const l of lum) if (l.mean < 0.22 || l.mean > 0.72 || l.white > 0.05 || l.black > 0.08 || !l.visible) check(false, `${l.id} luminance mean=${l.mean.toFixed(3)} white=${l.white.toFixed(3)} black=${l.black.toFixed(3)} visible=${l.visible}`);
const byEnv = {}; for (const l of lum) (byEnv[l.env] ||= []).push(l.mean);
for (const [e, v] of Object.entries(byEnv)) console.log(`    ${e.padEnd(8)} mean luminance ${(v.reduce((a, b) => a + b) / v.length).toFixed(3)}`);
check(lum.every(l => l.mean >= 0.22 && l.mean <= 0.72 && l.white <= 0.05 && l.black <= 0.08), 'all courses balanced exposure (no washed-out or crushed frames), player on screen');

// ------------------------------------------------------------ 4. graphics quality levels
console.log('4. Graphics quality');
await page.evaluate(() => window.__game.load('S03E02C2'));
for (const q of ['low', 'medium', 'high']) {
  await page.evaluate((q) => window.__game.quality(q), q);
  await page.waitForTimeout(300);
  const s = await page.evaluate(() => window.__game.stats());
  const st = await page.evaluate(() => window.__game.state());
  await page.screenshot({ path: `${OUT}/quality-${q}.png` });
  check(s.level === q && st.chunks.join(',') === '105,134,167,001,063', `${q}: draws=${s.draws} tris=${s.tris} fps(sw-render)=${s.fps.toFixed(0)} layout identical`);
}

// ------------------------------------------------------------ 5. keyboard controls
console.log('5. Keyboard controls');
await page.evaluate(() => { window.__game.bot(false); return window.__game.load('S01E01C1'); });
await page.evaluate(() => window.__game.fastForward(3.2));
const k0 = await page.evaluate(() => window.__game.state());
await page.keyboard.down('KeyD'); await page.waitForTimeout(1500);
const k1 = await page.evaluate(() => window.__game.state());
await page.keyboard.press('Space'); await page.waitForTimeout(250);
const k2 = await page.evaluate(() => window.__game.state());
await page.keyboard.up('KeyD');
check(k1.x > k0.x + 0.5, `D/→ moves forward (${k0.x.toFixed(2)} → ${k1.x.toFixed(2)})`);
check(!k2.grounded || k2.vy !== 0 || k2.anim === 'jump' || k2.anim === 'fall', 'Space jumps');
await page.keyboard.press('Escape'); await page.waitForTimeout(150);
check(await page.$('#pResume') !== null, 'Esc opens pause menu');
await page.screenshot({ path: `${OUT}/pause.png` });

// ------------------------------------------------------------ 6. save / load persistence
console.log('6. Save / load');
const saved = await page.evaluate(() => window.__game.save());
await page.reload(); await page.waitForFunction(() => window.__gameReady === true, null, { timeout: 90000 });
const loaded = await page.evaluate(() => window.__game.save());
check(Object.keys(loaded.courses).length === 45 && loaded.unlocked === saved.unlocked && JSON.stringify(loaded.courses) === JSON.stringify(saved.courses), `progress persisted across reload (${Object.keys(loaded.courses).length} course records, stars=${Object.values(loaded.courses).reduce((a, r) => a + r.stars, 0)})`);
check(await page.evaluate(() => !!localStorage.getItem('splashcircuit.ghost.S01E01C1')), 'best-run ghost stored');
await ctx.close();

// ------------------------------------------------------------ 7. touch / swipe (mobile web == Android input path)
console.log('7. Touch & swipe controls (19.5:9 phone)');
{
  const { ctx: tctx, page: tp } = await open({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await tp.evaluate(() => window.__game.load('S01E01C1'));
  await tp.evaluate(() => window.__game.fastForward(3.2));
  const cdp = await tctx.newCDPSession(tp);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const s0 = await tp.evaluate(() => window.__game.state());
  await touch('touchStart', [{ x: 100, y: 300, id: 1 }]);
  await touch('touchMove', [{ x: 190, y: 300, id: 1 }]);
  await tp.waitForTimeout(1500);
  const s1 = await tp.evaluate(() => window.__game.state());
  check(s1.x > s0.x + 0.5, `drag right in left 40% runs forward (${s0.x.toFixed(2)} → ${s1.x.toFixed(2)})`);
  await touch('touchStart', [{ x: 100, y: 300, id: 1 }, { x: 650, y: 250, id: 2 }]);
  await touch('touchMove', [{ x: 190, y: 300, id: 1 }, { x: 650, y: 180, id: 2 }]);
  await tp.waitForTimeout(120);
  const s2 = await tp.evaluate(() => window.__game.state());
  check(!s2.grounded || s2.anim === 'jump', 'swipe up on right side = jump');
  await touch('touchEnd', [{ x: 190, y: 300, id: 1 }]);
  await tp.screenshot({ path: `${OUT}/touch-hud.png` });
  check(await tp.$eval('.touch-btns', e => getComputedStyle(e).display !== 'none'), 'virtual jump/slide buttons visible on touch devices');
  check(tp.errors.length === 0, 'no errors on mobile ' + tp.errors.join(' | '));
  await tctx.close();
}

// ------------------------------------------------------------ 8. responsive layouts
console.log('8. Responsive UI');
for (const [name, w, h] of [['16x9', 1280, 720], ['18x9', 1440, 720], ['19.5x9', 1560, 720], ['20x9', 1600, 720], ['tablet-4x3', 1024, 768], ['phone-19.5x9', 780, 360]]) {
  const { ctx: rc, page: rp } = await open({ viewport: { width: w, height: h } });
  const clipped = async () => rp.$$eval('button', (bs) => bs.filter(b => { const r = b.getBoundingClientRect(); const s = getComputedStyle(b); if (s.display === 'none' || s.visibility === 'hidden' || r.width === 0 || b.closest('.screen')) return false; return r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1; }).length);
  const menuClip = await rp.$$eval('.menu-list .mbtn', (bs) => bs.filter(b => { const r = b.getBoundingClientRect(); return r.right > innerWidth || r.bottom > innerHeight + 1 || r.left < 0; }).length);
  await rp.evaluate(() => window.__game.load('S01E01C1'));
  await rp.evaluate(() => window.__game.fastForward(3.5));
  await rp.waitForTimeout(200);
  const hudClip = await clipped();
  await rp.screenshot({ path: `${OUT}/hud-${name}.png` });
  check(menuClip === 0 && hudClip === 0, `${name} (${w}×${h}): menu and HUD buttons fully on-screen`);
  await rc.close();
}

// ------------------------------------------------------------ 9. Android packaging (same assets inside the APK)
console.log('9. Android asset bundle in an emulated Android WebView environment');
if (fs.existsSync('android/app/src/main/assets/www/index.html')) {
  const asrv = await serve('android/app/src/main/assets/www', 8125);
  const actx = await browser.newContext({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2.6,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36 SplashCircuitApp/1.0.0' });
  // Stand-in for the Java @JavascriptInterface StorageBridge (SharedPreferences)
  await actx.addInitScript(() => {
    const P = 'prefs:'; window.__bridgeCalls = 0;
    window.AndroidStorage = { getItem: (k) => { window.__bridgeCalls++; return localStorage.getItem(P + k); }, setItem: (k, v) => { window.__bridgeCalls++; localStorage.setItem(P + k, v); }, removeItem: (k) => localStorage.removeItem(P + k) };
  });
  const ap = await actx.newPage(); const aerr = [];
  ap.on('pageerror', e => aerr.push(e.message));
  await ap.goto('http://localhost:8125/index.html?test');
  await ap.waitForFunction(() => window.__gameReady === true, null, { timeout: 90000 });
  check(await ap.evaluate(() => document.body.classList.contains('is-android')), 'Android platform adapter selected');
  check(await ap.evaluate(() => window.__onAndroidBack() === false), 'hardware back at root menu lets the app exit');
  await ap.evaluate(() => window.__game.unlockAll());
  await ap.evaluate(() => window.__game.load('S05E03C3'));
  const st = await ap.evaluate(() => window.__game.state());
  check(st.chunks.join(',') === '083,163,153,103,137,094' && st.env === 'Medieval', 'same course data in Android bundle (S05E03C3)');
  await ap.evaluate(() => { window.__game.bot(true); window.__game.fastForward(240); });
  const fin = await ap.evaluate(() => window.__game.state());
  check(fin.phase === 'finished', `course completed in Android bundle (time ${fin.result && fin.result.time}s)`);
  check(await ap.evaluate(() => window.__bridgeCalls > 0 && !!localStorage.getItem('prefs:splashcircuit.save.v1')), 'progress saved through the AndroidStorage bridge');
  await ap.evaluate(() => window.__game.load('S01E01C1'));
  await ap.evaluate(() => window.__game.fastForward(3.3));
  await ap.evaluate(() => window.__onAndroidBack());
  await ap.waitForTimeout(150);
  check(await ap.$('#pResume') !== null, 'hardware back in-game opens pause');
  await ap.screenshot({ path: `${OUT}/android-pause.png` });
  check(aerr.length === 0, 'no errors in Android bundle ' + aerr.join(' | '));
  await actx.close(); asrv.close();
} else check(false, 'android assets not built (run node tools/build.mjs android debug)');

await browser.close(); srv.close();
console.log(failures ? `\nFAILED: ${failures} check(s)` : '\n✓ ALL BROWSER CHECKS PASSED');
process.exit(failures ? 1 : 0);
