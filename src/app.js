// Page wiring: read the recipe, convert, render. All work happens in the browser.

import { convertRecipe, toText } from "./convert.js";
import { ingredientById, SOURCES } from "./ingredients.js";
import { parseRecipe } from "./parse.js";
import { decimal } from "./format.js";
import { DEFAULT_SETTINGS, unitById } from "./units.js";

const STORAGE_KEY = "recipe-units:v1";

const SAMPLES = {
  tr: { servings: 8, text: `Kakaolu kek

Kek için:
- 3 yumurta
- 1 su bardağı toz şeker
- 1 çay bardağı sıvı yağ
- 1 su bardağı süt
- 2 su bardağı un
- 3 yemek kaşığı kakao
- 1 paket kabartma tozu
- 1 paket vanilin
- yarım çay kaşığı tuz

Üzeri için:
- 1 su bardağı ceviz içi
- 2 yemek kaşığı pudra şekeri

Fırını 180 dereceye ısıtın, 35 dakika pişirin.` },
  en: { servings: 24, text: `Oatmeal raisin cookies

1 1/2 cups rolled oats
1 cup all-purpose flour
1/2 tsp baking soda
1/2 tsp salt
1/2 cup butter, softened
3/4 cup packed brown sugar
1 large egg
1 tsp vanilla extract
1/2 cup raisins
1/3 cup chopped walnuts

Bake at 350 F for 10 to 12 minutes.` },
};

const T = {
  tr: {
    title: "Tarif Ölçü Çevirici",
    tagline: "Tarifi yapıştır: su bardağı, cup ve gram arasında çevirsin, porsiyonu ölçeklesin.",
    target: "Çevir", servings: "Porsiyon", from: "Tarif", to: "Yapacağım", settings: "Ölçü ayarları",
    cup: "1 su bardağı", dessert: "1 tatlı kaşığı",
    settingsNote: "Türk mutfak ölçüleri standart değil: kaynaklar su bardağı için 200 ya da 250 ml, tatlı kaşığı için 5 ya da 10 ml veriyor. Tarifin yazıldığı ölçüyü seç.",
    targets: { metric: "Gram / ml", us: "ABD (cup)", tr: "Türk ölçüsü", scale: "Sadece ölçekle" },
    input: "Tarif", output: "Sonuç", sampleTr: "Örnek: kek", sampleEn: "Örnek: cookies", clear: "Temizle", copy: "Kopyala",
    copied: "Kopyalandı", selected: "Metin seçildi, kopyalayabilirsin",
    placeholder: "Her satıra bir malzeme yaz, örneğin:\n2 su bardağı un\n1 cup sugar\n200 g tereyağı",
    summary: (n, m) => `${n} malzeme çevrildi${m ? ` · ${m} satır olduğu gibi kaldı` : ""}`,
    empty: "Sol tarafa bir tarif yapıştır.",
    approx: "yaklaşık", how: "nasıl hesaplandı?", unknown: "malzeme tanınmadı",
    unknownHelp: "Malzeme tanınmadığı için sadece ölçü birimi çevrildi.",
    notes: {
      heaped: "Tepeleme ölçü: gerçek miktar biraz daha fazla.",
      noDensity: "Bu malzemenin ağırlığı bilinmiyor, hacim olarak bırakıldı.",
      packed: "bastırılarak ölçülmüş", "pekmez approximated with molasses": "pekmez için melas değeri kullanıldı",
      "long grain, uncooked": "uzun taneli, çiğ", dry: "kuru", chopped: "doğranmış", whole: "bütün",
      unsweetened: "şekersiz", diced: "küp doğranmış",
    },
    per: "1", each: "1 adet",
    footer: [
      "Ağırlıklar ölçüye göre değişir; sonuçlar mutfak için yuvarlanır ve ≈ ile işaretlenir.",
      "Malzeme ağırlıkları: ", " (un kaşıkla doldurulup silinmiş). Birkaç Türk malzemesi: ", ".",
    ],
  },
  en: {
    title: "Recipe Unit Converter",
    tagline: "Paste a recipe to convert it between Turkish cups, US cups and grams, and scale it.",
    target: "Convert to", servings: "Servings", from: "Recipe", to: "Making", settings: "Measure settings",
    cup: "1 Turkish cup", dessert: "1 dessert spoon",
    settingsNote: "Turkish kitchen measures are not standardised: sources give 200 or 250 ml for a su bardağı and 5 or 10 ml for a tatlı kaşığı. Pick the one your recipe uses.",
    targets: { metric: "Grams / ml", us: "US cups", tr: "Turkish cups", scale: "Scale only" },
    input: "Recipe", output: "Result", sampleTr: "Sample: cake", sampleEn: "Sample: cookies", clear: "Clear", copy: "Copy",
    copied: "Copied", selected: "Text selected, ready to copy",
    placeholder: "One ingredient per line, for example:\n2 cups flour\n1 su bardağı süt\n200 g butter",
    summary: (n, m) => `${n} ingredient${n === 1 ? "" : "s"} converted${m ? ` · ${m} line${m === 1 ? "" : "s"} left as written` : ""}`,
    empty: "Paste a recipe on the left.",
    approx: "approximate", how: "how was this worked out?", unknown: "ingredient not recognised",
    unknownHelp: "The ingredient was not recognised, so only the unit was converted.",
    notes: {
      heaped: "Heaped measure: the real amount is a bit more.",
      noDensity: "No known weight for this ingredient; kept as a volume.",
      packed: "packed", "pekmez approximated with molasses": "uses molasses as an approximation for pekmez",
      "long grain, uncooked": "long grain, uncooked", dry: "dry", chopped: "chopped", whole: "whole",
      unsweetened: "unsweetened", diced: "diced",
    },
    per: "1", each: "1 piece",
    footer: [
      "Weights depend on how you measure; results are rounded for the kitchen and marked ≈.",
      "Ingredient weights: ", " (flour spooned and levelled). A few Turkish staples: ", ".",
    ],
  },
};

