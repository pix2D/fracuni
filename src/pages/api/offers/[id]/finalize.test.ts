import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { POST } from "@/pages/api/offers/[id]/finalize";
import { createOffer, getOffer } from "@/lib/offers";
import { createCompany, createLocation, createPaymentMethod } from "@/lib/companies";
import { createClient } from "@/lib/clients";
import { configurePdfGeneration } from "@/lib/pdf-generator";
import { apiContext } from "@/test/api";
import { useMigratedDb } from "@/test/db";

useMigratedDb();

let dataDir: string;

beforeEach(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "fireracuni-offer-route-"));
  configurePdfGeneration({ renderer: async (html) => Buffer.from(html), dataDir });
});

afterEach(async () => {
  configurePdfGeneration({ renderer: null, dataDir: null });
  await fs.rm(dataDir, { recursive: true, force: true });
});

const COMPANY_INPUT = {
  name: "Firefly One d.o.o.",
  address: "Ulica 1, Zagreb",
  phone: "+385 1 234 5678",
  oib: "12345678901",
  iban: "HR1234567890",
  swift: "ZABAHR2X",
  emailFromAddress: "info@firefly.hr",
  emailFromName: "Firefly One",
  issuerName: "Ana Anić",
};

async function draftOffer() {
  const company = await createCompany(COMPANY_INPUT);
  const location = await createLocation(company.id, { number: 1, nameHr: "Zagreb", isDefault: true });
  const paymentMethod = await createPaymentMethod(company.id, {
    number: 1,
    nameHr: "Transakcijski račun",
    isDefault: true,
  });
  const client = await createClient({ name: "Domaći d.o.o.", clientType: "business", country: "HR", oib: "98765432109" });

  return createOffer({
    companyId: company.id,
    clientId: client.id,
    locationId: location.id,
    paymentMethodId: paymentMethod.id,
    currency: "EUR",
    issueDate: "2026-06-15",
    dueDate: "2026-07-15",
    lineItems: [{ descriptionHr: "Usluga", quantity: 1, unitPrice: 100 }],
  });
}

describe("POST /api/offers/:id/finalize", () => {
  it("rolls back Offer finalization when PDF generation fails, then retries with the first number", async () => {
    const offer = await draftOffer();
    configurePdfGeneration({
      renderer: async () => {
        throw new Error("renderer failed");
      },
      dataDir,
    });

    const response = await POST(apiContext({ params: { id: String(offer.id) } }));
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toMatch(/PDF generation failed/);

    const failed = await getOffer(offer.id);
    expect(failed).toMatchObject({
      status: "draft",
      documentNumber: null,
      pdfPathHr: null,
      pdfHashHr: null,
      pdfPathEn: null,
      pdfHashEn: null,
    });

    configurePdfGeneration({ renderer: async (html) => Buffer.from(html), dataDir });
    const retry = await POST(apiContext({ params: { id: String(offer.id) } }));
    expect(retry.status).toBe(200);
    const retried = await retry.json();
    expect(retried.documentNumber).toBe("1");
    expect(retried.pdfHashHr).toMatch(/^[0-9a-f]{64}$/);
  });
});
