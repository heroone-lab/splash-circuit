import { detectPlatform, createAdapters } from './platform/platform.js';
import { Game } from './Game.js';
import { UIManager } from './ui/UIManager.js';
const BUILD = Object.assign({ mode: 'development', target: 'web', debug: true, version: '1.0.0' }, window.__BUILD__ || {});
async function main() {
const canvas = document.getElementById('game');
const platform = detectPlatform();
document.body.classList.toggle('is-touch', platform.touch);
document.body.classList.toggle('is-android', platform.android);
const { storage, input } = createAdapters(platform, document.getElementById('touchLayer'));
const ui = new UIManager(document.getElementById('ui'), BUILD, platform);
const game = new Game({ canvas, platform, storage, input, ui, build: BUILD });
ui.attach(game);
if (platform.android) window.__onAndroidBack = () => {
const atRoot = game.state === 'menu' && ui.current && ui.current.name === 'menu';
if (atRoot) return false;
input.press('back'); return true;
};
try {
await game.boot();
ui.bootDone();
} catch (e) {
console.error(e);
ui.fatal(e && e.message ? e.message : String(e));
return;
}
if (BUILD.debug || new URLSearchParams(location.search).has('test')) window.__game = game.testApi();
window.__gameReady = true;
}
main();