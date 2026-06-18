import { describe, expect, it } from "vitest";
import { GET, POST } from "@/pages/api/invoices/index";
import { createInvoice } from "@/lib/invoices";
import { createCompany } from "@/lib/companies";
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

describe("GET /api/invoices", () => {
  it("lists invoices filtered by company", async () => {
    const company = await createCompany(COMPANY_INPUT);
    const other = await createCompany({ ...COMPANY_INPUT, oib: "99999999999" });
    await createInvoice({ companyId: company.id });
    await createInvoice({ companyId: other.id });

    const response = await GET(apiContext({
      request: new Request(`http://test.local/api/invoices?companyId=${company.id}`),
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0].companyId).toBe(company.id);
  });

  it("returns 400 for an invalid companyId", async () => {
    const response = await GET(apiContext({
      request: new Request("http://test.local/api/invoices?companyId=abc"),
    }));
    expect(response.status).toBe(400);
  });
});

describe("POST /api/invoices", () => {
  it("creates a draft invoice with line items", async () => {
    const company = await createCompany(COMPANY_INPUT);

    const response = await POST(apiContext({
      request: new Request("http://test.local/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.id,
          currency: "EUR",
          lineItems: [{ descriptionHr: "Usluga", quantity: 1, unitPrice: 100 }],
        }),
      }),
    }));

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.status).toBe("draft");
    expect(body.type).toBe("invoice");
    expect(body.documentNumber).toBeNull();
    expect(body.lineItems).toHaveLength(1);
  });

  it("creates a draft with only a company (permissive)", async () => {
    const company = await createCompany(COMPANY_INPUT);
    const response = await POST(apiContext({
      request: new Request("http://test.local/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id }),
      }),
    }));
    expect(response.status).toBe(201);
  });

  it("creates a from-scratch Credit Note when type is credit_note", async () => {
    const company = await createCompany(COMPANY_INPUT);

    const response = await POST(apiContext({
      request: new Request("http://test.local/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.id,
          type: "credit_note",
          currency: "EUR",
          lineItems: [{ descriptionHr: "Povrat", quantity: -1, unitPrice: 100 }],
        }),
      }),
    }));

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.type).toBe("credit_note");
    expect(body.status).toBe("draft");
    expect(body.lineItems[0].quantity).toBe(1);
    expect(body.lineItems[0].unitPrice).toBe(-100);
  });

  it("returns 400 when companyId is missing", async () => {
    const response = await POST(apiContext({
      request: new Request("http://test.local/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: "EUR" }),
      }),
    }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    const response = await POST(apiContext({
      request: new Request("http://test.local/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      }),
    }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for a non-existent company", async () => {
    const response = await POST(apiContext({
      request: new Request("http://test.local/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: 9999 }),
      }),
    }));
    expect(response.status).toBe(400);
  });
});
