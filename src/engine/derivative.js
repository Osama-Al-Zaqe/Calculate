// ============================================================
//  محرك رياضي — التفاضل والاشتقاق (مع خطوات الحل)
// ============================================================

import { Num, Var, Const, Add, Mul, Pow, Neg, Div, Fn, toText, hasVar } from './ast.js';
import { simplify, expand, key, toPolynomial } from './simplify.js';
import { toLatex } from './latex.js';
import { evaluate, fmt } from './eval.js';

const L = (n) => toLatex(n);

/** اشتقاق تعبير بالنسبة إلى v مع تسجيل الخطوات */
export function differentiate(node, v = 'x', steps = []) {
  const s = simplify(node);
  const push = (title, expr) => steps.push({ title, latex: L(expr) });

  const d = (n) => differentiate(n, v, steps);

  switch (s.t) {
    case 'num':
      push(`مشتقة الثابت ${L(s)} هي صفر`, Num(0));
      return Num(0);
    case 'const':
      push(`مشتقة الثابت ${L(s)} هي صفر`, Num(0));
      return Num(0);
    case 'var':
      if (s.name === v) {
        push(`مشتقة ${v} بالنسبة لـ ${v} تساوي 1`, Num(1));
        return Num(1);
      }
      push(`${s.name} ثابت بالنسبة لـ ${v}، فمشتقتها صفر`, Num(0));
      return Num(0);
    case 'neg': {
      const r = simplify(Neg(d(s.arg)));
      push('قاعدة الثابت السالب: (c·f)′ = c·f′', r);
      return r;
    }
    case 'add': {
      const parts = s.args.map((a) => d(a));
      const r = simplify(Add(...parts));
      push('قاعدة الجمع: مشتقة المجموع = مجموع المشتقات', r);
      return r;
    }
    case 'mul': {
      // قاعدة الضرب
      const [f, ...rest] = s.args;
      if (rest.length === 1) {
        const g = rest[0];
        const df = d(f), dg = d(g);
        const r = simplify(Add(Mul(df, g), Mul(f, dg)));
        push(`قاعدة الضرب: (f·g)′ = f′·g + f·g′ حيث f = ${L(f)} و g = ${L(g)}`, r);
        return r;
      }
      // ضرب متعدد: مشتقة حاصل الضرب
      let acc = Num(0);
      for (let i = 0; i < s.args.length; i++) {
        const others = s.args.filter((_, j) => j !== i);
        acc = Add(acc, Mul(d(s.args[i]), ...others));
      }
      const r = simplify(acc);
      push('قاعدة الضرب الموسّعة (مشتقة حاصل ضرب عدة عوامل)', r);
      return r;
    }
    case 'div': {
      const { num: f, den: g } = s;
      const df = d(f), dg = d(g);
      const r = simplify(Div(Add(Mul(df, g), Neg(Mul(f, dg))), Pow(g, Num(2))));
      push(`قاعدة القسمة: (f/g)′ = (f′·g − f·g′)/g² حيث f = ${L(f)}، g = ${L(g)}`, r);
      return r;
    }
    case 'pow': {
      const { base, exp } = s;
      const baseHasV = hasVar(base, v);
      const expHasV = hasVar(exp, v);
      if (!expHasV) {
        // (f^n)' = n f^(n-1) f'
        const df = d(base);
        const n = exp;
        const r = simplify(Mul(n, Pow(base, simplify(Add(n, Num(-1)))), df));
        push(`قاعدة القوة: (f^n)′ = n·f^(n−1)·f′ حيث f = ${L(base)} و n = ${L(n)}`, r);
        return r;
      }
      if (!baseHasV) {
        // (a^g)' = a^g ln(a) g'
        const dg = d(exp);
        const r = simplify(Mul(s, Fn('ln', [base]), dg));
        push(`مشتقة دالة أسية: (a^g)′ = a^g·ln(a)·g′`, r);
        return r;
      }
      // f^g = e^(g ln f) ⇒ مشتقة لوغاريتمية
      const dg = d(exp), df = d(base);
      const inner = simplify(Add(Mul(dg, Fn('ln', [base])), Div(Mul(exp, df), base)));
      const r = simplify(Mul(s, inner));
      push('اشتقاق لوغاريتمي: f^g = e^(g·ln f) ثم نشتق', r);
      return r;
    }
    case 'fn': {
      const { name, args } = s;
      const [u] = args;
      const du = d(u);
      const chain = (outer) => {
        const r = simplify(Mul(outer, du));
        push(`قاعدة السلسلة: [f(u)]′ = f′(u)·u′ حيث u = ${L(u)}`, r);
        return r;
      };
      switch (name) {
        case 'sin': return chain(Fn('cos', [u]));
        case 'cos': return chain(Neg(Fn('sin', [u])));
        case 'tan': return chain(Div(Num(1), Pow(Fn('cos', [u]), Num(2))));
        case 'cot': return chain(Neg(Div(Num(1), Pow(Fn('sin', [u]), Num(2)))));
        case 'sec': return chain(Mul(Fn('sec', [u]), Fn('tan', [u])));
        case 'csc': return chain(Neg(Mul(Fn('csc', [u]), Fn('cot', [u]))));
        case 'asin': case 'arcsin':
          return chain(Div(Num(1), Fn('sqrt', [Add(Num(1), Neg(Pow(u, Num(2))))])));
        case 'acos': case 'arccos':
          return chain(Neg(Div(Num(1), Fn('sqrt', [Add(Num(1), Neg(Pow(u, Num(2))))]))));
        case 'atan': case 'arctan':
          return chain(Div(Num(1), Add(Num(1), Pow(u, Num(2)))));
        case 'acot':
          return chain(Neg(Div(Num(1), Add(Num(1), Pow(u, Num(2))))));
        case 'sinh': return chain(Fn('cosh', [u]));
        case 'cosh': return chain(Fn('sinh', [u]));
        case 'tanh': return chain(Add(Num(1), Neg(Pow(Fn('tanh', [u]), Num(2)))));
        case 'ln': return chain(Div(Num(1), u));
        case 'log':
          if (args.length === 2) return chain(Div(Num(1), Mul(u, Fn('ln', [args[0]]))));
          return chain(Div(Num(1), Mul(u, Fn('ln', [Num(10)]))));
        case 'lg': return chain(Div(Num(1), Mul(u, Fn('ln', [Num(10)]))));
        case 'log2': return chain(Div(Num(1), Mul(u, Fn('ln', [Num(2)]))));
        case 'exp': return chain(Fn('exp', [u]));
        case 'sqrt': return chain(Div(Num(1), Mul(Num(2), Fn('sqrt', [u]))));
        case 'cbrt': return chain(Div(Num(1), Mul(Num(3), Pow(Fn('cbrt', [u]), Num(2)))));
        case 'abs': return chain(Div(u, Fn('abs', [u])));
        case 'sign': case 'sgn': return Num(0);
        default: {
          // اشتقاق عددي للدوال غير المعروفة
          push(`الدالة ${name} غير مدعومة رمزيًا — تُترك كما هي`, s);
          return s;
        }
      }
    }
    default:
      return Num(0);
  }
}

