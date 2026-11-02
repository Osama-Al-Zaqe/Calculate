import { el } from './helpers.js';

/**
 * لوحة مفاتيح رياضية: تُدخل رموزًا في حقل نصي محدد.
 * @param {HTMLInputElement|HTMLTextAreaElement} target
 * @param {{onEnter?:Function, mode?:'basic'|'full'|'algebra'}} opts
 */
export function mathKeypad(target, opts = {}) {
  const mode = opts.mode || 'full';
  const wrap = el('div', { class: 'keypad' });

  const insert = (text, caretOffset = 0) => {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    const value = target.value;
    target.value = value.slice(0, start) + text + value.slice(end);
    const pos = start + text.length - caretOffset;
    target.setSelectionRange(pos, pos);
    target.focus();
    target.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const backspace = () => {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    if (start === end && start > 0) {
      target.value = target.value.slice(0, start - 1) + target.value.slice(end);
      target.setSelectionRange(start - 1, start - 1);
    } else {
      target.value = target.value.slice(0, start) + target.value.slice(end);
      target.setSelectionRange(start, start);
    }
    target.focus();
    target.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const key = (label, insertText, cls = '', caretOffset = 0) => {
    const b = el('button', {
      class: `key ${cls}`.trim(),
      type: 'button',
      html: label,
      'aria-label': label.replace(/<[^>]+>/g, ''),
      onclick: () => insert(insertText, caretOffset),
    });
    wrap.append(b);
    return b;
  };

  const fnKey = (label, insertText, caretOffset = 1) => key(label, insertText, 'key--fn', caretOffset);

  if (mode === 'basic') {
    ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '(', ')'].forEach((k) => {
      const map = { '÷': '/', '×': '*', '−': '-' };
      key(k, map[k] || k, /[÷×−()]/.test(k) ? 'key--op' : '');
    });
    key('⌫', '', 'key--del').onclick = backspace;
    key('=', '', 'key--eq key--wide').onclick = () => opts.onEnter?.();
    return wrap;
  }

  if (mode === 'algebra') {
    // للجبر: أرقام + متغيرات + عمليات
    ['x', 'y', 'z', '^', '(', ')'].forEach((k) => fnKey(k, k, k === '(' || k === ')' ? 0 : 0));
    ['7', '8', '9', '÷'].forEach((k) => key(k, k === '÷' ? '/' : k, 'key--op'));
    ['4', '5', '6', '×'].forEach((k) => key(k, k === '×' ? '*' : k, 'key--op'));
    ['1', '2', '3', '−'].forEach((k) => key(k, k === '−' ? '-' : k, 'key--op'));
    ['0', '.', '=', '+'].forEach((k) => key(k, k, k === '=' ? '' : 'key--op'));
    key('⌫', '', 'key--del').onclick = backspace;
    key('حل', '', 'key--eq key--wide').onclick = () => opts.onEnter?.();
    return wrap;
  }

  // full
  const rows = [
    [['sin(', 'sin('], ['cos(', 'cos('], ['tan(', 'tan('], ['ln(', 'ln('], ['log(', 'log('], ['√(', 'sqrt(']],
    [['sin⁻¹', 'asin('], ['cos⁻¹', 'acos('], ['tan⁻¹', 'atan('], ['eˣ', 'e^('], ['|x|', 'abs('], ['x²', '^2']],
    [['π', 'pi'], ['e', 'e'], ['xʸ', '^'], ['!', '!'], ['%', '/100'], ['1/x', '1/(']],
    [['(', '('], [')', ')'], ['÷', '/'], ['×', '*'], ['−', '-'], ['+', '+']],
    [['7', '7'], ['8', '8'], ['9', '9'], ['abs', 'abs('], ['sinh', 'sinh('], ['cosh', 'cosh(']],
    [['4', '4'], ['5', '5'], ['6', '6'], ['tanh', 'tanh('], ['exp', 'exp('], ['log₂', 'log2(']],
  ];
  for (const row of rows) {
    for (const [label, text] of row) {
      const isNum = /^[0-9.]+$/.test(text);
      const isOp = ['/', '*', '-', '+', '(', ')', '^', '!'].includes(text);
      if (isNum) key(label, text, '');
      else if (isOp) key(label, text, 'key--op');
      else fnKey(label, text, label.includes('(') ? 1 : 0);
    }
  }
  key('0', '0', '');
  key('.', '.', '');
  key('⌫', '', 'key--del').onclick = backspace;
  key('=', '', 'key--eq key--wide').onclick = () => opts.onEnter?.();

  return wrap;
}
