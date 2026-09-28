import { QUALITY } from '../config.js';
export class GraphicsManager {
constructor(renderer, platform) { this.renderer = renderer; this.platform = platform; this.level = 'medium'; this.fpsAvg = 60; }
detect() {
const gl = this.renderer.gl;
let gpu = '';
try { const ext = gl.getExtension('WEBGL_debug_renderer_info'); gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch (e) { /* ignore */ }
const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
const mobile = this.platform.mobile;
let level = 'high';
if (mobile) level = mem >= 6 && cores >= 8 ? 'medium' : 'low';
else if (/swiftshader|llvmpipe|software|intel\(r\) hd graphics [2-5]/i.test(gpu) || cores <= 2) level = 'low';
else if (mem <= 4) level = 'medium';
this.gpu = gpu; return level;
}
apply(setting) {
this.level = setting === 'auto' ? this.detect() : setting;
this.preset = QUALITY[this.level];
this.renderer.setQuality(this.preset);
return this.preset;
}
}