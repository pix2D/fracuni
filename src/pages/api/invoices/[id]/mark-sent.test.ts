import { describe, expect, it } from "vitest";
import { POST } from "@/pages/api/invoices/[id]/mark-sent";
import { finalizeInvoice } from "@/lib/document-engine";
import { createInvoice, getInvoice } from "@/lib/invoices";
import { createCompany, createLocation, createPaymentMethod } from "@/lib/companies";
import { createClient } from "@/lib/clients";
import { apiContext } from "@/test/api";
import { useMigratedDb } from "@/test/db";

useMigratedDb();

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

async function draftInvoice() {
  const company = await createCompany(COMPANY_INPUT);
  const location = await createLocation(company.id, { number: 1, nameHr: "Zagreb", isDefault: true });
  const paymentMethod = await createPaymentMethod(company.id, {
    number: 1,
    nameHr: "Transakcijski",
    isDefault: true,
  });
  const client = await createClient({ name: "Domaći d.o.o.", country: "HR", oib: "98765432109" });
  return createInvoice({
    companyId: company.id,
    clientId: client.id,
    locationId: location.id,
    paymentMethodId: paymentMethod.id,
    currency: "EUR",
    issueDate: "2026-06-15",
    lineItems: [{ descriptionHr: "Usluga", quantity: 1, unitPrice: 100 }],
  });
}

describe("POST /api/invoices/:id/mark-sent", () => {
  it("transitions a Finalized invoice to Sent", async () => {
    const draft = await draftInvoice();
    const finalized = await finalizeInvoice(draft.id);

    const response = await POST(apiContext({ params: { id: String(finalized.id) } }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("sent");
    expect((await getInvoice(finalized.id))!.status).toBe("sent");
  });

  it("returns 409 when the invoice is still Draft", async () => {
    const draft = await draftInvoice();

    const response = await POST(apiContext({ params: { id: String(draft.id) } }));

    expect(response.status).toBe(409);
    expect((await getInvoice(draft.id))!.status).toBe("draft");
  });

  it("returns 400 for an invalid id", async () => {
    const response = await POST(apiContext({ params: { id: "abc" } }));
    expect(response.status).toBe(400);
  });
});
