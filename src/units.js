// Measurement units. Volumes in millilitres, masses in grams.
//
// Turkish kitchen measures are not standardised: sources give 200 or 250 ml for a "su bardağı"
// and 5 or 10 ml for a "tatlı kaşığı". Those two are settings (see DEFAULT_SETTINGS); the rest
// follow the most common published values. US measures are the legal US customary definitions.

export const US_CUP_ML = 236.5882365;
export const US_TBSP_ML = US_CUP_ML / 16;
export const US_TSP_ML = US_CUP_ML / 48;

export const DEFAULT_SETTINGS = Object.freeze({
  suBardagiMl: 200,
  tatliKasigiMl: 10,
});

// kind: "volume" | "mass" | "count" | "kept" (recognised, scaled, but never converted)
// system: "tr" | "us" | "metric" | "imperial"
export const UNITS = [
  // Turkish
  { id: "su_bardagi", kind: "volume", system: "tr", ml: (s) => s.suBardagiMl,
    aliases: ["su bardağı", "su bardagi", "su bardak", "bardak", "su b."],
    label: { tr: ["su bardağı", "su bardağı"], en: ["Turkish cup", "Turkish cups"] } },
  { id: "cay_bardagi", kind: "volume", system: "tr", ml: () => 100,
    aliases: ["çay bardağı", "cay bardagi", "çay bardak"],
    label: { tr: ["çay bardağı", "çay bardağı"], en: ["tea glass", "tea glasses"] } },
  { id: "kahve_fincani", kind: "volume", system: "tr", ml: () => 75,
    aliases: ["kahve fincanı", "kahve fincani", "fincan"],
    label: { tr: ["kahve fincanı", "kahve fincanı"], en: ["coffee cup", "coffee cups"] } },
  { id: "yemek_kasigi", kind: "volume", system: "tr", ml: () => 15,
    aliases: ["yemek kaşığı", "yemek kasigi", "y.k.", "yk"],
    label: { tr: ["yemek kaşığı", "yemek kaşığı"], en: ["tablespoon", "tablespoons"] } },
  { id: "tatli_kasigi", kind: "volume", system: "tr", ml: (s) => s.tatliKasigiMl,
    aliases: ["tatlı kaşığı", "tatli kasigi", "t.k."],
    label: { tr: ["tatlı kaşığı", "tatlı kaşığı"], en: ["dessert spoon", "dessert spoons"] } },
  { id: "cay_kasigi", kind: "volume", system: "tr", ml: () => 5,
    aliases: ["çay kaşığı", "cay kasigi", "ç.k.", "çk"],
    label: { tr: ["çay kaşığı", "çay kaşığı"], en: ["teaspoon", "teaspoons"] } },

  // US customary
  { id: "cup", kind: "volume", system: "us", ml: () => US_CUP_ML,
    aliases: ["cups", "cup", "c."],
    label: { tr: ["cup", "cup"], en: ["cup", "cups"] } },
  { id: "tbsp", kind: "volume", system: "us", ml: () => US_TBSP_ML,
    aliases: ["tablespoons", "tablespoon", "tbsps", "tbsp", "tbs", "tbl", "T"],
    label: { tr: ["tbsp", "tbsp"], en: ["tbsp", "tbsp"] } },
  { id: "tsp", kind: "volume", system: "us", ml: () => US_TSP_ML,
    aliases: ["teaspoons", "teaspoon", "tsps", "tsp", "t"],
    label: { tr: ["tsp", "tsp"], en: ["tsp", "tsp"] } },
  { id: "fl_oz", kind: "volume", system: "us", ml: () => US_CUP_ML / 8,
    aliases: ["fluid ounces", "fluid ounce", "fl. oz.", "fl. oz", "fl oz", "floz"],
    label: { tr: ["fl oz", "fl oz"], en: ["fl oz", "fl oz"] } },

  // Metric
  { id: "ml", kind: "volume", system: "metric", ml: () => 1,
    aliases: ["millilitres", "milliliters", "millilitre", "milliliter", "mililitre", "ml", "cc"],
    label: { tr: ["ml", "ml"], en: ["ml", "ml"] } },
  { id: "cl", kind: "volume", system: "metric", ml: () => 10,
    aliases: ["santilitre", "centilitre", "centiliter", "cl"],
    label: { tr: ["cl", "cl"], en: ["cl", "cl"] } },
  { id: "dl", kind: "volume", system: "metric", ml: () => 100,
    aliases: ["desilitre", "decilitre", "deciliter", "dl"],
    label: { tr: ["dl", "dl"], en: ["dl", "dl"] } },
  { id: "l", kind: "volume", system: "metric", ml: () => 1000,
    aliases: ["litres", "liters", "litre", "liter", "litre", "lt", "l"],
    label: { tr: ["litre", "litre"], en: ["l", "l"] } },
  { id: "g", kind: "mass", system: "metric", g: 1,
    aliases: ["grams", "gram", "grammes", "gramme", "gr", "g"],
    label: { tr: ["g", "g"], en: ["g", "g"] } },
  { id: "kg", kind: "mass", system: "metric", g: 1000,
    aliases: ["kilograms", "kilogram", "kilo", "kg"],
    label: { tr: ["kg", "kg"], en: ["kg", "kg"] } },

  // Imperial / US mass
  { id: "oz", kind: "mass", system: "imperial", g: 28.349523125,
    aliases: ["ounces", "ounce", "oz"],
    label: { tr: ["oz", "oz"], en: ["oz", "oz"] } },
  { id: "lb", kind: "mass", system: "imperial", g: 453.59237,
    aliases: ["pounds", "pound", "lbs", "lb"],
    label: { tr: ["lb", "lb"], en: ["lb", "lb"] } },

  // Counted
  { id: "piece", kind: "count", system: "any",
    aliases: ["adet", "tane", "pieces", "piece", "pcs"],
    label: { tr: ["adet", "adet"], en: ["", ""] } },

  // Recognised but not convertible: scaled, unit kept as written
  { id: "kept", kind: "kept", system: "any",
    aliases: ["tutam", "pinch", "pinches", "paket", "packet", "packets", "sachet", "demet", "bunch",
      "diş", "dis", "clove", "cloves", "dilim", "slice", "slices", "avuç", "avuc", "handful",
      "kutu", "can", "cans", "kase", "dash", "sprig", "dal", "yaprak"],
    label: null },
];

// Words that may sit between the quantity and the unit: "1 tepeleme yemek kaşığı".
export const MODIFIERS = {
  heaped: ["tepeleme", "dolu", "heaped", "heaping", "rounded", "generous"],
  level: ["silme", "level", "scant"],
};

export function unitById(id) {
  return UNITS.find((u) => u.id === id);
}

export function unitMl(unit, settings) {
  return unit.ml(settings);
}
