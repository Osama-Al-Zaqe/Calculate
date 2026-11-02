// ============================================================
//  محرك رياضي — تحليل الدوال
// ============================================================

import { Num, Var, Add, Mul, Pow, Neg, Div, Fn, hasVar, toText } from './ast.js';
import { simplify, expand, toPolynomial, key } from './simplify.js';
import { toLatex } from './latex.js';
import { evaluate, fmt } from './eval.js';
import { differentiate } from './derivative.js';
import { numericRoots, solveEquation } from './solve.js';
import { computeLimit } from './limits.js';

const L = (n) => toLatex(n);
const step = (title, latex, note) => ({ title, latex, note });

/** تحليل شامل للدالة */
export function analyzeFunction(node, v = 'x') {
  const f = simplify(node);
  const steps = [];
  const out = { expression: f, latex: L(f), variable: v, steps };

  // المجال
  out.domain = findDomain(f, v);
  steps.push(step('المجال', out.domain.latex, out.domain.note));

  // الجذور (التقاطعات مع المحور x)
  const coeffs = toPolynomial(f, v);
  let roots = [];
  if (coeffs) {
    roots = numericRoots(coeffs, 100);
    if (coeffs.length === 2) roots = [-coeffs[0] / coeffs[1]];
    else if (coeffs.length === 3) {
      const [c, b, a] = coeffs;
      const disc = b * b - 4 * a * c;
      if (disc >= 0) roots = [(-b + Math.sqrt(disc)) / (2 * a), (-b - Math.sqrt(disc)) / (2 * a)].sort((x, y) => x - y);
      else roots = [];
    }
  } else {
    roots = findNumericRoots(f, v);
  }
  out.roots = roots;
  steps.push(step('الجذور (تقاطع مع المحور x)',
    roots.length ? roots.map((r) => `${v} = ${fmt(r, 6)}`).join(',\\;') : '\\text{لا توجد جذور حقيقية}'));

  // التقاطع مع المحور y
  try {
    const y0 = evaluate(f, { [v]: 0 });
    out.yIntercept = Number.isFinite(y0) ? y0 : null;
    steps.push(step('التقاطع مع المحور y', `f(0) = ${Number.isFinite(y0) ? fmt(y0, 6) : '\\text{غير معرّف}'}`));
  } catch { out.yIntercept = null; }

  // المشتقة الأولى: التزايد والتناقص والقيم الحدية
  const d1 = simplify(differentiate(f, v, []));
  out.derivative = d1;
  steps.push(step('المشتقة الأولى', `f'(${v}) = ${L(d1)}`));

  const critCoeffs = toPolynomial(d1, v);
  let critical = [];
  if (critCoeffs) {
    if (critCoeffs.length === 2) critical = [-critCoeffs[0] / critCoeffs[1]];
    else if (critCoeffs.length === 3) {
      const [c, b, a] = critCoeffs;
      const disc = b * b - 4 * a * c;
      if (disc >= 0) critical = [(-b + Math.sqrt(disc)) / (2 * a), (-b - Math.sqrt(disc)) / (2 * a)].sort((x, y) => x - y);
    } else {
      critical = numericRoots(critCoeffs, 100);
    }
  } else {
    critical = findNumericRoots(d1, v);
  }
  out.criticalPoints = critical;
  if (critical.length) {
    steps.push(step('النقاط الحرجة (حيث f′ = 0)', critical.map((c) => `${v} = ${fmt(c, 6)}`).join(',\\;')));
  }

  // المشتقة الثانية: الانقلاب والتقعر
  const d2 = simplify(differentiate(d1, v, []));
  out.secondDerivative = d2;
  steps.push(step('المشتقة الثانية', `f''(${v}) = ${L(d2)}`));

  const d2Coeffs = toPolynomial(d2, v);
  let inflections = [];
  if (d2Coeffs) {
    if (d2Coeffs.length === 2) inflections = [-d2Coeffs[0] / d2Coeffs[1]];
    else if (d2Coeffs.length === 3) {
      const [c, b, a] = d2Coeffs;
      const disc = b * b - 4 * a * c;
      if (disc > 0) inflections = [(-b + Math.sqrt(disc)) / (2 * a), (-b - Math.sqrt(disc)) / (2 * a)].sort((x, y) => x - y);
    } else if (d2Coeffs.length > 3) inflections = numericRoots(d2Coeffs, 100);
  } else inflections = findNumericRoots(d2, v);
  out.inflections = inflections.filter((x) => Number.isFinite(x));

  // تصنيف النقاط الحرجة
  out.extrema = critical.map((c) => {
    const val = evaluate(f, { [v]: c });
    let kind = 'نقطة حرجة';
    try {
      const s = evaluate(d2, { [v]: c });
      if (s > 1e-9) kind = 'قيمة صغرى محلية';
      else if (s < -1e-9) kind = 'قيمة عظمى محلية';
      else {
        // اختبار المشتقة الأولى
        const l = evaluate(d1, { [v]: c - 0.01 });
        const r = evaluate(d1, { [v]: c + 0.01 });
        if (l > 0 && r < 0) kind = 'قيمة عظمى محلية';
        else if (l < 0 && r > 0) kind = 'قيمة صغرى محلية';
        else kind = 'نقطة انعطاف أفقية';
      }
    } catch { /* تجاهل */ }
    return { x: c, y: val, kind };
  });
  if (out.extrema.length) {
    steps.push(step('القيم العظمى والصغرى المحلية',
      out.extrema.map((e) => `\\text{${e.kind}}: (${fmt(e.x, 6)}, ${fmt(e.y, 6)})`).join(' \\\\ ')));
  }

  // فترات التزايد والتناقص
  const breakpoints = [...new Set([...critical, ...out.domain.excluded])].sort((a, b) => a - b);
  const intervals = [];
  const bounds = [-Infinity, ...breakpoints, Infinity];
  for (let i = 0; i < bounds.length - 1; i++) {
    const a = bounds[i], b = bounds[i + 1];
    if (a === -Infinity && b === -Infinity) continue;
    const mid = a === -Infinity ? b - 1 : b === Infinity ? a + 1 : (a + b) / 2;
    try {
      const s = evaluate(d1, { [v]: mid });
      if (Number.isFinite(s)) {
        intervals.push({ from: a, to: b, increasing: s > 0 });
      }
    } catch { /* تجاهل */ }
  }
  out.monotonicity = intervals;
  if (intervals.length) {
    steps.push(step('فترات التزايد والتناقص',
      intervals.map((i) => `${i.increasing ? '\\nearrow' : '\\searrow'} \\; (${i.from === -Infinity ? '-\\infty' : fmt(i.from, 4)}, ${i.to === Infinity ? '+\\infty' : fmt(i.to, 4)})`).join(' \\quad ')));
  }

  // التقعر
  out.concavityUp = [];
  out.concavityDown = [];
  const cBounds = [-Infinity, ...out.inflections, Infinity];
  for (let i = 0; i < cBounds.length - 1; i++) {
    const a = cBounds[i], b = cBounds[i + 1];
    const mid = a === -Infinity ? b - 1 : b === Infinity ? a + 1 : (a + b) / 2;
    try {
      const s = evaluate(d2, { [v]: mid });
      if (s > 0) out.concavityUp.push([a, b]);
      else if (s < 0) out.concavityDown.push([a, b]);
    } catch { /* تجاهل */ }
  }

  // النهايات عند المالانهاية
  out.limits = [];
  for (const dir of [1, -1]) {
    try {
      const res = computeLimit(f, v, dir > 0 ? 'inf' : '-inf');
      out.limits.push({ dir: dir > 0 ? '+∞' : '−∞', value: res.value });
    } catch { /* تجاهل */ }
  }
  steps.push(step('النهايات عند المالانهاية',
    out.limits.map((l) => `\\lim_{${v}\\to ${l.dir}} f(${v}) = ${Number.isFinite(l.value) ? fmt(l.value, 6) : (l.value > 0 ? '+\\infty' : '-\\infty')}`).join(',\\;')));

  // المدى (تقديري)
  out.range = estimateRange(f, v, out);

  return out;
}

