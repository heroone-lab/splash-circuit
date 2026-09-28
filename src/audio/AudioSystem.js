// AudioSystem: fully procedural (original) Web Audio SFX, music and ambience.
// Works in desktop/mobile browsers and the Android WebView.
import { rng } from '../core/math.js';

export class AudioSystem {
  constructor() {
    this.ctx = null; this.vol = { master: 0.8, music: 0.55, sfx: 0.8 }; this.listenerX = 0;
    this.musicStyle = null; this.seqTimer = null; this.loops = {}; this.lastPlay = {};
  }
  get ready() { return !!this.ctx && this.ctx.state === 'running'; }
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        this.ctx = new AC();
        const c = this.ctx;
        this.master = c.createGain(); this.master.connect(c.destination);
        this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.connect(this.master);
        this.musicBus = c.createGain(); this.musicBus.connect(this.comp);
        this.sfxBus = c.createGain(); this.sfxBus.connect(this.comp);
        this.ambBus = c.createGain(); this.ambBus.connect(this.sfxBus);
        const len = c.sampleRate * 2; this.noise = c.createBuffer(1, len, c.sampleRate);
        const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.applyVolumes();
        if (this.pendingMusic !== undefined) this.setMusic(this.pendingMusic);
        if (this.pendingAmb) this.setAmbience(this.pendingAmb);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { console.warn('audio unavailable', e); }
  }
  setVolumes(v) { Object.assign(this.vol, v); this.applyVolumes(); }
  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = this.vol.master; this.musicBus.gain.value = this.vol.music * 0.42; this.sfxBus.gain.value = this.vol.sfx;
  }
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  // ---------------------------------------------------------------- primitives
  env(g, t, a, d, peak = 1, sustain = 0) {
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain || 0.0001), t + a + d);
  }
  tone(type, f0, f1, dur, gain, out, t0 = 0, a = 0.005) {
    const c = this.ctx, t = c.currentTime + t0, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    this.env(g, t, a, dur, gain); o.connect(g); g.connect(out); o.start(t); o.stop(t + a + dur + 0.05);
  }
  noiseHit(dur, gain, filterType, f0, f1, out, t0 = 0, q = 1, a = 0.003) {
    const c = this.ctx, t = c.currentTime + t0, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; s.loop = true; f.type = filterType; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    this.env(g, t, a, dur, gain); s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random()); s.stop(t + a + dur + 0.05);
  }

  /** Play a named SFX with optional x position (distance attenuation). */
  play(name, o = {}) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    if (this.lastPlay[name] && now - this.lastPlay[name] < (THROTTLE[name] || 0.03)) return;
    this.lastPlay[name] = now;
    let gain = o.gain ?? 1;
    if (o.x !== undefined) { const d = Math.abs(o.x - this.listenerX); gain *= Math.max(0, 1 - d / 16); if (gain < 0.02) return; }
    const out = this.sfxBus, r = (o.rate || 1) * (0.94 + Math.random() * 0.12);
    const S = this;
    switch (name) {
      case 'step': S.noiseHit(0.06, 0.18 * gain, 'bandpass', 900 * r, 300, out, 0, 1.2); S.tone('sine', 110 * r, 70, 0.05, 0.08 * gain, out); break;
      case 'stepWood': S.noiseHit(0.07, 0.2 * gain, 'bandpass', 600 * r, 250, out, 0, 2); S.tone('triangle', 180 * r, 120, 0.05, 0.08 * gain, out); break;
      case 'stepMetal': S.noiseHit(0.05, 0.14 * gain, 'highpass', 2500 * r, 1800, out, 0, 1); S.tone('square', 420 * r, 380, 0.04, 0.03 * gain, out); break;
      case 'jump': S.noiseHit(0.18, 0.14 * gain, 'bandpass', 500, 2200, out, 0, 0.8); S.tone('sine', 180 * r, 260, 0.12, 0.08 * gain, out); break;
      case 'land': S.tone('sine', 120 * r, 45, 0.18, 0.4 * gain, out); S.noiseHit(0.12, 0.22 * gain, 'lowpass', 900, 200, out); break;
      case 'slide': S.noiseHit(0.55, 0.16 * gain, 'bandpass', 1500, 500, out, 0, 0.7, 0.02); break;
      case 'impact': case 'thud': S.tone('sine', 95 * r, 40, 0.25, 0.55 * gain, out); S.noiseHit(0.16, 0.35 * gain, 'lowpass', 2200, 300, out); break;
      case 'clank': S.tone('square', 220 * r, 180, 0.08, 0.06 * gain, out); S.noiseHit(0.09, 0.18 * gain, 'bandpass', 3200 * r, 2000, out, 0, 4); S.tone('triangle', 660 * r, 640, 0.2, 0.05 * gain, out, 0.02); break;
      case 'boing': S.tone('sine', 160 * r, 420, 0.22, 0.35 * gain, out); S.tone('sine', 320 * r, 700, 0.18, 0.1 * gain, out, 0.02); break;
      case 'bounce': S.tone('sine', 140 * r, 520, 0.3, 0.35 * gain, out); S.noiseHit(0.1, 0.1 * gain, 'lowpass', 600, 200, out); break;
      case 'piston': S.noiseHit(0.12, 0.2 * gain, 'highpass', 1500, 4000, out, 0, 1); S.tone('sawtooth', 90, 60, 0.1, 0.06 * gain, out); break;
      case 'pop': S.tone('sine', 300 * r, 900, 0.08, 0.2 * gain, out); break;
      case 'whoosh': S.noiseHit(0.35, 0.12 * gain, 'bandpass', 400, 1600, out, 0, 1.5, 0.12); break;
      case 'ballhit': S.tone('sine', 70, 35, 0.35, 0.5 * gain, out); S.noiseHit(0.2, 0.3 * gain, 'lowpass', 1200, 200, out); break;
      case 'ballbounce': S.tone('sine', 85 * r, 50, 0.2, 0.3 * gain, out); break;
      case 'wipeout': S.tone('sawtooth', 420, 90, 0.7, 0.12 * gain, out); S.noiseHit(0.5, 0.2 * gain, 'lowpass', 1800, 200, out); S.tone('sine', 60, 35, 0.6, 0.35 * gain, out); break;
      case 'ragdoll': S.tone('sine', 80 * r, 50, 0.12, 0.25 * gain, out); break;
      case 'splash': S.noiseHit(0.9, 0.4 * gain, 'lowpass', 3500, 400, out, 0, 0.7, 0.01); S.noiseHit(0.35, 0.2 * gain, 'highpass', 3000, 6000, out, 0.02); S.tone('sine', 140, 60, 0.3, 0.2 * gain, out); break;
      case 'checkpoint': [0, 4, 7, 12].forEach((n, i) => S.tone('triangle', 523 * Math.pow(2, n / 12), 523 * Math.pow(2, n / 12), 0.25, 0.12 * gain, out, i * 0.07)); break;
      case 'ring': S.tone('sine', 1320 * r, 1320, 0.15, 0.12 * gain, out); S.tone('sine', 1980 * r, 1980, 0.2, 0.08 * gain, out, 0.05); break;
      case 'energy': S.noiseHit(0.5, 0.12 * gain, 'highpass', 3000, 8000, out, 0, 1); S.tone('sawtooth', 220, 880, 0.5, 0.06 * gain, out); break;
      case 'rewind': S.tone('triangle', 900, 200, 0.6, 0.12 * gain, out); S.noiseHit(0.6, 0.06 * gain, 'bandpass', 3000, 600, out, 0, 2); break;
      case 'teleport': S.tone('sine', 300, 1600, 0.35, 0.14 * gain, out); S.tone('sine', 1600, 400, 0.35, 0.1 * gain, out, 0.2); break;
      case 'countdown': S.tone('square', 440, 440, 0.15, 0.08 * gain, out); break;
      case 'go': S.tone('square', 880, 880, 0.35, 0.09 * gain, out); S.tone('triangle', 1320, 1320, 0.35, 0.06 * gain, out); break;
      case 'finish': [0, 4, 7, 12, 16].forEach((n, i) => S.tone('triangle', 392 * Math.pow(2, n / 12), 392 * Math.pow(2, n / 12), 0.4, 0.13 * gain, out, i * 0.09)); S.noiseHit(1.4, 0.06 * gain, 'bandpass', 1500, 800, out, 0.1, 0.5, 0.2); break;
      case 'victory': [0, 7, 12, 16, 19, 24].forEach((n, i) => S.tone('triangle', 262 * Math.pow(2, n / 12), 262 * Math.pow(2, n / 12), 0.5, 0.11 * gain, out, i * 0.12)); break;
      case 'defeat': [7, 5, 3, 0].forEach((n, i) => S.tone('triangle', 262 * Math.pow(2, n / 12), 262 * Math.pow(2, n / 12), 0.45, 0.1 * gain, out, i * 0.2)); break;
      case 'star': S.tone('triangle', 1046 * r, 1568, 0.25, 0.12 * gain, out); break;
      case 'uiClick': S.tone('triangle', 660, 520, 0.05, 0.08 * gain, out); break;
      case 'uiHover': S.tone('sine', 880, 880, 0.03, 0.03 * gain, out); break;
      case 'uiBack': S.tone('triangle', 520, 380, 0.06, 0.08 * gain, out); break;
      case 'bonk': S.tone('sine', 300, 150, 0.1, 0.18 * gain, out); break;
      default: break;
    }
  }

  // ---------------------------------------------------------------- looping positional sources (conveyor hum etc.)
  setLoop(name, level) {
    if (!this.ready) return;
    let L = this.loops[name];
    if (!L) {
      const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), o = c.createOscillator(), og = c.createGain();
      s.buffer = this.noise; s.loop = true; f.type = 'bandpass'; f.frequency.value = name === 'hum' ? 220 : 500; f.Q.value = 3;
      o.type = 'sawtooth'; o.frequency.value = 55; og.gain.value = 0.02;
      g.gain.value = 0; s.connect(f); f.connect(g); o.connect(og); og.connect(g); g.connect(this.sfxBus); s.start(); o.start();
      L = this.loops[name] = { g };
    }
    L.g.gain.setTargetAtTime(level * 0.18, this.ctx.currentTime, 0.1);
  }
  stopLoops() { for (const k in this.loops) this.loops[k].g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05); }

  // ---------------------------------------------------------------- ambience
  setAmbience(kind) {
    this.pendingAmb = kind;
    if (!this.ctx) return;
    if (this.amb) { try { this.amb.stop(); } catch (e) { /* ignore */ } this.amb = null; }
    if (this.birdTimer) clearInterval(this.birdTimer);
    if (!kind) return;
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    s.buffer = this.noise; s.loop = true;
    const cfg = { sea: [500, 0.09], lagoon: [650, 0.07], crowd: [900, 0.06], wind: [380, 0.07], forest: [1200, 0.035], boardwalk: [800, 0.05] }[kind] || [600, 0.05];
    f.type = 'lowpass'; f.frequency.value = cfg[0]; g.gain.value = cfg[1];
    lfo.frequency.value = kind === 'sea' || kind === 'lagoon' ? 0.12 : 0.3; lg.gain.value = cfg[1] * 0.6;
    lfo.connect(lg); lg.connect(g.gain); s.connect(f); f.connect(g); g.connect(this.ambBus); s.start(); lfo.start();
    this.amb = { stop: () => { s.stop(); lfo.stop(); } };
    if (kind === 'forest' || kind === 'lagoon') {
      this.birdTimer = setInterval(() => { if (!this.ready || Math.random() < 0.5) return; const f0 = 2200 + Math.random() * 1600; for (let i = 0; i < 3; i++) this.tone('sine', f0, f0 * 1.25, 0.07, 0.025, this.ambBus, i * 0.1); }, 1400);
    } else if (kind === 'crowd') {
      this.birdTimer = setInterval(() => { if (!this.ready || Math.random() < 0.6) return; this.noiseHit(1.2, 0.05, 'bandpass', 1200, 900, this.ambBus, 0, 0.8, 0.3); }, 2000);
    }
  }

  // ---------------------------------------------------------------- music sequencer
  setMusic(style) {
    this.pendingMusic = style;
    if (!this.ctx) return;
    if (this.seqTimer) { clearInterval(this.seqTimer); this.seqTimer = null; }
    this.musicStyle = style;
    if (!style) return;
    const c = this.ctx, r = rng(style.root * 31 + style.tempo);
    const spb = 60 / style.tempo / 4; // 16th note
    const prog = [0, 5, 3, 4];
    const lead = Array.from({ length: 32 }, () => (r() < 0.55 ? r.int(0, style.scale.length - 1) : -1));
    let step = 0, next = c.currentTime + 0.1;
    const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
    const deg = (d, oct = 0) => { const s = style.scale; const k = ((d % s.length) + s.length) % s.length; return style.root + s[k] + 12 * (Math.floor(d / s.length) + oct); };
    const bus = this.musicBus;
    this.seqTimer = setInterval(() => {
      if (!this.ready) { next = c.currentTime + 0.1; return; }
      while (next < c.currentTime + 0.12) {
        const t0 = next - c.currentTime, bar = Math.floor(step / 16) % 4, s16 = step % 16;
        const chord = prog[bar];
        const sw = style.swing && s16 % 2 ? spb * style.swing : 0;
        // drums
        const dr = style.drums;
        if (s16 % 4 === 0 && (dr !== 'soft' || s16 % 8 === 0)) this.tone('sine', 120, 45, 0.16, dr === 'soft' ? 0.18 : 0.32, bus, t0);
        if ((s16 === 4 || s16 === 12) && dr !== 'soft') this.noiseHit(0.12, dr === 'march' ? 0.14 : 0.1, 'bandpass', 1800, 1200, bus, t0, 0.8);
        if (s16 % 2 === 0 && dr !== 'march') this.noiseHit(0.03, dr === 'tiki' ? 0.035 : 0.028, 'highpass', 7000, 7000, bus, t0 + sw);
        if (dr === 'tiki' && (s16 === 3 || s16 === 10)) this.tone('sine', 300, 220, 0.08, 0.12, bus, t0);
        // bass
        if (s16 % 4 === 0 || (dr === 'funk' && s16 % 4 === 3)) this.tone(style.wave === 'sine' ? 'triangle' : 'triangle', midi(deg(chord, -1)), midi(deg(chord, -1)), spb * 2.5, 0.2, bus, t0);
        // pad on bar start
        if (s16 === 0) for (const k of [0, 2, 4]) this.tone('sine', midi(deg(chord + k, 0)), midi(deg(chord + k, 0)), spb * 14, 0.035, bus, t0, 0.3);
        // lead
        const li = lead[step % 32];
        if (li >= 0 && s16 % 2 === 0) this.tone(style.wave, midi(deg(chord + li, 1)), midi(deg(chord + li, 1)), spb * 1.6, style.wave === 'sine' ? 0.07 : 0.028, bus, t0 + sw);
        step++; next += spb;
      }
    }, 30);
  }
  footstep(surface) { this.play(surface === 'wood' || surface === 'deck' ? 'stepWood' : surface === 'belt' || surface === 'metal' ? 'stepMetal' : 'step', { gain: 0.8 }); }
}

const THROTTLE = { step: 0.08, stepWood: 0.08, stepMetal: 0.08, whoosh: 0.12, clank: 0.1, ballbounce: 0.08, uiHover: 0.05, splash: 0.2 };

export const MENU_MUSIC = { tempo: 96, root: 48, scale: [0, 2, 4, 7, 9], wave: 'sine', drums: 'soft' };
