// ============================================================
//  محرك رياضي — حل المعادلات (خطية، تربيعية، كثيرات حدود، أنظمة، خاصة)
// ============================================================

import { Num, Var, Const, Add, Mul, Pow, Neg, Div, Fn, Eq, toText, hasVar, vars, clone } from './ast.js';
import { simplify, expand, key, toPolynomial, substitute } from './simplify.js';
import { toLatex } from './latex.js';
import { evaluate, fmt } from './eval.js';
import { Rat, simplifyRadical } from './rational.js';
import { parse } from './parser.js';

const L = (n) => toLatex(n);

const step = (title, latex, note) => ({ title, latex, note });

// ------------------------------------------------------------
//  حل معادلة واحدة
// ------------------------------------------------------------

/**
 * حل معادلة بمجهول واحد
 * @returns {{type, variable, solutions, steps, complex, exact, message}}
 */
export function solveEquation(ast, variable) {
  const steps = [];
  const eq = ast.t === 'eq' ? ast : Eq(ast, Num(0));
  const lhs = expand(eq.lhs);
  const rhs = expand(eq.rhs);
  const v = variable || [...vars(eq)][0] || 'x';

  steps.push(step('المعادلة الأصلية', `${L(eq.lhs)} = ${L(eq.rhs)}`));

  // نقل كل الحدود إلى طرف واحد
  const poly = simplify(Add(lhs, Neg(rhs)));
  if (key(poly) !== key(lhs)) {
    steps.push(step('ننقل جميع الحدود إلى الطرف الأيسر', `${L(poly)} = 0`));
  }

  // هل هي كثيرة حدود؟
  const coeffs = toPolynomial(poly, v);
  if (coeffs) {
    return solvePolynomial(coeffs, v, steps, poly);
  }

  // معادلات خاصة
  return solveSpecial(poly, v, steps);
}

