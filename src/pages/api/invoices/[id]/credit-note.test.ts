import { describe, expect, it } from "vitest";
import { POST } from "@/pages/api/invoices/[id]/credit-note";
import { createInvoice } from "@/lib/invoices";
import { finalizeInvoice } from "@/lib/document-engine";
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

async function setup() {
  const company = await createCompany(COMPANY_INPUT);
  const location = await createLocation(company.id, { number: 1, nameHr: "Zagreb", isDefault: true });
  const paymentMethod = await createPaymentMethod(company.id, {
    number: 1,
    nameHr: "Transakcijski račun",
    isDefault: true,
  });
  const client = await createClient({ name: "Domaći d.o.o.", country: "HR", oib: "98765432109" });
  return { company, location, paymentMethod, client };
}

async function finalizedInvoice() {
  const { company, location, paymentMethod, client } = await setup();
  const invoice = await createInvoice({
    companyId: company.id,
    clientId: client.id,
    locationId: location.id,
    paymentMethodId: paymentMethod.id,
    currency: "EUR",
    issueDate: "2026-06-15",
    lineItems: [{ descriptionHr: "Usluga", quantity: 2, unitPrice: 150 }],
  });
  return finalizeInvoice(invoice.id);
}

describe("POST /api/invoices/:id/credit-note", () => {
  it("creates a Draft Credit Note from a Finalized Invoice with negated amounts", async () => {
    const source = await finalizedInvoice();

    const response = await POST(apiContext({ params: { id: String(source.id) } }));

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.type).toBe("credit_note");
    expect(body.status).toBe("draft");
    expect(body.documentNumber).toBeNull();
    expect(body.originalInvoiceNumber).toBe("1/1/1");
    expect(body.lineItems[0].unitPrice).toBe(-150);
  });

  it("returns 409 when the source Invoice is still a Draft", async () => {
    const { company, client, location, paymentMethod } = await setup();
    const draft = await createInvoice({
      companyId: company.id,
      clientId: client.id,
      locationId: location.id,
      paymentMethodId: paymentMethod.id,
      currency: "EUR",
      issueDate: "2026-06-15",
      lineItems: [{ descriptionHr: "Usluga", quantity: 1, unitPrice: 100 }],
    });

    const response = await POST(apiContext({ params: { id: String(draft.id) } }));
    expect(response.status).toBe(409);
  });

  it("returns 404 for a non-existent invoice", async () => {
    const response = await POST(apiContext({ params: { id: "9999" } }));
    expect(response.status).toBe(404);
  });

  it("returns 400 for an invalid id", async () => {
    const response = await POST(apiContext({ params: { id: "abc" } }));
    expect(response.status).toBe(400);
  });
});
