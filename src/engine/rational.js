// ============================================================
//  محرك رياضي — الأعداد النسبية الدقيقة (Rational)
// ============================================================

export function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { const t = a % b; a = b; b = t; }
  return a;
}

export function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

export class Rat {
  constructor(n, d = 1) {
    if (d === 0) throw new Error('القسمة على صفر');
    if (!Number.isFinite(n) || !Number.isFinite(d)) throw new Error('قيمة غير منتهية');
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d) || 1;
    this.n = n / g;
    this.d = d / g;
  }
  static of(x) {
    if (x instanceof Rat) return x;
    if (Number.isInteger(x)) return new Rat(x, 1);
    // تحويل عشري إلى كسر دقيق
    const s = String(x);
    if (s.includes('e') || s.includes('E')) return new Rat(Math.round(x * 1e9), 1e9);
    const dec = (s.split('.')[1] || '').length;
    const pow = Math.pow(10, dec);
    return new Rat(Math.round(x * pow), pow);
  }
  add(o) { o = Rat.of(o); return new Rat(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { o = Rat.of(o); return new Rat(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { o = Rat.of(o); return new Rat(this.n * o.n, this.d * o.d); }
  div(o) { o = Rat.of(o); return new Rat(this.n * o.d, this.d * o.n); }
  pow(k) {
    if (k >= 0) return new Rat(Math.pow(this.n, k), Math.pow(this.d, k));
    return new Rat(Math.pow(this.d, -k), Math.pow(this.n, -k));
  }
  neg() { return new Rat(-this.n, this.d); }
  get value() { return this.n / this.d; }
  get isInt() { return this.d === 1; }
  equals(o) { o = Rat.of(o); return this.n === o.n && this.d === o.d; }
  toString() { return this.d === 1 ? String(this.n) : `${this.n}/${this.d}`; }
  toMixed() {
    if (this.d === 1) return String(this.n);
    const sign = this.n < 0 ? '-' : '';
    const a = Math.abs(this.n);
    const whole = Math.floor(a / this.d);
    const rem = a % this.d;
    if (whole === 0) return `${sign}${rem}/${this.d}`;
    return `${sign}${whole} ${rem}/${this.d}`;
  }
}

/** تبسيط كسرين عدد صحيحين */
export function simplifyFraction(n, d) {
  if (d === 0) return null;
  const r = new Rat(Math.round(n), Math.round(d));
  return r;
}

/** استخراج عوامل أولية */
export function primeFactors(n) {
  n = Math.abs(Math.round(n));
  const f = {};
  for (let p = 2; p * p <= n; p++) {
    while (n % p === 0) { f[p] = (f[p] || 0) + 1; n /= p; }
  }
  if (n > 1) f[n] = (f[n] || 0) + 1;
  return f;
}

/**
 * تبسيط جذر: √n = a√b
 */
export function simplifyRadical(n) {
  if (!Number.isInteger(n) || n < 0) return null;
  let outside = 1, inside = n;
  for (let p = 2; p * p <= inside; p++) {
    while (inside % (p * p) === 0) { inside /= p * p; outside *= p; }
  }
  return { outside, inside };
}

export function factorsToText(f) {
  return Object.entries(f)
    .map(([p, e]) => (e === 1 ? p : `${p}^${e}`))
    .join(' × ');
}