/** المشتقة النونية */
export function nthDerivative(node, v, n, steps = []) {
  let cur = simplify(node);
  const results = [];
  for (let i = 1; i <= n; i++) {
    const s = [];
    cur = simplify(differentiate(cur, v, s));
    results.push({ order: i, expr: cur });
    if (steps) steps.push({ title: `المشتقة من الرتبة ${i}`, latex: L(cur), sub: s });
  }
  return { expr: cur, results };
}

/** الاشتقاق عند نقطة */
export function derivativeAt(node, v, point) {
  const s = [];
  const d = simplify(differentiate(node, v, s));
  const value = evaluate(d, { [v]: point });
  return { derivative: d, value, steps: s };
}

/** الاشتقاق الضمني: F(x,y)=0 → dy/dx = -F_x / F_y */
export function implicitDerivative(F, xv = 'x', yv = 'y') {
  const s1 = [], s2 = [];
  const Fx = simplify(differentiate(F, xv, s1));
  const Fy = simplify(differentiate(F, yv, s2));
  const dydx = simplify(Neg(Div(Fx, Fy)));
  return { Fx, Fy, dydx, steps: [...s1, ...s2] };
}

/** الاشتقاق اللوغاريتمي */
export function logDerivative(node, v = 'x') {
  const steps = [];
  const lnf = Fn('ln', [node]);
  steps.push({ title: 'نأخذ اللوغاريتم الطبيعي للطرفين', latex: `\\ln(y) = \\ln\\left(${L(node)}\\right)` });
  const dln = simplify(differentiate(lnf, v, steps));
  const yTimes = simplify(Mul(node, dln));
  steps.push({ title: 'نضرب في y للحصول على المشتقة', latex: `y' = ${L(yTimes)}` });
  return { result: yTimes, steps };
}

/** حساب المماس عند نقطة */
export function tangentLine(node, v, x0) {
  const s = [];
  const d = simplify(differentiate(node, v, s));
  const y0 = evaluate(node, { [v]: x0 });
  const m = evaluate(d, { [v]: x0 });
  const b = y0 - m * x0;
  return { slope: m, y0, intercept: b, line: `y = ${fmt(m, 6)}x ${b >= 0 ? '+' : '−'} ${fmt(Math.abs(b), 6)}`, derivative: d };
}

export { L as latexOfExpr };
