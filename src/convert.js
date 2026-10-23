// Convert parsed recipe lines to a target measuring system, optionally scaled.
//
// target: "metric" (g / ml), "us" (cups / tbsp / tsp), "tr" (su bardağı / kaşık) or "scale"
// (keep every unit as written, only multiply).

import { ingredientById } from "./ingredients.js";
import { decimal, fractionText, nearestFraction, plainQuantity, roundMetric } from "./format.js";
import { DEFAULT_SETTINGS, unitById, US_CUP_ML, US_TBSP_ML, US_TSP_ML } from "./units.js";

const CUP_FRACTIONS = [1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4];
const TBSP_FRACTIONS = [1 / 2];
const TSP_FRACTIONS = [1 / 8, 1 / 4, 1 / 2, 3 / 4];

function label(unit, lang, plural) {
  if (!unit.label) return "";
  return unit.label[lang][plural ? 1 : 0];
}

// Pick the output unit from the larger end of a range, then express both ends in it.
function kitchenUnit(mlMax, system, settings) {
  if (system === "us") {
    if (mlMax >= (US_CUP_ML / 4) * 0.9) return { id: "cup", ml: US_CUP_ML, fractions: CUP_FRACTIONS };
    if (mlMax >= US_TBSP_ML * 0.9) return { id: "tbsp", ml: US_TBSP_ML, fractions: TBSP_FRACTIONS };
    return { id: "tsp", ml: US_TSP_ML, fractions: TSP_FRACTIONS };
  }
  const cup = settings.suBardagiMl;
  if (mlMax >= (cup / 4) * 0.9) return { id: "su_bardagi", ml: cup, fractions: CUP_FRACTIONS };
  if (mlMax >= 15 * 0.9) return { id: "yemek_kasigi", ml: 15, fractions: TBSP_FRACTIONS };
  return { id: "cay_kasigi", ml: 5, fractions: TSP_FRACTIONS };
}

function kitchenValue(value, fractions) {
  const f = nearestFraction(value, fractions);
  if (f.value === 0) {
    const smallest = fractions[0];
    return { text: fractionText(0, smallest), value: smallest };
  }
  return { text: fractionText(f.whole, f.frac), value: f.value };
}

function joinRange(a, b) {
  return b === null || a === b ? a : `${a}–${b}`;
}

function relativeError(actual, shown) {
  return actual === 0 ? 0 : Math.abs(shown - actual) / actual;
}

function toKitchen(mlMin, mlMax, system, settings, lang) {
  const top = mlMax ?? mlMin;
  if (top < 0.3) return { amount: lang === "tr" ? "1 tutam" : "a pinch", unit: "", approx: true };
  const u = kitchenUnit(top, system, settings);
  const a = kitchenValue(mlMin / u.ml, u.fractions);
  const b = mlMax === null ? null : kitchenValue(mlMax / u.ml, u.fractions);
  const plural = (b ?? a).value > 1;
  return {
    amount: joinRange(a.text, b ? b.text : null),
    unit: label(unitById(u.id), lang, plural),
    approx: relativeError(mlMin / u.ml, a.value) > 0.05 || (b !== null && relativeError(mlMax / u.ml, b.value) > 0.05),
  };
}

function toMetricMass(gMin, gMax, lang) {
  const top = gMax ?? gMin;
  const kg = top >= 1000;
  const fmt = (g) => (kg ? decimal(roundMetric(g) / 1000, lang, 2) : decimal(roundMetric(g), lang, 1));
  return { amount: joinRange(fmt(gMin), gMax === null ? null : fmt(gMax)), unit: kg ? "kg" : "g" };
}

function toMetricVolume(mlMin, mlMax, lang) {
  const top = mlMax ?? mlMin;
  const litres = top >= 1000;
  const fmt = (ml) => (litres ? decimal(roundMetric(ml) / 1000, lang, 2) : decimal(roundMetric(ml), lang, 1));
  return { amount: joinRange(fmt(mlMin), mlMax === null ? null : fmt(mlMax)), unit: litres ? (lang === "tr" ? "litre" : "l") : "ml" };
}

function toImperialMass(gMin, gMax, lang) {
  const top = gMax ?? gMin;
  const lb = top >= 453.59237;
  const unitG = lb ? 453.59237 : 28.349523125;
  const fmt = (g) => decimal(g / unitG, lang, lb ? 2 : 1);
  return { amount: joinRange(fmt(gMin), gMax === null ? null : fmt(gMax)), unit: lb ? "lb" : "oz" };
}

