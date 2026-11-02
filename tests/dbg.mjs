import { parse } from '../src/engine/parser.js';
import { integrate } from '../src/engine/integral.js';
import { evaluate } from '../src/engine/eval.js';
import { toLatex } from '../src/engine/latex.js';
import { Mul, Div, Var, hasVar } from '../src/engine/ast.js';

const f = parse('2x*e^(x^2)');
console.log('f args', f.args.map((a) => a.t));
const consts = f.args.filter((a) => !hasVar(a, 'x'));
const vars = f.args.filter((a) => hasVar(a, 'x'));
console.log('consts', consts.length, 'vars', vars.length);
const steps = [];
const r = integrate(f, 'x', steps);
console.log('result', toLatex(r), evaluate(r, { x: 1 }));
console.log(steps.map((s) => s.title));
