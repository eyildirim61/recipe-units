// Parse one recipe line into { quantity, unit, ingredient } — or leave it as plain text.
//
//   "2 su bardağı un"            -> 2, su_bardagi, flour
//   "1½ cups of sugar"           -> 1.5, cup, sugar
//   "Un: 2-3 su bardağı"         -> 2..3, su_bardagi, flour
//   "yarım çay kaşığı tuz"       -> 0.5, cay_kasigi, salt
//   "1 tepeleme yemek kaşığı un" -> 1, yemek_kasigi, flour (modifier: heaped)
//   "3 yumurta"                  -> 3, (count), egg
//   "Hamuru için:"               -> text

import { INGREDIENTS } from "./ingredients.js";
import { MODIFIERS, UNITS } from "./units.js";
import { escapeRegex, fold, TR_SUFFIX, WB_END, WB_START } from "./text.js";

const UNICODE_FRACTIONS = { "½": 1 / 2, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 1 / 4, "¾": 3 / 4, "⅛": 1 / 8, "⅜": 3 / 8, "⅝": 5 / 8, "⅞": 7 / 8 };

const NUMBER_WORDS = {
  yarim: 0.5, ceyrek: 0.25, bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10,
  half: 0.5, quarter: 0.25, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  a: 1, an: 1,
};

const UF = Object.keys(UNICODE_FRACTIONS).join("");
const NUM = String.raw`\d+(?:[.,]\d+)?`;
const DIGIT_QTY = String.raw`(?:\d+\s+\d+\s*/\s*\d+|\d+\s*[${UF}]|\d+\s*/\s*\d+|[${UF}]|${NUM})(?:\s+bucuk)?`;
const WORD_QTY = String.raw`(?:${Object.keys(NUMBER_WORDS).sort((a, b) => b.length - a.length).join("|")})(?:\s+bucuk)?`;
const ONE_QTY = String.raw`(?:${DIGIT_QTY}|${WORD_QTY})`;
const QTY = String.raw`(${ONE_QTY})(?:\s*(?:-|–|—|to|ila|ile|veya|or)\s*(${ONE_QTY}))?`;

const MODIFIER_WORDS = Object.values(MODIFIERS).flat().map((m) => escapeRegex(fold(m)));
const MODIFIER = String.raw`(?:(${MODIFIER_WORDS.join("|")})\s+)?`;

// Unit aliases, longest first so "su bardağı" wins over "bardak" and "fl oz" over "oz".
const UNIT_ALIASES = UNITS.flatMap((u) => u.aliases.map((a) => ({ unit: u, alias: a, folded: fold(a) })))
  .sort((a, b) => b.folded.length - a.folded.length);
const UNIT_ALT = [...new Set(UNIT_ALIASES.map((x) => escapeRegex(x.folded)))].join("|");

// Quantity, optional modifier, unit. Digits may touch the unit ("200g", "250ml"); a quantity word
// may not, otherwise "at" would read as "a" + "t" (one teaspoon).
const AFTER_QTY = String.raw`(?:(?<=[\d${UF}])\s*|\s+)`;
const QTY_UNIT = new RegExp(String.raw`${WB_START}${QTY}${AFTER_QTY}${MODIFIER}(${UNIT_ALT})(?:\s+dolusu|\s+dolu)?${WB_END}`);
const LEADING_QTY = new RegExp(String.raw`^${QTY}${WB_END}\s*`);
const BULLET = /^\s*(?:[-*•·–]+|\d+[.)](?=\s+\D))\s*/;

export function parseNumber(raw) {
  let text = fold(raw).trim();
  let extra = 0;
  if (/\s+bucuk$/.test(text)) {
    extra = 0.5;
    text = text.replace(/\s+bucuk$/, "");
  }
  if (text in NUMBER_WORDS) return NUMBER_WORDS[text] + extra;
  let m = text.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (m) return Number(m[1]) + Number(m[2]) / Number(m[3]) + extra;
  m = text.match(new RegExp(`^(\\d+)\\s*([${UF}])$`));
  if (m) return Number(m[1]) + UNICODE_FRACTIONS[m[2]] + extra;
  m = text.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (m) return Number(m[2]) === 0 ? NaN : Number(m[1]) / Number(m[2]) + extra;
  if (text in UNICODE_FRACTIONS) return UNICODE_FRACTIONS[text] + extra;
  return Number(text.replace(",", ".")) + extra;
}