function solvePolynomial(coeffs, v, steps, poly) {
  // إزالة المعاملات الصفرية العليا
  const c = [...coeffs];
  while (c.length > 1 && Math.abs(c[c.length - 1]) < 1e-14) c.pop();
  const degree = c.length - 1;

  if (degree === 0) {
    if (Math.abs(c[0]) < 1e-14) {
      return {
        type: 'identity', variable: v, solutions: [], infinite: true,
        steps: [...steps, step('الطرفان متساويان دائمًا', '0 = 0', 'المعادلة متطابقة: كل قيمة للمتغير تحققها')],
        message: 'المعادلة متطابقة — لعدد لا نهائي من الحلول',
      };
    }
    return {
      type: 'contradiction', variable: v, solutions: [], none: true,
      steps: [...steps, step('ظهر تناقض', `${fmt(c[0])} = 0`, 'لا يوجد أي حل')],
      message: 'لا يوجد حل (المعادلة متناقضة)',
    };
  }

  if (degree === 1) {
    const [b, a] = c;
    steps.push(step('معادلة خطية من الصورة ax + b = 0', `${L(Num(a))} ${v} ${b >= 0 ? '+' : '-'} ${L(Num(Math.abs(b)))} = 0`));
    steps.push(step('نعزل الحد الذي يحتوي المتغير', `${L(Num(a))} ${v} = ${L(Num(-b))}`));
    const sol = new Rat(Math.round(b * 1e10), Math.round(a * 1e10));
    const exact = Math.abs(sol.d) < 1e12 ? sol : null;
    steps.push(step(`نقسم على معامل ${v}`, `${v} = ${L(Num(-b))} / ${L(Num(a))} = ${L(Num(-b / a))}`));
    return {
      type: 'linear', variable: v, degree: 1,
      solutions: [-b / a],
      exact: [exact && exact.isInt ? String(exact.n) : exact ? exact.toString() : fmt(-b / a)],
      steps,
      message: `حل وحيد: ${v} = ${fmt(-b / a, 8)}`,
    };
  }

  if (degree === 2) {
    const [cc, b, a] = c;
    steps.push(step('معادلة من الدرجة الثانية بالصورة ax² + bx + c = 0',
      `${L(Num(a))}${v}^2 ${b >= 0 ? '+' : '-'} ${L(Num(Math.abs(b)))}${v} ${cc >= 0 ? '+' : '-'} ${L(Num(Math.abs(cc)))} = 0`));
    steps.push(step('نحدد المعاملات', `a = ${L(Num(a))},\\; b = ${L(Num(b))},\\; c = ${L(Num(cc))}`));
    const disc = b * b - 4 * a * cc;
    steps.push(step('نحسب المميز Δ = b² − 4ac', `\\Delta = (${fmt(b)})^2 - 4(${fmt(a)})(${fmt(cc)}) = ${fmt(disc)}`));

    if (disc > 1e-14) {
      const sq = Math.sqrt(disc);
      const r1 = (-b + sq) / (2 * a);
      const r2 = (-b - sq) / (2 * a);
      steps.push(step('Δ > 0 ⇒ جذران حقيقيان مختلفان', `\\Delta > 0`));
      steps.push(step('نستخدم القانون العام', `${v} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a} = \\frac{${fmt(-b)} \\pm \\sqrt{${fmt(disc)}}}{${fmt(2 * a)}}`));
      steps.push(step('الجذران', `${v}_1 = ${fmt(r1, 8)},\\quad ${v}_2 = ${fmt(r2, 8)}`));
      const exactForms = exactQuadratic(a, b, cc, disc);
      return {
        type: 'quadratic', variable: v, degree: 2, discriminant: disc,
        solutions: [r1, r2].sort((x, y) => y - x),
        exact: exactForms,
        steps,
        message: `جذران حقيقيان: ${v} = ${fmt(r1, 8)} و ${v} = ${fmt(r2, 8)}`,
      };
    }
    if (Math.abs(disc) < 1e-14) {
      const r = -b / (2 * a);
      steps.push(step('Δ = 0 ⇒ جذر مكرر واحد', `${v} = \\frac{-b}{2a} = ${fmt(r, 8)}`));
      return {
        type: 'quadratic', variable: v, degree: 2, discriminant: 0,
        solutions: [r], exact: [fmt(r, 8)], steps,
        message: `جذر مكرر: ${v} = ${fmt(r, 8)}`,
      };
    }
    const re = -b / (2 * a);
    const im = Math.sqrt(-disc) / (2 * a);
    steps.push(step('Δ < 0 ⇒ لا جذور حقيقية، بل جذران مركّبان مترافقان', `\\Delta = ${fmt(disc)} < 0`));
    steps.push(step('نكتب الجذور بصيغة مركبة', `${v} = ${fmt(re, 8)} \\pm ${fmt(Math.abs(im), 8)}i`));
    return {
      type: 'quadratic', variable: v, degree: 2, discriminant: disc,
      solutions: [], complex: [[re, im], [re, -im]],
      exact: [`${fmt(re, 8)} + ${fmt(Math.abs(im), 8)}i`, `${fmt(re, 8)} - ${fmt(Math.abs(im), 8)}i`],
      steps,
      message: `لا توجد حلول حقيقية — الجذور المركبة: ${fmt(re, 8)} ± ${fmt(Math.abs(im), 8)}i`,
    };
  }

  // درجة 3 أو أعلى
  return solveHigherDegree(c, v, steps);
}

function exactQuadratic(a, b, c, disc) {
  const out = [];
  const sq = Math.sqrt(disc);
  const isPerfect = Math.abs(sq - Math.round(sq)) < 1e-9;
  if (isPerfect) {
    for (const sign of [1, -1]) {
      const r = new Rat(Math.round((-b + sign * sq) * 1e9), Math.round(2 * a * 1e9));
      out.push(r.isInt ? String(r.n) : r.toString());
    }
    return out;
  }
  // تبسيط الجذر
  const rad = simplifyRadical(Math.round(disc));
  if (rad && rad.inside !== Math.round(disc)) {
    for (const sign of [1, -1]) {
      out.push(`(${fmt(-b)} ${sign > 0 ? '+' : '−'} ${rad.outside}√${rad.inside}) / ${fmt(2 * a)}`);
    }
    return out;
  }
  return [fmt((-b + sq) / (2 * a), 8), fmt((-b - sq) / (2 * a), 8)];
}

