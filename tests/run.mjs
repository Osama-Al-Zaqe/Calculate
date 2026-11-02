// اختبارات محرك الرياضيات
import { parse } from '../src/engine/parser.js';
import { simplify, expand } from '../src/engine/simplify.js';
import { evaluate, fmt } from '../src/engine/eval.js';
import { toLatex } from '../src/engine/latex.js';
import { solveEquation, solveSystem, parseEquations } from '../src/engine/solve.js';
import { differentiate } from '../src/engine/derivative.js';
import { integrate, definiteIntegral, verifyIntegral } from '../src/engine/integral.js';
import { computeLimit, testContinuity } from '../src/engine/limits.js';
import { determinant, inverse, matMul, rank, eigenvalues } from '../src/engine/matrix.js';
import { dot, cross, norm, angleBetween, lineThrough, circle } from '../src/engine/geometry.js';
import { describe as statDescribe, correlation, binomialProbability, normalCdf } from '../src/engine/stats.js';
import { factorPolynomial, simplifySqrt, simplifyNumericFraction } from '../src/engine/factor.js';
import { analyzeFunction } from '../src/engine/functionAnalysis.js';
import { convert } from '../src/engine/convert.js';
import { assistant } from '../src/engine/assistant.js';
import { QUESTIONS } from '../src/data/questions.js';

let pass = 0, fail = 0;
const failures = [];

function eq(actual, expected, label, tol = 1e-8) {
  const ok = Math.abs(actual - expected) <= tol * Math.max(1, Math.abs(expected));
  if (ok) pass++;
  else { fail++; failures.push(`${label}: توقعنا ${expected} وحصلنا على ${actual}`); }
}

function truthy(cond, label) {
  if (cond) pass++;
  else { fail++; failures.push(`${label}`); }
}

function throws(fn, label) {
  try { fn(); fail++; failures.push(`${label}: كان يجب أن يرفع خطأ`); }
  catch { pass++; }
}

// ---------- المحلل ----------
eq(evaluate(parse('2+3*4')), 14, 'ترتيب العمليات');
eq(evaluate(parse('(2+3)*4')), 20, 'الأقواس');
eq(evaluate(parse('2^3^2')), 512, 'الأس يميني الترابط');
eq(evaluate(parse('-2^2')), -4, 'السالب مع الأس');
eq(evaluate(parse('2x+1'), { x: 3 }), 7, 'الضرب الضمني');
eq(evaluate(parse('2(3+1)')), 8, 'ضرب ضمني بأقواس');
eq(evaluate(parse('(x+1)(x-1)'), { x: 5 }), 24, 'ضرب قوسين');
eq(evaluate(parse('sin(0)')), 0, 'جيب الصفر');
eq(evaluate(parse('cos(pi)')), -1, 'جيب تمام باي');
eq(evaluate(parse('ln(e)')), 1, 'لوغاريتم طبيعي');
eq(evaluate(parse('log(100)')), 2, 'لوغاريتم عشري');
eq(evaluate(parse('5!')), 120, 'المضروب');
eq(evaluate(parse('sqrt(16)')), 4, 'الجذر');
eq(evaluate(parse('abs(-7)')), 7, 'القيمة المطلقة');
eq(evaluate(parse('50%')), 0.5, 'النسبة المئوية');
eq(evaluate(parse('sin(30)'), {}, { angle: 'deg' }), 0.5, 'الدرجات');
eq(evaluate(parse('|−3|')), 3, 'القيمة المطلقة بالرموز');
eq(evaluate(parse('2×3÷6')), 1, 'رموز الضرب والقسمة');
eq(evaluate(parse('π')), Math.PI, 'باي');
eq(evaluate(parse('3²+2³')), 17, 'الأسس المرتفعة');
throws(() => parse('2+*3'), 'تعبير غير صالح يرفع خطأ');

