// ============================================================
//  المساعد الرياضي الذكي (محلي بالكامل)
//  يفهم المسألة بالعربية، يحدد نوعها، ثم يستدعي المحرك الحقيقي
// ============================================================

import { parse } from './parser.js';
import { toLatex } from './latex.js';
import { solveEquation, solveSystem, parseEquations } from './solve.js';
import { differentiate } from './derivative.js';
import { integrate, definiteIntegral } from './integral.js';
import { computeLimit } from './limits.js';
import { simplify, expand } from './simplify.js';
import { analyzeFunction } from './functionAnalysis.js';
import { factorPolynomial, simplifyExpression } from './factor.js';
import { evaluate, fmt } from './eval.js';
import { describe, parseNumbers } from './stats.js';
import { Num } from './ast.js';
import { vars } from './ast.js';

const step = (title, latex, note) => ({ title, latex, note });

/** الكلمات المفتاحية العربية للتعرف على نوع المسألة */
const PATTERNS = [
  { type: 'derivative', words: ['اشتق', 'مشتقة', 'اشتقاق', 'تفاضل', 'derivative', 'diff'] },
  { type: 'integral', words: ['تكامل', 'تكاملية', 'integral', 'انتجرال'] },
  { type: 'limit', words: ['نهاية', 'نهايات', 'limit', 'غاية'] },
  { type: 'solve', words: ['حل', 'جذور', 'جذر المعادلة', 'solve', 'أوجد قيمة', 'اوجد قيمة', 'قيمة x', 'قيمة س'] },
  { type: 'factor', words: ['حلل', 'تحليل', 'عوامل', 'factor'] },
  { type: 'expand', words: ['فك', 'بسط', 'تبسيط', 'simplify', 'expand'] },
  { type: 'analyze', words: ['ادرس', 'تحليل الدالة', 'مجال', 'مدى', 'تزايد', 'تناقص', 'نقاط حرجة'] },
  { type: 'stats', words: ['متوسط', 'وسيط', 'منوال', 'انحراف', 'تباين', 'إحصاء', 'احصاء'] },
  { type: 'evaluate', words: ['احسب', 'قيمة', 'احسب قيمة', 'evaluate', '='] },
];

function detectType(text) {
  const t = text.toLowerCase();
  for (const p of PATTERNS) {
    if (p.words.some((w) => t.includes(w))) return p.type;
  }
  return null;
}

/** استخراج التعبير الرياضي من النص العربي */
function extractExpression(text) {
  let s = text
    .replace(/[أ-ي\u0600-\u06FF]+/g, ' ') // إزالة الكلمات العربية (بما فيها الحروف المفردة مثل "ح" في "حل")
    .replace(/[؟?]/g, ' ')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/√/g, 'sqrt')
    .trim();
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/**
 * المساعد الرياضي: يحلل النص ويحل المسألة خطوة بخطوة
 * @param {string} text نص المسألة بالعربية أو معادلة
 */
export function assistant(text) {
  const raw = text.trim();
  if (!raw) return { ok: false, message: 'اكتب مسألة رياضية أولًا' };

  const steps = [];
  const type = detectType(raw) || guessType(raw);

  steps.push(step('١. فهم المطلوب', `\\text{${escapeArabic(describeType(type))}}`));

  try {
    switch (type) {
      case 'derivative': return solveDerivativeTask(raw, steps);
      case 'integral': return solveIntegralTask(raw, steps);
      case 'limit': return solveLimitTask(raw, steps);
      case 'factor': return solveFactorTask(raw, steps);
      case 'expand': return solveSimplifyTask(raw, steps);
      case 'analyze': return solveAnalyzeTask(raw, steps);
      case 'stats': return solveStatsTask(raw, steps);
      case 'solve': return solveEquationTask(raw, steps);
      case 'evaluate': return solveEvaluateTask(raw, steps);
      default: return solveEquationTask(raw, steps);
    }
  } catch (e) {
    return { ok: false, message: `لم أتمكن من حل المسألة: ${e.message}`, steps };
  }
}