function solveHigherDegree(coeffs, v, steps) {
  steps.push(step(`معادلة من الدرجة ${coeffs.length - 1}`, `${L(coeffsToExpr(coeffs, v))} = 0`));

  // البحث عن جذور نسبية p/q
  const rationalRoots = findRationalRoots(coeffs);
  let work = [...coeffs];
  const roots = [];
  const factorNotes = [];

  for (const r of rationalRoots) {
    // قسمة تركيبية
    const res = syntheticDivide(work, r);
    if (res && Math.abs(res.remainder) < 1e-9) {
      roots.push(r);
      work = res.quotient;
      factorNotes.push(`(x − ${r})`);
    }
  }

  if (factorNotes.length) {
    steps.push(step('نجد جذورًا نسبية ونقسم (قسمة تركيبية)',
      `${L(coeffsToExpr(coeffs, v))} = ${factorNotes.join(' \\cdot ')} \\cdot \\left(${L(coeffsToExpr(work, v))}\\right)`));
  }

  // المتبقي: درجة 2 → قانون عام، درجة 1 → مباشر
  const remaining = [...work];
  while (remaining.length > 1 && Math.abs(remaining[remaining.length - 1]) < 1e-12) remaining.pop();

  if (remaining.length === 1) {
    const solutions = roots.map((r) => r);
    steps.push(step('تم إيجاد جميع الجذور', solutions.map((r) => `${v} = ${fmt(r, 8)}`).join(',\\;')));
    return {
      type: 'polynomial', variable: v, degree: coeffs.length - 1,
      solutions, exact: solutions.map((r) => fmt(r, 8)), steps,
      message: `الجذور: ${solutions.map((r) => fmt(r, 8)).join('، ')}`,
    };
  }
  if (remaining.length === 2) {
    const [b, a] = remaining;
    const r = -b / a;
    roots.push(r);
    steps.push(step('العامل الأخير من الدرجة الأولى', `${L(coeffsToExpr(remaining, v))} = 0 \\Rightarrow ${v} = ${fmt(r, 8)}`));
    return {
      type: 'polynomial', variable: v, degree: coeffs.length - 1,
      solutions: roots, exact: roots.map((x) => fmt(x, 8)), steps,
      message: `الجذور: ${roots.map((x) => fmt(x, 8)).join('، ')}`,
    };
  }
  if (remaining.length === 3) {
    const [cc, b, a] = remaining;
    const disc = b * b - 4 * a * cc;
    if (disc >= 0) {
      const sq = Math.sqrt(disc);
      const r1 = (-b + sq) / (2 * a), r2 = (-b - sq) / (2 * a);
      roots.push(r1, r2);
      steps.push(step('نحل العامل التربيعي بالقانون العام', `${v} = \\frac{${fmt(-b)} \\pm \\sqrt{${fmt(disc)}}}{${fmt(2 * a)}}`));
      return {
        type: 'polynomial', variable: v, degree: coeffs.length - 1,
        solutions: roots, exact: roots.map((x) => fmt(x, 8)), steps,
        message: `الجذور: ${roots.map((x) => fmt(x, 8)).join('، ')}`,
      };
    }
    const re = -b / (2 * a), im = Math.sqrt(-disc) / (2 * a);
    steps.push(step('العامل التربيعي بجذور مركبة', `${v} = ${fmt(re, 8)} \\pm ${fmt(Math.abs(im), 8)}i`));
    return {
      type: 'polynomial', variable: v, degree: coeffs.length - 1,
      solutions: roots, complex: [[re, im], [re, -im]],
      exact: roots.map((x) => fmt(x, 8)).concat([`${fmt(re, 8)} ± ${fmt(Math.abs(im), 8)}i`]),
      steps,
      message: `الجذور الحقيقية: ${roots.length ? roots.map((x) => fmt(x, 8)).join('، ') : 'لا يوجد'} — وجذران مركبان`,
    };
  }

  // لا يوجد حل رمزي كامل: حل عددي
  const numeric = numericRoots(coeffs);
  steps.push(step('لا يوجد تحليل نسبي كامل — نستخدم حلًا عدديًا (طريقة نيوتن)', numeric.map((r) => `${v} \\approx ${fmt(r, 8)}`).join(',\\;')));
  return {
    type: 'polynomial', variable: v, degree: coeffs.length - 1,
    solutions: numeric, exact: numeric.map((r) => fmt(r, 8)), steps, numericOnly: true,
    message: `حلول تقريبية: ${numeric.map((r) => fmt(r, 8)).join('، ')}`,
  };
}

function coeffsToExpr(coeffs, v) {
  const parts = [];
  coeffs.forEach((c, i) => {
    if (Math.abs(c) < 1e-14) return;
    const coef = Math.abs(c);
    let term;
    if (i === 0) term = Num(coef);
    else if (i === 1) term = coef === 1 ? Var(v) : Mul(Num(coef), Var(v));
    else term = coef === 1 ? Pow(Var(v), Num(i)) : Mul(Num(coef), Pow(Var(v), Num(i)));
    parts.push(c < 0 ? Neg(term) : term);
  });
  if (!parts.length) return Num(0);
  return simplify(Add(...parts));
}

