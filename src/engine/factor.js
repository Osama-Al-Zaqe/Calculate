// ============================================================
//  محرك رياضي — التحليل إلى عوامل وتبسيط التعبيرات
// ============================================================

import { Num, Var, Add, Mul, Pow, Neg, Div, Fn } from './ast.js';
import { simplify, expand, toPolynomial, key } from './simplify.js';
import { toLatex } from './latex.js';
import { fmt } from './eval.js';
import { gcd, lcm, simplifyRadical, primeFactors, factorsToText, Rat } from './rational.js';

const L = (n) => toLatex(n);

/** تحليل كثير حدود إلى عوامل (جذور نسبية) */
export function factorPolynomial(node, v = 'x') {
  const steps = [];
  const poly = expand(node);
  const coeffs = toPolynomial(poly, v);
  if (!coeffs) return { ok: false, message: 'التعبير ليس كثيرة حدود في المتغير المحدد', steps };

  const c = [...coeffs];
  let degree = c.length - 1;
  if (degree < 1) return { ok: true, factored: poly, latex: L(poly), steps: [{ title: 'تعبير ثابت', latex: L(poly) }] };

  steps.push({ title: 'التعبير الأصلي', latex: L(poly) });

  // العامل المشترك الأكبر
  const intCoeffs = c.map((x) => Math.round(x));
  const allInt = c.every((x) => Math.abs(x - Math.round(x)) < 1e-9);
  let commonFactor = 1;
  if (allInt) {
    commonFactor = intCoeffs.reduce((g, x) => gcd(g, x), 0) || 1;
    if (commonFactor !== 1) {
      steps.push({ title: 'نُخرج العامل المشترك الأكبر', latex: `${commonFactor}\\left(${L(coeffsToExpr(c.map((x) => x / commonFactor), v))}\\right)` });
    }
  }
  const work = c.map((x) => x / commonFactor);

  // جذور صفر
  const factors = [];
  let idx = 0;
  while (idx < work.length && Math.abs(work[idx]) < 1e-12) { factors.push(Var(v)); idx++; }
  let rest = work.slice(idx);
  if (factors.length) {
    steps.push({ title: 'نُخرج المتغير المشترك', latex: `${v}^{${factors.length}}` });
  }

  // جذور نسبية
  const rationalRoots = [];
  if (rest.length > 1) {
    const divisors = (n) => {
      n = Math.abs(Math.round(n));
      const out = [];
      for (let i = 1; i * i <= n; i++) if (n % i === 0) { out.push(i); if (i !== n / i) out.push(n / i); }
      return out;
    };
    const ps = divisors(rest[0]), qs = divisors(rest[rest.length - 1]);
    const cands = new Set();
    for (const p of ps) for (const q of qs) { cands.add(p / q); cands.add(-p / q); }
    for (const cand of [...cands].sort((a, b) => Math.abs(a) - Math.abs(b))) {
      if (rest.length < 2) break;
      let val = 0;
      for (let i = rest.length - 1; i >= 0; i--) val = val * cand + rest[i];
      if (Math.abs(val) < 1e-9) {
        rationalRoots.push(cand);
        // قسمة تركيبية
        const q = new Array(rest.length - 1).fill(0);
        q[q.length - 1] = rest[rest.length - 1];
        for (let i = rest.length - 3; i >= 0; i--) q[i] = rest[i + 1] + q[i + 1] * cand;
        rest = q;
        steps.push({ title: `جذر نسبي: ${v} = ${fmt(cand, 6)} ⇒ العامل (${v} ${cand >= 0 ? '−' : '+'} ${fmt(Math.abs(cand), 6)})`, latex: `\\left(${v} ${cand >= 0 ? '-' : '+'} ${fmt(Math.abs(cand), 6)}\\right)` });
      }
    }
  }

  // تحليل المتبقي
  const restParts = [];
  if (rest.length === 1) {
    if (Math.abs(rest[0] - 1) > 1e-12) restParts.push(Num(rest[0]));
  } else if (rest.length === 2) {
    const [b, a] = rest;
    const root = -b / a;
    restParts.push(simplify(Mul(Num(a), Add(Var(v), Num(root)))));
  } else if (rest.length === 3) {
    const [cc, b, a] = rest;
    const disc = b * b - 4 * a * cc;
    if (disc >= 0) {
      const sq = Math.sqrt(disc);
      const r1 = (-b + sq) / (2 * a), r2 = (-b - sq) / (2 * a);
      restParts.push(simplify(Mul(Num(a), Add(Var(v), Num(-r1)), Add(Var(v), Num(-r2)))));
      steps.push({ title: 'نحل العامل التربيعي المتبقي', latex: `\\left(${v} - ${fmt(r1, 6)}\\right)\\left(${v} - ${fmt(r2, 6)}\\right)` });
    } else {
      restParts.push(coeffsToExpr(rest, v));
      steps.push({ title: 'العامل المتبقي لا يُحلل على الأعداد الحقيقية (مميز سالب)', latex: `\\Delta = ${fmt(disc, 6)} < 0` });
    }
  } else if (rest.length > 1) {
    restParts.push(coeffsToExpr(rest, v));
    steps.push({ title: 'العامل المتبقي لا يملك جذورًا نسبية — نتركه كما هو', latex: L(coeffsToExpr(rest, v)) });
  }

  const allFactors = [];
  if (commonFactor !== 1) allFactors.push(Num(commonFactor));
  allFactors.push(...factors);
  allFactors.push(...rationalRoots.map((r) => Add(Var(v), Num(-r))));
  allFactors.push(...restParts.filter((p) => !(p.t === 'num' && p.value === 1)));

  const factored = simplify(Mul(...allFactors));
  const isFactored = key(factored) !== key(poly) && factored.t === 'mul';
  steps.push({ title: 'الصورة المحللة', latex: L(factored) });
  return {
    ok: true, factored, latex: L(factored), steps,
    factoredFully: isFactored,
    message: isFactored ? 'تم التحليل بنجاح' : 'لم نجد تحليلًا إضافيًا — التعبير أولي أو يحتاج طرقًا متقدمة',
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

/** تبسيط تعبير جبري مع الخطوات */
export function simplifyExpression(node) {
  const steps = [];
  const original = node;
  const expanded = expand(node);
  steps.push({ title: 'التعبير الأصلي', latex: L(original) });
  if (key(expanded) !== key(simplify(original))) {
    steps.push({ title: 'بعد فك الأقواس', latex: L(expanded) });
  }
  const result = simplify(expanded);
  steps.push({ title: 'بعد تبسيط الحدود المتشابهة', latex: L(result) });
  return { result, latex: L(result), steps };
}

/** تبسيط كسر جبري */
export function simplifyAlgebraicFraction(numNode, denNode, v = 'x') {
  const steps = [];
  const numF = factorPolynomial(numNode, v);
  const denF = factorPolynomial(denNode, v);
  steps.push({ title: 'نحلل البسط', latex: numF.latex });
  steps.push({ title: 'نحلل المقام', latex: denF.latex });
  if (!numF.ok || !denF.ok) {
    return { ok: false, message: 'لا يمكن تبسيط هذا الكسر تلقائيًا', steps };
  }
  const nf = numF.factored.t === 'mul' ? numF.factored.args : [numF.factored];
  const df = denF.factored.t === 'mul' ? denF.factored.args : [denF.factored];
  const canceled = [];
  const nRest = [...nf], dRest = [...df];
  for (let i = nRest.length - 1; i >= 0; i--) {
    const k = key(nRest[i]);
    const j = dRest.findIndex((x) => key(x) === k);
    if (j >= 0) {
      canceled.push(nRest[i]);
      nRest.splice(i, 1);
      dRest.splice(j, 1);
    }
  }
  const num = nRest.length ? (nRest.length === 1 ? nRest[0] : Mul(...nRest)) : Num(1);
  const den = dRest.length ? (dRest.length === 1 ? dRest[0] : Mul(...dRest)) : Num(1);
  if (canceled.length) {
    steps.push({ title: 'نختصر العوامل المشتركة', latex: `${canceled.map(L).join(' \\cdot ')}` });
  }
  const result = simplify(Div(num, den));
  steps.push({ title: 'النتيجة بعد الاختصار', latex: L(result) });
  return { ok: true, result, latex: L(result), steps, canceled: canceled.length };
}

/** تبسيط الجذور */
export function simplifySqrt(n) {
  const rad = simplifyRadical(Math.round(n));
  if (!rad) return null;
  if (rad.inside === 1) return { latex: String(rad.outside), text: String(rad.outside), steps: [{ title: 'جذر تام', latex: `\\sqrt{${n}} = ${rad.outside}` }] };
  if (rad.outside === 1) return { latex: `\\sqrt{${rad.inside}}`, text: `√${rad.inside}`, steps: [{ title: 'لا يمكن تبسيط أكثر', latex: `\\sqrt{${n}}` }], unchanged: true };
  return {
    latex: `${rad.outside}\\sqrt{${rad.inside}}`,
    text: `${rad.outside}√${rad.inside}`,
    steps: [
      { title: 'نحلل العدد إلى عوامل أولية', latex: `${n} = ${factorsToText(primeFactors(n))}` },
      { title: 'نُخرج المربعات الكاملة', latex: `\\sqrt{${n}} = ${rad.outside}\\sqrt{${rad.inside}}` },
    ],
    factorText: factorsToText(primeFactors(n)),
  };
}

/** GCD و LCM */
export function gcdLcm(numbers) {
  if (!numbers.length) throw new Error('أدخل أرقامًا');
  const g = numbers.reduce((a, b) => gcd(a, b));
  const l = numbers.reduce((a, b) => lcm(a, b));
  return { gcd: g, lcm: l, steps: [
    { title: 'نحلل كل عدد إلى عوامله الأولية', latex: numbers.map((n) => `${n} = ${factorsToText(primeFactors(n))}`).join(' \\\\ ') },
    { title: 'القاسم المشترك الأكبر (نأخذ القوى المشتركة بأصغر أس)', latex: `\\gcd = ${g}` },
    { title: 'المضاعف المشترك الأصغر (نأخذ كل القوى بأكبر أس)', latex: `\\text{lcm} = ${l}` },
  ] };
}

/** توحيد المقامات */
export function commonDenominator(fractions) {
  const dens = fractions.map((f) => f.den);
  const l = dens.reduce((a, b) => lcm(a, b));
  const steps = [];
  const parts = fractions.map((f) => {
    const mult = l / f.den;
    steps.push({ title: `نضرب بسط ومقام ${f.num}/${f.den} في ${mult}`, latex: `\\frac{${f.num}}{${f.den}} = \\frac{${f.num * mult}}{${l}}` });
    return f.num * mult;
  });
  const total = parts.reduce((a, b) => a + b, 0);
  const r = new Rat(total, l);
  return { numerator: r.n, denominator: r.d, latex: r.d === 1 ? String(r.n) : `\\frac{${r.n}}{${r.d}}`, steps };
}

/** تبسيط كسر عددي */
export function simplifyNumericFraction(n, d) {
  const r = new Rat(Math.round(n), Math.round(d));
  return {
    latex: r.d === 1 ? String(r.n) : `\\frac{${r.n}}{${r.d}}`,
    mixed: r.toMixed(),
    decimal: r.value,
    steps: [
      { title: 'نحلل البسط والمقام', latex: `${n} = ${factorsToText(primeFactors(n))},\\quad ${d} = ${factorsToText(primeFactors(d))}` },
      { title: 'نقسم على القاسم المشترك الأكبر', latex: `\\frac{${n} \\div ${gcd(n, d)}}{${d} \\div ${gcd(n, d)}} = \\frac{${r.n}}{${r.d}}` },
    ],
  };
}
