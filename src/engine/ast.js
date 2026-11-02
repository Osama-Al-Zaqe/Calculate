// ============================================================
//  محرك رياضي رمزي — بناء شجرة التعبير (AST) وأدواتها
// ============================================================

export const Num = (value) => ({ t: 'num', value });
export const Var = (name) => ({ t: 'var', name });
export const Const = (name) => ({ t: 'const', name });
export const Add = (...args) => ({ t: 'add', args: flat('add', args) });
export const Mul = (...args) => ({ t: 'mul', args: flat('mul', args) });
export const Pow = (base, exp) => ({ t: 'pow', base, exp });
export const Neg = (arg) => ({ t: 'neg', arg });
export const Div = (num, den) => ({ t: 'div', num, den });
export const Fn = (name, args) => ({ t: 'fn', name, args: Array.isArray(args) ? args : [args] });
export const Eq = (lhs, rhs) => ({ t: 'eq', lhs, rhs });
export const Rel = (op, lhs, rhs) => ({ t: 'rel', op, lhs, rhs });
export const List = (items) => ({ t: 'list', items });
export const Abs = (arg) => Fn('abs', [arg]);

function flat(kind, args) {
  const out = [];
  for (const a of args) {
    if (a && a.t === kind) out.push(...a.args);
    else if (a !== undefined && a !== null) out.push(a);
  }
  return out;
}

export const isNum = (n, v) => n && n.t === 'num' && (v === undefined || Math.abs(n.value - v) < 1e-14);
export const isZero = (n) => isNum(n, 0);
export const isOne = (n) => isNum(n, 1);

/** هل التعبير يحتوي على المتغير المذكور؟ */
export function hasVar(node, name) {
  if (!node || typeof node !== 'object') return false;
  if (node.t === 'var') return name === undefined ? true : node.name === name;
  if (node.t === 'num' || node.t === 'const') return false;
  for (const key of ['arg', 'base', 'exp', 'num', 'den', 'lhs', 'rhs']) {
    if (node[key] && hasVar(node[key], name)) return true;
  }
  if (node.args && node.args.some((a) => hasVar(a, name))) return true;
  if (node.items && node.items.some((a) => hasVar(a, name))) return true;
  return false;
}

/** جمع كل أسماء المتغيرات */
export function vars(node, acc = new Set()) {
  if (!node || typeof node !== 'object') return acc;
  if (node.t === 'var') acc.add(node.name);
  for (const key of ['arg', 'base', 'exp', 'num', 'den', 'lhs', 'rhs']) {
    if (node[key]) vars(node[key], acc);
  }
  if (node.args) node.args.forEach((a) => vars(a, acc));
  if (node.items) node.items.forEach((a) => vars(a, acc));
  return acc;
}

/** المشي على كل العقد */
export function walk(node, fn) {
  if (!node || typeof node !== 'object') return;
  fn(node);
  for (const key of ['arg', 'base', 'exp', 'num', 'den', 'lhs', 'rhs']) {
    if (node[key]) walk(node[key], fn);
  }
  if (node.args) node.args.forEach((a) => walk(a, fn));
  if (node.items) node.items.forEach((a) => walk(a, fn));
}

/** تحويل شجرة إلى نص عادي (للإدخال من جديد) */
export function toText(node) {
  if (!node) return '';
  switch (node.t) {
    case 'num':
      return String(node.value);
    case 'var':
      return node.name;
    case 'const':
      return node.name === 'pi' ? 'pi' : 'e';
    case 'add':
      return node.args.map((a, i) => (i === 0 ? toText(a) : (isNegTerm(a) ? ' - ' + toText(stripNeg(a)) : ' + ' + toText(a)))).join('');
    case 'mul':
      return node.args.map((a) => (needsParensInMul(a) ? '(' + toText(a) + ')' : toText(a))).join('*');
    case 'div':
      return `(${toText(node.num)})/(${toText(node.den)})`;
    case 'pow':
      return `${needsParensInPow(node.base) ? '(' + toText(node.base) + ')' : toText(node.base)}^(${toText(node.exp)})`;
    case 'neg':
      return '-' + (needsParensInMul(node.arg) ? '(' + toText(node.arg) + ')' : toText(node.arg));
    case 'fn':
      return `${node.name}(${node.args.map(toText).join(',')})`;
    case 'eq':
      return `${toText(node.lhs)} = ${toText(node.rhs)}`;
    case 'rel':
      return `${toText(node.lhs)} ${node.op} ${toText(node.rhs)}`;
    case 'list':
      return node.items.map(toText).join(', ');
    default:
      return '?';
  }
}

function isNegTerm(a) {
  return a.t === 'neg' || (a.t === 'num' && a.value < 0);
}
function stripNeg(a) {
  if (a.t === 'neg') return a.arg;
  if (a.t === 'num' && a.value < 0) return Num(-a.value);
  return a;
}
function needsParensInMul(a) {
  return a.t === 'add' || a.t === 'eq' || a.t === 'rel' || (a.t === 'num' && a.value < 0);
}
function needsParensInPow(a) {
  return a.t === 'add' || a.t === 'mul' || a.t === 'div' || a.t === 'neg' || a.t === 'num';
}

/** نسخة عميقة */
export function clone(node) {
  return JSON.parse(JSON.stringify(node));
}

/** هل التعبير عددي بالكامل (بدون متغيرات)؟ */
export function isNumeric(node) {
  return !hasVar(node);
}

/** بناء قائمة جمع مع تبسيط أولي */
export function sum(args) {
  const flatArgs = [];
  for (const a of args) {
    if (a.t === 'add') flatArgs.push(...a.args);
    else flatArgs.push(a);
  }
  return flatArgs.length === 1 ? flatArgs[0] : Add(...flatArgs);
}

export function prod(args) {
  const flatArgs = [];
  for (const a of args) {
    if (a.t === 'mul') flatArgs.push(...a.args);
    else flatArgs.push(a);
  }
  return flatArgs.length === 1 ? flatArgs[0] : Mul(...flatArgs);
}