const REF_UNIT = { cup: ["cup", "cup"], tbsp: ["tbsp", "tbsp"], tsp: ["tsp", "tsp"], ml: ["ml", "ml"],
  su_bardagi_200: ["su bardağı (200 ml)", "Turkish cup (200 ml)"] };
const SOURCE_SHORT = { ka: "King Arthur", tr: "yemek.com / egitimsistem.com", phys: "" };

const $ = (id) => document.getElementById(id);
const els = {
  input: $("input"), result: $("result"), summary: $("summary"), target: $("target"), quick: $("quick"),
  from: $("from"), to: $("to"), factor: $("factor"), cup: $("cup"), dessert: $("dessert"), toast: $("toast"),
};

const state = load() || {
  lang: (navigator.language || "tr").toLowerCase().startsWith("tr") ? "tr" : "en",
  text: SAMPLES.tr.text, from: SAMPLES.tr.servings, to: SAMPLES.tr.servings, target: "metric",
  settings: { ...DEFAULT_SETTINGS },
};

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (data && typeof data.text === "string") return { ...data, settings: { ...DEFAULT_SETTINGS, ...data.settings } };
  } catch { /* storage unavailable: start fresh */ }
  return null;
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

const factor = () => (state.from > 0 && state.to > 0 ? state.to / state.from : 1);

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function segment(container, options, current, onPick) {
  container.innerHTML = "";
  for (const [value, label] of options) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.setAttribute("aria-pressed", String(value === current));
    b.addEventListener("click", () => onPick(value));
    container.append(b);
  }
}

