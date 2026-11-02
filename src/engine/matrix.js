// ============================================================
//  محرك رياضي — المصفوفات والجبر الخطي
// ============================================================

import { Rat } from './rational.js';
import { fmt } from './eval.js';

export function makeMatrix(rows, cols, fill = 0) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill));
}

export function parseMatrix(text) {
  const rows = text.trim().split(/[\n;]+/).map((r) => r.trim()).filter(Boolean);
  const data = rows.map((r) =>
    r.split(/[\s,\t]+/).filter(Boolean).map((x) => {
      const v = Number(x.replace('٫', '.').replace('−', '-'));
      if (Number.isNaN(v)) throw new Error(`قيمة غير رقمية في المصفوفة: "${x}"`);
      return v;
    }));
  const cols = data[0].length;
  if (data.some((r) => r.length !== cols)) throw new Error('جميع صفوف المصفوفة يجب أن تكون بنفس الطول');
  return data;
}

export const matAdd = (A, B) => {
  checkSameSize(A, B);
  return A.map((r, i) => r.map((v, j) => v + B[i][j]));
};
export const matSub = (A, B) => {
  checkSameSize(A, B);
  return A.map((r, i) => r.map((v, j) => v - B[i][j]));
};
export const matScale = (A, k) => A.map((r) => r.map((v) => v * k));

export function matMul(A, B) {
  if (A[0].length !== B.length) {
    throw new Error(`لا يمكن الضرب: عدد أعمدة الأولى (${A[0].length}) ≠ عدد صفوف الثانية (${B.length})`);
  }
  const out = makeMatrix(A.length, B[0].length);
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < B[0].length; j++) {
      let s = 0;
      for (let k = 0; k < B.length; k++) s += A[i][k] * B[k][j];
      out[i][j] = s;
    }
  }
  return out;
}

export const transpose = (A) => A[0].map((_, j) => A.map((r) => r[j]));

