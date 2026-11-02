// ============================================================
//  محرك رياضي — التكامل (رمزي + عددي مع خطوات)
// ============================================================

import { Num, Var, Const, Add, Mul, Pow, Neg, Div, Fn, toText, hasVar, vars, clone } from './ast.js';
import { simplify, expand, key } from './simplify.js';
import { toLatex } from './latex.js';
import { evaluate, fmt } from './eval.js';
import { differentiate } from './derivative.js';

const L = (n) => toLatex(n);

/** تكامل عددي بطريقة سيمبسون التكيفية */
export function adaptiveSimpson(f, a, b, tol = 1e-10) {
  const simpson = (a, b, fa, fm, fb) => ((b - a) / 6) * (fa + 4 * fm + fb);
  const rec = (a, b, fa, fm, fb, whole, depth) => {
    const m = (a + b) / 2;
    const lm = (a + m) / 2, rm = (m + b) / 2;
    const flm = f(lm), frm = f(rm);
    const left = simpson(a, m, fa, flm, fm);
    const right = simpson(m, b, fm, frm, fb);
    const delta = left + right - whole;
    if (depth <= 0 || Math.abs(delta) < 15 * tol) return left + right + delta / 15;
    return rec(a, m, fa, flm, fm, left, depth - 1) + rec(m, b, fm, frm, fb, right, depth - 1);
  };
  let fa, fb, fm;
  try { fa = f(a); } catch { fa = f(a + 1e-12); }
  try { fb = f(b); } catch { fb = f(b - 1e-12); }
  fm = f((a + b) / 2);
  if (!Number.isFinite(fa) || !Number.isFinite(fb) || !Number.isFinite(fm)) {
    // نقطة شاذة: نزيح قليلًا
    const eps = (b - a) * 1e-9;
    return rec(a + eps, b - eps, f(a + eps), f((a + b) / 2), f(b - eps), 0, 50);
  }
  return rec(a, b, fa, fm, fb, simpson(a, b, fa, fm, fb), 50);
}

/** تكامل عددي لتعابير ذات نقاط شاذة (تقريب متعدد النقاط) */
export function numericIntegral(node, v, a, b, opts = {}) {
  const f = (x) => evaluate(node, { [v]: x }, opts);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return improperIntegral(f, a, b);
  }
  return adaptiveSimpson(f, a, b);
}

function improperIntegral(f, a, b) {
  const sign = a > b ? -1 : 1;
  const [lo, hi] = a > b ? [b, a] : [a, b];
  const toInf = (start, dir) => {
    let total = 0;
    let x = start;
    let step = 1;
    for (let i = 0; i < 60; i++) {
      const next = x + dir * step;
      const part = adaptiveSimpson(f, x, next, 1e-9);
      if (!Number.isFinite(part)) return NaN;
      total += part;
      x = next;
      step *= 2;
      if (Math.abs(part) < 1e-12) break;
    }
    return total;
  };
  if (!Number.isFinite(lo) && !Number.isFinite(hi)) {
    return sign * (toInf(0, 1) + toInf(0, -1));
  }
  if (!Number.isFinite(hi)) return sign * toInf(lo, 1);
  return sign * toInf(hi, -1);
}

/** تحقق من صحة التكامل بالاشتقاق */
export function verifyIntegral(antiderivative, integrand, v) {
  try {
    const d = simplify(differentiate(antiderivative, v, []));
    const diff = simplify(Add(d, Neg(simplify(integrand))));
    // اختبار عددي عند عدة نقاط
    const pts = [0.37, 1.13, 2.71, -0.83];
    let ok = true;
    for (const p of pts) {
      const a = evaluate(d, { [v]: p });
      const b = evaluate(integrand, { [v]: p });
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      if (Math.abs(a - b) > 1e-6 * Math.max(1, Math.abs(b))) { ok = false; break; }
    }
    return { ok, derivative: d, difference: diff };
  } catch {
    return { ok: false };
  }
}

