// Text helpers. `fold` lower-cases and strips Turkish diacritics one character at a time, so the
// folded string has exactly the same length as the original and match positions line up.

const FOLD = {
  ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", I: "i", İ: "i", ö: "o", Ö: "o", ş: "s", Ş: "s",
  ü: "u", Ü: "u", â: "a", Â: "a", î: "i", Î: "i", û: "u", Û: "u", é: "e", É: "e", "’": "'", "‘": "'",
};

export function fold(text) {
  let out = "";
  for (const ch of text) {
    if (FOLD[ch] !== undefined) {
      out += FOLD[ch];
      continue;
    }
    const lower = ch.toLowerCase();
    out += lower.length === ch.length ? lower : ch;
  }
  return out;
}

export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Turkish words take suffixes ("un" -> "unu", "şeker" -> "şekeri", "su" -> "suyu"). After folding,
// these are the short possessive/accusative endings worth accepting; longer ones are rare in recipes.
export const TR_SUFFIX = "(?:[iu]|n[iu]|s[iu]|y[iu])?";

// Word boundary that also works next to folded Turkish letters (all ASCII after folding).
export const WB_START = "(?<![a-z0-9])";
export const WB_END = "(?![a-z0-9])";