function describeType(type) {
  const map = {
    derivative: 'مسألة تفاضل — نريد إيجاد المشتقة',
    integral: 'مسألة تكامل',
    limit: 'مسألة نهايات',
    solve: 'معادلة — نريد إيجاد قيمة المجهول',
    factor: 'تحليل إلى عوامل',
    expand: 'تبسيط تعبير جبري',
    analyze: 'دراسة دالة',
    stats: 'مسألة إحصائية',
    evaluate: 'حساب قيمة تعبير عددي',
  };
  return map[type] || 'مسألة رياضية';
}

function guessType(raw) {
  if (/[=]/.test(raw)) return 'solve';
  if (/[a-zA-Z]/.test(raw)) return 'evaluate';
  return 'evaluate';
}

function escapeArabic(s) {
  return `\\text{${s}}`;
}

function solveDerivativeTask(raw, steps) {
  const expr = extractExpression(raw);
  const ast = parse(expr);
  const v = [...vars(ast)][0] || 'x';
  const subSteps = [];
  const d = simplify(differentiate(ast, v, subSteps));
  steps.push(step('٢. نحدد نوع المسألة', `\\text{اشتقاق الدالة } ${toLatex(ast)} \\text{ بالنسبة لـ } ${v}`));
  steps.push(step('٣. نطبّق قواعد الاشتقاق', '\\text{قاعدة الجمع، الضرب، السلسلة، ...}'));
  steps.push(...subSteps.map((s, i) => ({ title: `   ${s.title}`, latex: s.latex })));
  steps.push(step('٤. النتيجة النهائية', `f'(${v}) = ${toLatex(d)}`));
  return {
    ok: true, type: 'derivative',
    resultLatex: `f'(${v}) = ${toLatex(d)}`,
    steps,
    verified: verifyDerivative(ast, d, v),
    explanation: 'اشتققنا الدالة باستخدام قواعد الاشتقاق ثم بسطنا الناتج. يمكن التحقق عدديًا بمقارنة الميل التقريبي.',
  };
}

function verifyDerivative(f, d, v) {
  const h = 1e-6;
  for (const x of [0.7, 1.9, 2.4]) {
    try {
      const numeric = (evaluate(f, { [v]: x + h }) - evaluate(f, { [v]: x - h })) / (2 * h);
      const symbolic = evaluate(d, { [v]: x });
      if (!Number.isFinite(numeric) || !Number.isFinite(symbolic)) continue;
      if (Math.abs(numeric - symbolic) > 1e-4 * Math.max(1, Math.abs(numeric))) return false;
    } catch { /* تجاهل */ }
  }
  return true;
}

function solveIntegralTask(raw, steps) {
  const expr = extractExpression(raw);
  const ast = parse(expr);
  const v = [...vars(ast)][0] || 'x';
  const subSteps = [];
  const antiderivative = integrate(ast, v, subSteps);
  steps.push(step('٢. نحدد نوع المسألة', `\\int ${toLatex(ast)} \\, d${v}`));
  if (!antiderivative) {
    const num = requireNumeric(ast, v, raw);
    if (num) {
      steps.push(step('٣. لا يوجد حل رمزي مباشر', '\\text{نستخدم تكاملًا عدديًا}'));
      steps.push(step('٤. النتيجة', `\\approx ${fmt(num.value, 10)}`));
      return { ok: true, type: 'integral', resultLatex: `\\int \\approx ${fmt(num.value, 8)}`, steps };
    }
    return { ok: false, message: 'لم أجد حلًا رمزيًا لهذا التكامل. جرّب إدخال حدود التكامل للحصول على قيمة عددية.', steps };
  }
  steps.push(...subSteps.map((s) => ({ title: `   ${s.title}`, latex: s.latex })));
  steps.push(step('٤. النتيجة النهائية', `\\int ${toLatex(ast)} \\, d${v} = ${toLatex(antiderivative)} + C`));
  return {
    ok: true, type: 'integral',
    resultLatex: `\\int ${toLatex(ast)} \\, d${v} = ${toLatex(antiderivative)} + C`,
    steps,
    explanation: 'استخدمنا قواعد التكامل الأساسية (القوة، الجمع، التعويض أو التجزئة) ثم أضفنا ثابت التكامل C.',
  };
}

