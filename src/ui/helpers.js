import katex from 'katex';
import 'katex/dist/katex.min.css';

/* ============================================================
   عرض المعادلات
   ============================================================ */

/** يحوّل LaTeX إلى HTML آمن باستخدام KaTeX */
export function tex(latex, display = false) {
  if (latex === null || latex === undefined) return '';
  try {
    return katex.renderToString(String(latex), {
      displayMode: display,
      throwOnError: false,
      strict: false,
      trust: false,
      output: 'html',
      maxExpand: 2000,
    });
  } catch {
    return `<code>${escapeHtml(String(latex))}</code>`;
  }
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** عنصر نتيجة معادلة */
export function mathEl(latex, display = false) {
  const el = document.createElement('div');
  el.className = 'result__math';
  el.innerHTML = tex(latex, display);
  return el;
}

/* ============================================================
   التوست
   ============================================================ */
let toastTimer = null;
export function toast(message, ms = 2200) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-on'), ms);
}

/* ============================================================
   التخزين المحلي
   ============================================================ */
const NS = 'mathpro:';
export const store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(NS + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(NS + key, JSON.stringify(value)); } catch { /* ممتلئ أو محجوب */ }
  },
  remove(key) {
    try { localStorage.removeItem(NS + key); } catch { /* تجاهل */ }
  },
  clearAll() {
    try {
      Object.keys(localStorage).filter((k) => k.startsWith(NS)).forEach((k) => localStorage.removeItem(k));
    } catch { /* تجاهل */ }
  },
};

/* ============================================================
   سجل العمليات
   ============================================================ */
const HISTORY_KEY = 'history';
const HISTORY_MAX = 120;

export function addHistory(entry) {
  const list = store.get(HISTORY_KEY, []);
  list.unshift({ ...entry, id: Date.now() + Math.random().toString(36).slice(2, 7), at: Date.now() });
  store.set(HISTORY_KEY, list.slice(0, HISTORY_MAX));
  document.dispatchEvent(new CustomEvent('history:changed'));
}

export function getHistory() {
  return store.get(HISTORY_KEY, []);
}

export function clearHistory() {
  store.set(HISTORY_KEY, []);
  document.dispatchEvent(new CustomEvent('history:changed'));
}

export function removeHistoryItem(id) {
  store.set(HISTORY_KEY, getHistory().filter((h) => h.id !== id));
  document.dispatchEvent(new CustomEvent('history:changed'));
}

/* ============================================================
   المفضلة
   ============================================================ */
const FAV_KEY = 'favorites';
export function getFavorites() { return store.get(FAV_KEY, []); }
export function isFavorite(id) { return getFavorites().some((f) => f.id === id); }
export function toggleFavorite(item) {
  const list = getFavorites();
  const idx = list.findIndex((f) => f.id === item.id);
  if (idx >= 0) list.splice(idx, 1);
  else list.unshift(item);
  store.set(FAV_KEY, list);
  document.dispatchEvent(new CustomEvent('history:changed'));
  return idx < 0;
}

/* ============================================================
   الحافظة
   ============================================================ */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      toast('✓ تم النسخ');
      return true;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    toast('✓ تم النسخ');
    return true;
  } catch {
    toast('تعذّر النسخ — انسخ يدويًا');
    return false;
  }
}

/* ============================================================
   بناء عناصر مساعدة
   ============================================================ */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

/** بطاقة خطوة حل */
export function stepCard(step, index) {
  const card = el('div', { class: 'step', dataset: { n: toArabicDigits(index + 1) } });
  if (step.title) card.append(el('div', { class: 'step__title', text: step.title }));
  if (step.latex) {
    const m = el('div', { class: 'step__math' });
    m.innerHTML = tex(step.latex);
    card.append(m);
  }
  if (step.note) card.append(el('div', { class: 'step__note', text: step.note }));
  return card;
}

export function stepsBlock(steps) {
  const wrap = el('div', { class: 'steps' });
  steps.forEach((s, i) => wrap.append(stepCard(s, i)));
  return wrap;
}

export function toArabicDigits(n) {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
}

export function timeAgo(ts) {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `قبل ${toArabicDigits(m)} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${toArabicDigits(h)} ساعة`;
  const d = Math.floor(h / 24);
  if (d < 30) return `قبل ${toArabicDigits(d)} يوم`;
  return new Date(ts).toLocaleDateString('ar-EG');
}

/** أزرار النسخ / الطباعة / المفضلة */
export function resultActions({ latex, plain, title = 'نتيجة' }) {
  const row = el('div', { class: 'row row--tight' });
  if (latex) {
    row.append(el('button', {
      class: 'btn btn--sm', type: 'button', title: 'نسخ',
      onclick: () => copyText(latex),
    }, '📋 نسخ'));
  }
  if (plain) {
    row.append(el('button', {
      class: 'btn btn--sm', type: 'button', title: 'نسخ النص',
      onclick: () => copyText(plain),
    }, '🔤 نسخ النص'));
  }
  row.append(el('button', {
    class: 'btn btn--sm', type: 'button', title: 'طباعة / PDF',
    onclick: () => window.print(),
  }, '🖨️ طباعة'));
  return row;
}

/** عنوان قسم */
export function sectionTitle(text) {
  return el('div', { class: 'section-title', text });
}

/** أمثلة جاهزة قابلة للنقر */
export function examplesRow(list, onPick) {
  const row = el('div', { class: 'row row--tight', style: 'margin-top:10px' });
  row.append(el('span', { style: 'font-size:12px;color:var(--text-mute)', text: 'أمثلة:' }));
  for (const ex of list) {
    row.append(el('button', {
      class: 'chip', type: 'button', text: ex.label || ex.value,
      onclick: () => onPick(ex.value),
    }));
  }
  return row;
}
