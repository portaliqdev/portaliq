/** Deterministic seeded RNG (mulberry32) so the mock dataset is reproducible. */
export class Rng {
  private s: number;
  constructor(seed = 0x9e3779b9) {
    this.s = seed >>> 0;
  }
  next(): number {
    this.s |= 0;
    this.s = (this.s + 0x6d2b79f5) | 0;
    let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** integer in [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  /** float in [min, max], rounded to `dp` decimals */
  float(min: number, max: number, dp = 2): number {
    const v = this.next() * (max - min) + min;
    const f = 10 ** dp;
    return Math.round(v * f) / f;
  }
  bool(pTrue = 0.5): boolean {
    return this.next() < pTrue;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  /** sample n distinct items */
  sample<T>(arr: readonly T[], n: number): T[] {
    const pool = [...arr];
    const out: T[] = [];
    while (out.length < n && pool.length) {
      out.push(pool.splice(Math.floor(this.next() * pool.length), 1)[0]);
    }
    return out;
  }
  /** weighted pick: items with relative weights */
  weighted<T>(items: readonly (readonly [T, number])[]): T {
    const total = items.reduce((s, [, w]) => s + w, 0);
    let r = this.next() * total;
    for (const [item, w] of items) {
      if ((r -= w) <= 0) return item;
    }
    return items[items.length - 1][0];
  }
  /** approx normal via central limit; clamped to [min,max] */
  gauss(mean: number, sd: number, min: number, max: number): number {
    let g = 0;
    for (let i = 0; i < 4; i++) g += this.next();
    g = (g / 4 - 0.5) * 2; // ~[-1,1]
    return Math.max(min, Math.min(max, Math.round(mean + g * sd * 2)));
  }
}