function basisText(line, c) {
  const t = T[state.lang];
  const L = state.lang === "tr" ? 0 : 1;
  const parts = [];
  const unit = line.unit ? unitById(line.unit) : null;
  if (c.basis?.unitMl && unit && unit.system !== "metric") {
    parts.push(`1 ${line.unitText} = ${decimal(c.basis.unitMl, state.lang, 1)} ml`);
  }
  const ing = line.ingredient ? ingredientById(line.ingredient) : null;
  if (c.basis?.density && ing) {
    const r = c.basis.density;
    const src = SOURCE_SHORT[r.source];
    parts.push(`${ing.name[state.lang]}: ${decimal(r.qty, state.lang)} ${REF_UNIT[r.unit][L]} = ${r.g} g${src ? ` (${src})` : ""}`);
  }
  if (c.basis?.each && ing) parts.push(`${ing.name[state.lang]}: ${t.each} ≈ ${decimal(c.basis.each, state.lang, 1)} g (${SOURCE_SHORT[c.basis.source]})`);
  return parts.join(" · ");
}

function noteTexts(line, c) {
  const t = T[state.lang];
  return c.notes.map((n) => {
    if (n.startsWith("ingredient:")) {
      const ing = ingredientById(n.slice("ingredient:".length));
      return ing?.note ? t.notes[ing.note] || ing.note : null;
    }
    return t.notes[n] || null;
  }).filter(Boolean);
}

function render() {
  const t = T[state.lang];
  document.documentElement.lang = state.lang;
  document.title = t.title;
  $("title").textContent = t.title;
  $("tagline").textContent = t.tagline;
  $("lbl-target").textContent = t.target;
  $("lbl-servings").textContent = t.servings;
  $("lbl-from").textContent = t.from;
  $("lbl-to").textContent = t.to;
  $("lbl-settings").textContent = t.settings;
  $("lbl-cup").textContent = t.cup;
  $("lbl-dessert").textContent = t.dessert;
  $("settings-note").textContent = t.settingsNote;
  $("in-title").textContent = t.input;
  $("out-title").textContent = t.output;
  $("sample-tr").textContent = t.sampleTr;
  $("sample-en").textContent = t.sampleEn;
  $("clear").textContent = t.clear;
  $("copy").textContent = t.copy;
  els.input.placeholder = t.placeholder;
  $("lang-tr").setAttribute("aria-pressed", String(state.lang === "tr"));
  $("lang-en").setAttribute("aria-pressed", String(state.lang === "en"));

  segment(els.target, Object.entries(t.targets), state.target, (v) => { state.target = v; update(); });
  const f = factor();
  segment(els.quick, [[0.5, "×½"], [1, "×1"], [1.5, "×1½"], [2, "×2"], [3, "×3"]],
    [0.5, 1, 1.5, 2, 3].find((k) => Math.abs(k - f) < 1e-9), (k) => { state.to = Math.round(state.from * k * 100) / 100; update(); });
  segment(els.cup, [[200, "200 ml"], [250, "250 ml"]], state.settings.suBardagiMl, (v) => { state.settings.suBardagiMl = v; update(); });
  segment(els.dessert, [[10, "10 ml"], [5, "5 ml"]], state.settings.tatliKasigiMl, (v) => { state.settings.tatliKasigiMl = v; update(); });

  if (document.activeElement !== els.from) els.from.value = state.from;
  if (document.activeElement !== els.to) els.to.value = state.to;
  els.factor.textContent = `×${decimal(f, state.lang, 2)}`;
  if (els.input.value !== state.text) els.input.value = state.text;

  const options = { target: state.target, factor: f, settings: state.settings, lang: state.lang };
  const lines = convertRecipe(parseRecipe(state.text), options);
  renderResult(lines);
  renderFooter();
  return lines;
}

let lastLines = [];

