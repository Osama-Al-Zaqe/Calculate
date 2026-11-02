// ============================================================
//  محرك رياضي — المحول الرياضي للوحدات
// ============================================================

// كل وحدة: معامل التحويل إلى الوحدة الأساسية
export const UNITS = {
  length: {
    name: 'الأطوال',
    icon: '📏',
    base: 'متر',
    units: {
      mm: { name: 'مليمتر', factor: 0.001 },
      cm: { name: 'سنتيمتر', factor: 0.01 },
      m: { name: 'متر', factor: 1 },
      km: { name: 'كيلومتر', factor: 1000 },
      inch: { name: 'بوصة', factor: 0.0254 },
      ft: { name: 'قدم', factor: 0.3048 },
      yd: { name: 'ياردة', factor: 0.9144 },
      mile: { name: 'ميل', factor: 1609.344 },
      nmi: { name: 'ميل بحري', factor: 1852 },
    },
  },
  area: {
    name: 'المساحات',
    icon: '🔲',
    base: 'متر مربع',
    units: {
      mm2: { name: 'مليمتر مربع', factor: 1e-6 },
      cm2: { name: 'سنتيمتر مربع', factor: 1e-4 },
      m2: { name: 'متر مربع', factor: 1 },
      km2: { name: 'كيلومتر مربع', factor: 1e6 },
      hectare: { name: 'هكتار', factor: 1e4 },
      acre: { name: 'أكر', factor: 4046.8564224 },
      ft2: { name: 'قدم مربع', factor: 0.09290304 },
      inch2: { name: 'بوصة مربعة', factor: 0.00064516 },
    },
  },
  volume: {
    name: 'الحجوم',
    icon: '🧊',
    base: 'لتر',
    units: {
      ml: { name: 'مليلتر', factor: 0.001 },
      l: { name: 'لتر', factor: 1 },
      m3: { name: 'متر مكعب', factor: 1000 },
      cm3: { name: 'سنتيمتر مكعب', factor: 0.001 },
      gal: { name: 'غالون أمريكي', factor: 3.785411784 },
      galUK: { name: 'غالون بريطاني', factor: 4.54609 },
      cup: { name: 'كوب', factor: 0.2365882365 },
      floz: { name: 'أونصة سائلة', factor: 0.0295735295625 },
    },
  },
  mass: {
    name: 'الكتلة',
    icon: '⚖️',
    base: 'كيلوجرام',
    units: {
      mg: { name: 'مليجرام', factor: 1e-6 },
      g: { name: 'جرام', factor: 0.001 },
      kg: { name: 'كيلوجرام', factor: 1 },
      ton: { name: 'طن', factor: 1000 },
      lb: { name: 'باوند', factor: 0.45359237 },
      oz: { name: 'أونصة', factor: 0.028349523125 },
      stone: { name: 'ستون', factor: 6.35029318 },
      qintar: { name: 'قنطار', factor: 100 },
    },
  },
  time: {
    name: 'الزمن',
    icon: '⏱️',
    base: 'ثانية',
    units: {
      ms: { name: 'ملي ثانية', factor: 0.001 },
      s: { name: 'ثانية', factor: 1 },
      min: { name: 'دقيقة', factor: 60 },
      h: { name: 'ساعة', factor: 3600 },
      day: { name: 'يوم', factor: 86400 },
      week: { name: 'أسبوع', factor: 604800 },
      month: { name: 'شهر (30 يوم)', factor: 2592000 },
      year: { name: 'سنة (365 يوم)', factor: 31536000 },
    },
  },
  speed: {
    name: 'السرعة',
    icon: '🚀',
    base: 'متر/ثانية',
    units: {
      mps: { name: 'متر/ثانية', factor: 1 },
      kph: { name: 'كم/ساعة', factor: 1 / 3.6 },
      mph: { name: 'ميل/ساعة', factor: 0.44704 },
      knot: { name: 'عقدة', factor: 0.514444 },
      fps: { name: 'قدم/ثانية', factor: 0.3048 },
    },
  },
  angle: {
    name: 'الزوايا',
    icon: '📐',
    base: 'راديان',
    units: {
      rad: { name: 'راديان', factor: 1 },
      deg: { name: 'درجة', factor: Math.PI / 180 },
      grad: { name: 'جراديان', factor: Math.PI / 200 },
      turn: { name: 'دورة كاملة', factor: 2 * Math.PI },
      arcmin: { name: 'دقيقة قوسية', factor: Math.PI / 10800 },
      arcsec: { name: 'ثانية قوسية', factor: Math.PI / 648000 },
    },
  },
  temperature: {
    name: 'الحرارة',
    icon: '🌡️',
    base: 'كلفن',
    special: true,
    units: {
      C: { name: 'مئوية °C' },
      F: { name: 'فهرنهايت °F' },
      K: { name: 'كلفن K' },
    },
  },
  data: {
    name: 'البيانات',
    icon: '💾',
    base: 'بايت',
    units: {
      bit: { name: 'بت', factor: 1 / 8 },
      B: { name: 'بايت', factor: 1 },
      KB: { name: 'كيلوبايت', factor: 1024 },
      MB: { name: 'ميجابايت', factor: 1024 ** 2 },
      GB: { name: 'جيجابايت', factor: 1024 ** 3 },
      TB: { name: 'تيرابايت', factor: 1024 ** 4 },
    },
  },
};

function tempToK(value, unit) {
  if (unit === 'C') return value + 273.15;
  if (unit === 'F') return (value - 32) * 5 / 9 + 273.15;
  return value;
}

function kToTemp(k, unit) {
  if (unit === 'C') return k - 273.15;
  if (unit === 'F') return (k - 273.15) * 9 / 5 + 32;
  return k;
}

/** تحويل بين وحدتين */
export function convert(category, value, from, to) {
  const cat = UNITS[category];
  if (!cat) throw new Error('فئة التحويل غير معروفة');
  if (cat.special && category === 'temperature') {
    const k = tempToK(value, from);
    return { value: kToTemp(k, to), formula: `${value} ${cat.units[from].name} = ${kToTemp(k, to).toFixed(6)} ${cat.units[to].name}` };
  }
  const f1 = cat.units[from].factor;
  const f2 = cat.units[to].factor;
  const result = (value * f1) / f2;
  return {
    value: result,
    formula: `${value} × ${f1} ÷ ${f2} = ${result}`,
  };
}

/** تحويل إلى جميع الوحدات في فئة */
export function convertAll(category, value, from) {
  const cat = UNITS[category];
  return Object.keys(cat.units).map((u) => ({
    unit: u,
    name: cat.units[u].name,
    value: convert(category, value, from, u).value,
  }));
}
