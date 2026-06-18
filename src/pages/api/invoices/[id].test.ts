import { describe, expect, it } from "vitest";
import { GET, PUT, DELETE } from "@/pages/api/invoices/[id]";
import { createInvoice, getInvoice } from "@/lib/invoices";
import { finalizeInvoice } from "@/lib/document-engine";
import { createCompany, createLocation, createPaymentMethod } from "@/lib/companies";
import { createClient } from "@/lib/clients";
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

async function finalizedInvoiceId(): Promise<number> {
  const company = await createCompany(COMPANY_INPUT);
  const location = await createLocation(company.id, { number: 1, nameHr: "Zagreb", isDefault: true });
  const paymentMethod = await createPaymentMethod(company.id, {
    number: 1,
    nameHr: "Transakcijski",
    isDefault: true,
  });
  const client = await createClient({ name: "Domaći d.o.o.", country: "HR", oib: "98765432109" });
  const draft = await createInvoice({
    companyId: company.id,
    clientId: client.id,
    locationId: location.id,
    paymentMethodId: paymentMethod.id,
    currency: "EUR",
    issueDate: "2026-06-15",
    notesHr: "Original",
    lineItems: [{ descriptionHr: "Usluga", quantity: 1, unitPrice: 100 }],
  });
  const finalized = await finalizeInvoice(draft.id);
  return finalized.id;
}

function putRequest(id: number, body: unknown): Request {
  return new Request(`http://test.local/api/invoices/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

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

  it("normalizes draft Credit Note line items on update", async () => {
    const company = await createCompany(COMPANY_INPUT);
    const creditNote = await createInvoice({
      companyId: company.id,
      type: "credit_note",
      lineItems: [{ descriptionHr: "Old", quantity: 1, unitPrice: 5 }],
    });

    const response = await PUT(apiContext({
      params: { id: String(creditNote.id) },
      request: putRequest(creditNote.id, {
        lineItems: [{ descriptionHr: "Refund", quantity: -2, unitPrice: 80 }],
      }),
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.lineItems).toHaveLength(1);
    expect(body.lineItems[0]).toMatchObject({
      descriptionHr: "Refund",
      quantity: 2,
      unitPrice: -80,
    });
  });

  it("returns 409 when updating a Finalized invoice", async () => {
    const id = await finalizedInvoiceId();

    const response = await PUT(apiContext({
      params: { id: String(id) },
      request: putRequest(id, { notesHr: "Corrected" }),
    }));

    expect(response.status).toBe(409);
    expect((await getInvoice(id))!.notesHr).toBe("Original");
  });

  it("returns 409 when editing a Sent invoice", async () => {
    const id = await finalizedInvoiceId();
    await getDb().updateTable("invoices").set({ status: "sent" }).where("id", "=", id).execute();

    const response = await PUT(apiContext({
      params: { id: String(id) },
      request: putRequest(id, { notesHr: "nope" }),
    }));

    expect(response.status).toBe(409);
    expect((await getInvoice(id))!.notesHr).toBe("Original");
  });

  it("returns 409 when editing a Paid invoice", async () => {
    const id = await finalizedInvoiceId();
    await getDb().updateTable("invoices").set({ status: "paid" }).where("id", "=", id).execute();

    const response = await PUT(apiContext({
      params: { id: String(id) },
      request: putRequest(id, { notesHr: "nope" }),
    }));

    expect(response.status).toBe(409);
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
