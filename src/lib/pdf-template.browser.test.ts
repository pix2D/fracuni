// Browser-mode tests: render the PDF template's real HTML/CSS in headless
// Chromium (Playwright provider) and assert on the resulting DOM, computed
// styles, and layout geometry — things a string-matching test can't see. Runs
// in the "browser" Vitest project (see vitest.config.ts).
import { describe, it, expect, afterEach } from "vitest";
import { renderDocumentHtml } from "@/lib/pdf-template";
import type { PdfDocumentData } from "@/lib/pdf-document";

function hrData(overrides: Partial<PdfDocumentData> = {}): PdfDocumentData {
  return {
    lang: "hr",
    title: "Račun",
    isOffer: false,
    documentNumber: "1/1/1",
    company: {
      name: "Firefly One d.o.o.",
      address: "Ulica 1\n10000 Zagreb",
      oib: "12345678901",
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
      { position: 1, description: "Konzultacije", quantity: "2,00", vatPercent: "25", unitPrice: "100,00", amount: "200,00" },
    ],
    totals: { subtotal: "200,00", vat: { rate: "25", amount: "50,00" }, total: "250,00", currency: "EUR", eurEquivalent: null },
    exchangeRateText: null,
    legalText: "Domaći zakonski tekst.",
    notes: "Hvala na povjerenju!",
    ...overrides,
  };
}

const frames: HTMLIFrameElement[] = [];

async function render(data: PdfDocumentData): Promise<Document> {
  const iframe = document.createElement("iframe");
  iframe.width = "820";
  iframe.height = "1160";
  document.body.appendChild(iframe);
  frames.push(iframe);
  const loaded = new Promise<void>((resolve) => {
    iframe.addEventListener("load", () => resolve(), { once: true });
  });
  iframe.srcdoc = renderDocumentHtml(data);
  await loaded;
  return iframe.contentDocument!;
}

afterEach(() => {
  while (frames.length) frames.pop()!.remove();
});

describe("PDF template (rendered in Chromium)", () => {
  it("renders the title, document number and notes into the DOM", async () => {
    const doc = await render(hrData());
    expect(doc.querySelector(".doc-title")?.textContent).toBe("Račun");
    expect(doc.querySelector(".doc-number")?.textContent).toBe("1/1/1");
    expect(doc.querySelector(".notes")?.textContent).toContain("Hvala na povjerenju!");
  });

  it("applies the stylesheet (the bank bar has its grey background)", async () => {
    const doc = await render(hrData());
    const bar = doc.querySelector(".bank-bar")!;
    const bg = doc.defaultView!.getComputedStyle(bar).backgroundColor;
    // #f3f4f6 -> rgb(243, 244, 246); proves the inline <style> actually applied.
    expect(bg).toBe("rgb(243, 244, 246)");
  });

  it("lays out the title to the right of the brand (flex header)", async () => {
    const doc = await render(hrData());
    const brand = doc.querySelector(".brand")!.getBoundingClientRect();
    const meta = doc.querySelector(".doc-meta")!.getBoundingClientRect();
    expect(meta.left).toBeGreaterThan(brand.right);
  });

  it("shows a PDV % column on the Croatian table", async () => {
    const doc = await render(hrData());
    const headers = [...doc.querySelectorAll("table.items thead th")].map((th) => th.textContent);
    expect(headers).toContain("PDV %");
    expect(headers).toContain("Naziv robe/usluge");
  });

  it("omits the PDV % column on the English copy", async () => {
    const doc = await render(
      hrData({
        lang: "en",
        title: "Invoice",
        lineItems: [
          { position: 1, description: "Consulting", quantity: "2,00", vatPercent: "0", unitPrice: "100,00", amount: "200,00" },
        ],
        totals: { subtotal: "200,00", vat: null, total: "200,00", currency: "EUR", eurEquivalent: null },
        legalText: "Reverse charge.",
      }),
    );
    const headers = [...doc.querySelectorAll("table.items thead th")].map((th) => th.textContent);
    expect(headers).toContain("Service Description");
    expect(headers).not.toContain("PDV %");
    // Reverse-charge English copy shows no PDV breakdown row.
    expect(doc.body.textContent).not.toContain("PDV (");
  });
});
