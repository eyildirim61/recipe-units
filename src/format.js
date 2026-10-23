// Number formatting: kitchen fractions for cups and spoons, sensible rounding for grams.

const FRACTION_GLYPHS = [
  [1 / 8, "⅛"], [1 / 4, "¼"], [1 / 3, "⅓"], [1 / 2, "½"], [2 / 3, "⅔"], [3 / 4, "¾"],
];

export function decimal(value, lang, maxDigits = 2) {
  const rounded = Number(value.toFixed(maxDigits));
  const text = String(rounded);
  return lang === "tr" ? text.replace(".", ",") : text;
}

// Nearest value made of a whole number plus one of the allowed fractions.
export function nearestFraction(value, fractions) {
  const whole = Math.floor(value);
  let best = { value: whole, whole, frac: 0 };
  for (const base of [whole, whole + 1]) {
    for (const f of [0, ...fractions]) {
      const candidate = base + f;
      if (base > whole && f > 0) continue; // whole+1 only as a plain number
      if (Math.abs(candidate - value) < Math.abs(best.value - value)) best = { value: candidate, whole: base, frac: f };
    }
  }
  return best;
}

export function fractionText(whole, frac) {
  const glyph = FRACTION_GLYPHS.find(([v]) => Math.abs(v - frac) < 1e-9)?.[1] ?? "";
  if (!glyph) return String(whole);
  return whole ? `${whole}${glyph}` : glyph;
}

// Grams and millilitres: precise when small, rounded when large.
export function roundMetric(value) {
  if (value < 1) return Math.round(value * 10) / 10;
  if (value < 10) return Math.round(value * 2) / 2;
  if (value < 100) return Math.round(value);
  if (value < 1000) return Math.round(value / 5) * 5;
  return Math.round(value / 10) * 10;
}

export function plainQuantity(value, lang) {
  if (Number.isInteger(value)) return String(value);
  const f = nearestFraction(value, [1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4]);
  if (Math.abs(f.value - value) < 0.01 && f.frac) return fractionText(f.whole, f.frac);
  return decimal(value, lang);
}
