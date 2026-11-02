// ============================================================
//  محرك رياضي — الإحصاء والاحتمالات
// ============================================================

import { factorial, nCr, nPr, factorial as fact } from './eval.js';

export function parseNumbers(text) {
  const nums = text.split(/[\s,;،]+/).filter(Boolean).map((x) => Number(x.replace('٫', '.').replace('−', '-')));
  if (nums.some(Number.isNaN)) throw new Error('تحتوي القائمة على قيمة غير رقمية');
  if (!nums.length) throw new Error('أدخل قائمة أرقام مفصولة بفواصل أو مسافات');
  return nums;
}

export function describe(data) {
  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);
  const sum = data.reduce((s, x) => s + x, 0);
  const mean = sum / n;

  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;

  const freq = new Map();
  data.forEach((x) => freq.set(x, (freq.get(x) || 0) + 1));
  let maxFreq = 0;
  freq.forEach((f) => { if (f > maxFreq) maxFreq = f; });
  const modes = [...freq.entries()].filter(([, f]) => f === maxFreq).map(([v]) => v);

  const variancePop = data.reduce((s, x) => s + (x - mean) ** 2, 0) / n;
  const varianceSample = n > 1 ? data.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1) : 0;

  const q1 = percentile(sorted, 25);
  const q3 = percentile(sorted, 75);

  return {
    count: n, sum, mean, median,
    mode: maxFreq > 1 ? modes : [],
    range: sorted[n - 1] - sorted[0],
    min: sorted[0], max: sorted[n - 1],
    variancePop, varianceSample,
    stdPop: Math.sqrt(variancePop),
    stdSample: Math.sqrt(varianceSample),
    q1, q3, iqr: q3 - q1,
    sorted,
    freq: [...freq.entries()].sort((a, b) => a[0] - b[0]),
  };
}

export function percentile(sorted, p) {
  const n = sorted.length;
  if (n === 1) return sorted[0];
  const idx = (p / 100) * (n - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** معامل الارتباط */
export function correlation(xs, ys) {
  if (xs.length !== ys.length) throw new Error('يجب أن تكون القائمتان بنفس الطول');
  const n = xs.length;
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  const r = sxy / Math.sqrt(sxx * syy);
  // الانحدار الخطي
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  return { r, r2: r * r, slope, intercept };
}

// ---------- الاحتمالات ----------

export const permutations = (n, r) => nPr(n, r);
export const combinations = (n, r) => nCr(n, r);

/** احتمال بسيط: عدد النواتج المواتية / الكلي */
export function probability(favorable, total) {
  if (total <= 0) throw new Error('عدد النواتج الكلي يجب أن يكون موجبًا');
  return favorable / total;
}

export function binomialProbability(n, k, p) {
  const c = nCr(n, k);
  return c * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

export function binomialMeanStd(n, p) {
  return { mean: n * p, std: Math.sqrt(n * p * (1 - p)) };
}

export function normalPdf(x, mu = 0, sigma = 1) {
  return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma));
}

/** التوزيع الطبيعي التراكمي (تقريب دقيق) */
export function normalCdf(x, mu = 0, sigma = 1) {
  const z = (x - mu) / sigma;
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

export function erf(x) {
  const t = 1 / (1 + 0.5 * Math.abs(x));
  const y = 1 - t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 +
    t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 +
    t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? y : -y;
}

export function normalBetween(a, b, mu = 0, sigma = 1) {
  return normalCdf(b, mu, sigma) - normalCdf(a, mu, sigma);
}

export function poissonProbability(lambda, k) {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / fact(k);
}
