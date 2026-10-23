// Ingredient densities, each traced to a published source.
//
// `ref` is the measurement exactly as the source states it (e.g. 1 cup = 120 g). Grams per
// millilitre are derived from it, so the table can be checked line by line against the source.
// Entries with `ref: null` are deliberately unknown: they exist so that "kosher salt" does not
// silently match "salt", whose density is very different.

import { US_CUP_ML, US_TBSP_ML, US_TSP_ML } from "./units.js";

export const SOURCES = {
  ka: {
    name: "King Arthur Baking — Ingredient Weight Chart",
    url: "https://www.kingarthurbaking.com/learn/ingredient-weight-chart",
    note: "Flour is spooned into the cup and levelled.",
  },
  tr: {
    name: "yemek.com and egitimsistem.com measurement tables (200 ml su bardağı)",
    url: "https://yemek.com/bardak-olculeri/",
    note: "Used only where no King Arthur value exists.",
  },
  phys: { name: "Physical constant", url: "", note: "Water: 1 g per ml." },
};

const VOLUME_UNITS = { cup: US_CUP_ML, tbsp: US_TBSP_ML, tsp: US_TSP_ML, ml: 1, su_bardagi_200: 200 };

const ka = (qty, unit, g) => ({ source: "ka", qty, unit, g });
const tr = (g) => ({ source: "tr", qty: 1, unit: "su_bardagi_200", g });

