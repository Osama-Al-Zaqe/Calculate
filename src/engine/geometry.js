// ============================================================
//  محرك رياضي — المتجهات والهندسة التحليلية
// ============================================================

import { fmt } from './eval.js';

export const vAdd = (a, b) => a.map((x, i) => x + b[i]);
export const vSub = (a, b) => a.map((x, i) => x - b[i]);
export const vScale = (a, k) => a.map((x) => x * k);
export const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
export const norm = (a) => Math.sqrt(dot(a, a));

export function cross(a, b) {
  if (a.length !== 3 || b.length !== 3) throw new Error('الضرب الاتجاهي يتطلب متجهين ثلاثيي الأبعاد');
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function angleBetween(a, b, deg = true) {
  const cos = dot(a, b) / (norm(a) * norm(b));
  const clamped = Math.max(-1, Math.min(1, cos));
  const rad = Math.acos(clamped);
  return { rad, deg: (rad * 180) / Math.PI, cos };
}

export const distance = (a, b) => norm(vSub(a, b));
export const midpoint = (a, b) => a.map((x, i) => (x + b[i]) / 2);

export function parseVector(text) {
  const nums = text.replace(/[()\[\]{}]/g, ' ').split(/[\s,;]+/).filter(Boolean).map(Number);
  if (nums.some(Number.isNaN)) throw new Error('مدخلات المتجه يجب أن تكون أرقامًا');
  if (nums.length < 2) throw new Error('المتجه يجب أن يحتوي على مكوّنين على الأقل');
  return nums;
}

export const vecToLatex = (v) => `\\begin{pmatrix}${v.map((x) => fmt(x, 6)).join(' \\\\ ')}\\end{pmatrix}`;

// ---------- الهندسة التحليلية ----------

/** معادلة المستقيم المار بنقطتين */
export function lineThrough(p1, p2) {
  const [x1, y1] = p1, [x2, y2] = p2;
  const dx = x2 - x1, dy = y2 - y1;
  if (Math.abs(dx) < 1e-12) {
    return { type: 'vertical', equation: `x = ${fmt(x1, 6)}`, slope: Infinity, latex: `x = ${fmt(x1, 6)}` };
  }
  const m = dy / dx;
  const b = y1 - m * x1;
  return {
    type: 'line', slope: m, intercept: b,
    equation: `y = ${fmt(m, 6)}x ${b >= 0 ? '+' : '−'} ${fmt(Math.abs(b), 6)}`,
    latex: `y = ${fmt(m, 6)}x ${b >= 0 ? '+' : '-'} ${fmt(Math.abs(b), 6)}`,
    general: `${fmt(dy, 6)}x ${-dx >= 0 ? '+' : '−'} ${fmt(Math.abs(dx), 6)}y ${-(dy * x1 - dx * y1) >= 0 ? '+' : '−'} ${fmt(Math.abs(dy * x1 - dx * y1), 6)} = 0`,
  };
}

/** معادلة المستقيم من الميل ونقطة */
export function lineFromSlope(m, p) {
  const b = p[1] - m * p[0];
  return {
    slope: m, intercept: b,
    equation: `y = ${fmt(m, 6)}x ${b >= 0 ? '+' : '−'} ${fmt(Math.abs(b), 6)}`,
    latex: `y = ${fmt(m, 6)}x ${b >= 0 ? '+' : '-'} ${fmt(Math.abs(b), 6)}`,
  };
}

/** تقاطع مستقيمين */
export function lineIntersection(l1, l2) {
  const { slope: m1, intercept: b1 } = l1;
  const { slope: m2, intercept: b2 } = l2;
  if (Math.abs(m1 - m2) < 1e-12) return { parallel: true };
  const x = (b2 - b1) / (m1 - m2);
  return { x, y: m1 * x + b1 };
}

/** الدائرة */
export function circle(cx, cy, r) {
  return {
    latex: `(x ${cx >= 0 ? '-' : '+'} ${fmt(Math.abs(cx), 6)})^2 + (y ${cy >= 0 ? '-' : '+'} ${fmt(Math.abs(cy), 6)})^2 = ${fmt(r * r, 6)}`,
    general: `x^2 + y^2 ${-2 * cx >= 0 ? '+' : '-'} ${fmt(Math.abs(2 * cx), 6)}x ${-2 * cy >= 0 ? '+' : '-'} ${fmt(Math.abs(2 * cy), 6)}y + ${fmt(cx * cx + cy * cy - r * r, 6)} = 0`,
    area: Math.PI * r * r,
    circumference: 2 * Math.PI * r,
  };
}

export function circleFromGeneral(a, b, c) {
  // x² + y² + ax + by + c = 0
  const cx = -a / 2, cy = -b / 2;
  const r2 = cx * cx + cy * cy - c;
  if (r2 < 0) return { valid: false, message: 'لا تمثل دائرة حقيقية (نصف القطر تربيعي سالب)' };
  return { cx, cy, r: Math.sqrt(r2), ...circle(cx, cy, Math.sqrt(r2)) };
}

/** القطع المكافئ y = a(x−h)² + k */
export function parabola(a, h, k) {
  const vertex = [h, k];
  const focus = [h, k + 1 / (4 * a)];
  const directrix = `y = ${fmt(k - 1 / (4 * a), 6)}`;
  return {
    vertex, focus, directrix,
    latex: `y = ${fmt(a, 6)}(x ${h >= 0 ? '-' : '+'} ${fmt(Math.abs(h), 6)})^2 ${k >= 0 ? '+' : '-'} ${fmt(Math.abs(k), 6)}`,
    axis: `x = ${fmt(h, 6)}`,
    opens: a > 0 ? 'أعلى' : 'أسفل',
  };
}

/** القطع الناقص */
export function ellipse(h, k, a, b) {
  const c = Math.sqrt(Math.abs(a * a - b * b));
  const major = a >= b ? 'أفقي' : 'رأسي';
  const A = Math.max(a, b), B = Math.min(a, b);
  return {
    latex: `\\frac{(x ${h >= 0 ? '-' : '+'} ${fmt(Math.abs(h), 6)})^2}{${fmt(a * a, 6)}} + \\frac{(y ${k >= 0 ? '-' : '+'} ${fmt(Math.abs(k), 6)})^2}{${fmt(b * b, 6)}} = 1`,
    c, e: c / A, major, area: Math.PI * a * b,
    foci: [[h - c, k], [h + c, k]],
  };
}

/** القطع الزائد */
export function hyperbola(h, k, a, b) {
  const c = Math.sqrt(a * a + b * b);
  return {
    latex: `\\frac{(x ${h >= 0 ? '-' : '+'} ${fmt(Math.abs(h), 6)})^2}{${fmt(a * a, 6)}} - \\frac{(y ${k >= 0 ? '-' : '+'} ${fmt(Math.abs(k), 6)})^2}{${fmt(b * b, 6)}} = 1`,
    c, e: c / a,
    asymptotes: [`y = ${fmt(b / a, 6)}(x ${h >= 0 ? '-' : '+'} ${fmt(Math.abs(h), 6)}) ${k >= 0 ? '+' : '-'} ${fmt(Math.abs(k), 6)}`,
      `y = ${fmt(-b / a, 6)}(x ${h >= 0 ? '-' : '+'} ${fmt(Math.abs(h), 6)}) ${k >= 0 ? '+' : '-'} ${fmt(Math.abs(k), 6)}`],
    foci: [[h - c, k], [h + c, k]],
  };
}

/** مساحة مثلث من ثلاث نقاط */
export function triangleArea(p1, p2, p3) {
  return Math.abs((p2[0] - p1[0]) * (p3[1] - p1[1]) - (p3[0] - p1[0]) * (p2[1] - p1[1])) / 2;
}
