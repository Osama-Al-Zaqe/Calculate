// ============================================================
//  محرك رياضي — النهايات والاتصال
// ============================================================

import { Num, Var, Add, Mul, Pow, Neg, Div, Fn, hasVar } from './ast.js';
import { simplify, expand } from './simplify.js';
import { toLatex } from './latex.js';
import { evaluate, fmt } from './eval.js';
import { differentiate } from './derivative.js';

const L = (n) => toLatex(n);
const step = (title, latex, note) => ({ title, latex, note });

/** حساب النهاية عددياً من جهة */
function numericLimit(node, v, a, dir) {
  const f = (x) => evaluate(node, { [v]: x });
  const vals = [];
  for (const h of [1e-1, 1e-2, 1e-3, 1e-4, 1e-5, 1e-6, 1e-7, 1e-8]) {
    try {
      const x = dir === 'left' ? a - h : a + h;
      const y = f(x);
      if (Number.isFinite(y)) vals.push(y);
    } catch { /* تجاهل */ }
  }
  if (vals.length < 3) return NaN;
  const last = vals[vals.length - 1];
  const prev = vals[vals.length - 2];
  if (Math.abs(last - prev) < 1e-4 * Math.max(1, Math.abs(last))) return last;
  if (Math.abs(last) > 1e6) return last > 0 ? Infinity : -Infinity;
  return last;
}

/**
 * حساب النهاية
 * @param {object} node التعبير
 * @param {string} v المتغير
 * @param {number|'inf'|'-inf'} a نقطة النهاية
 * @param {'both'|'left'|'right'} dir
 */
export function computeLimit(node, v, a, dir = 'both') {
  const steps = [];
  const f = simplify(node);
  const atInf = a === 'inf' || a === '-inf' || a === Infinity || a === -Infinity;
  const point = atInf ? (a === 'inf' || a === Infinity ? Infinity : -Infinity) : a;

  steps.push(step('التعبير', `\\lim_{${v} \\to ${atInf ? (point > 0 ? '+\\infty' : '-\\infty') : fmt(point)}} ${L(f)}`));

  // نهاية كثيرة حدود / دالة كسرية عند المالانهاية
  if (atInf) {
    const res = limitAtInfinity(f, v, point > 0 ? 1 : -1, steps);
    if (res !== null) return { value: res, steps, method: 'تحليل الحد الأعلى درجة' };
  }

  // تعويض مباشر
  try {
    const direct = evaluate(f, { [v]: point });
    if (Number.isFinite(direct)) {
      steps.push(step('تعويض مباشر', `${L(f)}\\big|_{${v}=${fmt(point)}} = ${fmt(direct, 10)}`));
      return { value: direct, steps, method: 'تعويض مباشر' };
    }
  } catch { /* غير معرّف */ }

  // صيغة غير محددة 0/0 أو ∞/∞ ⇒ لوبيتال
  if (f.t === 'div') {
    const numVal = safeEval(f.num, v, point);
    const denVal = safeEval(f.den, v, point);
    const isIndeterminate = (Math.abs(numVal) < 1e-12 && Math.abs(denVal) < 1e-12) ||
      (!Number.isFinite(numVal) && !Number.isFinite(denVal));
    if (isIndeterminate) {
      steps.push(step('صيغة غير محددة', `${fmt(numVal)} / ${fmt(denVal)}`));
      let curNum = f.num, curDen = f.den;
      for (let k = 0; k < 6; k++) {
        const dn = simplify(differentiate(curNum, v, []));
        const dd = simplify(differentiate(curDen, v, []));
        steps.push(step(`نطبّق قاعدة لوبيتال (مرة ${k + 1}): نشتق البسط والمقام`,
          `\\lim \\frac{${L(dn)}}{${L(dd)}}`));
        const val = safeEval(Div(dn, dd), v, point);
        if (Number.isFinite(val)) {
          steps.push(step('تعويض مباشر بعد الاشتقاق', `= ${fmt(val, 10)}`));
          return { value: val, steps, method: 'قاعدة لوبيتال' };
        }
        curNum = dn; curDen = dd;
      }
    }
  }

  // نهايات من الجهتين عددياً
  if (!atInf) {
    const left = numericLimit(f, v, point, 'left');
    const right = numericLimit(f, v, point, 'right');
    steps.push(step('نحسب النهاية من الجهتين عددياً',
      `\\lim_{${v}\\to ${fmt(point)}^-} = ${fmt(left, 8)},\\quad \\lim_{${v}\\to ${fmt(point)}^+} = ${fmt(right, 8)}`));
    if (Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 1e-4 * Math.max(1, Math.abs(left))) {
      return { value: (left + right) / 2, steps, method: 'تقريب عددي من الجهتين' };
    }
    if (dir === 'left') return { value: left, steps, method: 'تقريب عددي' };
    if (dir === 'right') return { value: right, steps, method: 'تقريب عددي' };
    if (Math.abs(left) > 1e5 || Math.abs(right) > 1e5) {
      return { value: null, left, right, divergent: true, steps, method: 'النهاية غير موجودة (تؤول إلى ما لا نهاية)' };
    }
    return { value: null, left, right, notExists: true, steps, method: 'النهاية غير موجودة: النهايتان من الجهتين مختلفتان' };
  }

  // عند المالانهاية عددياً
  const big = numericLimit(f, v, point > 0 ? 1e7 : -1e7, point > 0 ? 'right' : 'left');
  steps.push(step('تقريب عند قيمة كبيرة جدًا', `${fmt(big, 8)}`));
  return { value: Number.isFinite(big) ? big : (big > 0 ? Infinity : -Infinity), steps, method: 'تقريب عددي' };
}