function findRationalRoots(coeffs) {
  const c = [...coeffs];
  while (c.length > 1 && Math.abs(c[c.length - 1]) < 1e-12) c.pop();
  const a0 = c[0], an = c[c.length - 1];
  // جذر صفر
  const roots = [];
  let idx = 0;
  while (idx < c.length && Math.abs(c[idx]) < 1e-12) { roots.push(0); idx++; }
  const rest = c.slice(idx);
  if (rest.length < 2) return roots;

  const divisors = (n) => {
    n = Math.abs(Math.round(n));
    if (n === 0) return [0];
    const out = [];
    for (let i = 1; i * i <= n; i++) {
      if (n % i === 0) { out.push(i); if (i !== n / i) out.push(n / i); }
    }
    return out.sort((a, b) => a - b);
  };
  const ps = divisors(rest[0]);
  const qs = divisors(rest[rest.length - 1]);
  const candidates = new Set();
  for (const p of ps) for (const q of qs) {
    candidates.add(p / q);
    candidates.add(-p / q);
  }
  const found = [];
  let work = [...rest];
  for (const cand of [...candidates].sort((a, b) => Math.abs(a) - Math.abs(b))) {
    if (work.length < 2) break;
    const val = evalPoly(work, cand);
    if (Math.abs(val) < 1e-9) {
      found.push(cand);
      const res = syntheticDivide(work, cand);
      if (res) work = res.quotient;
    }
  }
  return [...roots, ...found];
}

export function evalPoly(coeffs, x) {
  let r = 0;
  for (let i = coeffs.length - 1; i >= 0; i--) r = r * x + coeffs[i];
  return r;
}

function syntheticDivide(coeffs, root) {
  const n = coeffs.length;
  if (n < 2) return null;
  const out = new Array(n - 1).fill(0);
  out[n - 2] = coeffs[n - 1];
  for (let i = n - 3; i >= 0; i--) out[i] = coeffs[i + 1] + out[i + 1] * root;
  const remainder = coeffs[0] + out[0] * root;
  return { quotient: out, remainder };
}

/** جذور عددية بطريقة نيوتن مع مسح للنقاط */
export function numericRoots(coeffs, range = 50) {
  const f = (x) => evalPoly(coeffs, x);
  const df = (x) => {
    let r = 0;
    for (let i = coeffs.length - 1; i > 0; i--) r = r * x + coeffs[i] * i;
    return r;
  };
  const roots = [];
  const N = 2000;
  const stepSize = (2 * range) / N;
  for (let i = 0; i <= N; i++) {
    let x = -range + i * stepSize;
    let y = f(x);
    if (Math.abs(y) < 1e-12) { addRoot(roots, x); continue; }
    const x2 = x + stepSize;
    const y2 = f(x2);
    if (y * y2 < 0) {
      // تنصيف + نيوتن
      let lo = x, hi = x2;
      for (let k = 0; k < 60; k++) {
        const mid = (lo + hi) / 2;
        if (f(lo) * f(mid) <= 0) hi = mid; else lo = mid;
      }
      addRoot(roots, (lo + hi) / 2);
    }
  }
  return roots.sort((a, b) => a - b);
}

function addRoot(arr, r) {
  if (!arr.some((x) => Math.abs(x - r) < 1e-6)) arr.push(parseFloat(r.toPrecision(12)));
}

// ------------------------------------------------------------
//  المعادلات الخاصة
// ------------------------------------------------------------