function findDomain(f, v) {
  const excluded = [];
  const notes = [];
  const scan = (n) => {
    if (!n || typeof n !== 'object') return;
    if (n.t === 'div') {
      const roots = findNumericRoots(n.den, v);
      roots.forEach((r) => excluded.push(r));
      if (roots.length) notes.push(`المقام لا يساوي صفرًا`);
      scan(n.num); scan(n.den);
      return;
    }
    if (n.t === 'fn') {
      if (n.name === 'sqrt') {
        // داخل الجذر ≥ 0
        const coeffs = toPolynomial(n.args[0], v);
        if (coeffs && coeffs.length === 2) {
          const [b, a] = coeffs;
          const bound = -b / a;
          notes.push(a > 0 ? `داخل الجذر ≥ 0 ⇒ ${v} ≥ ${fmt(bound, 4)}` : `داخل الجذر ≥ 0 ⇒ ${v} ≤ ${fmt(bound, 4)}`);
        } else if (coeffs && coeffs.length === 3) {
          const [c, b, a] = coeffs;
          const disc = b * b - 4 * a * c;
          if (disc < 0 && a > 0) notes.push('داخل الجذر موجب دائمًا');
          else if (disc < 0 && a < 0) notes.push('داخل الجذر سالب دائمًا ⇒ المجال فارغ');
          else if (disc >= 0) {
            const r1 = (-b - Math.sqrt(disc)) / (2 * a), r2 = (-b + Math.sqrt(disc)) / (2 * a);
            notes.push(a > 0 ? `${v} ≤ ${fmt(Math.min(r1, r2), 4)} أو ${v} ≥ ${fmt(Math.max(r1, r2), 4)}` : `${fmt(Math.min(r1, r2), 4)} ≤ ${v} ≤ ${fmt(Math.max(r1, r2), 4)}`);
          }
        } else notes.push('داخل الجذر يجب أن يكون ≥ 0');
      }
      if (n.name === 'ln' || n.name === 'log') {
        notes.push('داخل اللوغاريتم > 0');
        const roots = findNumericRoots(n.args[0], v);
        roots.forEach((r) => excluded.push(r));
      }
      if (n.name === 'tan' || n.name === 'sec') notes.push('الدالة غير معرّفة عندما cos = 0');
      if (n.name === 'cot' || n.name === 'csc') notes.push('الدالة غير معرّفة عندما sin = 0');
      n.args.forEach(scan);
      return;
    }
    if (n.t === 'pow') { scan(n.base); scan(n.exp); return; }
    if (n.t === 'add' || n.t === 'mul') { n.args.forEach(scan); return; }
    if (n.t === 'neg') { scan(n.arg); return; }
  };
  scan(f);
  const uniq = [...new Set(excluded.map((x) => parseFloat(x.toFixed(8))))].sort((a, b) => a - b);
  let latex;
  if (!notes.length) latex = `\\mathbb{R} \\; (\\text{جميع الأعداد الحقيقية})`;
  else latex = notes.join(' \\quad ');
  return { notes, excluded: uniq, latex, note: notes.join(' • ') || 'جميع الأعداد الحقيقية' };
}