// Scaled value in the original unit, formatted the way that unit is normally written.
function inOriginalUnit(min, max, unit, unitText, lang) {
  const kitchen = unit && unit.kind === "volume" && unit.system !== "metric";
  const fmt = (v) => {
    if (kitchen) return kitchenValue(v, unit.id === "cup" || unit.id === "su_bardagi" ? CUP_FRACTIONS : TSP_FRACTIONS).text;
    if (unit && (unit.kind === "volume" || unit.kind === "mass") && unit.system === "metric") return decimal(roundMetric(v), lang, 1);
    return plainQuantity(Math.round(v * 100) / 100, lang);
  };
  return { amount: joinRange(fmt(min), max === null ? null : fmt(max)), unit: unitText || "" };
}

export function convertItem(item, options = {}) {
  const { target = "metric", factor = 1, lang = "tr" } = options;
  const settings = { ...DEFAULT_SETTINGS, ...(options.settings || {}) };
  const unit = item.unit ? unitById(item.unit) : null;
  const ing = item.ingredient ? ingredientById(item.ingredient) : null;
  const min = item.quantity.min * factor;
  const max = item.quantity.max === null ? null : item.quantity.max * factor;

  const notes = [];
  if (item.modifier === "heaped") notes.push("heaped");
  if (ing?.note) notes.push(`ingredient:${ing.id}`);

  const result = { amount: "", unit: "", approx: false, extra: null, notes, basis: null };
  const finish = (r) => ({ ...result, ...r, notes });

  // Counted things and units that cannot be converted: scale only.
  if (!unit || unit.kind === "count" || unit.kind === "kept" || target === "scale") {
    const r = inOriginalUnit(min, max, unit, item.unitText, lang);
    const article = item.quantityText.match(/^(an?)\s/i);
    if (article && factor === 1 && max === null) r.amount = article[1];
    if (ing?.each && (!unit || unit.kind === "count")) {
      const g = toMetricMass(min * ing.each, max === null ? null : max * ing.each, lang);
      r.extra = `${g.amount} g`;
      result.basis = { each: ing.each, source: ing.eachSource };
    }
    return finish(r);
  }

  // Already in the target system (oz and lb count as US): keep the unit the recipe used.
  if (target === unit.system || (target === "us" && unit.system === "imperial")) {
    return finish(inOriginalUnit(min, max, unit, item.unitText, lang));
  }

  const density = ing?.gPerMl ?? null;

  if (unit.kind === "mass") {
    const gMin = min * unit.g;
    const gMax = max === null ? null : max * unit.g;
    if (target === "metric") return finish(toMetricMass(gMin, gMax, lang));
    if (density) {
      const r = toKitchen(gMin / density, gMax === null ? null : gMax / density, target, settings, lang);
      result.basis = { density: ing.ref, source: ing.ref.source };
      return finish({ ...r, approx: true });
    }
    if (target === "us") return finish(toImperialMass(gMin, gMax, lang));
    notes.push("noDensity");
    return finish(toMetricMass(gMin, gMax, lang));
  }

  // Volume
  const perUnit = unit.ml(settings);
  const mlMin = min * perUnit;
  const mlMax = max === null ? null : max * perUnit;
  result.basis = { unitMl: perUnit, unitId: unit.id };

  if (target === "metric") {
    if (density && !ing.liquid) {
      result.basis = { ...result.basis, density: ing.ref, source: ing.ref.source };
      return finish({ ...toMetricMass(mlMin * density, mlMax === null ? null : mlMax * density, lang), approx: true });
    }
    if (ing && !density && !ing.liquid) notes.push("noDensity");
    return finish(toMetricVolume(mlMin, mlMax, lang));
  }
  return finish(toKitchen(mlMin, mlMax, target, settings, lang));
}

export function convertRecipe(lines, options = {}) {
  return lines.map((line) => (line.type === "item" ? { ...line, converted: convertItem(line, options) } : line));
}

// Plain-text version for copying.
export function toText(converted) {
  return converted
    .map((line) => {
      if (line.type !== "item") return line.raw;
      const c = line.converted;
      const qty = [c.approx ? "~" : "", c.amount, c.unit ? ` ${c.unit}` : ""].join("");
      const extra = c.extra ? ` (${c.extra})` : "";
      return `${line.prefix}${qty} ${line.name}${extra}`.replace(/\s+$/, "");
    })
    .join("\n");
}
