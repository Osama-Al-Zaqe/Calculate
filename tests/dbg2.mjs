import { parse } from '../src/engine/parser.js';
import { simplify, expand, toPolynomial, key } from '../src/engine/simplify.js';
import { toLatex } from '../src/engine/latex.js';
import { evaluate } from '../src/engine/eval.js';
import { Add, Neg, Mul, Num, Var } from '../src/engine/ast.js';

const n = Add(Var('x'), Var('y'), Var('z'), Num(-6));
console.log('ast', JSON.stringify(n));
const s = simplify(n);
console.log('simplified', JSON.stringify(s));
console.log('poly', JSON.stringify(toPolynomial(s, 'x')));
console.log('poly raw', JSON.stringify(toPolynomial(n, 'x')));
const ex = expand(n);
console.log('expand', JSON.stringify(ex));