function findNumericRoots(f, v) {
  const roots = [];
  const g = (x) => {
    try {
      const y = evaluate(f, { [v]: x });
      return Number.isFinite(y) ? y : NaN;
    } catch { return NaN; }
  };
  const N = 4000, range = 20, h = (2 * range) / N;
  for (let i = 0; i <= N; i++) {
    const x = -range + i * h;
    const y1 = g(x), y2 = g(x + h);
    if (Number.isFinite(y1) && Math.abs(y1) < 1e-12) { push(roots, x); continue; }
    if (Number.isFinite(y1) && Number.isFinite(y2) && y1 * y2 < 0) {
      let lo = x, hi = x + h;
      for (let k = 0; k < 60; k++) {
        const mid = (lo + hi) / 2;
        if (g(lo) * g(mid) <= 0) hi = mid; else lo = mid;
      }
      push(roots, (lo + hi) / 2);
    }
  }
  return roots;
}

function push(arr, x) {
  if (!arr.some((y) => Math.abs(y - x) < 1e-6)) arr.push(parseFloat(x.toPrecision(10)));
}

function estimateRange(f, v, info) {
  const values = [];
  for (let x = -50; x <= 50; x += 0.05) {
    try {
      const y = evaluate(f, { [v]: x });
      if (Number.isFinite(y)) values.push(y);
    } catch { /* تجاهل */ }
  }
  const extremaY = info.extrema.map((e) => e.y).filter(Number.isFinite);
  const all = [...values, ...extremaY];
  if (!all.length) return { latex: '\\text{غير محدد}', min: -Infinity, max: Infinity };
  const min = Math.min(...all), max = Math.max(...all);
  const limPlus = info.limits.find((l) => l.dir === '+∞')?.value;
  const limMinus = info.limits.find((l) => l.dir === '−∞')?.value;
  const lowInf = limPlus === -Infinity || limMinus === -Infinity || min < -1e10;
  const highInf = limPlus === Infinity || limMinus === Infinity || max > 1e10;
  const fmtB = (x) => (x === -Infinity ? '-\\infty' : x === Infinity ? '+\\infty' : fmt(x, 4));
  return {
    min, max, lowInf, highInf,
    latex: `[${lowInf ? '-\\infty' : fmt(min, 4)},\\; ${highInf ? '+\\infty' : fmt(max, 4)}] \\; (\\text{تقديري})`,
  };
}