/** تكامل رمزي: يعيد {expr, steps, method} أو null */
export function integrate(node, v = 'x', steps = []) {
  const f = simplify(node);
  const push = (title, latex) => steps.push({ title, latex });

  const I = (n) => integrate(n, v, steps);

  // صفر
  if (f.t === 'num' || f.t === 'const') {
    const r = simplify(Mul(f, Var(v)));
    push(`تكامل ثابت: ∫ c dx = c·x`, `${L(r)} + C`);
    return r;
  }
  if (f.t === 'var' && f.name === v) {
    const r = simplify(Div(Pow(Var(v), Num(2)), Num(2)));
    push(`∫ x dx = x²/2`, `${L(r)} + C`);
    return r;
  }
  if (!hasVar(f, v)) {
    const r = simplify(Mul(f, Var(v)));
    push(`العامل ${L(f)} ثابت بالنسبة لـ ${v}`, `${L(r)} + C`);
    return r;
  }
  if (f.t === 'add') {
    const parts = f.args.map((a) => I(a));
    if (parts.some((p) => p === null)) return null;
    const r = simplify(Add(...parts));
    push('قاعدة الجمع: ∫(f + g) dx = ∫f dx + ∫g dx', `${L(r)} + C`);
    return r;
  }
  if (f.t === 'neg') {
    const inner = I(f.arg);
    if (inner === null) return null;
    return simplify(Neg(inner));
  }
  if (f.t === 'mul') {
    // نجرّب التعويض على حاصل الضرب كاملًا أولًا (مثل ∫2x·e^(x²)dx)
    const subProd = trySubstitution(f, v, steps);
    if (subProd) return subProd;
    const consts = f.args.filter((a) => !hasVar(a, v));
    const vars = f.args.filter((a) => hasVar(a, v));
    if (consts.length && vars.length) {
      const inner = I(vars.length === 1 ? vars[0] : Mul(...vars));
      if (inner === null) return null;
      const c = consts.length === 1 ? consts[0] : Mul(...consts);
      const r = simplify(Mul(c, inner));
      push('إخراج الثابت خارج التكامل: ∫ c·f dx = c·∫f dx', `${L(r)} + C`);
      return r;
    }
  }
  if (f.t === 'pow') {
    const { base, exp } = f;
    if (base.t === 'var' && base.name === v && exp.t === 'num' && exp.value !== -1) {
      const n = exp.value;
      const r = simplify(Div(Pow(Var(v), Num(n + 1)), Num(n + 1)));
      push(`قاعدة القوة: ∫ x^n dx = x^(n+1)/(n+1)`, `${L(r)} + C`);
      return r;
    }
    if (base.t === 'var' && base.name === v && exp.t === 'num' && exp.value === -1) {
      const r = Fn('ln', [Fn('abs', [Var(v)])]);
      push('∫ (1/x) dx = ln|x|', `${L(r)} + C`);
      return r;
    }
    // 1/x^n
    if (base.t === 'var' && base.name === v && exp.t === 'neg' && exp.arg.t === 'num') {
      const n = -exp.arg.value;
      const r = simplify(Div(Pow(Var(v), Num(1 - n)), Num(1 - n)));
      push(`∫ x^(−n) dx`, `${L(r)} + C`);
      return r;
    }
  }
  if (f.t === 'div') {
    const { num, den } = f;
    // c / x
    if (!hasVar(num, v) && den.t === 'var' && den.name === v) {
      const r = simplify(Mul(num, Fn('ln', [Fn('abs', [Var(v)])])));
      push('∫ c/x dx = c·ln|x|', `${L(r)} + C`);
      return r;
    }
    // 1/(ax+b)
    if (num.t === 'num' && num.value === 1 && den.t === 'add') {
      const lin = linearParts(den, v);
      if (lin) {
        const r = simplify(Div(Fn('ln', [Fn('abs', [den])]), Num(lin.a)));
        push('∫ dx/(ax+b) = (1/a)·ln|ax+b|', `${L(r)} + C`);
        return r;
      }
    }
    // كثير حدود / كثير حدود
    const np = polynomialCoeffs(num, v), dp = polynomialCoeffs(den, v);
    if (np && dp && dp.length > 1) {
      const q = polyDivide(np, dp);
      if (q) {
        const r = integratePoly(q.quotient, v, steps);
        if (q.remainder.some((c) => Math.abs(c) > 1e-12)) {
          push('قسمة كثيرات الحدود: نقسم البسط على المقام أولًا', `${L(r)} + \\int \\frac{${L(q.remainderExpr)}}{${L(den)}} dx + C`);
        }
        return r;
      }
    }
  }
  if (f.t === 'fn') {
    const { name, args } = f;
    const [u] = args;
    if (u.t === 'var' && u.name === v) {
      const table = {
        sin: Neg(Fn('cos', [Var(v)])),
        cos: Fn('sin', [Var(v)]),
        tan: Neg(Fn('ln', [Fn('abs', [Fn('cos', [Var(v)])])])),
        cot: Fn('ln', [Fn('abs', [Fn('sin', [Var(v)])])]),
        sec: Fn('ln', [Fn('abs', [Add(Fn('sec', [Var(v)]), Fn('tan', [Var(v)]))])]),
        csc: Neg(Fn('ln', [Fn('abs', [Add(Fn('csc', [Var(v)]), Fn('cot', [Var(v)]))])])),
        exp: Fn('exp', [Var(v)]),
        sinh: Fn('cosh', [Var(v)]),
        cosh: Fn('sinh', [Var(v)]),
        tanh: Fn('ln', [Fn('cosh', [Var(v)])]),
        '1/x': null,
      };
      if (table[name] !== undefined && table[name] !== null) {
        const r = simplify(table[name]);
        push(`تكامل أساسي: ∫ ${name}(x) dx`, `${L(r)} + C`);
        return r;
      }
      if (name === 'ln') {
        const r = simplify(Add(Mul(Var(v), Fn('ln', [Var(v)])), Neg(Var(v))));
        push('∫ ln(x) dx = x·ln(x) − x (بالتجزئة)', `${L(r)} + C`);
        return r;
      }
      if (name === 'sqrt') {
        const r = simplify(Div(Mul(Num(2), Pow(Var(v), Num(1.5))), Num(3)));
        push('∫ √x dx = (2/3)x^(3/2)', `${L(r)} + C`);
        return r;
      }
    }
  }

  // التعويض: جرّب u = دالة داخلية
  const sub = trySubstitution(f, v, steps);
  if (sub) return sub;

  // التجزئة
  const parts = tryByParts(f, v, steps);
  if (parts) return parts;

  // دوال خطية داخل دوال مثلثية/أسية: ∫ sin(ax+b) dx
  const linearFn = tryLinearInner(f, v, steps);
  if (linearFn) return linearFn;

  return null;
}