// liquid: shown in ml rather than grams when converting to metric.
// each: grams per piece, for counted ingredients such as eggs.
const RAW = [
  // Flours and starches
  ["flour", "un", "flour", ka(1, "cup", 120),
    ["un", "beyaz un", "buğday unu", "çok amaçlı un", "ekmeklik un"],
    ["flour", "all-purpose flour", "all purpose flour", "plain flour", "bread flour", "cake flour"]],
  ["whole_wheat_flour", "tam buğday unu", "whole wheat flour", ka(1, "cup", 113),
    ["tam buğday unu", "kepekli un"], ["whole wheat flour", "wholemeal flour"]],
  ["rye_flour", "çavdar unu", "rye flour", ka(1, "cup", 106), ["çavdar unu"], ["rye flour"]],
  ["rice_flour", "pirinç unu", "rice flour", ka(1, "cup", 142), ["pirinç unu"], ["rice flour"]],
  ["chickpea_flour", "nohut unu", "chickpea flour", ka(1, "cup", 85),
    ["nohut unu"], ["chickpea flour", "gram flour", "besan"]],
  ["oat_flour", "yulaf unu", "oat flour", ka(1, "cup", 92), ["yulaf unu"], ["oat flour"]],
  ["almond_flour", "badem unu", "almond flour", ka(1, "cup", 96),
    ["badem unu", "toz badem", "öğütülmüş badem"], ["almond flour", "almond meal", "ground almonds"]],
  ["hazelnut_flour", "fındık unu", "hazelnut flour", ka(1, "cup", 89),
    ["fındık unu", "toz fındık", "öğütülmüş fındık", "dövülmüş fındık"], ["hazelnut flour", "ground hazelnuts"]],
  ["coconut_flour", "hindistan cevizi unu", "coconut flour", ka(1, "cup", 128),
    ["hindistan cevizi unu"], ["coconut flour"]],
  ["semolina", "irmik", "semolina", ka(1, "cup", 163), ["irmik"], ["semolina"]],
  ["cornmeal", "mısır unu", "cornmeal", ka(1, "cup", 138), ["mısır unu"], ["cornmeal", "polenta"]],
  ["cornstarch", "nişasta", "cornstarch", ka(0.25, "cup", 28),
    ["nişasta", "mısır nişastası", "buğday nişastası"], ["cornstarch", "corn starch", "cornflour"]],
  ["potato_starch", "patates nişastası", "potato starch", ka(1, "cup", 152),
    ["patates nişastası"], ["potato starch"]],
  ["cocoa", "kakao", "cocoa", ka(0.5, "cup", 42), ["kakao"], ["cocoa", "cocoa powder"]],
  ["breadcrumbs", "galeta unu", "breadcrumbs", ka(0.25, "cup", 28),
    ["galeta unu", "ekmek kırıntısı"], ["breadcrumbs", "bread crumbs", "dried breadcrumbs"]],

  // Sugars and syrups
  ["sugar", "toz şeker", "sugar", ka(1, "cup", 198),
    ["şeker", "toz şeker", "beyaz şeker", "kristal şeker"], ["sugar", "granulated sugar", "white sugar"]],
  ["superfine_sugar", "ince toz şeker", "superfine sugar", ka(1, "cup", 190),
    ["ince toz şeker"], ["superfine sugar", "caster sugar", "castor sugar"]],
  ["brown_sugar", "esmer şeker", "brown sugar", ka(1, "cup", 213),
    ["esmer şeker"], ["brown sugar", "light brown sugar", "dark brown sugar"], { note: "packed" }],
  ["powdered_sugar", "pudra şekeri", "powdered sugar", ka(1, "cup", 113),
    ["pudra şekeri", "pudra şeker"], ["powdered sugar", "icing sugar", "confectioners sugar", "confectioners' sugar"]],
  ["honey", "bal", "honey", ka(1, "tbsp", 21), ["bal", "çiçek balı"], ["honey"]],
  ["molasses", "pekmez", "molasses", ka(0.25, "cup", 85),
    ["pekmez", "üzüm pekmezi", "harnup pekmezi", "keçiboynuzu pekmezi"], ["molasses"],
    { note: "pekmez approximated with molasses" }],
  ["maple_syrup", "akçaağaç şurubu", "maple syrup", ka(0.5, "cup", 156), ["akçaağaç şurubu"], ["maple syrup"]],
  ["corn_syrup", "mısır şurubu", "corn syrup", ka(1, "cup", 312), ["mısır şurubu", "glikoz şurubu"], ["corn syrup"]],
  ["jam", "reçel", "jam", ka(0.25, "cup", 85), ["reçel", "marmelat"], ["jam", "preserves", "marmalade"]],

  // Fats
  ["butter", "tereyağı", "butter", ka(0.5, "cup", 113),
    ["tereyağı", "tereyağ", "margarin"], ["butter", "unsalted butter", "salted butter", "margarine"]],
  ["oil", "sıvı yağ", "vegetable oil", ka(1, "cup", 198),
    ["sıvı yağ", "ayçiçek yağı", "ayçiçeği yağı", "mısır yağı", "kanola yağı", "yağ"],
    ["oil", "vegetable oil", "canola oil", "sunflower oil", "corn oil"], { liquid: true }],
  ["olive_oil", "zeytinyağı", "olive oil", ka(0.25, "cup", 50),
    ["zeytinyağı", "zeytin yağı", "sızma zeytinyağı"], ["olive oil", "extra virgin olive oil"], { liquid: true }],
  ["coconut_oil", "hindistan cevizi yağı", "coconut oil", ka(0.5, "cup", 113),
    ["hindistan cevizi yağı"], ["coconut oil"]],
  ["ghee", "sade yağ", "ghee", ka(0.25, "cup", 44), ["sade yağ", "sadeyağ"], ["ghee", "clarified butter"]],
  ["shortening", "bitkisel katı yağ", "shortening", ka(0.25, "cup", 46),
    ["bitkisel katı yağ"], ["shortening", "vegetable shortening"]],

  // Dairy and liquids
  ["water", "su", "water", { source: "phys", qty: 1, unit: "ml", g: 1 },
    ["su", "ılık su", "sıcak su", "soğuk su", "kaynar su", "kaynamış su"],
    ["water", "warm water", "cold water", "boiling water", "hot water"], { liquid: true }],
  ["milk", "süt", "milk", ka(1, "cup", 227), ["süt", "ılık süt", "tam yağlı süt"], ["milk", "whole milk"], { liquid: true }],
  ["buttermilk", "buttermilk", "buttermilk", ka(1, "cup", 227), [], ["buttermilk"], { liquid: true }],
  ["cream", "krema", "cream", ka(1, "cup", 227),
    ["krema", "sıvı krema", "süt kreması"], ["cream", "heavy cream", "whipping cream", "double cream", "light cream", "half and half"],
    { liquid: true }],
  ["sour_cream", "ekşi krema", "sour cream", ka(1, "cup", 227), ["ekşi krema"], ["sour cream"]],
  ["yogurt", "yoğurt", "yogurt", ka(1, "cup", 227), ["yoğurt"], ["yogurt", "yoghurt", "plain yogurt"]],
  ["cream_cheese", "krem peynir", "cream cheese", ka(1, "cup", 227), ["krem peynir", "labne"], ["cream cheese"]],
  ["ricotta", "lor peyniri", "ricotta", ka(1, "cup", 227), ["lor", "lor peyniri"], ["ricotta"]],
  ["mascarpone", "mascarpone", "mascarpone", ka(1, "cup", 227), ["mascarpone"], ["mascarpone"]],
  ["parmesan", "rendelenmiş parmesan", "grated parmesan", ka(0.5, "cup", 50),
    ["parmesan", "rendelenmiş parmesan"], ["parmesan", "grated parmesan"]],
  ["grated_cheese", "rendelenmiş peynir", "grated cheese", ka(1, "cup", 113),
    ["rendelenmiş kaşar", "kaşar", "kaşar peyniri", "rendelenmiş peynir", "mozzarella"],
    ["grated cheese", "shredded cheese", "cheddar", "mozzarella", "swiss cheese", "jack cheese"]],
  ["milk_powder", "süt tozu", "milk powder", ka(0.5, "cup", 50), ["süt tozu"], ["milk powder", "powdered milk", "dry milk"]],
  ["vanilla_extract", "vanilya özütü", "vanilla extract", ka(1, "tbsp", 14),
    ["vanilya özütü", "vanilya ekstraktı", "sıvı vanilya"], ["vanilla extract", "vanilla"], { liquid: true }],

  // Leaveners and salt
  ["salt", "tuz", "table salt", ka(1, "tbsp", 18), ["tuz", "sofra tuzu", "ince tuz"], ["salt", "table salt", "fine salt"]],
  ["baking_powder", "kabartma tozu", "baking powder", ka(1, "tsp", 4), ["kabartma tozu"], ["baking powder"]],
  ["baking_soda", "karbonat", "baking soda", ka(0.5, "tsp", 3),
    ["karbonat", "yemek sodası"], ["baking soda", "bicarbonate of soda", "bicarb"]],
  ["instant_yeast", "kuru maya", "instant yeast", ka(1, "tbsp", 9),
    ["instant maya", "kuru maya", "maya"], ["instant yeast", "dry yeast", "active dry yeast", "yeast"]],
  ["espresso_powder", "granül kahve", "espresso powder", ka(1, "tbsp", 7),
    ["granül kahve", "hazır kahve"], ["espresso powder", "instant espresso", "instant coffee"]],

  // Grains and pulses
  ["rice", "pirinç", "rice", ka(0.5, "cup", 99),
    ["pirinç", "baldo pirinç", "osmancık pirinç", "basmati pirinç"], ["rice", "white rice", "long grain rice", "basmati rice", "jasmine rice"],
    { note: "long grain, uncooked" }],
  ["bulgur", "bulgur", "bulgur", ka(1, "cup", 152),
    ["bulgur", "pilavlık bulgur", "köftelik bulgur", "ince bulgur"], ["bulgur", "bulghur", "bulgur wheat"]],
  ["oats", "yulaf ezmesi", "rolled oats", ka(1, "cup", 89),
    ["yulaf ezmesi", "yulaf"], ["rolled oats", "oats", "old-fashioned oats", "quick oats", "oatmeal"]],
  ["quinoa", "kinoa", "quinoa", ka(1, "cup", 177), ["kinoa"], ["quinoa"]],
  ["barley", "arpa", "pearl barley", ka(1, "cup", 213), ["arpa", "inci arpa"], ["pearl barley", "barley"]],
  ["lentils", "mercimek", "lentils", tr(170),
    ["mercimek", "kırmızı mercimek", "yeşil mercimek", "sarı mercimek"], ["lentils", "red lentils", "green lentils"]],
  ["chickpeas", "nohut", "dried chickpeas", tr(140), ["nohut", "kuru nohut"], ["dried chickpeas"], { note: "dry" }],
  ["beans", "kuru fasulye", "dried beans", tr(150), ["kuru fasulye", "barbunya"], ["dried beans", "navy beans"], { note: "dry" }],
  ["orzo", "arpa şehriye", "orzo", tr(150), ["arpa şehriye"], ["orzo"]],
  ["tomato_paste", "salça", "tomato paste", tr(225), ["salça", "domates salçası", "biber salçası"], ["tomato paste"]],

  // Nuts, seeds, dried fruit
  ["walnuts", "ceviz içi", "walnuts", ka(1, "cup", 113),
    ["ceviz", "ceviz içi", "doğranmış ceviz"], ["walnuts", "walnut", "chopped walnuts"], { note: "chopped" }],
  ["hazelnuts", "fındık", "hazelnuts", ka(1, "cup", 142), ["fındık", "fındık içi", "bütün fındık"], ["hazelnuts", "hazelnut"], { note: "whole" }],
  ["almonds", "badem", "almonds", ka(1, "cup", 142), ["badem", "çiğ badem", "bütün badem"], ["almonds", "whole almonds"], { note: "whole" }],
  ["sliced_almonds", "dilimlenmiş badem", "sliced almonds", ka(0.5, "cup", 43),
    ["dilimlenmiş badem", "badem dilimi"], ["sliced almonds", "flaked almonds"]],
  ["pistachios", "antep fıstığı", "pistachios", ka(0.5, "cup", 60), ["antep fıstığı", "antep fıstığı içi"], ["pistachios", "pistachio"]],
  ["cashews", "kaju", "cashews", ka(1, "cup", 113), ["kaju"], ["cashews", "cashew"]],
  ["pecans", "pekan cevizi", "pecans", ka(1, "cup", 105), ["pekan cevizi"], ["pecans", "pecan"]],
  ["peanut_butter", "fıstık ezmesi", "peanut butter", ka(0.5, "cup", 135), ["fıstık ezmesi"], ["peanut butter"]],
  ["sesame", "susam", "sesame seeds", ka(0.5, "cup", 71), ["susam"], ["sesame seeds", "sesame"]],
  ["tahini", "tahin", "tahini", ka(0.5, "cup", 128), ["tahin"], ["tahini"]],
  ["poppy_seeds", "haşhaş tohumu", "poppy seeds", ka(2, "tbsp", 18), ["haşhaş tohumu", "haşhaş"], ["poppy seeds"]],
  ["flaxseed", "keten tohumu", "flaxseed", ka(0.25, "cup", 35), ["keten tohumu"], ["flaxseed", "flax seeds", "linseed"]],
  ["chia", "chia tohumu", "chia seeds", ka(0.25, "cup", 37), ["chia tohumu", "chia"], ["chia seeds", "chia"]],
  ["raisins", "kuru üzüm", "raisins", ka(1, "cup", 149), ["kuru üzüm"], ["raisins", "sultanas"]],
  ["dates", "hurma", "dates", ka(1, "cup", 149), ["hurma", "doğranmış hurma"], ["dates", "chopped dates"], { note: "chopped" }],
  ["dried_apricots", "kuru kayısı", "dried apricots", ka(0.5, "cup", 64), ["kuru kayısı"], ["dried apricots"], { note: "diced" }],
  ["chocolate_chips", "damla çikolata", "chocolate chips", ka(1, "cup", 170),
    ["damla çikolata", "çikolata parçaları"], ["chocolate chips", "chocolate chunks", "white chocolate chips"]],
  ["coconut", "hindistan cevizi", "shredded coconut", ka(1, "cup", 53),
    ["hindistan cevizi", "rendelenmiş hindistan cevizi"], ["shredded coconut", "desiccated coconut", "coconut"],
    { note: "unsweetened" }],

  // Fruit and vegetables
  ["onion", "soğan", "onion", ka(1, "cup", 142), ["soğan", "doğranmış soğan", "kuru soğan"], ["onion", "onions", "diced onion", "chopped onion"],
    { note: "diced" }],
  ["mashed_banana", "muz püresi", "mashed banana", ka(1, "cup", 227), ["muz püresi", "ezilmiş muz"], ["mashed banana", "mashed bananas", "banana puree"]],
  ["pumpkin_puree", "balkabağı püresi", "pumpkin purée", ka(1, "cup", 227), ["balkabağı püresi", "bal kabağı püresi"], ["pumpkin puree", "pumpkin purée"]],
  ["applesauce", "elma püresi", "applesauce", ka(1, "cup", 255), ["elma püresi"], ["applesauce", "apple sauce"]],
  ["mashed_potato", "patates püresi", "mashed potatoes", ka(1, "cup", 213), ["patates püresi"], ["mashed potatoes", "mashed potato"]],

  // Counted
  ["egg", "yumurta", "egg", null, ["yumurta"], ["egg", "eggs", "large egg", "large eggs"], { each: 50, eachSource: "ka" }],
  ["egg_white", "yumurta beyazı", "egg white", null, ["yumurta beyazı", "yumurta akı"], ["egg white", "egg whites"], { each: 32.5, eachSource: "ka" }],
  ["egg_yolk", "yumurta sarısı", "egg yolk", null, ["yumurta sarısı"], ["egg yolk", "egg yolks"], { each: 14, eachSource: "ka" }],

  // Deliberately unknown: block a wrong match with a similar, much denser or lighter ingredient
  ["kosher_salt", "koşer tuzu", "kosher salt", null, ["koşer tuzu"], ["kosher salt"]],
  ["coarse_salt", "kaya tuzu", "coarse salt", null, ["kaya tuzu", "deniz tuzu", "iri tuz"], ["sea salt", "coarse salt", "flaky salt"]],
  ["peanuts", "yer fıstığı", "peanuts", null, ["yer fıstığı", "fıstık"], ["peanuts"]],
  ["pine_nuts", "çam fıstığı", "pine nuts", null, ["çam fıstığı", "dolmalık fıstık"], ["pine nuts"]],
  ["fresh_yeast", "yaş maya", "fresh yeast", null, ["yaş maya"], ["fresh yeast", "cake yeast"]],
  ["vanillin", "vanilin", "vanilla sugar", null, ["vanilin", "vanilya şekeri", "toz vanilya"], ["vanilla sugar", "vanilla powder"]],
  ["strained_yogurt", "süzme yoğurt", "strained yogurt", null, ["süzme yoğurt"], ["greek yogurt", "strained yogurt"]],
];

export const INGREDIENTS = RAW.map(([id, tr, en, ref, aliasesTr, aliasesEn, extra = {}]) => {
  const gPerMl = ref ? ref.g / (ref.qty * VOLUME_UNITS[ref.unit]) : null;
  return {
    id,
    name: { tr, en },
    aliases: [...aliasesTr, ...aliasesEn],
    ref,
    gPerMl,
    liquid: Boolean(extra.liquid),
    each: extra.each ?? null,
    eachSource: extra.eachSource ?? null,
    note: extra.note ?? null,
  };
});

export function ingredientById(id) {
  return INGREDIENTS.find((i) => i.id === id);
}
