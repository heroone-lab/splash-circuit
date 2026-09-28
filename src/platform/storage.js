// Storage adapters. WebStorage = localStorage (persistent browser storage);
// AndroidStorage = native SharedPreferences via the WebView JS bridge
// (window.AndroidStorage), falling back to WebView localStorage.
export class MemoryStorage {
  constructor() { this.m = new Map(); }
  get(k) { return this.m.has(k) ? this.m.get(k) : null; }
  set(k, v) { this.m.set(k, v); }
  remove(k) { this.m.delete(k); }
}

export class WebStorage {
  constructor() {
    try { const t = '__sc_test'; localStorage.setItem(t, '1'); localStorage.removeItem(t); this.ok = true; } catch (e) { this.ok = false; this.mem = new MemoryStorage(); }
  }
  get(k) { return this.ok ? localStorage.getItem(k) : this.mem.get(k); }
  set(k, v) { try { if (this.ok) localStorage.setItem(k, v); else this.mem.set(k, v); } catch (e) { console.warn('save failed', e); } }
  remove(k) { if (this.ok) localStorage.removeItem(k); else this.mem.remove(k); }
}

export class AndroidStorage {
  constructor() { this.bridge = window.AndroidStorage; this.fallback = new WebStorage(); }
  get(k) { try { if (this.bridge) { const v = this.bridge.getItem(k); return v === undefined || v === '' ? (v === '' ? null : null) : v; } } catch (e) { /* fall through */ } return this.fallback.get(k); }
  set(k, v) { try { if (this.bridge) { this.bridge.setItem(k, v); return; } } catch (e) { /* fall through */ } this.fallback.set(k, v); }
  remove(k) { try { if (this.bridge) { this.bridge.removeItem(k); return; } } catch (e) { /* fall through */ } this.fallback.remove(k); }
}