function solveSpecial(poly, v, steps) {
  // الجذور: √(f) = g
  if (poly.t === 'add') {
    const rad = poly.args.find((a) => a.t === 'fn' && (a.name === 'sqrt' || a.name === 'cbrt'));
    if (rad) {
      const rest = simplify(Add(...poly.args.filter((a) => a !== rad)));
      const other = simplify(Neg(rest));
      steps.push(step('معادلة جذرية: نعزل الجذر في طرف', `${L(rad)} = ${L(other)}`));
      const k = rad.name === 'sqrt' ? 2 : 3;
      const powered = simplify(Add(Pow(rad.args[0], Num(1)), Neg(Pow(other, Num(k)))));
      steps.push(step(`نرفع الطرفين للأس ${k} للتخلص من الجذر`, `${L(rad.args[0])} = ${L(Pow(other, Num(k)))}`));
      const inner = solveEquation(Eq(rad.args[0], Pow(other, Num(k))), v);
      steps.push(...inner.steps.map((s) => ({ ...s, title: '  ' + s.title })));
      // تحقق من الحلول الدخيلة
      const valid = [];
      const rejected = [];
      for (const sol of inner.solutions) {
        const val = evaluate(rad, { [v]: sol });
        const rhs = evaluate(other, { [v]: sol });
        if (Number.isFinite(val) && Math.abs(val - rhs) < 1e-6) valid.push(sol);
        else rejected.push(sol);
      }
      if (rejected.length) {
        steps.push(step('نتحقق من الحلول ونستبعد الدخيلة', `\\text{مرفوضة: } ${rejected.map((r) => fmt(r, 6)).join(', ')}`));
      }
      return {
        type: 'radical', variable: v, solutions: valid,
        exact: valid.map((r) => fmt(r, 8)), steps,
        message: valid.length ? `الحل: ${v} = ${valid.map((r) => fmt(r, 8)).join('، ')}` : 'لا يوجد حل صحيح',
      };
    }
    // القيمة المطلقة: |f| = g
    const absTerm = poly.args.find((a) => a.t === 'fn' && a.name === 'abs');
    if (absTerm) {
      const other = simplify(Neg(simplify(Add(...poly.args.filter((a) => a !== absTerm)))));
      steps.push(step('معادلة القيمة المطلقة: |f| = g', `${L(absTerm)} = ${L(other)}`));
      const s1 = solveEquation(Eq(absTerm.args[0], other), v);
      const s2 = solveEquation(Eq(absTerm.args[0], Neg(other)), v);
      const sols = [...new Set([...s1.solutions, ...s2.solutions])].sort((a, b) => b - a);
      steps.push(step('نحل الحالتين: f = g و f = −g', `${v} = ${sols.map((x) => fmt(x, 8)).join(',\\;')}`));
      return {
        type: 'absolute', variable: v, solutions: sols,
        exact: sols.map((x) => fmt(x, 8)), steps,
        message: sols.length ? `الحلول: ${sols.map((x) => fmt(x, 8)).join('، ')}` : 'لا يوجد حل',
      };
    }
    // أسية: a^x = b
    const expTerm = poly.args.find((a) => a.t === 'pow' && hasVar(a.exp, v) && !hasVar(a.base, v));
    if (expTerm) {
      const other = simplify(Neg(simplify(Add(...poly.args.filter((a) => a !== expTerm)))));
      steps.push(step('معادلة أسية', `${L(expTerm)} = ${L(other)}`));
      const b = evaluate(expTerm.base);
      const c = evaluate(other);
      if (c > 0 && b > 0 && b !== 1) {
        const sol = Math.log(c) / Math.log(b);
        steps.push(step('نأخذ لوغاريتم الطرفين', `\\ln(${fmt(b)}) \\cdot ${L(expTerm.exp)} = \\ln(${fmt(c)})`));
        steps.push(step('نحل بالنسبة للمتغير', `${v} = \\frac{\\ln ${fmt(c)}}{\\ln ${fmt(b)}} = ${fmt(sol, 8)}`));
        return {
          type: 'exponential', variable: v, solutions: [sol],
          exact: [fmt(sol, 8)], steps,
          message: `الحل: ${v} = ${fmt(sol, 8)}`,
        };
      }
    }
    // لوغاريتمية: ln(f) = g
    const logTerm = poly.args.find((a) => a.t === 'fn' && (a.name === 'ln' || a.name === 'log'));
    if (logTerm) {
      const other = simplify(Neg(simplify(Add(...poly.args.filter((a) => a !== logTerm)))));
      steps.push(step('معادلة لوغاريتمية', `${L(logTerm)} = ${L(other)}`));
      const base = logTerm.name === 'ln' ? Math.E : 10;
      const g = evaluate(other);
      const target = Math.pow(base, g);
      const inner = solveEquation(Eq(logTerm.args[0], Num(target)), v);
      const valid = inner.solutions.filter((s) => evaluate(logTerm.args[0], { [v]: s }) > 0);
      steps.push(step('نحوّل إلى الصورة الأسية', `${L(logTerm.args[0])} = ${fmt(target, 8)}`));
      return {
        type: 'logarithmic', variable: v, solutions: valid,
        exact: valid.map((x) => fmt(x, 8)), steps,
        message: valid.length ? `الحل: ${v} = ${valid.map((x) => fmt(x, 8)).join('، ')}` : 'لا يوجد حل (شرط المجال)',
      };
    }
  }

  // معادلة كسرية: نضرب في المقام
  const rational = rationalize(poly, v);
  if (rational) {
    steps.push(step('معادلة كسرية: نوحّد المقامات', `${L(rational.numerator)} = 0`));
    const inner = solveEquation(Eq(rational.numerator, Num(0)), v);
    const valid = inner.solutions.filter((s) => Math.abs(evaluate(rational.denominator, { [v]: s })) > 1e-9);
    const rejected = inner.solutions.filter((s) => Math.abs(evaluate(rational.denominator, { [v]: s })) <= 1e-9);
    steps.push(...inner.steps.map((s) => ({ ...s, title: '  ' + s.title })));
    if (rejected.length) steps.push(step('نستبعد القيم التي تُصفّر المقام', rejected.map((r) => fmt(r, 6)).join(', ')));
    return {
      type: 'rational', variable: v, solutions: valid,
      exact: valid.map((x) => fmt(x, 8)), steps,
      message: valid.length ? `الحل: ${v} = ${valid.map((x) => fmt(x, 8)).join('، ')}` : 'لا يوجد حل',
    };
  }

  // معادلة مثلثية بسيطة
  const trig = solveTrig(poly, v, steps);
  if (trig) return trig;

  // محاولة حل عددي
  const f = (x) => {
    try { return evaluate(poly, { [v]: x }); } catch { return NaN; }
  };
  const roots = [];
  for (let x = -20; x <= 20; x += 0.01) {
    const y1 = f(x), y2 = f(x + 0.01);
    if (Number.isFinite(y1) && Number.isFinite(y2) && y1 * y2 < 0) {
      let lo = x, hi = x + 0.01;
      for (let k = 0; k < 60; k++) {
        const mid = (lo + hi) / 2;
        if (f(lo) * f(mid) <= 0) hi = mid; else lo = mid;
      }
      addRoot(roots, (lo + hi) / 2);
    }
  }
  steps.push(step('لا يوجد حل رمزي مباشر — حل عددي', roots.map((r) => `${v} \\approx ${fmt(r, 8)}`).join(',\\;')));
  return {
    type: 'numeric', variable: v, solutions: roots,
    exact: roots.map((r) => fmt(r, 8)), steps, numericOnly: true,
    message: roots.length ? `حلول تقريبية: ${roots.map((r) => fmt(r, 8)).join('، ')}` : 'لم يتم إيجاد حلول في المدى المدروس',
  };
}

