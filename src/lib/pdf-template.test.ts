import { describe, it, expect } from "vitest";
import { renderDocumentHtml } from "@/lib/pdf-template";
import type { PdfDocumentData } from "@/lib/pdf-document";

function base(overrides: Partial<PdfDocumentData> = {}): PdfDocumentData {
  return {
    lang: "hr",
    title: "Račun",
    isOffer: false,
    documentNumber: "1/1/1",
    company: {
      name: "Firefly One d.o.o.",
      address: "Ulica 1\n10000 Zagreb",
      taxId: { label: "OIB", value: "12345678901" },
      iban: "HR1234567890",
      swift: "ZABAHR2X",
      phone: "+385 1 234 5678",
      tagline: "Vatreni softver",
      logoDataUri: null,
      issuerName: "Ana Anić",
    },
    client: {
      name: "Domaći d.o.o.",
      address: "Klijentska 5\n21000 Split",
      taxIds: [{ label: "OIB", value: "98765432109" }],
    },
    dates: { issue: "15.06.2026.", delivery: "15.06.2026.", due: "30.06.2026." },
    location: "Zagreb",
    paymentMethod: "Transakcijski račun",
    lineItems: [
      {
        position: 1,
        description: "Konzultacije",
        quantity: "2,00",
        vatPercent: "25",
        unitPrice: "100,00",
        amount: "200,00",
      },
    ],
    totals: {
      subtotal: "200,00",
      vat: { rate: "25", amount: "50,00" },
      total: "250,00",
      currency: "EUR",
      eurEquivalent: null,
    },
    exchangeRateText: null,
    legalText: "Domaći zakonski tekst.",
    notes: null,
    ...overrides,
  };
}

describe("renderDocumentHtml", () => {
  it("renders the title, document number and Croatian column headers", () => {
    const html = renderDocumentHtml(base());
    expect(html).toContain("Račun");
    expect(html).toContain("1/1/1");
    expect(html).toContain("Naziv robe/usluge");
    expect(html).toContain("PDV %");
    expect(html).toContain("Izdavatelj");
    expect(html).toContain("Kupac");
    expect(html).toContain('lang="hr"');
  });

  it("shows the PDV breakdown for a domestic document", () => {
    const html = renderDocumentHtml(base());
    expect(html).toContain("Osnovica");
    expect(html).toContain("PDV (25%)");
    expect(html).toContain("UKUPNO ZA PLATITI");
    expect(html).toContain("250,00");
  });

  it("uses English headers and omits the PDV column for the English copy", () => {
    const html = renderDocumentHtml(
      base({
        lang: "en",
        title: "Invoice",
        totals: { subtotal: "200,00", vat: null, total: "200,00", currency: "EUR", eurEquivalent: null },
        legalText: "Reverse charge.",
      }),
    );
    expect(html).toContain("Service Description");
    expect(html).toContain("Issuer");
    expect(html).toContain("Client");
    expect(html).not.toContain("PDV %");
    expect(html).not.toContain("Osnovica");
    expect(html).toContain("TOTAL");
  });

  it("escapes HTML in user-supplied content", () => {
    const html = renderDocumentHtml(base({ notes: "<script>alert(1)</script>" }));
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("embeds the logo when a data URI is present", () => {
    const html = renderDocumentHtml(
      base({ company: { ...base().company, logoDataUri: "data:image/png;base64,AAA" } }),
    );
    expect(html).toContain('src="data:image/png;base64,AAA"');
  });

  it("renders the exchange-rate text and EUR equivalent when present", () => {
    const html = renderDocumentHtml(
      base({
        totals: { subtotal: "200,00", vat: { rate: "25", amount: "50,00" }, total: "250,00", currency: "USD", eurEquivalent: "230,99" },
        exchangeRateText: "Tečaj na dan izdavanja računa iznosi 1 EUR = 1,082300 USD",
      }),
    );
    expect(html).toContain("1 EUR = 1,082300 USD");
    expect(html).toContain("230,99");
    expect(html).toContain("USD");
  });

  it("renders the notes section only when notes are present", () => {
    expect(renderDocumentHtml(base({ notes: "Hvala!" }))).toContain("Napomena");
    expect(renderDocumentHtml(base({ notes: null }))).not.toContain("Napomena");
  });
});
