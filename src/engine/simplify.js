// ============================================================
//  محرك رياضي رمزي — التبسيط والتبسيط القياسي (Simplifier)
// ============================================================

import {
  Num, Var, Const, Add, Mul, Pow, Neg, Div, Fn, isNum, isZero, isOne, toText, hasVar,
} from './ast.js';
import { Rat } from './rational.js';
import { evaluate } from './eval.js';

const MAX_ITER = 12;

/** مفتاح مقارنة للتعبيرات (للترتيب والتجميع) */
export function key(node) {
  if (!node) return '';
  switch (node.t) {
    case 'num': return 'n:' + node.value;
    case 'var': return 'v:' + node.name;
    case 'const': return 'c:' + node.name;
    case 'add': return 'a(' + node.args.map(key).join('|') + ')';
    case 'mul': return 'm(' + node.args.map(key).join('|') + ')';
    case 'pow': return 'p(' + key(node.base) + '^' + key(node.exp) + ')';
    case 'neg': return 'g(' + key(node.arg) + ')';
    case 'div': return 'd(' + key(node.num) + '/' + key(node.den) + ')';
    case 'fn': return 'f:' + node.name + '(' + node.args.map(key).join('|') + ')';
    default: return toText(node);
  }
}

/** ترتيب ثابت للتعبيرات (درجة تنازلية ثم أبجدية) */
export function sortKey(node) {
  const deg = degreeOf(node);
  return String(1000 - deg).padStart(5, '0') + '|' + key(node);
}

export function degreeOf(node, v) {
  if (!node) return 0;
  switch (node.t) {
    case 'num': return 0;
    case 'var': return v === undefined ? 1 : node.name === v ? 1 : 0;
    case 'const': return 0;
    case 'add': return Math.max(0, ...node.args.map((a) => degreeOf(a, v)));
    case 'mul': return node.args.reduce((s, a) => s + degreeOf(a, v), 0);
    case 'neg': return degreeOf(node.arg, v);
    case 'div': return degreeOf(node.num, v) - degreeOf(node.den, v);
    case 'pow': {
      const e = node.exp.t === 'num' ? node.exp.value : NaN;
      if (Number.isInteger(e)) return degreeOf(node.base, v) * e;
      return hasVar(node, v) ? 1 : 0;
    }
    default: return hasVar(node, v) ? 1 : 0;
  }
}

/** جمع أعداد نسبية بدقة */
function numAdd(a, b) {
  const r = Rat.of(a).add(Rat.of(b));
  return r.isInt ? r.n : r.value;
}
function numMul(a, b) {
  const r = Rat.of(a).mul(Rat.of(b));
  return r.isInt ? r.n : r.value;
}
function numDiv(a, b) {
  const r = Rat.of(a).div(Rat.of(b));
  return r.isInt ? r.n : r.value;
}
function numPow(a, b) {
  if (Number.isInteger(b) && Math.abs(b) <= 64) {
    const r = Rat.of(a).pow(b);
    return r.isInt ? r.n : r.value;
  }
  const v = Math.pow(a, b);
  return Number.isFinite(v) ? v : NaN;
}

/** تبسيط عودي */
export function simplify(node, opts = {}) {
  let cur = node;
  for (let i = 0; i < MAX_ITER; i++) {
    const next = simplifyOnce(cur, opts);
    if (key(next) === key(cur)) return next;
    cur = next;
  }
  return cur;
}

function simplifyOnce(node, opts) {
  if (!node) return node;
  switch (node.t) {
    case 'num': case 'var': case 'const': return node;
    case 'neg': {
      const a = simplify(node.arg, opts);
      if (a.t === 'num') return Num(-a.value);
      if (a.t === 'neg') return a.arg;
      if (a.t === 'add') return simplify(Add(...a.args.map((x) => Neg(x))), opts);
      if (a.t === 'mul') {
        const [first, ...rest] = a.args;
        if (first.t === 'num') return simplify(Mul(Num(-first.value), ...rest), opts);
        return Mul(Num(-1), ...a.args);
      }
      return Neg(a);
    }
    case 'add': {
      const args = [];
      for (const a of node.args) {
        const s = simplify(a, opts);
        if (s.t === 'add') args.push(...s.args);
        else args.push(s);
      }
      return simplifySum(args, opts);
    }
    case 'mul': {
      const args = [];
      for (const a of node.args) {
        const s = simplify(a, opts);
        if (s.t === 'mul') args.push(...s.args);
        else args.push(s);
      }
      // حوّل أي قسمة داخلية إلى أسس سالبة ليتعامل معها التبسيط
      const normalized = [];
      for (const a of args) {
        if (a.t === 'div') normalized.push(a.num, Pow(a.den, Num(-1)));
        else normalized.push(a);
      }
      return simplifyProduct(normalized, opts);
    }
    case 'div': {
      const n = simplify(node.num, opts);
      const d = simplify(node.den, opts);
      return simplifyQuotient(n, d, opts);
    }
    case 'pow': {
      const b = simplify(node.base, opts);
      const e = simplify(node.exp, opts);
      return simplifyPower(b, e, opts);
    }
    case 'fn': {
      const args = node.args.map((a) => simplify(a, opts));
      return simplifyFunction(node.name, args, opts);
    }
    default: return node;
  }
}

