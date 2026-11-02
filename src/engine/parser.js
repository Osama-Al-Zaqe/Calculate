// ============================================================
//  محرك رياضي رمزي — المحلل النحوي (Parser)
//  خوارزمية Pratt مع دعم الضرب الضمني والأسس المتتابعة
// ============================================================

import { tokenize, MathSyntaxError } from './lexer.js';
import { Num, Var, Const, Add, Mul, Pow, Neg, Div, Fn, Eq, Rel, List } from './ast.js';

const REL_OPS = new Set(['=', '<=', '>=', '<', '>', '!=']);

class Parser {
  constructor(tokens, src) {
    this.tokens = tokens;
    this.src = src;
    this.i = 0;
    this.inAbs = 0;
  }
  peek(off = 0) { return this.tokens[this.i + off]; }
  next() { return this.tokens[this.i++]; }
  expectOp(value) {
    const t = this.peek();
    if (t.type === 'op' && t.value === value) { this.i++; return t; }
    throw new MathSyntaxError(`توقّعنا "${value}" لكن وجدنا "${t.value || 'نهاية'}"`, t.pos);
  }
  atOp(value) {
    const t = this.peek();
    return t.type === 'op' && t.value === value;
  }
  atEof() { return this.peek().type === 'eof'; }

  // التعبير الكامل (قد يكون قائمة معادلات مفصولة بفاصلة منقوطة)
  parseProgram() {
    const items = [];
    items.push(this.parseRelation());
    while (this.atOp(';') || (this.atOp(',') && false)) {
      this.next();
      items.push(this.parseRelation());
    }
    if (!this.atEof()) {
      const t = this.peek();
      throw new MathSyntaxError(`رمز غير متوقع: "${t.value}"`, t.pos);
    }
    return items.length === 1 ? items[0] : List(items);
  }

  parseRelation() {
    const left = this.parseExpr(0);
    const t = this.peek();
    if (t.type === 'op' && REL_OPS.has(t.value)) {
      this.next();
      const right = this.parseExpr(0);
      return t.value === '=' ? Eq(left, right) : Rel(t.value, left, right);
    }
    return left;
  }

  parseExpr(minBp) {
    let left = this.parsePrefix();
    left = this.parsePostfix(left);
    for (;;) {
      const t = this.peek();
      let lbp = 0;
      let kind = null;
      if (t.type === 'op') {
        if (t.value === '+' || t.value === '-') { lbp = 10; kind = 'add'; }
        else if (t.value === '*' || t.value === '/') { lbp = 20; kind = 'mul'; }
        else if (t.value === '^') { lbp = 40; kind = 'pow'; }
        else if (t.value === '!') { lbp = 50; kind = 'fact'; }
        else if (t.value === '%') { lbp = 50; kind = 'pct'; }
        else if (t.value === '|') {
          // "|" قد تكون فتح أو إغلاق القيمة المطلقة
          if (this.inAbs > 0) lbp = 0;
          else { lbp = 20; kind = 'implicit'; }
        }
        else if (t.value === '(' || t.value === '[' || t.value === '{') { lbp = 20; kind = 'implicit'; }
        else lbp = 0;
      } else if (t.type === 'num' || t.type === 'var' || t.type === 'const' || t.type === 'func') {
        // ضرب ضمني: 2x ، 2(x+1) ، (x+1)(x-1) ، 2sin(x)
        // لكن الدالة المتبوعة بقوس مباشرة ليست ضربًا ضمنيًا (sin(x))
        const prev = this.tokens[this.i - 1];
        if (t.type === 'func' && this.atOp('(') && prev) {
          lbp = 0;
        } else {
          lbp = 20; kind = 'implicit';
        }
      }

      if (lbp === 0 || lbp <= minBp) break;

      if (kind === 'add') {
        this.next();
        const right = this.parseExpr(lbp);
        left = t.value === '+' ? Add(left, right) : Add(left, Neg(right));
      } else if (kind === 'mul') {
        this.next();
        const right = this.parseExpr(lbp);
        left = t.value === '*' ? Mul(left, right) : Div(left, right);
      } else if (kind === 'pow') {
        this.next();
        const right = this.parseExpr(lbp - 1); // الأس يميني الترابط
        // تحويل e^u إلى exp(u)
        if (left.t === 'const' && left.name === 'e') {
          left = Fn('exp', [right]);
        } else {
          left = Pow(left, right);
        }
      } else if (kind === 'fact') {
        this.next();
        left = Fn('fact', [left]);
      } else if (kind === 'pct') {
        this.next();
        left = Mul(left, Num(0.01));
      } else if (kind === 'implicit') {
        const right = this.parseExpr(lbp);
        left = Mul(left, right);
      }
    }
    return left;
  }

  parsePostfix(node) {
    return node;
  }

  parsePrefix() {
    const t = this.peek();
    if (t.type === 'num') { this.next(); return Num(parseFloat(t.value)); }
    if (t.type === 'const') { this.next(); return Const(t.value); }
    if (t.type === 'var') { this.next(); return Var(t.value); }
    if (t.type === 'op') {
      if (t.value === '-') { this.next(); return Neg(this.parseExpr(30)); }
      if (t.value === '+') { this.next(); return this.parseExpr(30); }
      if (t.value === '(') { this.next(); const e = this.parseExpr(0); this.expectOp(')'); return e; }
      if (t.value === '[') { this.next(); const e = this.parseExpr(0); this.expectOp(']'); return e; }
      if (t.value === '{') { this.next(); const e = this.parseExpr(0); this.expectOp('}'); return e; }
      if (t.value === '|') {
        this.next();
        this.inAbs++;
        const e = this.parseExpr(0);
        this.inAbs--;
        this.expectOp('|');
        return Fn('abs', [e]);
      }
    }
    if (t.type === 'func') {
      this.next();
      const name = t.value;
      // دالة بدون أقواس مثل sin x  → sin(x)
      if (this.atOp('(')) {
        this.next();
        const args = [this.parseExpr(0)];
        while (this.atOp(',')) { this.next(); args.push(this.parseExpr(0)); }
        this.expectOp(')');
        return Fn(name, args);
      }
      // log_2(x) أو log(x, base)
      const arg = this.parseExpr(60);
      return Fn(name, [arg]);
    }
    throw new MathSyntaxError(`تعبير غير مكتمل قرب "${t.value || 'النهاية'}"`, t.pos);
  }
}

/**
 * تحويل نص إلى شجرة تعبير
 * @param {string} src
 */
export function parse(src) {
  if (!src || !src.trim()) throw new MathSyntaxError('التعبير فارغ', 0);
  const tokens = tokenize(preprocess(src));
  const p = new Parser(tokens, src);
  const ast = p.parseProgram();
  return ast;
}

/** تحويلات نصية أولية للرموز العربية والإنجليزية */
export function preprocess(src) {
  return src
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660)) // أرقام عربية
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0)) // أرقام فارسية
    .replace(/لوغاريتم|لوغ\b/g, 'log')
    .replace(/\s+/g, ' ')
    .trim();
}

/** تحليل آمن مع رسالة خطأ عربية */
export function tryParse(src) {
  try {
    return { ok: true, ast: parse(src) };
  } catch (e) {
    return { ok: false, error: e.message, pos: e.pos };
  }
}