// ---------- التبسيط ----------
truthy(toLatex(simplify(parse('2x+3x'))) === '5x', 'جمع الحدود المتشابهة 2x+3x=5x → ' + toLatex(simplify(parse('2x+3x'))));
truthy(toLatex(simplify(parse('x*x'))) === 'x^{2}', 'x*x=x²');
truthy(toLatex(simplify(parse('x^2*x^3'))) === 'x^{5}', 'x²·x³=x⁵');
truthy(toLatex(simplify(parse('(x^2)^3'))) === 'x^{6}', '(x²)³=x⁶');
truthy(toLatex(simplify(parse('x/x'))) === '1', 'x/x=1');
eq(evaluate(expand(parse('(x+2)(x+3)')), { x: 1 }), 12, 'فك الأقواس');
truthy(toLatex(expand(parse('(x+1)^2'))) === 'x^{2} + 2x + 1', '(x+1)²=x²+2x+1 → ' + toLatex(expand(parse('(x+1)^2'))));
eq(evaluate(simplify(parse('1/3+1/6'))), 0.5, 'جمع كسور');

// ---------- حل المعادلات ----------
const s1 = solveEquation(parse('2x+5=15'));
eq(s1.solutions[0], 5, 'معادلة خطية 2x+5=15');
truthy(s1.steps.length > 2, 'خطوات المعادلة الخطية موجودة');

const s2 = solveEquation(parse('x^2-5x+6=0'));
eq(s2.solutions[0], 3, 'تربيعية جذر 1');
eq(s2.solutions[1], 2, 'تربيعية جذر 2');
eq(s2.discriminant, 1, 'المميز');

const s3 = solveEquation(parse('x^2+1=0'));
truthy(s3.complex && s3.solutions.length === 0, 'تربيعية بجذور مركبة');

const s4 = solveEquation(parse('x^3-6x^2+11x-6=0'));
eq(s4.solutions.length, 3, 'عدد جذور تكعيبية');
eq(s4.solutions.reduce((a, b) => a + b, 0), 6, 'مجموع جذور التكعيبية');

const s5 = solveEquation(parse('3(x-2)=2x+1'));
eq(s5.solutions[0], 7, 'معادلة بأقواس');

const s6 = solveEquation(parse('x/2+1=4'));
eq(s6.solutions[0], 6, 'معادلة بكسر');

const s7 = solveSystem(parseEquations('x+y+z=6\n2x-y+z=3\nx+2y-z=2'));
truthy(s7.solutions && Math.abs(s7.solutions.x - 1) < 1e-8 && Math.abs(s7.solutions.y - 2) < 1e-8 && Math.abs(s7.solutions.z - 3) < 1e-8,
  'نظام 3 مجاهيل: ' + JSON.stringify(s7.solutions));

const s8 = solveSystem(parseEquations('2x+3y=7\n4x+6y=14'));
truthy(s8.infinite, 'نظام بحلول لا نهائية');

const s9 = solveSystem(parseEquations('x+y=2\nx+y=5'));
truthy(s9.none, 'نظام غير متسق');

const s10 = solveEquation(parse('sqrt(x+3)=4'));
eq(s10.solutions[0], 13, 'معادلة جذرية');

const s11 = solveEquation(parse('abs(x-2)=5'));
truthy(s11.solutions.length === 2 && s11.solutions.includes(7) && s11.solutions.includes(-3), 'معادلة قيمة مطلقة');

const s12 = solveEquation(parse('2^x=8'));
eq(s12.solutions[0], 3, 'معادلة أسية');

const s13 = solveEquation(parse('ln(x)=0'));
eq(s13.solutions[0], 1, 'معادلة لوغاريتمية');

const s14 = solveEquation(parse('(x+1)/(x-1)=3'));
eq(s14.solutions[0], 2, 'معادلة كسرية');

const s15 = solveEquation(parse('sin(x)=0.5'));
truthy(s15.solutions.length >= 2, 'معادلة مثلثية');

// ---------- التفاضل ----------
const d1 = simplify(differentiate(parse('x^3+5x^2-4x+7'), 'x', []));
eq(evaluate(d1, { x: 2 }), 28, 'مشتقة كثيرة حدود عند 2');
truthy(toLatex(d1) === '3x^{2} + 10x - 4', 'شكل المشتقة → ' + toLatex(d1));

const d2 = simplify(differentiate(parse('sin(x)+cos(x)'), 'x', []));
eq(evaluate(d2, { x: 0 }), 1, 'مشتقة sin+cos');

const d3 = simplify(differentiate(parse('e^x+ln(x)'), 'x', []));
eq(evaluate(d3, { x: 1 }), Math.E + 1, 'مشتقة e^x+ln x');

