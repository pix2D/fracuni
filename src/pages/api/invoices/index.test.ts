import { describe, expect, it } from "vitest";
import { GET, POST } from "@/pages/api/invoices/index";
import { createInvoice } from "@/lib/invoices";
import { upsertCompanyProfile } from "@/lib/companies";
import { apiContext } from "@/test/api";
import { useMigratedDb } from "@/test/db";

useMigratedDb();

const COMPANY_INPUT = {
  name: "Orion Test Works d.o.o.",
  address: "Ulica 1, Zagreb",
  phone: "+385 1 234 5678",
  oib: "12345678901",
  iban: "HR1234567890",
  swift: "ZABAHR2X",
  emailFromAddress: "info@orion-test-works.test",
  emailFromName: "Orion Test Works",
  issuerName: "Ana Anić",
};

async function setupCompanyProfile() {
  await upsertCompanyProfile(COMPANY_INPUT);
}

describe("GET /api/invoices", () => {
  it("lists invoices", async () => {
    const first = await createInvoice({});
    const second = await createInvoice({});

    const response = await GET(apiContext({
      request: new Request("http://test.local/api/invoices"),
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(2);
    expect(body.map((invoice: { id: number }) => invoice.id)).toEqual([second.id, first.id]);
  });
});

describe("POST /api/invoices", () => {
  it("creates a draft invoice with line items", async () => {
    await setupCompanyProfile();

    const response = await POST(apiContext({
      request: new Request("http://test.local/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

  it("creates a from-scratch Credit Note when type is credit_note", async () => {
    await setupCompanyProfile();

    const response = await POST(apiContext({
      request: new Request("http://test.local/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

  it("creates a draft without any references", async () => {
    await setupCompanyProfile();

    const response = await POST(apiContext({
      request: new Request("http://test.local/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: "EUR" }),
      }),
    }));
    expect(response.status).toBe(201);
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

  it("returns 409 when the company profile is missing", async () => {
    const response = await POST(apiContext({
      request: new Request("http://test.local/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: "EUR" }),
      }),
    }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "Company profile must be set up before creating documents",
    });
  });

  it("returns 400 for a non-existent setting reference", async () => {
    await setupCompanyProfile();

    const response = await POST(apiContext({
      request: new Request("http://test.local/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: 9999 }),
      }),
    }));
    expect(response.status).toBe(400);
  });
});
