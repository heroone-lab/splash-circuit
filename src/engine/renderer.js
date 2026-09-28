import { LIT_VS, LIT_FS, DEPTH_VS, DEPTH_FS, SKY_VS, SKY_FS, WATER_VS, WATER_FS, PARTICLE_VS, PARTICLE_FS } from './shaders.js';
import { mat4, multiply, lookAt, ortho, normalMatrix3, perspective } from '../core/math.js';
function compile(gl, vs, fs) {
const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src.split('\n').map((l, i) => i + 1 + ': ' + l).join('\n')); return s; };
const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
return { p, u };
}
const hex = (c) => [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
export { hex };
export class Renderer {
constructor(canvas) {
this.canvas = canvas;
const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
if (!gl) throw new Error('WebGL2 is not supported by this browser/device.');
this.gl = gl;
this.lit = compile(gl, LIT_VS, LIT_FS);
this.depth = compile(gl, DEPTH_VS, DEPTH_FS);
this.sky = compile(gl, SKY_VS, SKY_FS);
this.water = compile(gl, WATER_VS, WATER_FS);
this.part = compile(gl, PARTICLE_VS, PARTICLE_FS);
this.skyVao = gl.createVertexArray();
this.shadowFbo = null; this.shadowTex = null; this.shadowSize = 0;
this.dummyShadow = this._makeShadowTex(1);
this.shadowVP = mat4(); this.lightView = mat4(); this.lightProj = mat4();
this.partVao = gl.createVertexArray(); this.partBuf = gl.createBuffer();
gl.bindVertexArray(this.partVao); gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 12);
gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 32, 28);
gl.bindVertexArray(null);
this.quality = null; this.pixelRatio = 1;
this.stats = { draws: 0, tris: 0 };
this.lost = false;
canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; });
}
_makeShadowTex(size) {
const gl = this.gl; const t = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, t);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, size, size, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
return t;
}
setQuality(q) {
this.quality = q;
const gl = this.gl;
if (q.shadowSize !== this.shadowSize) {
if (this.shadowTex) gl.deleteTexture(this.shadowTex);
if (this.shadowFbo) gl.deleteFramebuffer(this.shadowFbo);
this.shadowTex = null; this.shadowFbo = null; this.shadowSize = q.shadowSize;
if (q.shadowSize > 0) {
this.shadowTex = this._makeShadowTex(q.shadowSize);
this.shadowFbo = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowTex, 0);
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
}
this.resize(true);
}
resize(force) {
const dpr = Math.min(window.devicePixelRatio || 1, this.quality ? this.quality.pixelRatio : 1);
const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr)), h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
if (force || this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
this.pixelRatio = dpr;
return this.canvas.width / this.canvas.height;
}
/** Upload geometry: {pos,nrm,idx,col?} -> mesh */
createMesh(g) {
const gl = this.gl; const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
const buf = (data, loc, size) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); return b; };
const bufs = [buf(g.pos, 0, 3), buf(g.nrm, 1, 3)];
if (g.col) bufs.push(buf(g.col, 2, 4));
const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.idx, gl.STATIC_DRAW);
gl.bindVertexArray(null);
return { vao, count: g.idx.length, type: g.idx instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, hasColor: !!g.col, bufs: [...bufs, ib] };
}
deleteMesh(m) { const gl = this.gl; if (!m) return; gl.deleteVertexArray(m.vao); for (const b of m.bufs) gl.deleteBuffer(b); }
_envUniforms(prog, env, cam) {
const gl = this.gl, u = prog.u;
gl.uniform3fv(u.uSunDir, env.sunDir); gl.uniform3fv(u.uSunColor, env.sunColor); gl.uniform1f(u.uSunI, env.sunI);
if (u.uSky) gl.uniform3fv(u.uSky, env.hemiSky); if (u.uGround) gl.uniform3fv(u.uGround, env.hemiGround); if (u.uHemiI) gl.uniform1f(u.uHemiI, env.hemiI);
if (u.uFillDir) { gl.uniform3fv(u.uFillDir, env.fillDir); gl.uniform3fv(u.uFillColor, env.fillColor); }
if (u.uPLPos) { gl.uniform3fv(u.uPLPos, env.plPos); gl.uniform3fv(u.uPLColor, env.plColor); gl.uniform1f(u.uPLRange, env.plRange); }
if (u.uFogColor) { gl.uniform3fv(u.uFogColor, env.fogColor); gl.uniform1f(u.uFogDensity, env.fogDensity); gl.uniform1f(u.uFogStart, env.fogStart); }
gl.uniform3fv(u.uCamPos, cam.pos); gl.uniform1f(u.uExposure, env.exposure); gl.uniform1f(u.uSaturation, env.saturation);
}
_visible(o, cam) {
if (!o.visible) return false;
if (o.cx === undefined) return true;
return Math.abs(o.cx - cam.focusX) < cam.halfWidth + (o.rad || 1);
}
/** scene: {env, batches, objects, transparent, water, particles, time} */
render(scene, cam) {
if (this.lost) return;
const gl = this.gl, q = this.quality, env = scene.env;
this.stats.draws = 0; this.stats.tris = 0;
const shadowOn = !!(this.shadowFbo && env.shadows !== false);
if (shadowOn) {
const f = [cam.focusX, cam.focusY, 0];
const d = env.sunDir;
lookAt(this.lightView, [f[0] + d[0] * 40, f[1] + d[1] * 40, f[2] + d[2] * 40], f, [0, 1, 0]);
const hw = Math.min(26, cam.halfWidth + 6);
ortho(this.lightProj, -hw, hw, -hw * 0.75, hw * 0.75, 1, 95);
multiply(this.shadowVP, this.lightProj, this.lightView);
gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo);
gl.viewport(0, 0, this.shadowSize, this.shadowSize);
gl.clear(gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.colorMask(false, false, false, false);
gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
gl.useProgram(this.depth.p); gl.uniformMatrix4fv(this.depth.u.uViewProj, false, this.shadowVP);
const ident = scene.identity;
for (const b of scene.batches) { if (!b.castShadow || !this._visible(b, cam)) continue; gl.uniformMatrix4fv(this.depth.u.uModel, false, ident); gl.bindVertexArray(b.mesh.vao); gl.drawElements(gl.TRIANGLES, b.mesh.count, b.mesh.type, 0); }
for (const o of scene.objects) { if (o.castShadow === false || !this._visible(o, cam)) continue; gl.uniformMatrix4fv(this.depth.u.uModel, false, o.matrix); gl.bindVertexArray(o.mesh.vao); gl.drawElements(gl.TRIANGLES, o.mesh.count, o.mesh.type, 0); }
gl.colorMask(true, true, true, true);
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
gl.viewport(0, 0, this.canvas.width, this.canvas.height);
gl.clearColor(0.5, 0.6, 0.7, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
gl.useProgram(this.sky.p); this._envUniforms(this.sky, env, cam);
gl.uniformMatrix4fv(this.sky.u.uInvVP, false, cam.invViewProj);
gl.uniform3fv(this.sky.u.uSkyTop, env.skyTop); gl.uniform3fv(this.sky.u.uSkyHorizon, env.skyHorizon);
gl.uniform1i(this.sky.u.uClouds, q.clouds ? 1 : 0); gl.uniform1f(this.sky.u.uTime, scene.time);
gl.bindVertexArray(this.skyVao); gl.drawArrays(gl.TRIANGLES, 0, 3); this.stats.draws++;
gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
const L = this.lit, u = L.u;
gl.useProgram(L.p); this._envUniforms(L, env, cam);
gl.uniformMatrix4fv(u.uViewProj, false, cam.viewProj);
gl.uniformMatrix4fv(u.uShadowVP, false, this.shadowVP);
gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, shadowOn ? this.shadowTex : this.dummyShadow);
gl.uniform1i(u.uShadowMap, 0); gl.uniform1i(u.uShadowOn, shadowOn ? 1 : 0);
gl.uniform1f(u.uShadowTexel, 1 / Math.max(1, this.shadowSize)); gl.uniform1i(u.uPcf, q.pcf);
gl.uniform1i(u.uDetail, q.textureDetail); gl.uniform1f(u.uTime, scene.time);
const identN = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
for (const b of scene.batches) {
if (!this._visible(b, cam)) continue;
gl.uniformMatrix4fv(u.uModel, false, scene.identity); gl.uniformMatrix3fv(u.uNormalM, false, identN);
this._material(b, 1);
gl.bindVertexArray(b.mesh.vao); gl.drawElements(gl.TRIANGLES, b.mesh.count, b.mesh.type, 0);
this.stats.draws++; this.stats.tris += b.mesh.count / 3;
}
const drawObj = (o) => {
gl.uniformMatrix4fv(u.uModel, false, o.matrix); gl.uniformMatrix3fv(u.uNormalM, false, normalMatrix3(o.matrix));
this._material(o, o.opacity ?? 1);
gl.bindVertexArray(o.mesh.vao);
if (!o.mesh.hasColor) gl.vertexAttrib4f(2, 1, 1, 1, 0);
gl.drawElements(gl.TRIANGLES, o.mesh.count, o.mesh.type, 0);
this.stats.draws++; this.stats.tris += o.mesh.count / 3;
};
for (const o of scene.objects) if (this._visible(o, cam)) drawObj(o);
if (scene.water && scene.water.tiles) {
const W = this.water; gl.useProgram(W.p); this._envUniforms(W, env, cam);
gl.uniformMatrix4fv(W.u.uViewProj, false, cam.viewProj); gl.uniform1f(W.u.uTime, scene.time);
gl.uniform1i(W.u.uWaves, q.waterWaves ? 1 : 0); gl.uniform1i(W.u.uDetail, q.textureDetail);
gl.uniform3fv(W.u.uDeep, scene.water.deep); gl.uniform3fv(W.u.uShallow, scene.water.shallow); gl.uniform1f(W.u.uReflect, q.reflections);
gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.disable(gl.CULL_FACE);
for (const t of scene.water.tiles) { gl.uniformMatrix4fv(W.u.uModel, false, t.matrix); gl.bindVertexArray(t.mesh.vao); gl.drawElements(gl.TRIANGLES, t.mesh.count, t.mesh.type, 0); this.stats.draws++; }
}
if (scene.transparent.length) {
gl.useProgram(L.p);
gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.enable(gl.CULL_FACE);
for (const o of scene.transparent) if (this._visible(o, cam)) drawObj(o);
gl.depthMask(true);
}
const P = scene.particles;
if (P && P.count > 0) {
gl.useProgram(this.part.p); gl.uniformMatrix4fv(this.part.u.uViewProj, false, cam.viewProj);
gl.uniform1f(this.part.u.uScale, this.canvas.height * 0.9);
gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf); gl.bufferData(gl.ARRAY_BUFFER, P.data.subarray(0, P.count * 8), gl.DYNAMIC_DRAW);
gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
gl.bindVertexArray(this.partVao); gl.drawArrays(gl.POINTS, 0, P.count); this.stats.draws++;
gl.depthMask(true);
}
gl.disable(gl.BLEND);
gl.bindVertexArray(null);
}
_material(o, opacity) {
const gl = this.gl, u = this.lit.u;
gl.uniform3fv(u.uColor, o.color || [1, 1, 1]);
gl.uniform3fv(u.uPatColor, o.patColor || [1, 1, 1]);
gl.uniform1f(u.uPatScale, o.patScale || 1);
gl.uniform1i(u.uPattern, o.pattern || 0);
gl.uniform1i(u.uPatSpace, o.patSpace || 0);
gl.uniform1f(u.uRough, o.rough ?? 0.7);
gl.uniform1f(u.uEmissive, o.emissive || 0);
gl.uniform1f(u.uOpacity, opacity);
gl.uniform1f(u.uConvey, o.convey || 0);
gl.uniform1f(u.uWrap, o.wrap || 0);
gl.uniform1f(u.uRim, o.rim || 0);
}
}
/** Camera helper producing matrices consumed by the renderer. */
export class RenderCamera {
constructor() { this.view = mat4(); this.proj = mat4(); this.viewProj = mat4(); this.invViewProj = mat4(); this.pos = [0, 2, 10]; this.focusX = 0; this.focusY = 0; this.halfWidth = 12; this.fov = 42 * Math.PI / 180; }
update(eye, target, aspect) {
this.pos = eye; lookAt(this.view, eye, target, [0, 1, 0]);
perspective(this.proj, this.fov, aspect, 0.2, 400);
multiply(this.viewProj, this.proj, this.view);
invert(this.invViewProj, this.viewProj);
const dist = Math.abs(eye[2]);
this.halfWidth = Math.tan(this.fov / 2) * aspect * dist + 4;
}
}
export function invert(out, m) {
const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3], a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7],
a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11], a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11,
b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30,
b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
if (!det) return out; det = 1 / det;
out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det; out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det; out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det; out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det; out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det; out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det; out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det; out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det; out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
return out;
}