function safeEval(node, v, point) {
  try { return evaluate(node, { [v]: point }); } catch { return NaN; }
}

function limitAtInfinity(f, v, sign, steps) {
  // نهايات دوال كسرية: مقارنة الدرجات
  if (f.t === 'div') {
    const numDeg = polyDegree(f.num, v);
    const denDeg = polyDegree(f.den, v);
    if (numDeg !== null && denDeg !== null) {
      const leadN = leadingCoef(f.num, v);
      const leadD = leadingCoef(f.den, v);
      steps.push(step('نقسم البسط والمقام على أعلى قوة للمتغير',
        `\\text{درجة البسط} = ${numDeg},\\; \\text{درجة المقام} = ${denDeg}`));
      let value;
      if (numDeg < denDeg) value = 0;
      else if (numDeg === denDeg) value = leadN / leadD;
      else value = sign * Math.sign(leadN / leadD) * Infinity;
      steps.push(step('النتيجة', `= ${fmt(value, 10)}`));
      return value;
    }
  }
  // كثير حدود
  const deg = polyDegree(f, v);
  if (deg !== null && deg > 0) {
    const lead = leadingCoef(f, v);
    const value = sign * Math.sign(lead) * Infinity;
    steps.push(step('دالة كثيرة حدود: السلوك يحدده الحد الأعلى درجة', `= ${fmt(value)}`));
    return value;
  }
  if (f.t === 'fn' && ['exp', 'ln', 'sin', 'cos', 'tan'].includes(f.name)) {
    if (f.name === 'exp' && f.args[0].t === 'var') {
      const value = sign > 0 ? Infinity : 0;
      steps.push(step('سلوك الدالة الأسية', `= ${fmt(value)}`));
      return value;
    }
    if (f.name === 'ln') {
      const value = sign > 0 ? Infinity : NaN;
      steps.push(step('سلوك اللوغاريتم', `= ${fmt(value)}`));
      return Number.isNaN(value) ? null : value;
    }
  }
  return null;
}