/** الدالة العكسية (عندما تكون الدالة خطية أو بسيطة) */
export function inverseFunction(node, v = 'x') {
  const steps = [];
  const f = simplify(node);
  steps.push(step('نكتب y = f(x)', `y = ${L(f)}`));
  const coeffs = toPolynomial(f, v);
  if (coeffs && coeffs.length === 2) {
    const [b, a] = coeffs;
    steps.push(step('نبدّل x و y', `x = ${fmt(a, 6)}y ${b >= 0 ? '+' : '-'} ${fmt(Math.abs(b), 6)}`));
    steps.push(step('نحل بالنسبة لـ y', `y = \\frac{x ${b >= 0 ? '-' : '+'} ${fmt(Math.abs(b), 6)}}{${fmt(a, 6)}}`));
    return { ok: true, latex: `f^{-1}(x) = \\frac{x ${b >= 0 ? '-' : '+'} ${fmt(Math.abs(b), 6)}}{${fmt(a, 6)}}`, steps };
  }
  if (coeffs && coeffs.length === 3) {
    const [c, b, a] = coeffs;
    const disc = b * b - 4 * a * c;
    steps.push(step('نبدّل x و y', `x = ${fmt(a, 6)}y^2 ${b >= 0 ? '+' : '-'} ${fmt(Math.abs(b), 6)}y ${c >= 0 ? '+' : '-'} ${fmt(Math.abs(c), 6)}`));
    steps.push(step('الدالة التربيعية ليست أحادية على ℝ — نقيّد المجال لنصف فرع', `y = \\frac{-${fmt(b, 6)} \\pm \\sqrt{${fmt(b, 6)}^2 - 4(${fmt(a, 6)})(-x + ${fmt(c, 6)})}}{2(${fmt(a, 6)})}`));
    return {
      ok: true, restricted: true,
      latex: `f^{-1}(x) = \\frac{-${fmt(b, 6)} + \\sqrt{${fmt(disc, 6)} + 4${fmt(a, 6)}x}}{${fmt(2 * a, 6)}}`,
      steps,
      note: 'الدالة التربيعية غير عكوسة على كامل ℝ — هذا الفرع يعتمد على تقييد المجال',
    };
  }
  // محاولة عددية بالتبديل
  return {
    ok: false,
    steps: [...steps, step('لا يمكن إيجاد صيغة رمزية للدالة العكسية', '\\text{الدالة ليست أحادية أو معقدة رمزيًا}')],
    message: 'لم يتم إيجاد صيغة رمزية للدالة العكسية. تأكد أن الدالة أحادية (واحد لواحد).',
  };
}