function renderResult(lines) {
  const t = T[state.lang];
  lastLines = lines;
  const items = lines.filter((l) => l.type === "item").length;
  const texts = lines.filter((l) => l.type === "text").length;
  els.summary.textContent = items ? t.summary(items, texts) : "";
  if (!state.text.trim()) {
    els.result.innerHTML = `<li class="note-line">${escapeHtml(t.empty)}</li>`;
    return;
  }
  els.result.innerHTML = lines.map((line) => {
    if (line.type === "blank") return `<li class="blank" aria-hidden="true"></li>`;
    if (line.type === "text") {
      const heading = /:\s*$/.test(line.raw) || (line.raw.trim().split(/\s+/).length <= 4 && !/[.!?]$/.test(line.raw.trim()));
      return `<li class="${heading ? "heading" : "note-line"}">${escapeHtml(line.raw.trim())}</li>`;
    }
    const c = line.converted;
    const unit = line.unit ? unitById(line.unit) : null;
    const meta = [];
    const unrecognised = !line.ingredient && unit && (unit.kind === "volume" || unit.kind === "mass")
      && state.target !== "scale" && state.target !== unit.system;
    if (unrecognised) meta.push(`<span class="tag warn" title="${escapeHtml(t.unknownHelp)}">${escapeHtml(t.unknown)}</span>`);
    for (const n of noteTexts(line, c)) meta.push(`<span>${escapeHtml(n)}</span>`);
    const basis = basisText(line, c);
    const original = line.raw.slice(line.prefix.length).trim();
    meta.push(`<span>← ${escapeHtml(original)}</span>`);
    if (basis) meta.push(`<details><summary>${escapeHtml(t.how)}</summary><span class="basis">${escapeHtml(basis)}</span></details>`);
    const extra = c.extra ? ` <span class="extra">(${escapeHtml(c.extra)})</span>` : "";
    return `<li><div class="item">
      <div class="qty">${c.approx ? `<span class="approx" title="${escapeHtml(t.approx)}" aria-label="${escapeHtml(t.approx)}">≈</span>` : ""}${escapeHtml(c.amount)}${c.unit ? `<span class="unit">${escapeHtml(c.unit)}</span>` : ""}</div>
      <div class="name">${escapeHtml(line.name)}${extra}</div>
      <div class="meta">${meta.join("")}</div>
    </div></li>`;
  }).join("");
}

function renderFooter() {
  const t = T[state.lang];
  const link = (s) => `<a href="${s.url}" target="_blank" rel="noopener">${escapeHtml(s.name)}</a>`;
  $("footer").innerHTML = `<div>${escapeHtml(t.footer[0])}</div>
    <div>${escapeHtml(t.footer[1])}${link(SOURCES.ka)}${escapeHtml(t.footer[2])}${link(SOURCES.tr)}${escapeHtml(t.footer[3])}</div>`;
}

function update() {
  save();
  render();
}

function flash(message) {
  els.toast.textContent = message;
  clearTimeout(flash.timer);
  flash.timer = setTimeout(() => { els.toast.textContent = ""; }, 2200);
}

els.input.addEventListener("input", () => { state.text = els.input.value; update(); });
for (const [el, key] of [[els.from, "from"], [els.to, "to"]]) {
  el.addEventListener("input", () => {
    const v = Number(el.value.replace(",", "."));
    if (Number.isFinite(v) && v > 0) { state[key] = v; update(); }
  });
}
$("lang-tr").addEventListener("click", () => { state.lang = "tr"; update(); });
$("lang-en").addEventListener("click", () => { state.lang = "en"; update(); });
for (const lang of ["tr", "en"]) {
  $(`sample-${lang}`).addEventListener("click", () => {
    state.text = SAMPLES[lang].text;
    state.from = state.to = SAMPLES[lang].servings;
    state.target = lang === "tr" ? "metric" : "tr";
    update();
  });
}
$("clear").addEventListener("click", () => { state.text = ""; update(); els.input.focus(); });
$("copy").addEventListener("click", async () => {
  const text = toText(lastLines);
  try {
    await navigator.clipboard.writeText(text);
    flash(T[state.lang].copied);
  } catch {
    const range = document.createRange();
    range.selectNodeContents(els.result);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    flash(T[state.lang].selected);
  }
});

render();