const d4 = simplify(differentiate(parse('x^2*sin(x)'), 'x', []));
eq(evaluate(d4, { x: 1 }), 2 * Math.sin(1) + Math.cos(1), 'قاعدة الضرب');

const d5 = simplify(differentiate(parse('x/(x+1)'), 'x', []));
eq(evaluate(d5, { x: 1 }), 0.25, 'قاعدة القسمة');

const d6 = simplify(differentiate(parse('sin(x^2)'), 'x', []));
eq(evaluate(d6, { x: 1 }), 2 * Math.cos(1), 'قاعدة السلسلة');

const d7 = simplify(differentiate(parse('tan(x)'), 'x', []));
eq(evaluate(d7, { x: 0.5 }), 1 / Math.cos(0.5) ** 2, 'مشتقة tan');

const d8 = simplify(differentiate(parse('arctan(x)'), 'x', []));
eq(evaluate(d8, { x: 1 }), 0.5, 'مشتقة arctan');

const d9 = simplify(differentiate(parse('x^x'), 'x', []));
eq(evaluate(d9, { x: 2 }), 4 * (Math.log(2) + 1), 'مشتقة x^x');

// ---------- التكامل ----------
const i1 = integrate(parse('x^2'), 'x', []);
eq(evaluate(i1, { x: 3 }), 9, 'تكامل x²');

const i2 = integrate(parse('1/x'), 'x', []);
eq(evaluate(i2, { x: 2 }), Math.log(2), 'تكامل 1/x');

const i3 = integrate(parse('cos(x)'), 'x', []);
eq(evaluate(i3, { x: 1 }), Math.sin(1), 'تكامل cos');

const i4 = integrate(parse('2x*e^(x^2)'), 'x', []);
truthy(i4 !== null, 'تكامل بالتعويض');
if (i4) eq(evaluate(i4, { x: 1 }), Math.exp(1), 'تكامل بالتعويض قيمة', 1e-6);

const i5 = integrate(parse('x*e^x'), 'x', []);
truthy(i5 !== null, 'تكامل بالتجزئة');
if (i5) eq(evaluate(i5, { x: 1 }), 0, 'تكامل بالتجزئة قيمة', 1e-6);

const i6 = integrate(parse('sin(2x)'), 'x', []);
eq(evaluate(i6, { x: 1 }), -Math.cos(2) / 2, 'تكامل sin(2x)');

const di = definiteIntegral(parse('x^2'), 'x', 0, 3);
eq(di.value, 9, 'تكامل محدد x² من 0 إلى 3');

const di2 = definiteIntegral(parse('e^(-x^2)'), 'x', 0, 1);
eq(di2.value, 0.7468241328, 'تكامل عددي e^(-x²)', 1e-6);

// ---------- النهايات ----------
const l1 = computeLimit(parse('sin(x)/x'), 'x', 0);
eq(l1.value, 1, 'نهاية sin(x)/x', 1e-6);

const l2 = computeLimit(parse('(x^2-1)/(x-1)'), 'x', 1);
eq(l2.value, 2, 'نهاية (x²-1)/(x-1)', 1e-6);

const l3 = computeLimit(parse('1/x'), 'x', 'inf');
eq(l3.value, 0, 'نهاية 1/x عند المالانهاية');

const l4 = computeLimit(parse('(3x^2+2x)/(x^2-1)'), 'x', 'inf');
eq(l4.value, 3, 'نهاية كسرية عند المالانهاية');

const c1 = testContinuity(parse('1/x'), 'x', 0);
truthy(!c1.continuous, 'انقطاع 1/x عند 0');

const c2 = testContinuity(parse('x^2'), 'x', 2);
truthy(c2.continuous, 'اتصال x² عند 2');

// ---------- المصفوفات ----------
const A = [[1, 2], [3, 4]];
eq(determinant(A), -2, 'محدد 2×2');
const inv = inverse(A);
eq(inv[0][0], -2, 'معكوس مصفوفة');
eq(determinant([[1, 2, 3], [4, 5, 6], [7, 8, 10]]), -3, 'محدد 3×3');
eq(rank([[1, 2], [2, 4]]), 1, 'رتبة مصفوفة');
const ev = eigenvalues([[2, 0], [0, 3]]);
truthy(ev.some((e) => Math.abs(e.value - 2) < 1e-6) && ev.some((e) => Math.abs(e.value - 3) < 1e-6), 'القيم الذاتية');
const prod = matMul(A, [[1, 0], [0, 1]]);
eq(prod[0][0], 1, 'ضرب مصفوفات');

