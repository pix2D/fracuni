import { describe, it, expect } from "vitest";
import {
  lineItemAmount,
  sumAmounts,
  calculateVat,
  total,
  eurEquivalent,
  formatMoney,
  formatMoneyWithCurrency,
  exchangeRateText,
  subtractMoney,
  moneyFromSmallestUnit,
  toSmallestUnit,
} from "@/lib/currency";

describe("lineItemAmount", () => {
  it("calculates quantity × unit price for EUR", () => {
    const amount = lineItemAmount(2, 100.5, "EUR");
    expect(formatMoney(amount)).toBe("201,00");
  });

  it("handles fractional quantities", () => {
    const amount = lineItemAmount(1.5, 200, "EUR");
    expect(formatMoney(amount)).toBe("300,00");
  });

  it("handles fractional quantity and price", () => {
    const amount = lineItemAmount(2.5, 33.33, "EUR");
    expect(formatMoney(amount)).toBe("83,33");
  });
});

describe("sumAmounts", () => {
  it("sums multiple line items into subtotal", () => {
    const a = lineItemAmount(1, 100, "EUR");
    const b = lineItemAmount(2, 50, "EUR");
    const c = lineItemAmount(1, 25.5, "EUR");
    const sub = sumAmounts([a, b, c]);
    expect(formatMoney(sub)).toBe("225,50");
  });
});

describe("calculateVat", () => {
  it("calculates 25% VAT on subtotal", () => {
    const sub = lineItemAmount(1, 1000, "EUR");
    const vat = calculateVat(sub, 25);
    expect(formatMoney(vat)).toBe("250,00");
  });

  it("rounds VAT correctly", () => {
    const sub = lineItemAmount(1, 33.33, "EUR");
    const vat = calculateVat(sub, 25);
    expect(formatMoney(vat)).toBe("8,33");
  });
});

describe("total", () => {
  it("adds subtotal and VAT", () => {
    const sub = lineItemAmount(1, 1000, "EUR");
    const vat = calculateVat(sub, 25);
    const tot = total(sub, vat);
    expect(formatMoney(tot)).toBe("1.250,00");
  });
});

describe("eurEquivalent", () => {
  it("converts USD amount to EUR using exchange rate", () => {
    const amount = lineItemAmount(1, 1000, "USD");
    // rate: 1 EUR = 0.925 USD → to get EUR, divide by 0.925
    // 1000 USD / 0.925 = 1081.08 EUR
    const eur = eurEquivalent(amount, 0.925);
    expect(formatMoney(eur)).toBe("1.081,08");
  });

  it("converts HUF amount to EUR", () => {
    const amount = lineItemAmount(1, 40000, "HUF");
    // rate: 1 EUR = 395.5 HUF → 40000 / 395.5 = 101.14 EUR
    const eur = eurEquivalent(amount, 395.5);
    expect(formatMoney(eur)).toBe("101,14");
  });
});

describe("formatMoneyWithCurrency", () => {
  it("appends currency code", () => {
    const amount = lineItemAmount(1, 1234.56, "EUR");
    expect(formatMoneyWithCurrency(amount)).toBe("1.234,56 EUR");
  });

  it("works with HUF (zero-decimal)", () => {
    const amount = lineItemAmount(1, 40000, "HUF");
    expect(formatMoneyWithCurrency(amount)).toBe("40.000 HUF");
  });
});

describe("zero-decimal currencies", () => {
  it("HUF has no decimal places", () => {
    const amount = lineItemAmount(3, 5000, "HUF");
    expect(formatMoney(amount)).toBe("15.000");
  });

  it("ISK has no decimal places", () => {
    const amount = lineItemAmount(2, 15000, "ISK");
    expect(formatMoney(amount)).toBe("30.000");
  });

  it("HUF arithmetic is correct for large amounts", () => {
    const a = lineItemAmount(1, 150000, "HUF");
    const b = lineItemAmount(1, 250000, "HUF");
    const sub = sumAmounts([a, b]);
    const vat = calculateVat(sub, 25);
    const tot = total(sub, vat);
    expect(formatMoney(sub)).toBe("400.000");
    expect(formatMoney(vat)).toBe("100.000");
    expect(formatMoney(tot)).toBe("500.000");
  });
});

describe("exchangeRateText", () => {
  it("generates Croatian text", () => {
    const text = exchangeRateText(0.925, "USD", "hr");
    expect(text).toBe(
      "Tečaj na dan izdavanja računa iznosi 1 EUR = 0,925000 USD",
    );
  });

  it("generates English text", () => {
    const text = exchangeRateText(0.925, "USD", "en");
    expect(text).toBe(
      "The exchange rate on the issue date is 1 EUR = 0,925000 USD",
    );
  });

  it("formats rate with 6 decimals for HUF", () => {
    const text = exchangeRateText(395.5, "HUF", "hr");
    expect(text).toBe(
      "Tečaj na dan izdavanja računa iznosi 1 EUR = 395,500000 HUF",
    );
  });
});

describe("toSmallestUnit", () => {
  it("extracts integer for database storage", () => {
    const amount = lineItemAmount(2.5, 33.33, "EUR");
    expect(toSmallestUnit(amount)).toBe(8333);
  });

  it("extracts integer for zero-decimal currency", () => {
    const amount = lineItemAmount(1, 40000, "HUF");
    expect(toSmallestUnit(amount)).toBe(40000);
  });
});

describe("money (from smallest unit)", () => {
  it("creates a Money from smallest-unit integer", () => {
    const amount = moneyFromSmallestUnit(12345, "EUR");
    expect(formatMoney(amount)).toBe("123,45");
  });

  it("creates zero-decimal Money from smallest-unit integer", () => {
    const amount = moneyFromSmallestUnit(5000, "HUF");
    expect(formatMoney(amount)).toBe("5.000");
  });
});

describe("EU formatting edge cases", () => {
  it("formats zero correctly", () => {
    const amount = lineItemAmount(0, 100, "EUR");
    expect(formatMoney(amount)).toBe("0,00");
  });

  it("formats very small amounts", () => {
    const amount = lineItemAmount(1, 0.01, "EUR");
    expect(formatMoney(amount)).toBe("0,01");
  });

  it("formats large amounts with thousands separators", () => {
    const amount = lineItemAmount(1, 1234567.89, "EUR");
    expect(formatMoney(amount)).toBe("1.234.567,89");
  });

  it("formats millions correctly", () => {
    const amount = lineItemAmount(100, 99999.99, "EUR");
    expect(formatMoney(amount)).toBe("9.999.999,00");
  });

  it("formats negative amounts (for credit notes)", () => {
    const a = lineItemAmount(1, 100, "EUR");
    const b = lineItemAmount(1, 200, "EUR");
    const diff = subtractMoney(a, b);
    expect(formatMoney(diff)).toBe("-100,00");
  });
});
