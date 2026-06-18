import { describe, expect, it } from "vitest";
import { GET, POST } from "@/pages/api/offers/index";
import { createOffer } from "@/lib/offers";
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

describe("GET /api/offers", () => {
  it("lists only offers for the company (not invoices)", async () => {
    const company = await createCompany(COMPANY_INPUT);
    await createOffer({ companyId: company.id });
    await createInvoice({ companyId: company.id });

    const response = await GET(apiContext({
      request: new Request(`http://test.local/api/offers?companyId=${company.id}`),
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0].type).toBe("offer");
  });

  it("returns 400 for an invalid companyId", async () => {
    const response = await GET(apiContext({
      request: new Request("http://test.local/api/offers?companyId=abc"),
    }));
    expect(response.status).toBe(400);
  });
});

describe("POST /api/offers", () => {
  it("creates a draft offer", async () => {
    const company = await createCompany(COMPANY_INPUT);

    const response = await POST(apiContext({
      request: new Request("http://test.local/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.id,
          currency: "EUR",
          issueDate: "2026-06-15",
          dueDate: "2026-07-15",
          lineItems: [{ descriptionHr: "Usluga", quantity: 1, unitPrice: 100 }],
        }),
      }),
    }));

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.status).toBe("draft");
    expect(body.type).toBe("offer");
    expect(body.documentNumber).toBeNull();
    expect(body.lineItems).toHaveLength(1);
  });

  it("returns 400 when companyId is missing", async () => {
    const response = await POST(apiContext({
      request: new Request("http://test.local/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: "EUR" }),
      }),
    }));
    expect(response.status).toBe(400);
  });
});