function rationalize(node, v) {
  const n = simplify(node);
  if (n.t === 'div') {
    return { numerator: n.num, denominator: n.den };
  }
  if (n.t === 'add') {
    const dens = [];
    let num = Num(0);
    for (const a of n.args) {
      if (a.t === 'div') {
        dens.push(a.den);
        num = Add(num, Mul(a.num, ...dens.filter((d) => d !== a.den)));
      } else {
        num = Add(num, Mul(a, ...dens));
      }
    }
    if (!dens.length) return null;
    const denominator = dens.length === 1 ? dens[0] : Mul(...dens);
    return { numerator: expand(num), denominator };
  }
  return null;
}

function solveTrig(poly, v, steps) {
  // معالجة معادلات من الصورة a·sin(x) + b = 0
  const n = simplify(poly);
  const terms = n.t === 'add' ? n.args : [n];
  const trigTerm = terms.find((t) => t.t === 'fn' && ['sin', 'cos', 'tan'].includes(t.name) &&
    t.args[0].t === 'var' && t.args[0].name === v);
  if (!trigTerm) return null;
  const rest = simplify(Neg(simplify(Add(...terms.filter((t) => t !== trigTerm)))));
  steps.push(step('معادلة مثلثية', `${L(trigTerm)} = ${L(rest)}`));
  const target = evaluate(rest);
  if (!Number.isFinite(target) || Math.abs(target) > 1) {
    return { type: 'trigonometric', variable: v, solutions: [], steps, message: 'لا يوجد حل: قيمة الدالة المثلثية خارج المدى [−1, 1]' };
  }
  const base = trigTerm.name === 'sin' ? Math.asin(target)
    : trigTerm.name === 'cos' ? Math.acos(target) : Math.atan(target);
  const solutions = [];
  if (trigTerm.name === 'sin') {
    solutions.push(base, Math.PI - base);
  } else if (trigTerm.name === 'cos') {
    solutions.push(base, -base);
  } else {
    solutions.push(base);
  }
  const period = trigTerm.name === 'tan' ? Math.PI : 2 * Math.PI;
  steps.push(step('الحل الأساسي', `${v} = ${solutions.map((s) => fmt(s, 6)).join(',\\;')}`));
  steps.push(step(`الحل العام بإضافة الدور ${trigTerm.name === 'tan' ? 'π' : '2π'}`, `${v} = ${fmt(base, 6)} + k \\cdot ${fmt(period, 6)},\\; k \\in \\mathbb{Z}`));
  return {
    type: 'trigonometric', variable: v, solutions: solutions.map((s) => parseFloat(s.toPrecision(10))),
    exact: solutions.map((s) => fmt(s, 6)), period, steps,
    message: `الحل الأساسي: ${v} = ${solutions.map((s) => fmt(s, 6)).join('، ')} (+ الدورية)`,
  };
}

