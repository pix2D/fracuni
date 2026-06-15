import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates words", () => {
    expect(slugify("Firefly One d.o.o.")).toBe("firefly-one-d-o-o");
  });

  it("transliterates Croatian diacritics", () => {
    expect(slugify("Šđčćž ŠĐČĆŽ")).toBe("sdccz-sdccz");
  });

  it("strips other accents via NFKD", () => {
    expect(slugify("Café Résumé")).toBe("cafe-resume");
  });

  it("collapses runs of separators and trims edges", () => {
    expect(slugify("  Acme   GmbH & Co. ")).toBe("acme-gmbh-co");
  });

  it("returns an empty string when nothing is slug-safe", () => {
    expect(slugify("—///—")).toBe("");
  });
});
