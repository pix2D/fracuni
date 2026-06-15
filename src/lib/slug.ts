// URL/filename-safe slugs for Company and Client names. Used to build the PDF
// storage path (`{company-slug}/{year}/{month}/{number}-{client-slug}.pdf`).
//
// Croatian-specific letters (č ć ž š đ) don't all decompose under NFKD — đ in
// particular has no canonical decomposition — so they are transliterated
// explicitly before the generic accent-stripping pass.
const CROATIAN_MAP: Record<string, string> = {
  č: "c",
  ć: "c",
  ž: "z",
  š: "s",
  đ: "d",
};

// Combining diacritical marks left behind after NFKD decomposition (é → e + ´).
const COMBINING_MARKS = /[̀-ͯ]/g;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[čćžšđ]/g, (ch) => CROATIAN_MAP[ch] ?? ch)
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