// ------------------------------------------------------------
//  أنظمة المعادلات
// ------------------------------------------------------------

/**
 * حل نظام معادلات خطية بطريقة غاوس-جوردان مع الخطوات
 * @param {Array} equations قائمة {lhs, rhs}
 * @param {Array<string>} varList
 */
export function solveSystem(equations, varList) {
  const steps = [];
  const varsList = varList || [...new Set(equations.flatMap((e) => [...vars(e)]))].sort();
  const n = varsList.length;

  steps.push(step('النظام المعطى', equations.map((e) => `${L(e.lhs)} = ${L(e.rhs)}`).join(' \\\\ ')));

  // بناء المصفوفة الموسّعة: كل معادلة ⇒ مجموع a_i·v_i = ثابت
  const A = [];
  for (const e of equations) {
    const diff = expand(simplify(Add(e.lhs, Neg(e.rhs))));
    const row = [];
    // استخراج معاملات جميع المتغيرات دفعة واحدة
    for (const v of varsList) {
      const coeffs = toPolynomial(diff, v);
      if (!coeffs) return solveNonlinearSystem(equations, varsList);
      if (coeffs.length > 2) return solveNonlinearSystem(equations, varsList);
      row.push(coeffs[1] || 0);
    }
    // الحد الثابت: نعوض صفرًا لكل المتغيرات
    const constPart = evaluate(diff, Object.fromEntries(varsList.map((v) => [v, 0])));
    if (!Number.isFinite(constPart)) return solveNonlinearSystem(equations, varsList);
    row.push(-constPart);
    A.push(row);
  }

  steps.push(step('نكتب النظام في مصفوفة موسّعة', matrixLatex(A)));

  const m = A.length;
  let row = 0;
  const pivotCols = [];
  for (let col = 0; col < n && row < m; col++) {
    // اختيار المحور
    let best = row;
    for (let r = row; r < m; r++) if (Math.abs(A[r][col]) > Math.abs(A[best][col])) best = r;
    if (Math.abs(A[best][col]) < 1e-12) continue;
    [A[row], A[best]] = [A[best], A[row]];
    // توحيد المحور
    const p = A[row][col];
    for (let c = col; c <= n; c++) A[row][c] /= p;
    // إزالة من الصفوف الأخرى
    for (let r = 0; r < m; r++) {
      if (r === row) continue;
      const factor = A[r][col];
      if (Math.abs(factor) < 1e-14) continue;
      for (let c = col; c <= n; c++) A[r][c] -= factor * A[row][c];
    }
    pivotCols.push(col);
    row++;
  }

  steps.push(step('نستخدم الحذف الغاوسي (غاوس-جوردان) لتبسيط المصفوفة', matrixLatex(A)));

  // فحص التناقض
  for (let r = 0; r < m; r++) {
    const allZero = A[r].slice(0, n).every((x) => Math.abs(x) < 1e-9);
    if (allZero && Math.abs(A[r][n]) > 1e-9) {
      steps.push(step('ظهر صف متناقض: 0 = عدد غير صفري', '\\text{لا يوجد حل}'));
      return { type: 'system', variables: varsList, solutions: null, none: true, steps, message: 'النظام غير متسق — لا يوجد حل' };
    }
  }

  if (pivotCols.length < n) {
    const free = varsList.filter((_, i) => !pivotCols.includes(i));
    steps.push(step('عدد المجاهيل أكبر من الرتبة ⇒ حلول لا نهائية', `\\text{المتغيرات الحرة: } ${free.join(', ')}`));
    return {
      type: 'system', variables: varsList, solutions: null, infinite: true, freeVars: free, steps,
      message: `حلول لا نهائية (متغيرات حرة: ${free.join('، ')})`,
    };
  }

  const solution = {};
  pivotCols.forEach((col, i) => { solution[varsList[col]] = A[i][n]; });
  steps.push(step('نقرأ الحل من المصفوفة', Object.entries(solution).map(([k, val]) => `${k} = ${fmt(val, 8)}`).join(',\\;')));

  // تحقق بالتعويض
  const checks = equations.map((e) => {
    const scope = solution;
    const l = evaluate(e.lhs, scope), r = evaluate(e.rhs, scope);
    return { ok: Math.abs(l - r) < 1e-6, l, r };
  });
  steps.push(step('نتحقق بالتعويض في المعادلات الأصلية',
    checks.map((c) => (c.ok ? '\\checkmark' : '\\times')).join('\\;')));

  return {
    type: 'system', variables: varsList, solutions: solution,
    verified: checks.every((c) => c.ok), steps,
    message: 'حل وحيد: ' + Object.entries(solution).map(([k, val]) => `${k} = ${fmt(val, 8)}`).join('، '),
  };
}