function linearParts(node, v) {
  const c = polynomialCoeffs(node, v);
  if (!c || c.length > 2) return null;
  return { a: c[1] || 0, b: c[0] || 0 };
}

function polynomialCoeffs(node, v) {
  const ex = expand(node);
  const coeffs = [];
  const visit = (x, mul) => {
    if (x.t === 'num') { coeffs[0] = (coeffs[0] || 0) + mul * x.value; return true; }
    if (x.t === 'var') {
      if (x.name === v) { coeffs[1] = (coeffs[1] || 0) + mul; return true; }
      return false;
    }
    if (x.t === 'neg') return visit(x.arg, -mul);
    if (x.t === 'add') return x.args.every((a) => visit(a, mul));
    if (x.t === 'mul') {
      let deg = 0, coef = mul;
      for (const f of x.args) {
        if (f.t === 'num') { coef *= f.value; continue; }
        if (f.t === 'var' && f.name === v) { deg++; continue; }
        if (f.t === 'pow' && f.base.t === 'var' && f.base.name === v && f.exp.t === 'num') { deg += f.exp.value; continue; }
        return false;
      }
      coeffs[deg] = (coeffs[deg] || 0) + coef;
      return true;
    }
    if (x.t === 'pow' && x.base.t === 'var' && x.base.name === v && x.exp.t === 'num') {
      coeffs[x.exp.value] = (coeffs[x.exp.value] || 0) + mul;
      return true;
    }
    return false;
  };
  if (!visit(ex, 1)) return null;
  for (let i = 0; i < coeffs.length; i++) if (coeffs[i] === undefined) coeffs[i] = 0;
  while (coeffs.length > 1 && Math.abs(coeffs[coeffs.length - 1]) < 1e-14) coeffs.pop();
  return coeffs;
}

function polyDivide(num, den) {
  const n = [...num];
  const d = [...den];
  const q = new Array(Math.max(1, n.length - d.length + 1)).fill(0);
  for (let i = n.length - 1; i >= d.length - 1; i--) {
    const coef = n[i] / d[d.length - 1];
    q[i - (d.length - 1)] = coef;
    for (let j = 0; j < d.length; j++) n[i - j] -= coef * d[d.length - 1 - j];
  }
  const rem = n.slice(0, d.length - 1);
  const remExpr = coeffsToExpr(rem, 'x');
  return { quotient: q, remainder: rem, remainderExpr: remExpr };
}