// ---------- المتجهات ----------
eq(dot([1, 2, 3], [4, 5, 6]), 32, 'الضرب القياسي');
eq(norm([3, 4]), 5, 'طول المتجه');
const cr = cross([1, 0, 0], [0, 1, 0]);
eq(cr[2], 1, 'الضرب الاتجاهي');
eq(Math.round(angleBetween([1, 0], [0, 1]).deg), 90, 'الزاوية بين متجهين');
const ln = lineThrough([0, 0], [1, 2]);
eq(ln.slope, 2, 'ميل المستقيم');
truthy(circle(0, 0, 5).latex.includes('25'), 'معادلة الدائرة');

// ---------- الإحصاء ----------
const st = statDescribe([2, 4, 4, 4, 5, 5, 7, 9]);
eq(st.mean, 5, 'المتوسط');
eq(st.median, 4.5, 'الوسيط');
eq(st.mode[0], 4, 'المنوال');
eq(st.range, 7, 'المدى');
eq(st.stdPop, 2, 'الانحراف المعياري');
const cor = correlation([1, 2, 3, 4], [2, 4, 6, 8]);
eq(cor.r, 1, 'معامل الارتباط');
eq(binomialProbability(5, 2, 0.5), 0.3125, 'التوزيع ذو الحدين');
eq(normalCdf(0), 0.5, 'التوزيع الطبيعي', 1e-4);

// ---------- التحليل ----------
const f1 = factorPolynomial(parse('x^2-5x+6'), 'x');
truthy(f1.ok && f1.latex.includes('x - 3') && f1.latex.includes('x - 2'), 'تحليل x²-5x+6 → ' + f1.latex);
const f2 = factorPolynomial(parse('x^3-x'), 'x');
truthy(f2.ok && f2.factored.t === 'mul', 'تحليل x³-x → ' + f2.latex);
const sq = simplifySqrt(72);
truthy(sq && sq.text === '6√2', 'تبسيط √72 → ' + sq.text);
const fr = simplifyNumericFraction(24, 36);
truthy(fr.latex === '\\frac{2}{3}', 'تبسيط 24/36');

// ---------- تحليل الدوال ----------
const an = analyzeFunction(parse('x^2-4x+3'), 'x');
eq(an.roots.length, 2, 'جذور x²-4x+3');
truthy(an.extrema.some((e) => e.kind === 'قيمة صغرى محلية'), 'قيمة صغرى محلية');
eq(an.yIntercept, 3, 'التقاطع مع y');

// ---------- المحول ----------
eq(convert('length', 1, 'km', 'm').value, 1000, 'كم إلى م');
eq(convert('temperature', 100, 'C', 'F').value, 212, 'مئوية إلى فهرنهايت');
eq(convert('angle', 180, 'deg', 'rad').value, Math.PI, 'درجات إلى راديان');
eq(convert('speed', 36, 'kph', 'mps').value, 10, 'كم/س إلى م/ث');
eq(convert('mass', 1, 'kg', 'g').value, 1000, 'كجم إلى جرام');

// ---------- المساعد ----------
const a1 = assistant('حل المعادلة 2x+5=15');
truthy(a1.ok && a1.resultLatex.includes('5'), 'المساعد: حل معادلة');
const a2 = assistant('اشتق x^3+2x');
truthy(a2.ok && a2.type === 'derivative', 'المساعد: اشتقاق');
const a3 = assistant('احسب 15*4+20');
truthy(a3.ok, 'المساعد: حساب');

// ---------- بنك الأسئلة ----------
truthy(QUESTIONS.length >= 40, 'بنك الأسئلة يحتوي على 40+ سؤالًا (' + QUESTIONS.length + ')');
let badQ = 0;
for (const q of QUESTIONS) {
  if (!q.question || !q.answer || !q.solution || !q.topic || !q.level) badQ++;
}
truthy(badQ === 0, 'كل الأسئلة مكتملة الحقول');

console.log(`\n✅ نجح: ${pass}   ❌ فشل: ${fail}`);
if (failures.length) {
  console.log('\nالأخطاء:');
  failures.forEach((f) => console.log('  • ' + f));
  process.exit(1);
}
