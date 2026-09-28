export class Emitter {
constructor() { this.h = new Map(); }
on(n, f) { if (!this.h.has(n)) this.h.set(n, []); this.h.get(n).push(f); return () => this.off(n, f); }
off(n, f) { const l = this.h.get(n); if (l) { const i = l.indexOf(f); if (i >= 0) l.splice(i, 1); } }
emit(n, d) { const l = this.h.get(n); if (l) for (const f of l.slice()) f(d); }
clear() { this.h.clear(); }
}