// ---------- الجمع ----------
function simplifySum(args, opts) {
  let constant = 0;
  const terms = new Map(); // key -> {coef, term}

  const addTerm = (coef, term) => {
    if (term === null) { constant = numAdd(constant, coef); return; }
    const k = key(term);
    if (terms.has(k)) terms.get(k).coef = numAdd(terms.get(k).coef, coef);
    else terms.set(k, { coef, term });
  };

  const visit = (a, coef) => {
    if (a.t === 'num') { constant = numAdd(constant, numMul(coef, a.value)); return; }
    if (a.t === 'add') { a.args.forEach((x) => visit(x, coef)); return; }
    if (a.t === 'neg') { visit(a.arg, numMul(coef, -1)); return; }
    if (a.t === 'mul') {
      const nums = a.args.filter((x) => x.t === 'num');
      const rest = a.args.filter((x) => x.t !== 'num');
      if (nums.length) {
        const c = nums.reduce((s, x) => numMul(s, x.value), coef);
        if (rest.length === 0) { constant = numAdd(constant, c); return; }
        addTerm(c, rest.length === 1 ? rest[0] : Mul(...rest));
        return;
      }
    }
    addTerm(coef, a);
  };

  args.forEach((a) => visit(a, 1));

  const out = [];
  const list = [...terms.values()].filter((t) => t.coef !== 0);
  list.sort((a, b) => {
    const da = degreeOf(a.term), db = degreeOf(b.term);
    if (da !== db) return db - da; // الأس الأكبر أولًا
    const ka = key(a.term), kb = key(b.term);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  for (const { coef, term } of list) {
    if (coef === 1) out.push(term);
    else if (coef === -1) out.push(Neg(term));
    else if (coef < 0) out.push(Neg(Mul(Num(-coef), term)));
    else out.push(Mul(Num(coef), term));
  }
  if (constant !== 0) out.push(Num(constant));
  if (out.length === 0) return Num(0);
  if (out.length === 1) return out[0];
  return Add(...out);
}

// ---------- الضرب ----------
function simplifyProduct(args, opts) {
  let coef = 1;
  const factors = new Map(); // key -> {base, exp}
  let denom = []; // مقامات

  const addFactor = (base, exp) => {
    const k = key(base);
    if (factors.has(k)) factors.get(k).exp = numAdd(factors.get(k).exp, exp);
    else factors.set(k, { base, exp });
  };

  const visit = (a, mult) => {
    if (a.t === 'num') { coef = numMul(coef, Math.pow(a.value, mult)); return; }
    if (a.t === 'mul') { a.args.forEach((x) => visit(x, mult)); return; }
    if (a.t === 'neg') { coef = numMul(coef, Math.pow(-1, mult)); visit(a.arg, mult); return; }
    if (a.t === 'pow') {
      // إن كان الأساس عددًا والأس عددًا صحيحًا، نحسبه عدديًا
      if (a.base.t === 'num' && a.exp.t === 'num' && Number.isInteger(a.exp.value)) {
        coef = numMul(coef, Math.pow(Math.pow(a.base.value, a.exp.value), mult));
        return;
      }
      // إذا كان الأس غير رقمي، نحتفظ بالعقدة كما هي
      if (a.exp.t !== 'num') {
        addFactor(a, mult);
        return;
      }
      addFactor(a.base, numMul(a.exp.value, mult));
      return;
    }
    if (a.t === 'div') { visit(a.num, mult); visit(a.den, -mult); return; }
    addFactor(a, mult);
  };
  args.forEach((a) => visit(a, 1));

  const positive = [];
  const negative = [];
  for (const { base, exp } of factors.values()) {
    if (exp === 0) continue;
    if (exp === 1) positive.push(base);
    else if (exp === -1) negative.push(base);
    else if (exp > 0) positive.push(Pow(base, Num(exp)));
    else negative.push(Pow(base, Num(-exp)));
  }
  positive.sort((a, b) => {
    const da = degreeOf(a), db = degreeOf(b);
    if (da !== db) return db - da;
    const ka = key(a), kb = key(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  negative.sort((a, b) => {
    const da = degreeOf(a), db = degreeOf(b);
    if (da !== db) return db - da;
    const ka = key(a), kb = key(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });

  if (coef === 0) return Num(0);

  let out;
  if (positive.length === 0) out = coef === -1 ? Num(-1) : Num(coef);
  else if (coef === 1) out = positive.length === 1 ? positive[0] : Mul(...positive);
  else if (coef === -1) out = Neg(positive.length === 1 ? positive[0] : Mul(...positive));
  else out = Mul(Num(coef), ...positive);

  if (negative.length) {
    const den = negative.length === 1 ? negative[0] : Mul(...negative);
    const q = simplifyQuotient(out, den, opts);
    // حماية من الحلقات اللانهائية: إن لم يتغير شيء نعيد بناءً بسيطًا
    return q;
  }
  return out;
}

// ---------- القسمة ----------
function simplifyQuotient(n, d, opts, depth = 0) {
  if (depth > 10) return Div(n, d); // حماية من التكرار اللانهائي
  if (isZero(d)) return Div(n, d);
  if (isZero(n)) return Num(0);
  if (isOne(d)) return n;
  if (n.t === 'num' && d.t === 'num') {
    if (Number.isInteger(n.value) && Number.isInteger(d.value)) {
      const r = new Rat(n.value, d.value);
      return r.isInt ? Num(r.n) : Div(Num(r.n), Num(r.d));
    }
    return Num(n.value / d.value);
  }
  // (a/b)/c
  if (n.t === 'div') return simplifyQuotient(n.num, Mul(n.den, d), opts, depth + 1);
  // a/(b/c)
  if (d.t === 'div') return simplifyQuotient(Mul(n, d.den), d.num, opts, depth + 1);
  // دمج الأسس المتشابهة
  if (n.t === 'pow' && d.t === 'pow' && key(n.base) === key(d.base)) {
    return simplifyPower(n.base, simplifySum([n.exp, Neg(d.exp)], opts), opts);
  }
  if (n.t === 'mul') {
    const nums = n.args.filter((a) => a.t === 'num');
    const rest = n.args.filter((a) => a.t !== 'num');
    if (nums.length === 1 && rest.length) {
      return simplifyQuotient(rest.length === 1 ? rest[0] : Mul(...rest), Div(d, nums[0]), opts, depth + 1);
    }
  }
  // اختصار العامل المشترك
  const nf = factorMap(n);
  const df = factorMap(d);
  if (nf && df) {
    let changed = false;
    for (const [k, v] of nf) {
      if (df.has(k)) {
        const m = Math.min(v.exp, df.get(k).exp);
        if (m > 0) {
          nf.get(k).exp -= m;
          df.get(k).exp -= m;
          changed = true;
        }
      }
    }
    if (changed) {
      const nn = rebuildProduct(nf);
      const dd = rebuildProduct(df);
      if (isOne(dd)) return nn;
      return Div(nn, dd);
    }
  }
  if (key(n) === key(d)) return Num(1);
  return Div(n, d);
}

/** إعادة كتابة a/b كـ a·b^(-1) حتى يتعامل معها تبسيط الضرب */
function asProduct(node) {
  if (node.t === 'div') return Mul(node.num, Pow(node.den, Num(-1)));
  if (node.t === 'mul') return Mul(...node.args.map(asProduct));
  return node;
}

function factorMap(node) {
  const map = new Map();
  const visit = (a, mult) => {
    if (a.t === 'num') return false;
    if (a.t === 'mul') { a.args.forEach((x) => visit(x, mult)); return true; }
    if (a.t === 'pow') {
      map.set(key(a.base), { base: a.base, exp: (a.exp.t === 'num' ? a.exp.value : 1) * mult });
      return true;
    }
    map.set(key(a), { base: a, exp: mult });
    return true;
  };
  visit(node, 1);
  return map;
}

function rebuildProduct(map) {
  const parts = [];
  for (const { base, exp } of map.values()) {
    if (exp === 0) continue;
    if (exp === 1) parts.push(base);
    else parts.push(Pow(base, Num(exp)));
  }
  if (parts.length === 0) return Num(1);
  if (parts.length === 1) return parts[0];
  return simplifyProduct(parts, {});
}

// ---------- الأسس ----------
function simplifyPower(base, exp, opts) {
  if (isZero(exp)) return Num(1);
  if (isOne(exp)) return base;
  if (isZero(base)) return Num(0);
  if (isOne(base)) return Num(1);
  if (base.t === 'num' && exp.t === 'num') {
    if (Number.isInteger(exp.value) && exp.value < 0) {
      const r = Rat.of(base.value).pow(exp.value);
      return r.isInt ? Num(r.n) : Div(Num(1), Num(Math.pow(base.value, -exp.value)));
    }
    if (Number.isInteger(exp.value) && Math.abs(exp.value) <= 64) {
      const v = numPow(base.value, exp.value);
      if (!Number.isNaN(v)) return Num(v);
    }
    if (base.value > 0) {
      const v = Math.pow(base.value, exp.value);
      if (Number.isFinite(v)) return Num(v);
    }
    return Pow(base, exp);
  }
  if (base.t === 'pow') return simplifyPower(base.base, simplify(Mul(base.exp, exp), opts), opts);
  if (base.t === 'neg' && exp.t === 'num' && Number.isInteger(exp.value)) {
    return simplifyPower(base.arg, exp, opts); // (-x)^2 = x^2
  }
  if (base.t === 'mul') {
    // (a*b)^n = a^n * b^n
    if (exp.t === 'num' && Number.isInteger(exp.value)) {
      return simplifyProduct(base.args.map((a) => Pow(a, exp)), opts);
    }
  }
  // (x^a)^b مع a*b عدد صحيح
  return Pow(base, exp);
}

// ---------- الدوال ----------
function simplifyFunction(name, args, opts) {
  const [a, b] = args;
  // قيم عددية
  if (args.every((x) => x.t === 'num')) {
    const exact = exactFunctionValue(name, args);
    if (exact !== undefined) return exact;
  }
  switch (name) {
    case 'abs':
      if (a.t === 'num') return Num(Math.abs(a.value));
      if (a.t === 'mul' && a.args.some((x) => x.t === 'num' && x.value < 0)) {
        return Fn('abs', [simplify(Mul(Num(-1), a), opts)]);
      }
      if (a.t === 'pow' && a.exp.t === 'num' && a.exp.value % 2 === 0) return a;
      return Fn('abs', [a]);
    case 'sqrt':
      if (a.t === 'num' && a.value >= 0) {
        const r = Math.sqrt(a.value);
        if (Number.isInteger(r)) return Num(r);
        return Fn('sqrt', [a]);
      }
      if (a.t === 'pow' && a.exp.t === 'num' && a.exp.value % 2 === 0 && a.base.t !== 'num') {
        return simplifyPower(Fn('abs', [a.base]), Num(a.exp.value / 2), opts);
      }
      if (a.t === 'mul') {
        const squares = [];
        const rest = [];
        for (const f of a.args) {
          if (f.t === 'pow' && f.exp.t === 'num' && f.exp.value % 2 === 0) {
            squares.push(Pow(f.base, Num(f.exp.value / 2)));
          } else if (f.t === 'num') {
            let v = f.value;
            let out = 1;
            for (let p = 2; p * p <= v; p++) {
              while (v % (p * p) === 0) { v /= p * p; out *= p; }
            }
            if (out !== 1) squares.push(Num(out));
            if (v !== 1) rest.push(Num(v));
          } else rest.push(f);
        }
        if (squares.length) {
          const inside = rest.length ? Fn('sqrt', [rest.length === 1 ? rest[0] : Mul(...rest)]) : null;
          const outside = squares.length === 1 ? squares[0] : Mul(...squares);
          return inside ? simplifyProduct([outside, inside], opts) : outside;
        }
      }
      return Fn('sqrt', [a]);
    case 'exp':
      if (isZero(a)) return Num(1);
      if (a.t === 'fn' && a.name === 'ln') return a.args[0];
      return Fn('exp', [a]);
    case 'ln':
      if (isOne(a)) return Num(0);
      if (a.t === 'const' && a.name === 'e') return Num(1);
      if (a.t === 'fn' && a.name === 'exp') return a.args[0];
      if (a.t === 'pow' && a.base.t === 'const' && a.base.name === 'e') return a.exp;
      return Fn('ln', [a]);
    case 'log':
      if (args.length === 1) {
        if (isOne(a)) return Num(0);
        if (a.t === 'num' && a.value === 10) return Num(1);
        return Fn('log', [a]);
      }
      if (a.t === 'num' && b.t === 'num') {
        const v = Math.log(b.value) / Math.log(a.value);
        if (Number.isInteger(v)) return Num(v);
      }
      return Fn('log', args);
    case 'sin':
      if (isZero(a)) return Num(0);
      if (a.t === 'fn' && a.name === 'asin') return a.args[0];
      return Fn('sin', [a]);
    case 'cos':
      if (isZero(a)) return Num(1);
      if (a.t === 'fn' && a.name === 'acos') return a.args[0];
      return Fn('cos', [a]);
    case 'tan':
      if (isZero(a)) return Num(0);
      if (a.t === 'fn' && a.name === 'atan') return a.args[0];
      return Fn('tan', [a]);
    case 'asin': case 'arcsin':
      if (isZero(a)) return Num(0);
      if (a.t === 'fn' && a.name === 'sin') return a.args[0];
      return Fn(name, [a]);
    case 'acos':
      if (isOne(a)) return Num(0);
      if (a.t === 'fn' && a.name === 'cos') return a.args[0];
      return Fn(name, [a]);
    case 'atan': case 'arctan':
      if (isZero(a)) return Num(0);
      if (a.t === 'fn' && a.name === 'tan') return a.args[0];
      return Fn(name, [a]);
    case 'fact':
      if (a.t === 'num' && Number.isInteger(a.value) && a.value >= 0 && a.value <= 170) {
        let r = 1;
        for (let i = 2; i <= a.value; i++) r *= i;
        return Num(r);
      }
      return Fn('fact', [a]);
    case 'floor': case 'ceil': case 'round': case 'sign': case 'sgn':
      return Fn(name, [a]);
    default:
      return Fn(name, args);
  }
}

/** قيم دقيقة لدوال مثلثية عند زوايا مشهورة (بالراديان) */
function exactFunctionValue(name, args) {
  const a = args[0];
  if (a.t !== 'num') return undefined;
  const v = a.value;
  const PI = Math.PI;
  const ratios = [0, 1 / 6, 1 / 4, 1 / 3, 1 / 2, 1, 3 / 2, 2];
  const isSpecial = ratios.some((r) => Math.abs(Math.abs(v) - r * PI) < 1e-12);
  if (!isSpecial) return undefined;
  const norm = ((v % (2 * PI)) + 2 * PI) % (2 * PI);
  const table = {
    sin: { 0: 0, [PI / 6]: 0.5, [PI / 4]: Math.SQRT2 / 2, [PI / 3]: Math.sqrt(3) / 2, [PI / 2]: 1, [PI]: 0, [(3 * PI) / 2]: -1 },
    cos: { 0: 1, [PI / 6]: Math.sqrt(3) / 2, [PI / 4]: Math.SQRT2 / 2, [PI / 3]: 0.5, [PI / 2]: 0, [PI]: -1, [(3 * PI) / 2]: 0 },
    tan: { 0: 0, [PI / 6]: 1 / Math.sqrt(3), [PI / 4]: 1, [PI / 3]: Math.sqrt(3), [PI]: 0 },
  };
  const tbl = table[name];
  if (!tbl) return undefined;
  for (const k of Object.keys(tbl)) {
    if (Math.abs(norm - Number(k)) < 1e-12) return Num(tbl[k]);
  }
  return undefined;
}

/** فك الأقواس وتوسيع التعبير */
export function expand(node, depth = 0) {
  if (depth > 24) return simplify(node);
  const n = simplify(node);
  switch (n.t) {
    case 'add': return simplify(Add(...n.args.map((a) => expand(a, depth + 1))));
    case 'mul': {
      let terms = [Num(1)];
      for (const f of n.args) {
        const ex = expand(f, depth + 1);
        const parts = ex.t === 'add' ? ex.args : [ex];
        const next = [];
        for (const t of terms) for (const p of parts) next.push(Mul(t, p));
        terms = next;
      }
      return simplify(Add(...terms));
    }
    case 'pow': {
      const b = expand(n.base, depth + 1);
      if (n.exp.t === 'num' && Number.isInteger(n.exp.value) && n.exp.value > 1 && n.exp.value <= 12) {
        let terms = [Num(1)];
        const parts = b.t === 'add' ? b.args : [b];
        for (let i = 0; i < n.exp.value; i++) {
          const next = [];
          for (const t of terms) for (const p of parts) next.push(Mul(t, p));
          terms = next;
        }
        return simplify(Add(...terms));
      }
      return simplify(Pow(b, n.exp));
    }
    case 'neg': return simplify(Neg(expand(n.arg, depth + 1)));
    case 'div': return simplify(Div(expand(n.num, depth + 1), expand(n.den, depth + 1)));
    case 'fn': return simplify(Fn(n.name, n.args.map((a) => expand(a, depth + 1))));
    default: return n;
  }
}

/** تحويل تعبير إلى كثير حدود: مصفوفة معاملات [a0, a1, a2, ...] للمتغير v */
export function toPolynomial(node, v) {
  const n = expand(node);
  const coeffs = [];
  const addCoef = (i, c) => {
    coeffs[i] = (coeffs[i] || 0) + c;
  };
  const visit = (x, mul) => {
    if (x.t === 'num') { addCoef(0, mul * x.value); return true; }
    if (x.t === 'var') {
      if (x.name === v) { addCoef(1, mul); return true; }
      // متغير آخر: نتجاهل هذا الحد (معامل صفر للمتغير المستهدف)
      return true;
    }
    if (x.t === 'const') return false;
    if (x.t === 'neg') return visit(x.arg, -mul);
    if (x.t === 'add') {
      let allOk = true;
      for (const a of x.args) if (!visit(a, mul)) allOk = false;
      return allOk;
    }
    if (x.t === 'div') {
      // المقام ثابت عدديًا ⇒ نقسم المعاملات
      if (hasVar(x.den, v)) return false;
      let denVal;
      try { denVal = evaluate(x.den, {}); } catch { return false; }
      if (!Number.isFinite(denVal) || denVal === 0) return false;
      return visit(x.num, mul / denVal);
    }
if (x.t === 'mul') {
      let deg = 0, coef = mul;
      for (const f of x.args) {
        if (f.t === 'num') { coef *= f.value; continue; }
        if (f.t === 'var') {
          if (f.name === v) { deg += 1; continue; }
          // متغير آخر - الحد لا يساهم في معامل المتغير المستهدف
          return true;
        }
        if (f.t === 'pow' && f.base.t === 'var' && f.base.name === v && f.exp.t === 'num') {
          deg += f.exp.value; continue;
        }
        if (!hasVar(f, v)) {
          // عامل لا يحتوي على المتغير المستهدف - نحاول تقييمه عدديًا
          let val;
          try { val = evaluate(f, {}); } catch { return false; }
          if (!Number.isFinite(val)) return false;
          coef *= val;
          continue;
        }
        // يحتوي على المتغير المستهدف لكن ليس حدًا بسيطًا - ليس خطيًا
        return false;
      }
      addCoef(deg, coef);
      return true;
    }
    if (x.t === 'pow' && x.base.t === 'var' && x.base.name === v && x.exp.t === 'num') {
      addCoef(x.exp.value, mul);
      return true;
    }
    if (x.t === 'pow' && x.exp.t === 'num' && Number.isInteger(x.exp.value) && x.exp.value > 0) {
      // توسيع قوة ذات حدين
      const ex = expand(x);
      if (key(ex) !== key(x)) return visit(ex, mul);
    }
    return false;
  };
  if (!visit(n, 1)) return null;
  for (let i = 0; i < coeffs.length; i++) if (coeffs[i] === undefined) coeffs[i] = 0;
  if (coeffs.some((c) => !Number.isFinite(c))) return null;
  while (coeffs.length > 1 && Math.abs(coeffs[coeffs.length - 1]) < 1e-14) coeffs.pop();
  return coeffs;
}

/** تعويض قيمة متغير في تعبير */
export function substitute(node, name, value) {
  const sub = (n) => {
    if (!n || typeof n !== 'object') return n;
    if (n.t === 'var' && n.name === name) return typeof value === 'number' ? Num(value) : value;
    switch (n.t) {
      case 'add': return Add(...n.args.map(sub));
      case 'mul': return Mul(...n.args.map(sub));
      case 'neg': return Neg(sub(n.arg));
      case 'div': return Div(sub(n.num), sub(n.den));
      case 'pow': return Pow(sub(n.base), sub(n.exp));
      case 'fn': return Fn(n.name, n.args.map(sub));
      case 'eq': return { ...n, lhs: sub(n.lhs), rhs: sub(n.rhs) };
      default: return n;
    }
  };
  return simplify(sub(node));
}
