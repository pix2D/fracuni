// Real end-to-end coverage: launches the actual Playwright Chromium and produces
// real PDF bytes. Slower than the fake-renderer pipeline tests, so kept in its
// own file. Chromium is provisioned by the `playwright install chromium`
// postinstall into PLAYWRIGHT_BROWSERS_PATH.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { renderHtmlToPdf } from "@/lib/pdf-renderer";
import { generateInvoicePdfs } from "@/lib/pdf-generator";
import { finalizeInvoice } from "@/lib/document-engine";
import { createInvoice } from "@/lib/invoices";
import { createCompany, createLocation, createPaymentMethod } from "@/lib/companies";
import { createClient } from "@/lib/clients";
import { useMigratedDb } from "@/test/db";

useMigratedDb();

// Chromium launch + render can take a few seconds the first time.
const RENDER_TIMEOUT = 60_000;

let dataDir: string;
beforeEach(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "fireracuni-real-pdf-"));
});
afterEach(async () => {
  await fs.rm(dataDir, { recursive: true, force: true });
});

function isPdf(bytes: Buffer): boolean {
  return bytes.subarray(0, 5).toString("latin1") === "%PDF-";
}

function mockJson(body: unknown): typeof fetch {
  return async () => new Response(JSON.stringify(body), { status: 200 });
}

describe("renderHtmlToPdf (real Chromium)", () => {
  it(
    "renders HTML into a valid PDF document",
    async () => {
      const pdf = await renderHtmlToPdf("<html><body><h1>Račun 1/1/1</h1></body></html>");
      expect(isPdf(pdf)).toBe(true);
      expect(pdf.length).toBeGreaterThan(1000);
    },
    RENDER_TIMEOUT,
  );
});

describe("generateInvoicePdfs (real Chromium, full pipeline)", () => {
  it(
    "writes real Croatian + English PDFs for a foreign client and records matching hashes",
    async () => {
      const company = await createCompany({
        name: "Firefly One d.o.o.",
        address: "Ulica 1, Zagreb",
        phone: "+385 1 234 5678",
        oib: "12345678901",
        iban: "HR1234567890",
        swift: "ZABAHR2X",
        emailFromAddress: "info@firefly.hr",
        emailFromName: "Firefly One",
        issuerName: "Ana Anić",
        legalTextForeignHr: "Prijenos porezne obveze.",
        legalTextForeignEn: "Reverse charge.",
      });
      const location = await createLocation(company.id, { number: 1, nameHr: "Zagreb", isDefault: true });
      const paymentMethod = await createPaymentMethod(company.id, {
        number: 1,
        nameHr: "Transakcijski",
        isDefault: true,
      });
      const client = await createClient({ name: "Acme GmbH", clientType: "business", country: "DE", vatNumber: "DE123456789" });
      const draft = await createInvoice({
        companyId: company.id,
        clientId: client.id,
        locationId: location.id,
        paymentMethodId: paymentMethod.id,
        currency: "EUR",
        issueDate: "2026-06-15",
        lineItems: [{ descriptionHr: "Konzultacije", descriptionEn: "Consulting", quantity: 2, unitPrice: 100 }],
      });
      const finalized = await finalizeInvoice(draft.id, {
        viesFetcher: mockJson({
          valid: true,
          countryCode: "DE",
          vatNumber: "123456789",
          requestDate: "2026-06-15+02:00",
          name: "ACME GMBH",
          address: "BERLIN",
        }),
      });

      // No renderer injected -> uses the real Playwright renderer.
      const result = await generateInvoicePdfs(finalized.id, { dataDir });

      for (const relPath of [result.pdfPathHr!, result.pdfPathEn!]) {
        const bytes = await fs.readFile(path.join(dataDir, relPath));
        expect(isPdf(bytes)).toBe(true);
        expect(bytes.length).toBeGreaterThan(1000);
      }

      const hrBytes = await fs.readFile(path.join(dataDir, result.pdfPathHr!));
      const enBytes = await fs.readFile(path.join(dataDir, result.pdfPathEn!));
      expect(createHash("sha256").update(hrBytes).digest("hex")).toBe(result.pdfHashHr);
      expect(createHash("sha256").update(enBytes).digest("hex")).toBe(result.pdfHashEn);
    },
    RENDER_TIMEOUT,
  );
});
