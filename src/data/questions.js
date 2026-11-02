// ============================================================
//  بنك الأسئلة والتدريب — أسئلة حقيقية مع حلول نموذجية
// ============================================================

export const TOPICS = [
  { id: 'algebra', name: 'الجبر', icon: '🔢' },
  { id: 'equations', name: 'المعادلات', icon: '⚖️' },
  { id: 'functions', name: 'الدوال', icon: '📈' },
  { id: 'derivatives', name: 'التفاضل', icon: '∂' },
  { id: 'integrals', name: 'التكامل', icon: '∫' },
  { id: 'limits', name: 'النهايات', icon: '→' },
  { id: 'trigonometry', name: 'المثلثات', icon: '📐' },
  { id: 'geometry', name: 'الهندسة', icon: '🔷' },
  { id: 'statistics', name: 'الإحصاء', icon: '📊' },
];

export const LEVELS = [
  { id: 'easy', name: 'سهل', color: '#22c55e' },
  { id: 'medium', name: 'متوسط', color: '#f59e0b' },
  { id: 'hard', name: 'صعب', color: '#ef4444' },
];

export const QUESTIONS = [
  // ---------- الجبر ----------
  {
    id: 'alg-1', topic: 'algebra', level: 'easy',
    question: 'بسّط التعبير: 3x + 5x − 2x',
    answer: '6x',
    solution: 'نجمع الحدود المتشابهة: (3 + 5 − 2)x = 6x',
  },
  {
    id: 'alg-2', topic: 'algebra', level: 'easy',
    question: 'احسب: (2x)(3x²)',
    answer: '6x³',
    solution: 'نضرب المعاملات: 2 × 3 = 6، ونجمع الأسس: x¹ · x² = x³، فالنتيجة 6x³',
  },
  {
    id: 'alg-3', topic: 'algebra', level: 'medium',
    question: 'فك الأقواس: (x + 3)(x − 4)',
    answer: 'x² − x − 12',
    solution: 'نستخدم خاصية التوزيع: x·x + x·(−4) + 3·x + 3·(−4) = x² − 4x + 3x − 12 = x² − x − 12',
  },
  {
    id: 'alg-4', topic: 'algebra', level: 'medium',
    question: 'حلل إلى عوامل: x² − 9',
    answer: '(x − 3)(x + 3)',
    solution: 'فرق مربعين: a² − b² = (a − b)(a + b) حيث a = x، b = 3',
  },
  {
    id: 'alg-5', topic: 'algebra', level: 'hard',
    question: 'حلل إلى عوامل: x³ − 6x² + 11x − 6',
    answer: '(x − 1)(x − 2)(x − 3)',
    solution: 'نجرب الجذور النسبية من قواسم 6: عند x = 1 نحصل على 0، نقسم قسمة تركيبية فنحصل على x² − 5x + 6 = (x − 2)(x − 3)',
  },
  {
    id: 'alg-6', topic: 'algebra', level: 'medium',
    question: 'بسّط: √72',
    answer: '6√2',
    solution: '72 = 36 × 2، إذن √72 = √36 × √2 = 6√2',
  },
  {
    id: 'alg-7', topic: 'algebra', level: 'easy',
    question: 'بسّط الكسر: 24/36',
    answer: '2/3',
    solution: 'القاسم المشترك الأكبر للعددين 24 و36 هو 12، نقسم البسط والمقام على 12: 2/3',
  },
  {
    id: 'alg-8', topic: 'algebra', level: 'hard',
    question: 'بسّط: (x² − 1)/(x − 1)',
    answer: 'x + 1 (حيث x ≠ 1)',
    solution: 'x² − 1 = (x − 1)(x + 1)، وبالاختصار مع المقام نحصل على x + 1 بشرط x ≠ 1',
  },

  // ---------- المعادلات ----------
  {
    id: 'eq-1', topic: 'equations', level: 'easy',
    question: 'حل المعادلة: 2x + 5 = 15',
    answer: 'x = 5',
    solution: '2x = 15 − 5 = 10، ثم x = 10/2 = 5',
  },
  {
    id: 'eq-2', topic: 'equations', level: 'easy',
    question: 'حل المعادلة: 3(x − 2) = 12',
    answer: 'x = 6',
    solution: 'نقسم على 3: x − 2 = 4، ثم x = 6',
  },
  {
    id: 'eq-3', topic: 'equations', level: 'medium',
    question: 'حل المعادلة: x² − 5x + 6 = 0',
    answer: 'x = 2 أو x = 3',
    solution: 'المميز Δ = 25 − 24 = 1، إذن x = (5 ± 1)/2 فنجد x = 3 أو x = 2',
  },
  {
    id: 'eq-4', topic: 'equations', level: 'medium',
    question: 'حل المعادلة: x² + 4x + 4 = 0',
    answer: 'x = −2 (جذر مكرر)',
    solution: 'Δ = 16 − 16 = 0، إذن جذر واحد مكرر: x = −4/2 = −2',
  },
  {
    id: 'eq-5', topic: 'equations', level: 'hard',
    question: 'حل المعادلة: x² + 2x + 5 = 0',
    answer: 'x = −1 ± 2i',
    solution: 'Δ = 4 − 20 = −16 < 0، إذن الجذور مركبة: x = (−2 ± 4i)/2 = −1 ± 2i',
  },
  {
    id: 'eq-6', topic: 'equations', level: 'medium',
    question: 'حل النظام: x + y = 7 ، x − y = 1',
    answer: 'x = 4، y = 3',
    solution: 'بجمع المعادلتين: 2x = 8 ⇒ x = 4، ثم من الأولى y = 7 − 4 = 3',
  },
  {
    id: 'eq-7', topic: 'equations', level: 'hard',
    question: 'حل النظام: x + y + z = 6 ، 2x − y + z = 3 ، x + 2y − z = 2',
    answer: 'x = 1، y = 2، z = 3',
    solution: 'بالحذف الغاوسي: نطرح الأولى من الثالثة فنحصل على y − 2z = −4، ونكمل الحذف حتى نجد z = 3 ثم y = 2 ثم x = 1',
  },
  {
    id: 'eq-8', topic: 'equations', level: 'hard',
    question: 'حل المعادلة: √(x + 3) = 4',
    answer: 'x = 13',
    solution: 'نربع الطرفين: x + 3 = 16 ⇒ x = 13. نتحقق: √16 = 4 ✓',
  },

  // ---------- الدوال ----------
  {
    id: 'fn-1', topic: 'functions', level: 'easy',
    question: 'إذا كانت f(x) = x² − 4x + 3، فما قيمة f(2)؟',
    answer: 'f(2) = −1',
    solution: 'f(2) = 4 − 8 + 3 = −1',
  },
  {
    id: 'fn-2', topic: 'functions', level: 'medium',
    question: 'أوجد جذور الدالة f(x) = x² − 4x + 3',
    answer: 'x = 1 و x = 3',
    solution: 'x² − 4x + 3 = (x − 1)(x − 3) = 0، إذن x = 1 أو x = 3',
  },
  {
    id: 'fn-3', topic: 'functions', level: 'medium',
    question: 'ما رأس القطع المكافئ y = x² − 6x + 5؟',
    answer: '(3, −4)',
    solution: 'x = −b/(2a) = 6/2 = 3، و y = 9 − 18 + 5 = −4',
  },
  {
    id: 'fn-4', topic: 'functions', level: 'hard',
    question: 'ما مجال الدالة f(x) = 1/(x − 2)؟',
    answer: 'ℝ − {2}',
    solution: 'المقام لا يجوز أن يساوي صفرًا: x − 2 ≠ 0 ⇒ x ≠ 2، فالمجال كل الأعداد الحقيقية ما عدا 2',
  },
  {
    id: 'fn-5', topic: 'functions', level: 'hard',
    question: 'أوجد الدالة العكسية لـ f(x) = 2x + 3',
    answer: 'f⁻¹(x) = (x − 3)/2',
    solution: 'نكتب y = 2x + 3، نبدل: x = 2y + 3، ثم نحل: y = (x − 3)/2',
  },

  // ---------- التفاضل ----------
  {
    id: 'der-1', topic: 'derivatives', level: 'easy',
    question: 'اشتق: f(x) = x³',
    answer: "f'(x) = 3x²",
    solution: 'قاعدة القوة: مشتقة xⁿ هي n·x^(n−1)، إذن مشتقة x³ هي 3x²',
  },
  {
    id: 'der-2', topic: 'derivatives', level: 'easy',
    question: 'اشتق: f(x) = 5x + 7',
    answer: "f'(x) = 5",
    solution: 'مشتقة 5x هي 5، ومشتقة الثابت 7 هي 0، إذن المشتقة = 5',
  },
  {
    id: 'der-3', topic: 'derivatives', level: 'medium',
    question: 'اشتق: f(x) = x³ + 5x² − 4x + 7',
    answer: "f'(x) = 3x² + 10x − 4",
    solution: 'نشتق كل حد: 3x² + 10x − 4 + 0',
  },
  {
    id: 'der-4', topic: 'derivatives', level: 'medium',
    question: 'اشتق: f(x) = sin(x) + cos(x)',
    answer: "f'(x) = cos(x) − sin(x)",
    solution: 'مشتقة sin هي cos، ومشتقة cos هي −sin',
  },
  {
    id: 'der-5', topic: 'derivatives', level: 'medium',
    question: 'اشتق: f(x) = eˣ + ln(x)',
    answer: "f'(x) = eˣ + 1/x",
    solution: 'مشتقة eˣ هي eˣ، ومشتقة ln(x) هي 1/x',
  },
  {
    id: 'der-6', topic: 'derivatives', level: 'hard',
    question: 'اشتق: f(x) = x²·sin(x)',
    answer: "f'(x) = 2x·sin(x) + x²·cos(x)",
    solution: 'قاعدة الضرب: (uv)′ = u′v + uv′ حيث u = x²، v = sin(x)',
  },
  {
    id: 'der-7', topic: 'derivatives', level: 'hard',
    question: 'اشتق: f(x) = sin(x²)',
    answer: "f'(x) = 2x·cos(x²)",
    solution: 'قاعدة السلسلة: مشتقة sin(u) هي cos(u)·u′، و u = x² فـ u′ = 2x',
  },
  {
    id: 'der-8', topic: 'derivatives', level: 'hard',
    question: 'اشتق: f(x) = x/(x + 1)',
    answer: "f'(x) = 1/(x + 1)²",
    solution: 'قاعدة القسمة: (u/v)′ = (u′v − uv′)/v² = (1·(x+1) − x·1)/(x+1)² = 1/(x+1)²',
  },

  // ---------- التكامل ----------
  {
    id: 'int-1', topic: 'integrals', level: 'easy',
    question: 'احسب: ∫ x² dx',
    answer: 'x³/3 + C',
    solution: 'قاعدة القوة للتكامل: ∫xⁿ dx = x^(n+1)/(n+1) + C',
  },
  {
    id: 'int-2', topic: 'integrals', level: 'easy',
    question: 'احسب: ∫ 2x dx',
    answer: 'x² + C',
    solution: '∫2x dx = 2·x²/2 + C = x² + C',
  },
  {
    id: 'int-3', topic: 'integrals', level: 'medium',
    question: 'احسب: ∫ (1/x) dx',
    answer: 'ln|x| + C',
    solution: 'تكامل أساسي: ∫(1/x)dx = ln|x| + C',
  },
  {
    id: 'int-4', topic: 'integrals', level: 'medium',
    question: 'احسب: ∫ cos(x) dx',
    answer: 'sin(x) + C',
    solution: 'بما أن مشتقة sin(x) هي cos(x)، فتكامل cos(x) هو sin(x) + C',
  },
  {
    id: 'int-5', topic: 'integrals', level: 'medium',
    question: 'احسب التكامل المحدد: ∫₀³ x² dx',
    answer: '9',
    solution: 'التكامل غير المحدد x³/3، ثم نعوض: 27/3 − 0 = 9',
  },
  {
    id: 'int-6', topic: 'integrals', level: 'hard',
    question: 'احسب: ∫ 2x·e^(x²) dx',
    answer: 'e^(x²) + C',
    solution: 'بالتعويض u = x² فـ du = 2x dx، فيصبح ∫e^u du = e^u + C = e^(x²) + C',
  },
  {
    id: 'int-7', topic: 'integrals', level: 'hard',
    question: 'احسب: ∫ x·eˣ dx',
    answer: '(x − 1)eˣ + C',
    solution: 'بالتجزئة: u = x، dv = eˣdx ⇒ du = dx، v = eˣ. الناتج x·eˣ − ∫eˣdx = x·eˣ − eˣ + C',
  },

  // ---------- النهايات ----------
  {
    id: 'lim-1', topic: 'limits', level: 'easy',
    question: 'احسب: lim(x→2) (3x + 1)',
    answer: '7',
    solution: 'التعويض المباشر: 3(2) + 1 = 7',
  },
  {
    id: 'lim-2', topic: 'limits', level: 'medium',
    question: 'احسب: lim(x→0) sin(x)/x',
    answer: '1',
    solution: 'صيغة غير محددة 0/0. بتطبيق قاعدة لوبيتال: مشتقة البسط cos(x) ومشتقة المقام 1، فالنهاية cos(0) = 1',
  },
  {
    id: 'lim-3', topic: 'limits', level: 'medium',
    question: 'احسب: lim(x→1) (x² − 1)/(x − 1)',
    answer: '2',
    solution: 'نحلل البسط: (x−1)(x+1)/(x−1) = x + 1، ثم نعوض x = 1 فنحصل على 2',
  },
  {
    id: 'lim-4', topic: 'limits', level: 'hard',
    question: 'احسب: lim(x→∞) (3x² + 2x)/(x² − 1)',
    answer: '3',
    solution: 'نقسم البسط والمقام على x²: (3 + 2/x)/(1 − 1/x²) → 3/1 = 3',
  },
  {
    id: 'lim-5', topic: 'limits', level: 'medium',
    question: 'هل الدالة f(x) = 1/x متصلة عند x = 0؟',
    answer: 'لا، يوجد انقطاع لا نهائي',
    solution: 'الدالة غير معرّفة عند 0، والنهايتان من الجهتين تؤولان إلى ±∞، إذن هناك خط تقارب رأسي x = 0',
  },

  // ---------- المثلثات ----------
  {
    id: 'trig-1', topic: 'trigonometry', level: 'easy',
    question: 'ما قيمة sin(30°)؟',
    answer: '1/2',
    solution: 'قيمة مشهورة في مثلث 30-60-90: sin(30°) = 1/2',
  },
  {
    id: 'trig-2', topic: 'trigonometry', level: 'easy',
    question: 'ما قيمة cos(60°)؟',
    answer: '1/2',
    solution: 'cos(60°) = 1/2 (الزاوية المتممة لـ 30°)',
  },
  {
    id: 'trig-3', topic: 'trigonometry', level: 'medium',
    question: 'أثبت أن sin²(x) + cos²(x) = 1',
    answer: 'متطابقة أساسية صحيحة لكل x',
    solution: 'من دائرة الوحدة: النقطة (cos x, sin x) تبعد 1 عن المركز، فمجموع مربعي الإحداثيين = 1',
  },
  {
    id: 'trig-4', topic: 'trigonometry', level: 'hard',
    question: 'حل المعادلة: sin(x) = 1/2 في المجال [0, 2π]',
    answer: 'x = π/6 أو x = 5π/6',
    solution: 'sin موجب في الربعين الأول والثاني: x = π/6، والزاوية المتممة x = π − π/6 = 5π/6',
  },
  {
    id: 'trig-5', topic: 'trigonometry', level: 'medium',
    question: 'ما قيمة tan(45°)؟',
    answer: '1',
    solution: 'tan(45°) = sin(45°)/cos(45°) = (√2/2)/(√2/2) = 1',
  },

  // ---------- الهندسة ----------
  {
    id: 'geo-1', topic: 'geometry', level: 'easy',
    question: 'ما المسافة بين النقطتين (0, 0) و (3, 4)؟',
    answer: '5',
    solution: 'd = √((3−0)² + (4−0)²) = √(9 + 16) = √25 = 5',
  },
  {
    id: 'geo-2', topic: 'geometry', level: 'easy',
    question: 'ما نقطة منتصف القطعة بين (2, 4) و (6, 8)؟',
    answer: '(4, 6)',
    solution: 'المنتصف = ((2+6)/2, (4+8)/2) = (4, 6)',
  },
  {
    id: 'geo-3', topic: 'geometry', level: 'medium',
    question: 'ما ميل المستقيم المار بـ (1, 2) و (3, 6)؟',
    answer: '2',
    solution: 'm = (6 − 2)/(3 − 1) = 4/2 = 2',
  },
  {
    id: 'geo-4', topic: 'geometry', level: 'medium',
    question: 'ما معادلة الدائرة التي مركزها (0, 0) ونصف قطرها 5؟',
    answer: 'x² + y² = 25',
    solution: 'الصورة القياسية: (x − h)² + (y − k)² = r² ⇒ x² + y² = 25',
  },
  {
    id: 'geo-5', topic: 'geometry', level: 'hard',
    question: 'ما مساحة المثلث ذي الرؤوس (0,0)، (4,0)، (0,3)؟',
    answer: '6',
    solution: 'مثلث قائم الزاوية بساقين 4 و3: المساحة = (1/2)(4)(3) = 6',
  },

  // ---------- الإحصاء ----------
  {
    id: 'stat-1', topic: 'statistics', level: 'easy',
    question: 'ما متوسط الأعداد: 2، 4، 6، 8؟',
    answer: '5',
    solution: 'المتوسط = (2+4+6+8)/4 = 20/4 = 5',
  },
  {
    id: 'stat-2', topic: 'statistics', level: 'easy',
    question: 'ما وسيط الأعداد: 3، 7، 1، 9، 5؟',
    answer: '5',
    solution: 'نرتب: 1، 3، 5، 7، 9، والقيمة الوسطى = 5',
  },
  {
    id: 'stat-3', topic: 'statistics', level: 'medium',
    question: 'ما منوال الأعداد: 2، 4، 4، 4، 5، 5، 7؟',
    answer: '4',
    solution: 'العدد 4 يتكرر 3 مرات وهو الأكثر تكرارًا',
  },
  {
    id: 'stat-4', topic: 'statistics', level: 'medium',
    question: 'كم عدد التباديل الممكنة لاختيار 2 من 5 عناصر (بدون تكرار ومراعاة الترتيب)؟',
    answer: '20',
    solution: 'P(5,2) = 5!/(5−2)! = 5 × 4 = 20',
  },
  {
    id: 'stat-5', topic: 'statistics', level: 'hard',
    question: 'كم عدد التوافيق لاختيار 3 من 7 عناصر؟',
    answer: '35',
    solution: 'C(7,3) = 7!/(3!·4!) = (7×6×5)/(3×2×1) = 35',
  },
  {
    id: 'stat-6', topic: 'statistics', level: 'hard',
    question: 'ما احتمال ظهور صورة مرتين عند رمي عملة معدنية 3 مرات؟',
    answer: '3/8',
    solution: 'عدد النواتج الكلي 2³ = 8، والنواتج المواتية 3 (صصك، صكص، كصص)، فالاحتمال = 3/8',
  },
];

export function getQuestions({ topic, level, count = 10 } = {}) {
  let list = QUESTIONS;
  if (topic && topic !== 'all') list = list.filter((q) => q.topic === topic);
  if (level && level !== 'all') list = list.filter((q) => q.level === level);
  const shuffled = [...list].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