function polyDegree(node, v) {
  const ex = expand(node);
  if (ex.t === 'num') return 0;
  if (ex.t === 'var' && ex.name === v) return 1;
  if (ex.t === 'add') {
    const degs = ex.args.map((a) => polyDegree(a, v));
    if (degs.some((d) => d === null)) return null;
    return Math.max(...degs);
  }
  if (ex.t === 'mul') {
    const degs = ex.args.map((a) => polyDegree(a, v));
    if (degs.some((d) => d === null)) return null;
    return degs.reduce((s, d) => s + d, 0);
  }
  if (ex.t === 'pow' && ex.base.t === 'var' && ex.base.name === v && ex.exp.t === 'num') return ex.exp.value;
  if (!hasVar(ex, v)) return 0;
  return null;
}

function leadingCoef(node, v) {
  const ex = expand(node);
  const deg = polyDegree(ex, v);
  if (deg === null) return NaN;
  if (deg === 0) return evaluate(ex, { [v]: 0 });
  if (ex.t === 'add') {
    for (const a of ex.args) {
      if (polyDegree(a, v) === deg) return leadingCoef(a, v);
    }
  }
  if (ex.t === 'var') return 1;
  if (ex.t === 'mul') {
    return ex.args.reduce((p, a) => p * (polyDegree(a, v) === 0 ? evaluate(a, { [v]: 0 }) : leadingCoef(a, v)), 1);
  }
  if (ex.t === 'pow') return 1;
  return NaN;
}

/** اختبار الاتصال عند نقطة */
export function testContinuity(node, v, a) {
  const steps = [];
  const f = simplify(node);
  steps.push(step('الدالة', `f(${v}) = ${L(f)}`));

  let fValue;
  let defined = true;
  try {
    fValue = evaluate(f, { [v]: a });
    if (!Number.isFinite(fValue)) defined = false;
  } catch { defined = false; }

  steps.push(step('قيمة الدالة عند النقطة', defined
    ? `f(${fmt(a)}) = ${fmt(fValue, 8)}`
    : `f(${fmt(a)}) \\text{ غير معرّفة}`));

  const left = numericLimit(f, v, a, 'left');
  const right = numericLimit(f, v, a, 'right');
  steps.push(step('النهاية من اليسار', `\\lim_{${v}\\to ${fmt(a)}^-} f(${v}) = ${fmt(left, 8)}`));
  steps.push(step('النهاية من اليمين', `\\lim_{${v}\\to ${fmt(a)}^+} f(${v}) = ${fmt(right, 8)}`));

  const limitsEqual = Number.isFinite(left) && Number.isFinite(right) &&
    Math.abs(left - right) < 1e-4 * Math.max(1, Math.abs(left));

  if (!limitsEqual) {
    const infinite = Math.abs(left) > 1e5 || Math.abs(right) > 1e5;
    steps.push(step('الاستنتاج', infinite
      ? '\\text{انقطاع لا نهائي (خط تقارب رأسي)}'
      : '\\text{النهاية غير موجودة ⇒ انقطاع قفزي}'));
    return {
      continuous: false,
      type: infinite ? 'انقطاع لا نهائي (خط تقارب رأسي)' : 'انقطاع قفزي (النهايتان مختلفتان)',
      left, right, value: defined ? fValue : null, steps,
    };
  }

  if (!defined) {
    steps.push(step('الاستنتاج', '\\text{انقطاع قابل للإزالة: النهاية موجودة لكن الدالة غير معرّفة}'));
    return { continuous: false, type: 'انقطاع قابل للإزالة', left, right, value: null, removableValue: left, steps };
  }

  if (Math.abs(fValue - left) > 1e-4 * Math.max(1, Math.abs(left))) {
    steps.push(step('الاستنتاج', '\\text{انقطاع قابل للإزالة: قيمة الدالة لا تساوي النهاية}'));
    return { continuous: false, type: 'انقطاع قابل للإزالة', left, right, value: fValue, steps };
  }

  steps.push(step('الاستنتاج', '\\text{الدالة متصلة عند هذه النقطة} \\checkmark'));
  return { continuous: true, type: 'متصلة', left, right, value: fValue, steps };
}