function solveNonlinearSystem(equations, varsList) {
  const steps = [step('نظام غير خطي', equations.map((e) => `${L(e.lhs)} = ${L(e.rhs)}`).join(' \\\\ '))];
  if (equations.length !== 2 || varsList.length !== 2) {
    return { type: 'system', variables: varsList, solutions: null, unsupported: true, steps, message: 'الأنظمة غير الخطية المدعومة هي معادلتان بمجهولين' };
  }
  // حل عددي بطريقة نيوتن للمتغيرين
  const [v1, v2] = varsList;
  const F = equations.map((e) => (x, y) => evaluate(simplify(Add(e.lhs, Neg(e.rhs))), { [v1]: x, [v2]: y }));
  const found = [];
  for (let x0 = -5; x0 <= 5; x0 += 1) {
    for (let y0 = -5; y0 <= 5; y0 += 1) {
      let x = x0, y = y0;
      let ok = false;
      for (let k = 0; k < 60; k++) {
        const f1 = F[0](x, y), f2 = F[1](x, y);
        if (!Number.isFinite(f1) || !Number.isFinite(f2)) break;
        const h = 1e-6;
        const a11 = (F[0](x + h, y) - f1) / h, a12 = (F[0](x, y + h) - f1) / h;
        const a21 = (F[1](x + h, y) - f2) / h, a22 = (F[1](x, y + h) - f2) / h;
        const det = a11 * a22 - a12 * a21;
        if (Math.abs(det) < 1e-14) break;
        const dx = (-f1 * a22 + f2 * a12) / det;
        const dy = (-f2 * a11 + f1 * a21) / det;
        x += dx; y += dy;
        if (Math.abs(dx) + Math.abs(dy) < 1e-12) { ok = true; break; }
      }
      if (ok && Math.abs(F[0](x, y)) < 1e-8 && Math.abs(F[1](x, y)) < 1e-8) {
        if (!found.some((s) => Math.abs(s.x - x) < 1e-6 && Math.abs(s.y - y) < 1e-6)) {
          found.push({ x: parseFloat(x.toPrecision(10)), y: parseFloat(y.toPrecision(10)) });
        }
      }
    }
  }
  steps.push(step('حل عددي بطريقة نيوتن-رافسون متعددة البدايات',
    found.map((s) => `(${v1}, ${v2}) = (${fmt(s.x, 6)}, ${fmt(s.y, 6)})`).join(',\\;')));
  return {
    type: 'system', variables: varsList,
    solutions: found.length ? Object.fromEntries(found.map((s, i) => [`#${i + 1}`, s])) : null,
    points: found, steps, numericOnly: true,
    message: found.length ? `تم إيجاد ${found.length} حل` : 'لم يتم إيجاد حل',
  };
}

function matrixLatex(A) {
  const rows = A.map((r) => r.map((x) => fmt(Math.abs(x) < 1e-12 ? 0 : x, 6)).join(' & ')).join(' \\\\ ');
  return `\\left[\\begin{array}{${'c'.repeat(A[0].length - 1)}|c}${rows}\\end{array}\\right]`;
}

/** تحليل نص إلى معادلات */
export function parseEquations(text) {
  const lines = text.split(/[\n;]+/).map((s) => s.trim()).filter(Boolean);
  return lines.map((line) => {
    const ast = parse(line);
    if (ast.t === 'eq') return ast;
    if (ast.t === 'rel') return ast;
    return Eq(ast, Num(0));
  });
}

export { coeffsToExpr, syntheticDivide, findRationalRoots };
