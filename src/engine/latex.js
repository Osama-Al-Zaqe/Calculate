// ============================================================
//  محرك رياضي — تحويل شجرة التعبير إلى LaTeX
// ============================================================

const GREEK_LATEX = {
  theta: '\\theta', alpha: '\\alpha', beta: '\\beta', gamma: '\\gamma',
  delta: '\\delta', lambda: '\\lambda', mu: '\\mu', omega: '\\omega', phi: '\\phi',
};

const FN_LATEX = {
  sin: '\\sin', cos: '\\cos', tan: '\\tan', cot: '\\cot', sec: '\\sec', csc: '\\csc',
  asin: '\\arcsin', acos: '\\arccos', atan: '\\arctan', arcsin: '\\arcsin',
  arccos: '\\arccos', arctan: '\\arctan', acot: '\\arccot', asec: '\\arcsec', acsc: '\\arccsc',
  sinh: '\\sinh', cosh: '\\cosh', tanh: '\\tanh', coth: '\\coth', sech: '\\sech', csch: '\\csch',
  ln: '\\ln', log: '\\log', lg: '\\log', log2: '\\log_2', exp: '\\exp',
  max: '\\max', min: '\\min', gcd: '\\gcd',
};

/** تنسيق رقم إلى LaTeX (كسور عشرية بسيطة) */
export function numToLatex(v) {
  if (typeof v !== 'number' || Number.isNaN(v)) return '\\text{غير معرّف}';
  if (!Number.isFinite(v)) return v > 0 ? '+\\infty' : '-\\infty';
  if (Number.isInteger(v) && Math.abs(v) < 1e15) return String(v);
  const abs = Math.abs(v);
  if (abs !== 0 && (abs < 1e-6 || abs >= 1e10)) {
    const [m, e] = v.toExponential(6).split('e');
    return `${parseFloat(m)} \\times 10^{${parseInt(e, 10)}}`;
  }
  // كسر عشري بسيط
  for (const d of [2, 3, 4, 5, 6, 8, 10]) {
    const scaled = v * Math.pow(10, d);
    if (Math.abs(scaled - Math.round(scaled)) < 1e-9) {
      const r = Math.round(scaled);
      if (r === 0) return '0';
      // اختصر الكسر
      const g = gcdNum(Math.abs(r), Math.pow(10, d));
      const n = r / g, den = Math.pow(10, d) / g;
      if (den === 1) return String(n);
      if (den === 2 || den === 4 || den === 5 || den === 8 || den === 10) {
        return String(parseFloat(v.toFixed(d)));
      }
      return `\\frac{${n}}{${den}}`;
    }
  }
  return String(parseFloat(v.toPrecision(10)));
}

function gcdNum(a, b) {
  while (b) { const t = a % b; a = b; b = t; }
  return a || 1;
}

const PREC = { add: 1, mul: 2, div: 2, neg: 2, pow: 3, fn: 4, num: 4, var: 4, const: 4 };

function latexOf(node, parentPrec = 0) {
  if (!node) return '';
  const p = PREC[node.t] ?? 4;
  const s = core(node);
  if (p < parentPrec) return `\\left(${s}\\right)`;
  return s;
}

function core(node) {
  switch (node.t) {
    case 'num': return numToLatex(node.value);
    case 'var': return GREEK_LATEX[node.name] || node.name;
    case 'const': return node.name === 'pi' ? '\\pi' : node.name === 'e' ? 'e' : '\\infty';
    case 'add': {
      let out = '';
      node.args.forEach((a, i) => {
        if (i === 0) { out += latexOf(a, 1); return; }
        if (a.t === 'neg') out += ' - ' + latexOf(a.arg, 1);
        else if (a.t === 'num' && a.value < 0) out += ' - ' + numToLatex(-a.value);
        else if (a.t === 'mul' && a.args[0].t === 'num' && a.args[0].value < 0) {
          const rest = a.args.slice(1);
          const inner = rest.length === 1 ? latexOf(rest[0], 2) : rest.map((x) => latexOf(x, 2)).join(' \\cdot ');
          out += ' - ' + inner;
        } else out += ' + ' + latexOf(a, 1);
      });
      return out;
    }
    case 'mul': {
      const parts = [];
      node.args.forEach((a, i) => {
        const s = latexOf(a, 2);
        const prev = node.args[i - 1];
        if (i > 0) {
          const needsDot = (prev.t === 'num' && a.t === 'num') ||
            (prev.t === 'num' && a.t === 'fn') ||
            (prev.t === 'fn' && a.t === 'fn');
          if (needsDot) parts.push(' \\cdot ');
        }
        parts.push(s);
      });
      return parts.join('');
    }
    case 'div': return `\\frac{${latexOf(node.num, 0)}}{${latexOf(node.den, 0)}}`;
    case 'neg': return '-' + latexOf(node.arg, 2);
    case 'pow': {
      const b = latexOf(node.base, 3);
      if (node.exp.t === 'div') return `${b}^{${latexOf(node.exp, 0)}}`;
      return `${b}^{${latexOf(node.exp, 3)}}`;
    }
    case 'fn': return fnLatex(node);
    case 'eq': return `${latexOf(node.lhs, 0)} = ${latexOf(node.rhs, 0)}`;
    case 'rel': {
      const map = { '<': '<', '>': '>', '<=': '\\le', '>=': '\\ge', '!=': '\\ne' };
      return `${latexOf(node.lhs, 0)} ${map[node.op] || node.op} ${latexOf(node.rhs, 0)}`;
    }
    case 'list': return node.items.map((i) => latexOf(i, 0)).join(', \\; ');
    default: return '?';
  }
}

function fnLatex(node) {
  const { name, args } = node;
  const a = args.map((x) => latexOf(x, 0));
  if (name === 'abs') return `\\left|${a[0]}\\right|`;
  if (name === 'sqrt') return `\\sqrt{${a[0]}}`;
  if (name === 'cbrt') return `\\sqrt[3]{${a[0]}}`;
  if (name === 'root') return `\\sqrt[${a[1]}]{${a[0]}}`;
  if (name === 'fact') return `${latexOf(args[0], 3)}!`;
  if (name === 'log' && args.length === 2) return `\\log_{${a[0]}}\\left(${a[1]}\\right)`;
  if (name === 'mod') return `${a[0]} \\bmod ${a[1]}`;
  if (FN_LATEX[name]) {
    // sin²x
    if (args.length === 1) return `${FN_LATEX[name]}\\left(${a[0]}\\right)`;
    return `${FN_LATEX[name]}\\left(${a.join(', ')}\\right)`;
  }
  return `\\operatorname{${name}}\\left(${a.join(', ')}\\right)`;
}

export function toLatex(node) {
  return latexOf(node, 0);
}

/** نص LaTeX لعدد */
export function numLatex(v) {
  return numToLatex(v);
}

/** كسر بسيط من عدد عشري */
export function fracLatex(n, d) {
  return `\\frac{${n}}{${d}}`;
}