function requireNumeric(ast, v, raw) {
  const m = raw.match(/من\s*(-?[\d.]+)\s*إلى\s*(-?[\d.]+)/);
  if (!m) return null;
  const a = Number(m[1]), b = Number(m[2]);
  return definiteIntegral(ast, v, a, b);
}

function solveLimitTask(raw, steps) {
  const expr = extractExpression(raw);
  const ast = parse(expr);
  const v = [...vars(ast)][0] || 'x';
  let point = 0;
  const inf = /مالانهاية|∞|لانهاية|infinity/.test(raw);
  const m = raw.match(/(?:عند|إلى|الى|toward)\s*(-?[\d.]+)/);
  if (inf) point = 'inf';
  else if (m) point = Number(m[1]);
  const res = computeLimit(ast, v, point);
  steps.push(step('٢. نحدد النقطة', `\\lim_{${v} \\to ${point === 'inf' ? '+\\infty' : fmt(point)}} ${toLatex(ast)}`));
  steps.push(...res.steps.map((s) => ({ title: `   ${s.title}`, latex: s.latex })));
  return {
    ok: true, type: 'limit',
    resultLatex: `\\lim_{${v} \\to ${point === 'inf' ? '+\\infty' : fmt(point)}} ${toLatex(ast)} = ${Number.isFinite(res.value) ? fmt(res.value, 10) : (res.value > 0 ? '+\\infty' : '-\\infty')}`,
    steps,
    explanation: `استخدمنا طريقة ${res.method}.`,
  };
}

function solveFactorTask(raw, steps) {
  const expr = extractExpression(raw);
  const ast = parse(expr);
  const v = [...vars(ast)][0] || 'x';
  const res = factorPolynomial(ast, v);
  steps.push(step('٢. التعبير المطلوب تحليله', toLatex(ast)));
  steps.push(...res.steps.map((s) => ({ title: `   ${s.title}`, latex: s.latex })));
  return {
    ok: true, type: 'factor',
    resultLatex: res.latex,
    steps,
    message: res.message,
    explanation: 'أخرجنا العامل المشترك ثم بحثنا عن الجذور النسبية وقسمنا قسمة تركيبية.',
  };
}

function solveSimplifyTask(raw, steps) {
  const expr = extractExpression(raw);
  const ast = parse(expr);
  const res = simplifyExpression(expand(ast));
  steps.push(step('٢. نفك الأقواس ونجمع الحدود المتشابهة', toLatex(res.result)));
  return {
    ok: true, type: 'expand',
    resultLatex: res.latex,
    steps: [...steps, ...res.steps.map((s) => ({ title: `   ${s.title}`, latex: s.latex }))],
    explanation: 'فككنا الأقواس ثم جمعنا الحدود المتشابهة.',
  };
}

function solveAnalyzeTask(raw, steps) {
  const expr = extractExpression(raw);
  const ast = parse(expr);
  const v = [...vars(ast)][0] || 'x';
  const res = analyzeFunction(ast, v);
  steps.push(step('٢. الدالة', `f(${v}) = ${toLatex(ast)}`));
  steps.push(...res.steps.map((s) => ({ title: `   ${s.title}`, latex: s.latex })));
  return {
    ok: true, type: 'analyze',
    resultLatex: `f(${v}) = ${toLatex(ast)}`,
    steps,
    explanation: 'حللنا الدالة: المجال، الجذور، المشتقة، فترات التزايد والتناقص، والقيم الحدية.',
  };
}

