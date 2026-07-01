import { describe, expect, it } from "vitest";
import { createClient } from "@/lib/clients";
import { createLocation, createPaymentMethod, upsertCompanyProfile } from "@/lib/companies";
import { finalizeInvoice } from "@/lib/document-engine";
import { createInvoice } from "@/lib/invoices";
import { GET, PUT } from "@/pages/api/company/document-number-sequences";
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

async function setup() {
  const company = await upsertCompanyProfile(COMPANY_INPUT);
  const location = await createLocation({ number: 1, nameHr: "Zagreb", isDefault: true });
  const paymentMethod = await createPaymentMethod({
    number: 1,
    nameHr: "Transakcijski račun",
    isDefault: true,
  });
  const cash = await createPaymentMethod({
    number: 2,
    nameHr: "Gotovina",
  });
  const client = await createClient({
    name: "Domaći d.o.o.",
    clientType: "business",
    country: "HR",
    oib: "98765432109",
  });
  return { company, location, paymentMethod, cash, client };
}

function putRequest(body: unknown): Request {
  return new Request("http://test.local/api/company/document-number-sequences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/company/document-number-sequences", () => {
  it("returns current sequence state for every payment method in a year", async () => {
    const { paymentMethod, cash } = await setup();

    const response = await GET(apiContext({
      request: new Request("http://test.local/api/company/document-number-sequences?year=2026"),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject([
      {
        year: 2026,
        paymentMethodId: paymentMethod.id,
        paymentMethodNumber: 1,
        lastValue: 0,
        nextSequence: 1,
        maxIssuedSequence: 0,
      },
      {
        year: 2026,
        paymentMethodId: cash.id,
        paymentMethodNumber: 2,
        lastValue: 0,
        nextSequence: 1,
        maxIssuedSequence: 0,
      },
    ]);
  });

  it("returns 400 for an invalid year", async () => {
    await setup();

    const response = await GET(apiContext({
      request: new Request("http://test.local/api/company/document-number-sequences?year=nope"),
    }));

    expect(response.status).toBe(400);
  });
});

describe("PUT /api/company/document-number-sequences", () => {
  it("sets the next sequence and finalization consumes it", async () => {
    const { location, paymentMethod, client } = await setup();

    const response = await PUT(apiContext({
      request: putRequest({
        year: 2026,
        paymentMethodId: paymentMethod.id,
        nextSequence: 38,
      }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      lastValue: 37,
      nextSequence: 38,
    });

    const invoice = await createInvoice({
      clientId: client.id,
      locationId: location.id,
      paymentMethodId: paymentMethod.id,
      currency: "EUR",
      issueDate: "2026-06-15",
      lineItems: [{ descriptionHr: "Usluga", quantity: 1, unitPrice: 100 }],
    });

    const finalized = await finalizeInvoice(invoice.id);
    expect(finalized.documentNumber).toBe("38/1/1");
  });

  it("keeps payment method sequences independent", async () => {
    const { location, paymentMethod, cash, client } = await setup();

    await PUT(apiContext({
      request: putRequest({ year: 2026, paymentMethodId: cash.id, nextSequence: 10 }),
    }));

    const bankInvoice = await finalizeInvoice((await createInvoice({
      clientId: client.id,
      locationId: location.id,
      paymentMethodId: paymentMethod.id,
      currency: "EUR",
      issueDate: "2026-06-15",
      lineItems: [{ descriptionHr: "Usluga", quantity: 1, unitPrice: 100 }],
    })).id);
    const cashInvoice = await finalizeInvoice((await createInvoice({
      clientId: client.id,
      locationId: location.id,
      paymentMethodId: cash.id,
      currency: "EUR",
      issueDate: "2026-06-15",
      lineItems: [{ descriptionHr: "Usluga", quantity: 1, unitPrice: 100 }],
    })).id);

    expect(bankInvoice.documentNumber).toBe("1/1/1");
    expect(cashInvoice.documentNumber).toBe("10/1/2");
  });

  it("rejects a next sequence that would collide with an issued local document", async () => {
    const { location, paymentMethod, client } = await setup();
    await finalizeInvoice((await createInvoice({
      clientId: client.id,
      locationId: location.id,
      paymentMethodId: paymentMethod.id,
      currency: "EUR",
      issueDate: "2026-06-15",
      lineItems: [{ descriptionHr: "Usluga", quantity: 1, unitPrice: 100 }],
    })).id);

    const response = await PUT(apiContext({
      request: putRequest({
        year: 2026,
        paymentMethodId: paymentMethod.id,
        nextSequence: 1,
      }),
    }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "Next sequence must be greater than the locally issued sequence 1",
    });
  });

  it("rejects an unknown payment method", async () => {
    await setup();

    const response = await PUT(apiContext({
      request: putRequest({
        year: 2026,
        paymentMethodId: 9999,
        nextSequence: 5,
      }),
    }));

    expect(response.status).toBe(404);
  });
});
