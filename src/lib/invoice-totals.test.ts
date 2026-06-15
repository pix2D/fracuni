import { describe, it, expect } from "vitest";
import { computeInvoiceTotals } from "@/lib/invoice-totals";
import { formatMoney } from "@/lib/currency";

describe("computeInvoiceTotals", () => {
  it("sums line items into a subtotal", () => {
    const totals = computeInvoiceTotals(
      [
        { quantity: 2, unitPrice: 100 },
        { quantity: 1, unitPrice: 50.5 },
      ],
      "EUR",
      { domestic: false, vatRate: 25 },
    );
    expect(formatMoney(totals.subtotal)).toBe("250,50");
  });

  it("adds 25% PDV for domestic invoices", () => {
    const totals = computeInvoiceTotals(
      [{ quantity: 1, unitPrice: 100 }],
      "EUR",
      { domestic: true, vatRate: 25 },
    );
    expect(formatMoney(totals.subtotal)).toBe("100,00");
    expect(totals.pdv).not.toBeNull();
    expect(formatMoney(totals.pdv!)).toBe("25,00");
    expect(formatMoney(totals.total)).toBe("125,00");
  });

  it("omits PDV for foreign invoices", () => {
    const totals = computeInvoiceTotals(
      [{ quantity: 1, unitPrice: 100 }],
      "EUR",
      { domestic: false, vatRate: 25 },
    );
    expect(totals.pdv).toBeNull();
    expect(formatMoney(totals.total)).toBe("100,00");
  });

  it("returns zero for an empty line item list", () => {
    const totals = computeInvoiceTotals([], "EUR", { domestic: true, vatRate: 25 });
    expect(formatMoney(totals.subtotal)).toBe("0,00");
    expect(formatMoney(totals.total)).toBe("0,00");
  });

  it("handles zero-decimal currencies (HUF)", () => {
    const totals = computeInvoiceTotals(
      [{ quantity: 3, unitPrice: 1000 }],
      "HUF",
      { domestic: false, vatRate: 25 },
    );
    expect(formatMoney(totals.subtotal)).toBe("3.000");
  });
});
