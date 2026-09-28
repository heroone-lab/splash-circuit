import { WebStorage, AndroidStorage } from './storage.js';
import { WebInput, AndroidInput } from './InputManager.js';
export function detectPlatform() {
const ua = navigator.userAgent || '';
const android = !!window.AndroidStorage || /SplashCircuitApp/.test(ua);
const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const mobile = android || /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (touch && Math.min(screen.width, screen.height) < 820);
return { android, touch, mobile, name: android ? 'Android app' : mobile ? 'Mobile web' : 'Desktop web' };
}
export function createAdapters(platform, el) {
if (platform.android) return { storage: new AndroidStorage(), input: new AndroidInput(el) };
return { storage: new WebStorage(), input: new WebInput(el) };
}