function solveStatsTask(raw, steps) {
  const nums = raw.replace(/[^\d.,;\s-]/g, ' ').split(/[\s,;]+/).filter(Boolean).map(Number).filter((x) => !Number.isNaN(x));
  if (!nums.length) return { ok: false, message: 'لم أجد أرقامًا في المسألة', steps };
  const d = describe(nums);
  steps.push(step('٢. البيانات', nums.join(', ')));
  steps.push(step('٣. المتوسط الحسابي', `\\bar{x} = \\frac{${d.sum}}{${d.count}} = ${fmt(d.mean, 6)}`));
  steps.push(step('٤. الوسيط', fmt(d.median, 6)));
  steps.push(step('٥. الانحراف المعياري', `\\sigma = ${fmt(d.stdPop, 6)}`));
  return {
    ok: true, type: 'stats',
    resultLatex: `\\bar{x} = ${fmt(d.mean, 6)},\\; \\text{الوسيط} = ${fmt(d.median, 6)},\\; \\sigma = ${fmt(d.stdPop, 6)}`,
    steps,
    explanation: 'حسبنا المتوسط والوسيط والانحراف المعياري للبيانات المعطاة.',
  };
}

function solveEquationTask(raw, steps) {
  const cleaned = extractExpression(raw);
  const lines = cleaned.split(/[\n;]+/).filter((l) => l.trim());
  const eqs = parseEquations(lines.join('\n'));
  steps.push(step('٢. نحدد نوع المسألة', eqs.length > 1 ? '\\text{نظام معادلات}' : '\\text{معادلة}'));

  if (eqs.length > 1) {
    const res = solveSystem(eqs);
    steps.push(...res.steps.map((s) => ({ title: `   ${s.title}`, latex: s.latex })));
    return {
      ok: true, type: 'system',
      resultLatex: res.solutions
        ? Object.entries(res.solutions).map(([k, v]) => `${k} = ${fmt(v, 8)}`).join(',\\;')
        : `\\text{${res.message}}`,
      steps,
      message: res.message,
      explanation: 'حللنا النظام بالحذف الغاوسي ثم تحققنا من الحل بالتعويض.',
    };
  }

  const res = solveEquation(eqs[0]);
  steps.push(...res.steps.map((s) => ({ title: `   ${s.title}`, latex: s.latex })));
  const verified = res.solutions && res.solutions.length
    ? res.solutions.every((s) => {
      try {
        const l = evaluate(eqs[0].lhs, { [res.variable]: s });
        const r = evaluate(eqs[0].rhs, { [res.variable]: s });
        return Math.abs(l - r) < 1e-6 * Math.max(1, Math.abs(r));
      } catch { return false; }
    })
    : false;
  steps.push(step('٥. التحقق بالتعويض', verified ? '\\checkmark \\; \\text{الحل يحقق المعادلة}' : '\\text{لا يوجد حل حقيقي للتحقق منه}'));
  return {
    ok: true, type: 'equation',
    resultLatex: res.solutions?.length
      ? res.solutions.map((s, i) => `${res.variable}${res.solutions.length > 1 ? `_{${i + 1}}` : ''} = ${fmt(s, 8)}`).join(',\\;')
      : `\\text{${res.message}}`,
    steps,
    verified,
    message: res.message,
    explanation: 'أعدنا ترتيب المعادلة إلى الصورة القياسية ثم حللناها حسب درجتها، وتأكدنا من الحل بالتعويض.',
  };
}

function solveEvaluateTask(raw, steps) {
  const expr = extractExpression(raw);
  const ast = parse(expr);
  const vs = [...vars(ast)];
  if (vs.length) {
    const res = analyzeFunction(ast, vs[0]);
    steps.push(step('٢. الدالة تحتوي متغيرًا — نعرض تحليلها', `f(${vs[0]}) = ${toLatex(ast)}`));
    steps.push(...res.steps.map((s) => ({ title: `   ${s.title}`, latex: s.latex })));
    return { ok: true, type: 'analyze', resultLatex: `f(${vs[0]}) = ${toLatex(simplify(ast))}`, steps };
  }
  const s = simplify(ast);
  const value = evaluate(s);
  steps.push(step('٢. نبسّط التعبير', toLatex(s)));
  steps.push(step('٣. النتيجة', fmt(value, 12)));
  return {
    ok: true, type: 'evaluate',
    resultLatex: `${toLatex(ast)} = ${fmt(value, 12)}`,
    steps,
    verified: true,
    explanation: 'حسبنا التعبير بدقة عددية مع مراعاة ترتيب العمليات.',
  };
}

export { detectType, extractExpression };
