// ============================================================
//  محرك رياضي رمزي — الحساب العددي الآمن (بدون eval)
// ============================================================

import { MathSyntaxError } from './lexer.js';

const D2R = Math.PI / 180;

export function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) {
    if (Number.isInteger(n) && n < 0) return NaN;
    return gamma(n + 1);
  }
  if (n > 170) return Infinity;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

// تقريب دالة جاما (Lanczos) للاستخدام في التكاملات
function gamma(z) {
  const g = 7;
  const C = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  z -= 1;
  let x = C[0];
  for (let i = 1; i < g + 2; i++) x += C[i] / (z + i);
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

export function nCr(n, r) {
  if (r < 0 || n < 0) return NaN;
  if (!Number.isInteger(n) || !Number.isInteger(r)) return factorial(n) / (factorial(r) * factorial(n - r));
  if (r > n) return 0;
  r = Math.min(r, n - r);
  let res = 1;
  for (let i = 1; i <= r; i++) res = (res * (n - r + i)) / i;
  return Math.round(res);
}

export function nPr(n, r) {
  if (r > n) return 0;
  let res = 1;
  for (let i = 0; i < r; i++) res *= n - i;
  return res;
}

export function gcd(a, b) {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

/**
 * حساب قيمة تعبير عدديًا
 * @param {object} node شجرة التعبير
 * @param {object} scope قيم المتغيرات {x:2}
 * @param {object} opts {angle:'rad'|'deg'}
 */
export function evaluate(node, scope = {}, opts = {}) {
  const angle = opts.angle || 'rad';
  const toRad = (v) => (angle === 'deg' ? v * D2R : v);
  const fromRad = (v) => (angle === 'deg' ? v / D2R : v);

  const ev = (n) => {
    if (!n) throw new MathSyntaxError('تعبير فارغ', 0);
    switch (n.t) {
      case 'num': return n.value;
      case 'const':
        if (n.name === 'pi') return Math.PI;
        if (n.name === 'e') return Math.E;
        if (n.name === 'inf') return Infinity;
        return NaN;
      case 'var': {
        if (n.name in scope) return scope[n.name];
        if (n.name === 'pi') return Math.PI;
        if (n.name === 'e') return Math.E;
        throw new MathSyntaxError(`المتغير "${n.name}" غير معروف`, 0);
      }
      case 'add': return n.args.reduce((s, a) => s + ev(a), 0);
      case 'mul': return n.args.reduce((s, a) => s * ev(a), 1);
      case 'neg': return -ev(n.arg);
      case 'div': return ev(n.num) / ev(n.den);
      case 'pow': {
        const b = ev(n.base), e = ev(n.exp);
        if (b < 0 && !Number.isInteger(e)) {
          // الأسس الكسرية للأعداد السالبة: نستخدم الجذر الحقيقي للمقام الفردي
          const inv = 1 / e;
          const rounded = Math.round(inv);
          if (Math.abs(inv - rounded) < 1e-9 && rounded % 2 !== 0) {
            return Math.sign(b) * Math.pow(Math.abs(b), e);
          }
          return NaN;
        }
        return Math.pow(b, e);
      }
      case 'fn': {
        const a = n.args.map(ev);
        switch (n.name) {
          case 'sin': return Math.sin(toRad(a[0]));
          case 'cos': return Math.cos(toRad(a[0]));
          case 'tan': return Math.tan(toRad(a[0]));
          case 'cot': return 1 / Math.tan(toRad(a[0]));
          case 'sec': return 1 / Math.cos(toRad(a[0]));
          case 'csc': return 1 / Math.sin(toRad(a[0]));
          case 'asin': case 'arcsin': return fromRad(Math.asin(a[0]));
          case 'acos': case 'arccos': return fromRad(Math.acos(a[0]));
          case 'atan': case 'arctan': return fromRad(Math.atan(a[0]));
          case 'acot': return fromRad(Math.atan(1 / a[0]));
          case 'asec': return fromRad(Math.acos(1 / a[0]));
          case 'acsc': return fromRad(Math.asin(1 / a[0]));
          case 'sinh': return Math.sinh(a[0]);
          case 'cosh': return Math.cosh(a[0]);
          case 'tanh': return Math.tanh(a[0]);
          case 'coth': return 1 / Math.tanh(a[0]);
          case 'sech': return 1 / Math.cosh(a[0]);
          case 'csch': return 1 / Math.sinh(a[0]);
          case 'asinh': return Math.asinh(a[0]);
          case 'acosh': return Math.acosh(a[0]);
          case 'atanh': return Math.atanh(a[0]);
          case 'ln': return Math.log(a[0]);
          case 'log': return a.length > 1 ? Math.log(a[1]) / Math.log(a[0]) : Math.log10(a[0]);
          case 'lg': return Math.log10(a[0]);
          case 'log2': return Math.log2(a[0]);
          case 'exp': return Math.exp(a[0]);
          case 'sqrt': return Math.sqrt(a[0]);
          case 'cbrt': return Math.cbrt(a[0]);
          case 'root': return a[1] < 0 && Math.round(a[1]) % 2 !== 0
            ? -Math.pow(-a[0], 1 / a[1])
            : Math.pow(a[0], 1 / a[1]);
          case 'abs': return Math.abs(a[0]);
          case 'floor': return Math.floor(a[0]);
          case 'ceil': return Math.ceil(a[0]);
          case 'round': return Math.round(a[0]);
          case 'sign': case 'sgn': return Math.sign(a[0]);
          case 'max': return Math.max(...a);
          case 'min': return Math.min(...a);
          case 'gcd': return gcd(a[0], a[1]);
          case 'lcm': return Math.abs(a[0] * a[1]) / gcd(a[0], a[1]);
          case 'mod': return ((a[0] % a[1]) + a[1]) % a[1];
          case 'fact': return factorial(a[0]);
          case 'nCr': return nCr(a[0], a[1]);
          case 'nPr': return nPr(a[0], a[1]);
          case 'deg': return a[0] / D2R;
          case 'rad': return a[0] * D2R;
          default: throw new MathSyntaxError(`دالة غير معروفة: ${n.name}`, 0);
        }
      }
      case 'eq': return Math.abs(ev(n.lhs) - ev(n.rhs)) < 1e-12 ? 1 : 0;
      case 'rel': {
        const l = ev(n.lhs), r = ev(n.rhs);
        switch (n.op) {
          case '<': return l < r ? 1 : 0;
          case '>': return l > r ? 1 : 0;
          case '<=': return l <= r ? 1 : 0;
          case '>=': return l >= r ? 1 : 0;
          case '!=': return Math.abs(l - r) > 1e-12 ? 1 : 0;
        }
        return NaN;
      }
      case 'list': return ev(n.items[0]);
      default: throw new MathSyntaxError('نوع تعبير غير مدعوم', 0);
    }
  };
  return ev(node);
}

/** تنسيق رقم للعرض (تقريب ذكي) */
export function fmt(x, digits = 10) {
  if (typeof x !== 'number' || Number.isNaN(x)) return 'غير معرّف';
  if (!Number.isFinite(x)) return x > 0 ? '∞' : '-∞';
  if (Object.is(x, -0)) return '0';
  const abs = Math.abs(x);
  if (abs !== 0 && (abs < 1e-7 || abs >= 1e12)) {
    return x.toExponential(Math.min(digits - 1, 9)).replace('e', '×10^').replace('+', '');
  }
  const rounded = parseFloat(x.toPrecision(digits));
  return String(rounded);
}
