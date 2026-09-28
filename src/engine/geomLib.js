import * as G from './geometry.js';
export class GeomLib {
constructor(lodBias = 1) { this.cache = new Map(); this.lodBias = lodBias; this.gpu = new Map(); this.renderer = null; }
setLod(b) { if (b !== this.lodBias) { this.lodBias = b; this.cache.clear(); this.gpu.clear(); } }
seg(n) { return Math.max(6, Math.round(n * this.lodBias)); }
get(key) {
let g = this.cache.get(key);
if (g) return g;
switch (key) {
case 'box': g = G.box(); break;
case 'rbox': g = G.roundedBox(0.12, this.lodBias > 1 ? 3 : 2); break;
case 'rbox2': g = G.roundedBox(0.3, this.lodBias > 1 ? 3 : 2); break;
case 'sphere': g = G.sphere(this.seg(16)); break;
case 'sphereLo': g = G.sphere(8, 6); break;
case 'cyl': g = G.cylinder(this.seg(16)); break;
case 'cylLo': g = G.cylinder(8); break;
case 'cone': g = G.cylinder(this.seg(14), 0.0, 0.5); break;
case 'coneLo': g = G.cylinder(7, 0.0, 0.5); break;
case 'frustum': g = G.cylinder(this.seg(14), 0.35, 0.5); break;
case 'torus': g = G.torus(0.4, 0.07, this.seg(20), 8); break;
case 'disc': g = G.cylinder(this.seg(24), 0.5, 0.5); break;
default: throw new Error('unknown geometry ' + key);
}
this.cache.set(key, g); return g;
}
mesh(key, renderer) {
let m = this.gpu.get(key);
if (!m) { m = renderer.createMesh(this.get(key)); this.gpu.set(key, m); }
return m;
}
}