function resolveUnit(foldedAlias, originalText) {
  // "T" means tablespoon and "t" teaspoon; the case is only visible in the original text.
  if (foldedAlias === "t") {
    return UNITS.find((u) => u.id === (originalText === "T" ? "tbsp" : "tsp"));
  }
  return UNIT_ALIASES.find((x) => x.folded === foldedAlias).unit;
}

function modifierKind(word) {
  if (!word) return null;
  for (const [kind, words] of Object.entries(MODIFIERS)) {
    if (words.map(fold).includes(word)) return kind;
  }
  return null;
}

// Ingredient matching: longest alias wins, whole words, Turkish suffixes allowed.
const INGREDIENT_PATTERNS = INGREDIENTS.flatMap((ing) =>
  ing.aliases.map((alias) => {
    const folded = fold(alias);
    const body = folded.split(/\s+/).map(escapeRegex).join(String.raw`\s+`);
    return { ing, length: folded.length, re: new RegExp(`${WB_START}${body}${TR_SUFFIX}${WB_END}`) };
  }),
).sort((a, b) => b.length - a.length);

export function matchIngredient(name) {
  const folded = fold(name);
  for (const p of INGREDIENT_PATTERNS) {
    if (p.re.test(folded)) return p.ing;
  }
  return null;
}

function cleanName(text) {
  return text
    .replace(/\(\s*\)/g, "")
    .replace(/^\s*(?:of\s+)/i, "")
    .replace(/^[\s:,;\-–—]+|[\s:,;\-–—]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Remove a parenthesised alternative quantity, e.g. "200 g (1½ su bardağı) un" -> "un".
function dropAlternativeQuantities(text) {
  return text.replace(/\(([^)]*)\)/g, (whole, inner) => (QTY_UNIT.test(fold(inner)) ? "" : whole));
}

export function parseLine(line) {
  const raw = line;
  const bullet = line.match(BULLET);
  const prefix = bullet ? bullet[0] : "";
  const text = line.slice(prefix.length);
  const folded = fold(text);

  if (!text.trim()) return { raw, type: "blank" };

  let m = folded.match(QTY_UNIT);
  if (m) {
    const [whole, q1, q2, mod, unitAlias] = m;
    const unitStart = m.index + whole.lastIndexOf(unitAlias, whole.length);
    const unitOriginal = text.slice(unitStart, unitStart + unitAlias.length);
    const unit = resolveUnit(unitAlias, unitOriginal);
    const before = text.slice(0, m.index);
    const after = text.slice(m.index + whole.length);
    const name = cleanName(dropAlternativeQuantities(`${before} ${after}`));
    // "a"/"an" plus a long remainder is a sentence ("Add a tablespoon at a time"), not an ingredient.
    if (/^an?$/.test(q1) && !q2 && name.split(/\s+/).length > 3) return { raw, type: "text" };
    const item = build(raw, prefix, q1, q2, unit, name, modifierKind(mod), text.slice(m.index, m.index + whole.length));
    if (item.type === "item") item.unitText = unitOriginal;
    return item;
  }

  m = folded.match(LEADING_QTY);
  if (m) {
    const [whole, q1, q2] = m;
    const name = cleanName(dropAlternativeQuantities(text.slice(whole.length)));
    // "a"/"an" alone is an article, not a quantity ("A pinch of salt" is handled above by the unit).
    if (!name || (/^(a|an)$/.test(q1) && !q2)) return { raw, type: "text" };
    // Without a unit, only scale things that look like ingredients ("3 yumurta", "2 orta boy patates"),
    // never instructions ("180 derecede 30 dakika pişirin").
    const known = matchIngredient(name);
    if (!known && (/\d/.test(name) || name.split(/\s+/).length > 3)) return { raw, type: "text" };
    return build(raw, prefix, q1, q2, null, name, null, text.slice(0, whole.length).trim());
  }

  return { raw, type: "text" };
}

function build(raw, prefix, q1, q2, unit, name, modifier, quantityText) {
  const min = parseNumber(q1);
  const max = q2 ? parseNumber(q2) : null;
  if (!Number.isFinite(min) || (max !== null && !Number.isFinite(max))) return { raw, type: "text" };
  return {
    raw,
    type: "item",
    prefix,
    quantity: { min, max },
    quantityText,
    unit: unit ? unit.id : null,
    unitText: "",
    modifier,
    name,
    ingredient: name ? matchIngredient(name)?.id ?? null : null,
  };
}

export function parseRecipe(text) {
  return text.split(/\r?\n/).map(parseLine);
}