function coeffsToExpr(coeffs, v) {
  const terms = [];
  coeffs.forEach((c, i) => {
    if (Math.abs(c) < 1e-14) return;
    if (i === 0) terms.push(Num(c));
    else if (i === 1) terms.push(c === 1 ? Var(v) : Mul(Num(c), Var(v)));
    else terms.push(Mul(Num(c), Pow(Var(v), Num(i))));
  });
  if (!terms.length) return Num(0);
  return simplify(Add(...terms));
}

function integratePoly(coeffs, v, steps) {
  const terms = coeffs.map((c, i) => {
    if (Math.abs(c) < 1e-14) return Num(0);
    return simplify(Div(Mul(Num(c), Pow(Var(v), Num(i + 1))), Num(i + 1)));
  });
  return simplify(Add(...terms));
}

/** التعويض u = g(x) */
function trySubstitution(f, v, steps) {
  const candidates = [];
  const collect = (n, depth = 0) => {
    if (!n || typeof n !== 'object' || depth > 4) return;
    if (n.t === 'add' || n.t === 'mul' || n.t === 'pow' || n.t === 'fn' || n.t === 'div') {
      if (hasVar(n, v)) candidates.push(n);
    }
    if (n.t === 'pow') { collect(n.base, depth + 1); collect(n.exp, depth + 1); }
    if (n.t === 'fn') n.args.forEach((a) => collect(a, depth + 1));
    if (n.t === 'mul') n.args.forEach((a) => collect(a, depth + 1));
    if (n.t === 'add') n.args.forEach((a) => collect(a, depth + 1));
    if (n.t === 'div') { collect(n.num, depth + 1); collect(n.den, depth + 1); }
    if (n.t === 'neg') collect(n.arg, depth + 1);
  };
  collect(f);

  // نرتّب المرشحين: نجرّب أولًا التعبيرات الداخلية البسيطة (x²) ثم الأكثر تعقيدًا (exp(x²))
  const score = (n) => {
    if (n.t === 'mul') return 4;
    if (n.t === 'add') return 3;
    if (n.t === 'fn') return 2;
    if (n.t === 'pow') return 1;
    return 0;
  };
  candidates.sort((a, b) => score(a) - score(b));

  for (const cand of candidates) {
    const s = simplify(cand);
    const ds = simplify(differentiate(s, v, []));
    if (ds.t === 'num' || !hasVar(ds, v)) continue;
    const substitutedQuotient = simplify(replaceVar(Div(f, ds), s, Var('u')));
    if (!hasVar(substitutedQuotient, v)) {
      const inner = integrate(substitutedQuotient, 'u', []);
      if (inner === null) continue;
      const result = simplify(replaceVar(inner, 'u', s));
      steps.push({
        title: `التكامل بالتعويض: نضع u = ${L(s)} فيكون du = ${L(ds)} dx`,
        latex: `\\int ${L(substitutedQuotient)}\\,du = ${L(replaceVar(inner, 'u', Var('u')))} + C = ${L(result)} + C`,
      });
      return result;
    }
  }
  return null;
}

function replaceVar(node, from, to) {
  const isPattern = from && typeof from === 'object';
  const same = (a, b) => {
    if (a.t !== b.t) return false;
    if (a.t === 'var') return a.name === b.name;
    if (a.t === 'num') return Math.abs(a.value - b.value) < 1e-14;
    if (a.t === 'const') return a.name === b.name;
    if (a.t === 'add' || a.t === 'mul') {
      return a.args.length === b.args.length && a.args.every((x, i) => same(x, b.args[i]));
    }
    if (a.t === 'pow') return same(a.base, b.base) && same(a.exp, b.exp);
    if (a.t === 'fn') return a.name === b.name && a.args.length === b.args.length && a.args.every((x, i) => same(x, b.args[i]));
    return false;
  };
  const rep = (n) => {
    if (!n || typeof n !== 'object') return n;
    if (isPattern) { if (same(n, from)) return clone(to); }
    else if (n.t === 'var' && n.name === from) return clone(to);
    switch (n.t) {
      case 'add': return Add(...n.args.map(rep));
      case 'mul': return Mul(...n.args.map(rep));
      case 'neg': return Neg(rep(n.arg));
      case 'div': return Div(rep(n.num), rep(n.den));
      case 'pow': return Pow(rep(n.base), rep(n.exp));
      case 'fn': return Fn(n.name, n.args.map(rep));
      default: return n;
    }
  };
  return rep(node);
}

