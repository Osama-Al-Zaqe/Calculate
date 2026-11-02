import { evaluate } from '../engine/eval.js';
import { tryParse } from '../engine/parser.js';
import { differentiate } from '../engine/derivative.js';
import { toLatex } from '../engine/latex.js';
import { mathEl, fmt } from './helpers.js';

export class CanvasPlotter {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.container.appendChild(this.canvas);

    // مركز ونطاق الشبكة
    this.centerX = 0;
    this.centerY = 0;
    this.scale = 40; // bxs/unit

    // الدوال المرسومة [{ id, exprStr, ast, color, visible, derivative }]
    this.functions = [];
    this.nextColorIdx = 0;
    this.colors = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#e11d48'];

    // تفاعل السحب والتقريب
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.cursorPos = null;
    this.showTangent = false;

    this.initEvents();
    this.resize();
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width || 600;
    this.height = rect.height || 400;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);
    this.draw();
  }

  initEvents() {
    window.addEventListener('resize', () => this.resize());

    const c = this.canvas;
    c.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragStart = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      const rect = c.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (mouseX >= 0 && mouseX <= this.width && mouseY >= 0 && mouseY <= this.height) {
        this.cursorPos = { x: mouseX, y: mouseY };
      } else {
        this.cursorPos = null;
      }

      if (this.isDragging) {
        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;
        this.centerX += dx;
        this.centerY += dy;
        this.dragStart = { x: e.clientX, y: e.clientY };
      }
      this.draw();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoom = e.deltaY < 0 ? 1.15 : 0.85;
      const newScale = Math.max(5, Math.min(500, this.scale * zoom));

      const rect = c.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const mathX = (mouseX - (this.width / 2 + this.centerX)) / this.scale;
      const mathY = ((this.height / 2 + this.centerY) - mouseY) / this.scale;

      this.scale = newScale;
      this.centerX = mouseX - this.width / 2 - mathX * this.scale;
      this.centerY = mouseY - this.height / 2 + mathY * this.scale;
      this.draw();
    }, { passive: false });
  }

  addFunction(exprStr) {
    const ast = tryParse(exprStr);
    if (!ast) return { ok: false, error: 'صيغة الدالة غير صحيحة' };

    const color = this.colors[this.nextColorIdx % this.colors.length];
    this.nextColorIdx++;

    let derivativeAst = null;
    try {
      derivativeAst = differentiate(ast, 'x', []);
    } catch {}

    const fnItem = {
      id: Date.now() + Math.random(),
      exprStr,
      ast,
      color,
      visible: true,
      derivative: derivativeAst,
    };
    this.functions.push(fnItem);
    this.draw();
    return { ok: true, item: fnItem };
  }

  removeFunction(id) {
    this.functions = this.functions.filter((f) => f.id !== id);
    this.draw();
  }

  resetView() {
    this.centerX = 0;
    this.centerY = 0;
    this.scale = 40;
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    const isDark = document.documentElement.classList.contains('dark');

    // الخلفية
    ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
    ctx.fillRect(0, 0, w, h);

    const originX = w / 2 + this.centerX;
    const originY = h / 2 + this.centerY;

    // الشبكة
    ctx.lineWidth = 1;
    ctx.strokeStyle = isDark ? '#1e293b' : '#f1f5f9';

    const gridSize = this.scale;
    const startX = (originX % gridSize) - gridSize;
    const startY = (originY % gridSize) - gridSize;

    ctx.beginPath();
    for (let x = startX; x < w; x += gridSize) {
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
    }
    for (let y = startY; y < h; y += gridSize) {
      ctx.moveTo(0, y); ctx.lineTo(w, y);
    }
    ctx.stroke();

    // المحاور الرئيسية X و Y
    ctx.lineWidth = 2;
    ctx.strokeStyle = isDark ? '#475569' : '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(0, originY); ctx.lineTo(w, originY);
    ctx.moveTo(originX, 0); ctx.lineTo(originX, h);
    ctx.stroke();

    // أرقام المحاور
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const stepUnits = gridSize >= 80 ? 1 : gridSize >= 40 ? 2 : 5;
    const xMin = Math.floor((-originX) / gridSize);
    const xMax = Math.ceil((w - originX) / gridSize);

    for (let i = xMin; i <= xMax; i += stepUnits) {
      if (i === 0) continue;
      const px = originX + i * gridSize;
      ctx.fillText(i.toString(), px, originY + 4);
    }

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const yMin = Math.floor((originY - h) / gridSize);
    const yMax = Math.ceil(originY / gridSize);

    for (let i = yMin; i <= yMax; i += stepUnits) {
      if (i === 0) continue;
      const py = originY - i * gridSize;
      ctx.fillText(i.toString(), originX - 6, py);
    }

    // رسم منحنيات الدوال
    for (const fn of this.functions) {
      if (!fn.visible) continue;

      ctx.strokeStyle = fn.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      let isDrawing = false;
      const steps = w * 2; // دقة العينات

      for (let i = 0; i <= steps; i++) {
        const px = (i / steps) * w;
        const x = (px - originX) / this.scale;

        let y;
        try {
          y = evaluate(fn.ast, { x });
        } catch {
          y = NaN;
        }

        if (Number.isFinite(y)) {
          const py = originY - y * this.scale;
          if (py >= -h && py <= h * 2) {
            if (!isDrawing) {
              ctx.moveTo(px, py);
              isDrawing = true;
            } else {
              ctx.lineTo(px, py);
            }
          } else {
            isDrawing = false;
          }
        } else {
          isDrawing = false;
        }
      }
      ctx.stroke();
    }

    // نقطة المؤشر وقيمة الدالة والمماس
    if (this.cursorPos && this.functions.length > 0) {
      const mouseX = this.cursorPos.x;
      const mathX = (mouseX - originX) / this.scale;

      const activeFn = this.functions.find((f) => f.visible);
      if (activeFn) {
        let mathY = NaN;
        try { mathY = evaluate(activeFn.ast, { x: mathX }); } catch {}

        if (Number.isFinite(mathY)) {
          const py = originY - mathY * this.scale;

          // نقطة على المنحنى
          ctx.fillStyle = activeFn.color;
          ctx.beginPath();
          ctx.arc(mouseX, py, 5, 0, Math.PI * 2);
          ctx.fill();

          // المماس إن تم تفعيله
          if (this.showTangent && activeFn.derivative) {
            let slope = NaN;
            try { slope = evaluate(activeFn.derivative, { x: mathX }); } catch {}
            if (Number.isFinite(slope)) {
              ctx.strokeStyle = isDark ? '#f59e0b' : '#d97706';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              const dx = 100;
              ctx.moveTo(mouseX - dx, py + slope * dx);
              ctx.lineTo(mouseX + dx, py - slope * dx);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }

          // شريط معلومات القيمة
          ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)';
          ctx.strokeStyle = isDark ? '#334155' : '#cbd5e1';
          ctx.lineWidth = 1;
          const label = `x: ${fmt(mathX, 3)}, y: ${fmt(mathY, 3)}`;
          ctx.font = '12px sans-serif';
          const tw = ctx.measureText(label).width + 16;
          ctx.fillRect(10, 10, tw, 26);
          ctx.strokeRect(10, 10, tw, 26);
          ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, 18, 23);
        }
      }
    }
  }
}
