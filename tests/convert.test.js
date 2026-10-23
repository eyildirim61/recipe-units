import { test } from "node:test";
import assert from "node:assert/strict";

import { convertItem, convertRecipe, toText } from "../src/convert.js";
import { INGREDIENTS, SOURCES } from "../src/ingredients.js";
import { nearestFraction, roundMetric } from "../src/format.js";
import { parseLine, parseRecipe } from "../src/parse.js";
import { US_CUP_ML, UNITS } from "../src/units.js";

const conv = (line, options) => {
  const c = convertItem(parseLine(line), options);
  return `${c.approx ? "~" : ""}${c.amount}${c.unit ? " " + c.unit : ""}`;
};

test("densities match the source values they are derived from", () => {
  const flour = INGREDIENTS.find((i) => i.id === "flour");
  assert.ok(Math.abs(flour.gPerMl * US_CUP_ML - 120) < 1e-9);
  const salt = INGREDIENTS.find((i) => i.id === "salt");
  assert.ok(Math.abs(salt.gPerMl * (US_CUP_ML / 16) - 18) < 1e-9);
  for (const ing of INGREDIENTS) {
    if (ing.ref) {
      assert.ok(ing.ref.source in SOURCES, ing.id);
      assert.ok(ing.gPerMl > 0.1 && ing.gPerMl < 1.6, `${ing.id} density ${ing.gPerMl} looks wrong`);
    }
  }
});

test("aliases are unique across ingredients", () => {
  const seen = new Map();
  for (const ing of INGREDIENTS) {
    for (const alias of ing.aliases) {
      const key = alias.toLocaleLowerCase("tr");
      assert.ok(!seen.has(key) || seen.get(key) === ing.id, `"${alias}" used by ${seen.get(key)} and ${ing.id}`);
      seen.set(key, ing.id);
    }
  }
  assert.ok(UNITS.every((u) => u.aliases.length));
});

test("Turkish cups to grams", () => {
  assert.equal(conv("1 su bardağı toz şeker"), "~165 g"); // 200 ml × 198 g / US cup
  assert.equal(conv("2 su bardağı un"), "~205 g");
  assert.equal(conv("1 su bardağı süt"), "200 ml"); // liquids stay in ml
  assert.equal(conv("yarım çay kaşığı tuz"), "~3 g");
});

test("su bardağı size is a setting", () => {
  assert.equal(conv("1 su bardağı süt", { settings: { suBardagiMl: 250 } }), "250 ml");
  assert.equal(conv("1 tatlı kaşığı bal", { settings: { tatliKasigiMl: 5 } }), "~7 g");
});

test("US recipes to grams", () => {
  assert.equal(conv("2 cups all-purpose flour"), "~240 g");
  assert.equal(conv("1 cup water"), "235 ml");
  assert.equal(conv("1 T honey"), "~21 g");
  assert.equal(conv("1 stick butter"), conv("1 stick butter")); // unknown unit: left as text
  assert.equal(conv("8 oz cream cheese"), "225 g");
  assert.equal(conv("1 lb butter"), "455 g");
});

test("to US kitchen units with fractions", () => {
  assert.equal(conv("200 g toz şeker", { target: "us", lang: "en" }), "~1 cup"); // via density: always approximate
  assert.equal(conv("1 su bardağı süt", { target: "us", lang: "en" }), "~¾ cup");
  assert.equal(conv("30 ml zeytinyağı", { target: "us", lang: "en" }), "2 tbsp");
  assert.equal(conv("5 g tuz", { target: "us", lang: "en" }), "~¾ tsp"); // 0.84 tsp
  assert.equal(conv("500 g un", { target: "us", lang: "en" }), "~4¼ cups"); // 4.17 cups
  assert.equal(conv("8 oz cream cheese", { target: "us", lang: "en" }), "8 oz"); // already US
  assert.equal(conv("85 g damla çikolata", { target: "us", lang: "en" }), "~½ cup"); // source: 1 cup = 170 g
});

test("to Turkish units", () => {
  assert.equal(conv("2 cups all-purpose flour", { target: "tr" }), "2⅓ su bardağı");
  assert.equal(conv("1 tbsp honey", { target: "tr" }), "1 yemek kaşığı");
  assert.equal(conv("1/2 tsp salt", { target: "tr" }), "½ çay kaşığı");
  assert.equal(conv("120 g un", { target: "tr" }), "~1¼ su bardağı");
  assert.equal(conv("3 tatlı kaşığı şeker", { target: "tr" }), "3 tatlı kaşığı"); // same system: unchanged
});

test("mass without a known density", () => {
  const c = convertItem(parseLine("200 g lokum"), { target: "tr" });
  assert.equal(`${c.amount} ${c.unit}`, "200 g");
  assert.ok(c.notes.includes("noDensity"));
  assert.equal(conv("200 g lokum", { target: "us", lang: "en" }), "7.1 oz");
  assert.equal(conv("1 su bardağı koşer tuzu"), "200 ml"); // explicitly unknown: volume only
});

test("ranges keep one unit", () => {
  assert.equal(conv("Un: 2-3 yemek kaşığı", { target: "us", lang: "en" }), "2–3 tbsp");
  assert.equal(conv("2-3 su bardağı un"), "~205–305 g");
});

test("scaling", () => {
  assert.equal(conv("2 su bardağı un", { target: "scale", factor: 1.5 }), "3 su bardağı");
  assert.equal(conv("3 yumurta", { target: "scale", factor: 0.5 }), "1½");
  assert.equal(conv("200 g tereyağı", { target: "scale", factor: 1.5 }), "300 g");
  assert.equal(conv("2 su bardağı un", { factor: 2 }), "~405 g");
  assert.equal(conv("a pinch of salt"), "a pinch");
  assert.equal(conv("a pinch of salt", { factor: 2 }), "2 pinch");
});

test("eggs get a weight, heaped measures a note", () => {
  const egg = convertItem(parseLine("3 yumurta"));
  assert.equal(egg.extra, "150 g");
  assert.ok(convertItem(parseLine("1 tepeleme yemek kaşığı un")).notes.includes("heaped"));
  assert.ok(convertItem(parseLine("1 cup brown sugar")).notes.includes("ingredient:brown_sugar"));
});

test("tiny amounts become a pinch", () => {
  assert.equal(conv("0.1 g tuz", { target: "tr" }), "~1 tutam");
});

test("whole recipe round trip keeps text lines", () => {
  const recipe = "Kek:\n- 2 su bardağı un\n\nFırında pişirin.";
  const text = toText(convertRecipe(parseRecipe(recipe), { target: "metric" }));
  assert.equal(text, "Kek:\n- ~205 g un\n\nFırında pişirin.");
});

test("rounding helpers", () => {
  assert.equal(roundMetric(0.34), 0.3);
  assert.equal(roundMetric(3.3), 3.5);
  assert.equal(roundMetric(57.4), 57);
  assert.equal(roundMetric(253.6), 255);
  assert.equal(roundMetric(1234), 1230);
  assert.deepEqual(nearestFraction(0.845, [1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4]).value, 0.75);
  assert.deepEqual(nearestFraction(2.37, [1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4]).value, 2 + 1 / 3);
});
