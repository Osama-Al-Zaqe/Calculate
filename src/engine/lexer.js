// ============================================================
//  محرك رياضي رمزي — المحلل اللغوي (Lexer)
//  يحوّل نص المعادلة إلى قائمة رموز (tokens) بأمان تام بدون eval
// ============================================================

const GREEK = {
  'π': 'pi', 'Π': 'pi', 'θ': 'theta', 'α': 'alpha', 'β': 'beta',
  'γ': 'gamma', 'δ': 'delta', 'λ': 'lambda', 'μ': 'mu', 'ω': 'omega',
  '∞': 'inf', 'φ': 'phi',
};

const OPS = ['+', '-', '*', '/', '^', '(', ')', '[', ']', '{', '}', ',', '=', '<', '>', '!', '%', '|', ';', ':', "'"];

const KEYWORDS = new Set([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
  'asin', 'acos', 'atan', 'acot', 'asec', 'acsc',
  'arcsin', 'arccos', 'arctan',
  'sinh', 'cosh', 'tanh', 'coth', 'sech', 'csch',
  'asinh', 'acosh', 'atanh',
  'ln', 'log', 'lg', 'log2', 'exp', 'sqrt', 'cbrt', 'root', 'abs',
  'floor', 'ceil', 'round', 'sign', 'sgn', 'max', 'min', 'gcd', 'lcm',
  'mod', 'fact', 'nCr', 'nPr', 're', 'im', 'arg', 'deg', 'rad',
]);

export class MathSyntaxError extends Error {
  constructor(message, pos) {
    super(message);
    this.name = 'MathSyntaxError';
    this.pos = pos;
  }
}

/**
 * تحويل النص إلى رموز
 * @param {string} src
 * @returns {Array<{type:string,value:string,pos:number}>}
 */
export function tokenize(src) {
  const tokens = [];
  let i = 0;
  const n = src.length;
  let prevType = null; // لمتابعة الضرب الضمني

  const push = (type, value, pos) => {
    tokens.push({ type, value, pos });
    prevType = type;
  };

  while (i < n) {
    const ch = src[i];

    // مسافات
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }

    // أرقام (مع فاصلة عشرية عربية أو إنجليزية)
    if (/[0-9]/.test(ch) || ((ch === '.' || ch === '٫') && /[0-9]/.test(src[i + 1] || ''))) {
      let j = i;
      let num = '';
      while (j < n && /[0-9.]/.test(src[j])) {
        num += src[j] === '٫' ? '.' : src[j];
        j++;
      }
      if (num.split('.').length > 2) throw new MathSyntaxError('رقم غير صحيح: ' + num, i);
      push('num', num, i);
      i = j;
      continue;
    }

    // دوال وأسماء متغيرات
    if (/[A-Za-z]/.test(ch)) {
      let j = i;
      let name = '';
      while (j < n && /[A-Za-z0-9_]/.test(src[j])) {
        name += src[j];
        j++;
      }
      // أسماء الدوال المعروفة قد تتبعها قوس مباشرة أو بدون
      const lower = name;
      if (KEYWORDS.has(lower)) {
        push('func', lower, i);
      } else if (lower === 'pi' || lower === 'e') {
        push('const', lower, i);
      } else if (lower.length === 1) {
        push('var', lower, i);
      } else {
        // كلمة غير معروفة: نعتبرها دالة مجهولة أو متغير متعدد الأحرف
        push('var', lower, i);
      }
      i = j;
      continue;
    }

    // حروف يونانية ورموز رياضية
    if (GREEK[ch]) {
      const name = GREEK[ch];
      if (name === 'pi' || name === 'inf') push(name === 'pi' ? 'const' : 'const', name, i);
      else push('var', name, i);
      i++;
      continue;
    }

    // رموز بديلة
    if (ch === '×' || ch === '·' || ch === '⋅') { push('op', '*', i); i++; continue; }
    if (ch === '÷' || ch === '∕') { push('op', '/', i); i++; continue; }
    if (ch === '−' || ch === '–' || ch === '—') { push('op', '-', i); i++; continue; }
    if (ch === '²') { push('op', '^', i); push('num', '2', i); i++; continue; }
    if (ch === '³') { push('op', '^', i); push('num', '3', i); i++; continue; }
    if (ch === '√') { push('func', 'sqrt', i); i++; continue; }
    if (ch === '∛') { push('func', 'cbrt', i); i++; continue; }
    if (ch === '≤') { push('op', '<=', i); i++; continue; }
    if (ch === '≥') { push('op', '>=', i); i++; continue; }
    if (ch === '≠') { push('op', '!=', i); i++; continue; }
    if (ch === '∣') { push('op', '|', i); i++; continue; }

    // عوامل مقارنة مركبة
    if (ch === '<' || ch === '>') {
      if (src[i + 1] === '=') { push('op', ch + '=', i); i += 2; continue; }
      if (ch === '<' && src[i + 1] === '>') { push('op', '!=', i); i += 2; continue; }
      push('op', ch, i); i++; continue;
    }
    if (ch === '!' && src[i + 1] === '=') { push('op', '!=', i); i += 2; continue; }

    if (OPS.includes(ch)) {
      push('op', ch, i);
      i++;
      continue;
    }

    throw new MathSyntaxError(`رمز غير معروف: "${ch}"`, i);
  }

  // إضافة إغلاق تلقائي للأقواس الناقصة
  const open = tokens.filter((t) => t.type === 'op' && t.value === '(').length;
  const close = tokens.filter((t) => t.type === 'op' && t.value === ')').length;
  for (let k = 0; k < open - close; k++) tokens.push({ type: 'op', value: ')', pos: n });

  tokens.push({ type: 'eof', value: '', pos: n });
  return tokens;
}
