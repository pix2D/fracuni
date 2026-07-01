import { describe, expect, it } from "vitest";
import { GET, POST } from "@/pages/api/offers/index";
import { createOffer } from "@/lib/offers";
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

describe("GET /api/offers", () => {
  it("lists only offers, not invoices", async () => {
    const offer = await createOffer({});
    await createInvoice({});

    const response = await GET(apiContext({
      request: new Request("http://test.local/api/offers"),
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(offer.id);
    expect(body[0].type).toBe("offer");
  });
});

describe("POST /api/offers", () => {
  it("creates a draft offer", async () => {
    await setupCompanyProfile();

    const response = await POST(apiContext({
      request: new Request("http://test.local/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

  it("returns 400 for a non-existent setting reference", async () => {
    await setupCompanyProfile();

    const response = await POST(apiContext({
      request: new Request("http://test.local/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: 9999 }),
      }),
    }));
    expect(response.status).toBe(400);
  });

  it("returns 409 when the company profile is missing", async () => {
    const response = await POST(apiContext({
      request: new Request("http://test.local/api/offers", {
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
});
