import { test } from "node:test";
import assert from "node:assert/strict";

import { matchIngredient, parseLine, parseNumber } from "../src/parse.js";
import { fold } from "../src/text.js";

const item = (line) => {
  const p = parseLine(line);
  assert.equal(p.type, "item", `expected an item: ${line}`);
  return p;
};

test("fold keeps length and strips Turkish letters", () => {
  for (const s of ["Şeker", "İRMİK", "ılık süt", "Çay Kaşığı", "Ğ"]) assert.equal(fold(s).length, s.length);
  assert.equal(fold("İRMİK Şekeri ÇAY"), "irmik sekeri cay");
});

test("numbers: digits, decimals, fractions, words", () => {
  const cases = {
    "2": 2, "2,5": 2.5, "2.5": 2.5, "1/2": 0.5, "1 1/2": 1.5, "½": 0.5, "1½": 1.5, "2 ¾": 2.75,
    yarım: 0.5, çeyrek: 0.25, "bir buçuk": 1.5, "2 buçuk": 2.5, iki: 2, half: 0.5, a: 1,
  };
  for (const [text, value] of Object.entries(cases)) assert.equal(parseNumber(text), value, text);
  assert.ok(Number.isNaN(parseNumber("1/0")));
});

test("Turkish units and ingredients", () => {
  let p = item("2 su bardağı un");
  assert.deepEqual([p.quantity.min, p.unit, p.ingredient, p.name], [2, "su_bardagi", "flour", "un"]);
  p = item("yarım çay kaşığı tuz");
  assert.deepEqual([p.quantity.min, p.unit, p.ingredient], [0.5, "cay_kasigi", "salt"]);
  p = item("1 çay bardağı sıvı yağ");
  assert.deepEqual([p.unit, p.ingredient], ["cay_bardagi", "oil"]);
  p = item("1 bardak süt");
  assert.deepEqual([p.unit, p.ingredient], ["su_bardagi", "milk"]);
  p = item("3 tatlı kaşığı pudra şekeri");
  assert.deepEqual([p.unit, p.ingredient], ["tatli_kasigi", "powdered_sugar"]);
});

test("ingredient name before the quantity, with ranges", () => {
  const p = item("Un: 2-3 su bardağı");
  assert.deepEqual([p.quantity.min, p.quantity.max, p.unit, p.ingredient, p.name], [2, 3, "su_bardagi", "flour", "Un"]);
  assert.equal(item("2 to 3 cups water").quantity.max, 3);
  assert.equal(item("2 ila 3 yemek kaşığı bal").quantity.max, 3);
});

test("modifiers between quantity and unit", () => {
  assert.equal(item("1 tepeleme yemek kaşığı un").modifier, "heaped");
  assert.equal(item("1 silme yemek kaşığı un").modifier, "level");
  assert.equal(item("2 heaping tablespoons cocoa").modifier, "heaped");
});

test("English units, including case-sensitive T and t", () => {
  let p = item("1½ cups of sugar");
  assert.deepEqual([p.quantity.min, p.unit, p.ingredient, p.name], [1.5, "cup", "sugar", "sugar"]);
  assert.equal(item("1 T honey").unit, "tbsp");
  assert.equal(item("1 t baking soda").unit, "tsp");
  assert.equal(item("2 1/4 tsp instant yeast").quantity.min, 2.25);
  assert.equal(item("4 fl oz milk").unit, "fl_oz");
  assert.equal(item("8 oz cream cheese").unit, "oz");
});

test("metric units touching the number", () => {
  assert.deepEqual([item("200g un").unit, item("250ml süt").unit, item("1 kg patates").unit], ["g", "ml", "kg"]);
  assert.equal(item("200 gr tereyağı").ingredient, "butter");
});

test("parenthesised alternative quantity is removed from the name", () => {
  const p = item("200 g (1½ su bardağı) ceviz içi");
  assert.deepEqual([p.unit, p.quantity.min, p.name, p.ingredient], ["g", 200, "ceviz içi", "walnuts"]);
  assert.equal(item("2 cups flour (sifted)").name, "flour (sifted)");
});

test("bullets and numbering are kept as prefix", () => {
  assert.equal(item("- 2 su bardağı un").prefix, "- ");
  assert.equal(item("• 1 cup milk").prefix, "• ");
  assert.equal(parseLine("1. Fırını ısıtın").type, "text");
});

test("counted ingredients and kept units", () => {
  let p = item("3 yumurta");
  assert.deepEqual([p.unit, p.ingredient, p.quantity.min], [null, "egg", 3]);
  p = item("2 orta boy patates");
  assert.deepEqual([p.unit, p.ingredient], [null, null]);
  p = item("1 paket kabartma tozu");
  assert.deepEqual([p.unit, p.unitText, p.ingredient], ["kept", "paket", "baking_powder"]);
  p = item("3 diş sarımsak");
  assert.equal(p.unit, "kept");
  p = item("a pinch of salt");
  assert.deepEqual([p.unit, p.quantity.min, p.name], ["kept", 1, "salt"]);
});

test("instructions and headings stay text", () => {
  for (const line of ["Hamuru için:", "180 derecede 35 dakika pişirin.", "Bake for 25 minutes at 350 F",
    "A good cake needs patience", "Tuz, karabiber", "", "Bake at 350 F", "Add a tablespoon at a time"]) {
    assert.notEqual(parseLine(line).type, "item", line);
  }
});

test("ingredient matching: longest alias wins and Turkish suffixes work", () => {
  const id = (name) => matchIngredient(name)?.id ?? null;
  assert.equal(id("pudra şekeri"), "powdered_sugar");
  assert.equal(id("şeker"), "sugar");
  assert.equal(id("esmer şeker"), "brown_sugar");
  assert.equal(id("galeta unu"), "breadcrumbs");
  assert.equal(id("unu"), "flour");
  assert.equal(id("zeytinyağı"), "olive_oil");
  assert.equal(id("tereyağı"), "butter");
  assert.equal(id("sıvı yağ"), "oil");
  assert.equal(id("yaş maya"), "fresh_yeast");
  assert.equal(id("kuru maya"), "instant_yeast");
  assert.equal(id("süzme yoğurt"), "strained_yogurt");
  assert.equal(id("kosher salt"), "kosher_salt");
  assert.equal(id("arpa şehriye"), "orzo");
  assert.equal(id("çam fıstığı"), "pine_nuts");
  assert.equal(id("balık"), null); // "bal" (honey) must not match "balık" (fish)
  assert.equal(id("susam"), "sesame"); // not water
  assert.equal(id("İRMİK"), "semolina");
});