export function determinant(A) {
  const n = A.length;
  if (n !== A[0].length) throw new Error('المحدد يُعرّف فقط للمصفوفات المربعة');
  const M = A.map((r) => [...r]);
  let det = 1;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    if (Math.abs(M[pivot][col]) < 1e-14) return 0;
    if (pivot !== col) { [M[pivot], M[col]] = [M[col], M[pivot]]; det = -det; }
    det *= M[col][col];
    for (let r = col + 1; r < n; r++) {
      const f = M[r][col] / M[col][col];
      for (let c = col; c < n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return det;
}

export function determinantSteps(A) {
  const steps = [];
  const n = A.length;
  if (n === 1) return [{ title: 'مصفوفة 1×1', latex: `|A| = ${fmt(A[0][0])}` }];
  if (n === 2) {
    return [{
      title: 'محدد مصفوفة 2×2: ad − bc',
      latex: `|A| = (${fmt(A[0][0])})(${fmt(A[1][1])}) - (${fmt(A[0][1])})(${fmt(A[1][0])}) = ${fmt(determinant(A))}`,
    }];
  }
  if (n === 3) {
    const a = A[0][0], b = A[0][1], c = A[0][2];
    const det = determinant(A);
    steps.push({
      title: 'محدد مصفوفة 3×3 بقاعدة ساروس / التوسع بالصف الأول',
      latex: `|A| = a_{11}M_{11} - a_{12}M_{12} + a_{13}M_{13} = ${fmt(det)}`,
    });
    const m11 = determinant(minor(A, 0, 0));
    const m12 = determinant(minor(A, 0, 1));
    const m13 = determinant(minor(A, 0, 2));
    steps.push({
      title: 'المحددات الصغرى',
      latex: `M_{11} = ${fmt(m11)},\\; M_{12} = ${fmt(m12)},\\; M_{13} = ${fmt(m13)}`,
    });
    steps.push({
      title: 'التعويض',
      latex: `|A| = (${fmt(a)})(${fmt(m11)}) - (${fmt(b)})(${fmt(m12)}) + (${fmt(c)})(${fmt(m13)}) = ${fmt(det)}`,
    });
    return steps;
  }
  steps.push({ title: 'نستخدم الحذف الغاوسي لتحويل المصفوفة إلى مثلثية', latex: `|A| = ${fmt(determinant(A))}` });
  return steps;
}

export function minor(A, i, j) {
  return A.filter((_, r) => r !== i).map((row) => row.filter((_, c) => c !== j));
}

export function cofactorMatrix(A) {
  return A.map((row, i) => row.map((_, j) => ((i + j) % 2 === 0 ? 1 : -1) * determinant(minor(A, i, j))));
}

export function inverse(A) {
  const n = A.length;
  if (n !== A[0].length) throw new Error('المعكوس يُعرّف فقط للمصفوفات المربعة');
  const det = determinant(A);
  if (Math.abs(det) < 1e-12) throw new Error('المصفوفة غير قابلة للعكس لأن محددها = 0');
  const cof = cofactorMatrix(A);
  return transpose(cof).map((r) => r.map((v) => v / det));
}

export function rank(A) {
  const M = A.map((r) => [...r]);
  const rows = M.length, cols = M[0].length;
  let r = 0;
  for (let c = 0; c < cols && r < rows; c++) {
    let pivot = r;
    for (let i = r; i < rows; i++) if (Math.abs(M[i][c]) > Math.abs(M[pivot][c])) pivot = i;
    if (Math.abs(M[pivot][c]) < 1e-12) continue;
    [M[r], M[pivot]] = [M[pivot], M[r]];
    for (let i = r + 1; i < rows; i++) {
      const f = M[i][c] / M[r][c];
      for (let j = c; j < cols; j++) M[i][j] -= f * M[r][j];
    }
    r++;
  }
  return r;
}

export function trace(A) {
  return A.reduce((s, row, i) => s + row[i], 0);
}

/** القيم الذاتية لمصفوفة 2×2 أو 3×3 (عددية) */
export function eigenvalues(A) {
  const n = A.length;
  if (n === 2) {
    const [a, b] = A[0];
    const [c, d] = A[1];
    const tr = a + d;
    const det = a * d - b * c;
    const disc = tr * tr - 4 * det;
    if (disc >= 0) {
      const s = Math.sqrt(disc);
      return [{ value: (tr + s) / 2, real: true }, { value: (tr - s) / 2, real: true }];
    }
    const s = Math.sqrt(-disc);
    return [
      { value: `${fmt(tr / 2, 6)} + ${fmt(s / 2, 6)}i`, real: false, re: tr / 2, im: s / 2 },
      { value: `${fmt(tr / 2, 6)} - ${fmt(s / 2, 6)}i`, real: false, re: tr / 2, im: -s / 2 },
    ];
  }
  // طريقة QR للحجم الأكبر
  let M = A.map((r) => [...r]);
  for (let iter = 0; iter < 300; iter++) {
    const { Q, R } = qr(M);
    M = matMul(R, Q);
  }
  const vals = M.map((row, i) => row[i]);
  return vals.map((v) => ({ value: parseFloat(v.toPrecision(8)), real: true }));
}

function qr(A) {
  const n = A.length;
  const Q = makeMatrix(n, n);
  const R = makeMatrix(n, n);
  const cols = transpose(A);
  const q = [];
  for (let j = 0; j < n; j++) {
    let v = [...cols[j]];
    for (let i = 0; i < j; i++) {
      const dot = cols[j].reduce((s, x, k) => s + x * q[i][k], 0);
      R[i][j] = dot;
      v = v.map((x, k) => x - dot * q[i][k]);
    }
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    R[j][j] = norm;
    q.push(v.map((x) => x / norm));
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) Q[i][j] = q[j][i];
  return { Q, R };
}

/** المتجهات الذاتية لمصفوفة 2×2 */
export function eigenvectors2x2(A, lambda) {
  const [a, b] = A[0];
  const [c, d] = A[1];
  // (A - λI)v = 0
  let vx, vy;
  if (Math.abs(b) > 1e-12) { vx = b; vy = lambda - a; }
  else if (Math.abs(c) > 1e-12) { vx = lambda - d; vy = c; }
  else { vx = 1; vy = 0; }
  const norm = Math.sqrt(vx * vx + vy * vy) || 1;
  return [vx / norm, vy / norm];
}

/** حل نظام بالمعكوس */
export function solveWithMatrix(A, b) {
  const inv = inverse(A);
  return matMul(inv, b.map((x) => [x])).map((r) => r[0]);
}

export function matToLatex(A, brackets = 'bmatrix') {
  const body = A.map((r) => r.map((x) => (Math.abs(x) < 1e-12 ? '0' : fmt(x, 6))).join(' & ')).join(' \\\\ ');
  return `\\begin{${brackets}}${body}\\end{${brackets}}`;
}

function checkSameSize(A, B) {
  if (A.length !== B.length || A[0].length !== B[0].length) {
    throw new Error('أبعاد المصفوفتين غير متوافقة للجمع/الطرح');
  }
}
