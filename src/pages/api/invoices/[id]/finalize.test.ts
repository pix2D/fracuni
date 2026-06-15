import { describe, expect, it } from "vitest";
import { POST } from "@/pages/api/invoices/[id]/finalize";
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

describe("POST /api/invoices/:id/finalize", () => {
  it("finalizes a complete draft and returns the document number", async () => {
    const { company, location, paymentMethod, client } = await setup();
    const invoice = await createInvoice({
      companyId: company.id,
      clientId: client.id,
      locationId: location.id,
      paymentMethodId: paymentMethod.id,
      currency: "EUR",
      issueDate: "2026-06-15",
      lineItems: [{ descriptionHr: "Usluga", quantity: 1, unitPrice: 100 }],
    });

    const response = await POST(apiContext({ params: { id: String(invoice.id) } }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("finalized");
    expect(body.documentNumber).toBe("1/1/1");
  });

  it("returns 400 when required fields are missing", async () => {
    const { company } = await setup();
    const invoice = await createInvoice({ companyId: company.id });

    const response = await POST(apiContext({ params: { id: String(invoice.id) } }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.missingFields).toContain("Client");
    expect((await getInvoice(invoice.id))!.status).toBe("draft");
  });

  it("returns 409 when finalizing an already-finalized invoice", async () => {
    const { company, location, paymentMethod, client } = await setup();
    const invoice = await createInvoice({
      companyId: company.id,
      clientId: client.id,
      locationId: location.id,
      paymentMethodId: paymentMethod.id,
      currency: "EUR",
      issueDate: "2026-06-15",
      lineItems: [{ descriptionHr: "Usluga", quantity: 1, unitPrice: 100 }],
    });
    await POST(apiContext({ params: { id: String(invoice.id) } }));

    const response = await POST(apiContext({ params: { id: String(invoice.id) } }));
    expect(response.status).toBe(409);
  });

  it("returns 400 for an invalid id", async () => {
    const response = await POST(apiContext({ params: { id: "abc" } }));
    expect(response.status).toBe(400);
  });
});
