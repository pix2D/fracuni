import { describe, expect, it } from "vitest";
import { GET, PUT, DELETE } from "@/pages/api/invoices/[id]";
import { createInvoice, getInvoice } from "@/lib/invoices";
import { createCompany } from "@/lib/companies";
import { getDb } from "@/lib/db";
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

describe("GET /api/invoices/:id", () => {
  it("returns an invoice with line items", async () => {
    const company = await createCompany(COMPANY_INPUT);
    const invoice = await createInvoice({
      companyId: company.id,
      lineItems: [{ descriptionHr: "X", quantity: 1, unitPrice: 5 }],
    });

    const response = await GET(apiContext({ params: { id: String(invoice.id) } }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(invoice.id);
    expect(body.lineItems).toHaveLength(1);
  });

  it("returns 404 for a missing invoice", async () => {
    const response = await GET(apiContext({ params: { id: "9999" } }));
    expect(response.status).toBe(404);
  });

  it("returns 400 for an invalid id", async () => {
    const response = await GET(apiContext({ params: { id: "abc" } }));
    expect(response.status).toBe(400);
  });
});

describe("PUT /api/invoices/:id", () => {
  it("updates fields and replaces line items", async () => {
    const company = await createCompany(COMPANY_INPUT);
    const invoice = await createInvoice({
      companyId: company.id,
      lineItems: [{ descriptionHr: "Old", quantity: 1, unitPrice: 5 }],
    });

    const response = await PUT(apiContext({
      params: { id: String(invoice.id) },
      request: new Request(`http://test.local/api/invoices/${invoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency: "USD",
          lineItems: [{ descriptionHr: "New", quantity: 2, unitPrice: 10 }],
        }),
      }),
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.currency).toBe("USD");
    expect(body.lineItems).toHaveLength(1);
    expect(body.lineItems[0].descriptionHr).toBe("New");
  });

  it("returns 404 when updating a missing invoice", async () => {
    const response = await PUT(apiContext({
      params: { id: "9999" },
      request: new Request("http://test.local/api/invoices/9999", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: "EUR" }),
      }),
    }));
    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/invoices/:id", () => {
  it("deletes a draft invoice", async () => {
    const company = await createCompany(COMPANY_INPUT);
    const invoice = await createInvoice({ companyId: company.id });

    const response = await DELETE(apiContext({ params: { id: String(invoice.id) } }));
    expect(response.status).toBe(204);
    expect(await getInvoice(invoice.id)).toBeNull();
  });

  it("returns 409 when deleting a non-draft invoice", async () => {
    const company = await createCompany(COMPANY_INPUT);
    const invoice = await createInvoice({ companyId: company.id });
    await getDb().updateTable("invoices").set({ status: "finalized" }).where("id", "=", invoice.id).execute();

    const response = await DELETE(apiContext({ params: { id: String(invoice.id) } }));
    expect(response.status).toBe(409);
  });
});