/** التكامل بالتجزئة ∫u dv = uv − ∫v du */
function tryByParts(f, v, steps) {
  if (f.t !== 'mul') return null;
  const factors = f.args;
  if (factors.length !== 2) return null;
  const [a, b] = factors;
  const isPoly = (n) => {
    const c = polynomialCoeffs(n, v);
    return c !== null && c.length <= 3;
  };
  // u = كثير حدود، dv = الباقي
  let u, dv;
  if (isPoly(a) && !isPoly(b)) { u = a; dv = b; }
  else if (isPoly(b) && !isPoly(a)) { u = b; dv = a; }
  else return null;

  const du = simplify(differentiate(u, v, []));
  const vv = integrate(dv, v, []);
  if (vv === null) return null;
  const second = integrate(simplify(Mul(vv, du)), v, []);
  if (second === null) return null;
  const result = simplify(Add(Mul(u, vv), Neg(second)));
  steps.push({
    title: `التكامل بالتجزئة: ∫u·dv = u·v − ∫v·du حيث u = ${L(u)} و dv = ${L(dv)} dx`,
    latex: `${L(u)} \\cdot ${L(vv)} - \\int ${L(vv)} \\cdot ${L(du)}\\,dx = ${L(result)} + C`,
  });
  return result;
}

/** ∫ sin(ax+b) dx ونظائرها */
function tryLinearInner(f, v, steps) {
  if (f.t !== 'fn') return null;
  const [u] = f.args;
  const lin = linearParts(u, v);
  if (!lin || lin.a === 0) return null;
  const inner = integrate(Fn(f.name, [Var(v)]), v, []);
  if (inner === null) return null;
  const result = simplify(Div(replaceVar(inner, 'x', u), Num(lin.a)));
  steps.push({
    title: `دالة داخلية خطية: u = ${L(u)}، du = ${lin.a} dx`,
    latex: `\\frac{1}{${lin.a}} \\cdot ${L(replaceVar(inner, 'x', Var('u')))} + C = ${L(result)} + C`,
  });
  return result;
}

/** التكامل المحدد: يحاول رمزيًا ثم عدديًا */
export function definiteIntegral(node, v, a, b, opts = {}) {
  const steps = [];
  const antiderivative = integrate(node, v, steps);
  if (antiderivative) {
    try {
      const Fa = evaluate(antiderivative, { [v]: a }, opts);
      const Fb = evaluate(antiderivative, { [v]: b }, opts);
      if (Number.isFinite(Fa) && Number.isFinite(Fb)) {
        const value = Fb - Fa;
        const numeric = numericIntegral(node, v, a, b, opts);
        const verified = Math.abs(value - numeric) < 1e-6 * Math.max(1, Math.abs(numeric));
        return {
          symbolic: true,
          antiderivative,
          value,
          numeric,
          verified,
          steps: [
            ...steps,
            { title: 'نطبّق نظرية نيوتن-لايبنتز: F(b) − F(a)', latex: `\\left[${L(antiderivative)}\\right]_{${fmt(a, 6)}}^{${fmt(b, 6)}} = F(${fmt(b, 6)}) - F(${fmt(a, 6)})` },
            { title: 'التعويض بالحدود', latex: `${fmt(Fb, 8)} - (${fmt(Fa, 8)}) = ${fmt(value, 8)}` },
          ],
        };
      }
    } catch { /* ننتقل للعددي */ }
  }
  const numeric = numericIntegral(node, v, a, b, opts);
  return {
    symbolic: false,
    value: numeric,
    numeric,
    verified: Number.isFinite(numeric),
    steps: [
      { title: 'لا يوجد حل رمزي مباشر — نستخدم تكاملًا عدديًا (سيمبسون التكيفي)', latex: `\\int_{${fmt(a, 6)}}^{${fmt(b, 6)}} ${L(node)} \\, d${v} \\approx ${fmt(numeric, 10)}` },
    ],
  };
}

/** المساحة بين منحنيين */
export function areaBetween(f1, f2, v, a, b) {
  const diff = simplify(Add(f1, Neg(f2)));
  const value = numericIntegral(diff, v, a, b);
  return { value, diff };
}

export { replaceVar };
