import { describe, expect, it } from "vitest";
import { GET, PUT, DELETE } from "@/pages/api/offers/[id]";
import { createCompany, createLocation, createPaymentMethod } from "@/lib/companies";
import { createClient } from "@/lib/clients";
import { finalizeOffer } from "@/lib/document-engine";
import { createOffer, getOffer } from "@/lib/offers";
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

async function draftOffer() {
  const company = await createCompany(COMPANY_INPUT);
  const location = await createLocation(company.id, { number: 1, nameHr: "Zagreb", isDefault: true });
  const paymentMethod = await createPaymentMethod(company.id, {
    number: 1,
    nameHr: "Transakcijski račun",
    isDefault: true,
  });
  const client = await createClient({ name: "Domaći d.o.o.", clientType: "business", country: "HR", oib: "98765432109" });

  return createOffer({
    companyId: company.id,
    clientId: client.id,
    locationId: location.id,
    paymentMethodId: paymentMethod.id,
    currency: "EUR",
    issueDate: "2026-06-15",
    dueDate: "2026-07-15",
    notesHr: "Original",
    lineItems: [{ descriptionHr: "Usluga", quantity: 1, unitPrice: 100 }],
  });
}

function putRequest(id: number, body: unknown): Request {
  return new Request(`http://test.local/api/offers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/offers/:id", () => {
  it("returns an offer with line items", async () => {
    const offer = await draftOffer();

    const response = await GET(apiContext({ params: { id: String(offer.id) } }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(offer.id);
    expect(body.type).toBe("offer");
    expect(body.lineItems).toHaveLength(1);
  });
});

describe("PUT /api/offers/:id", () => {
  it("updates a draft offer", async () => {
    const offer = await draftOffer();

    const response = await PUT(apiContext({
      params: { id: String(offer.id) },
      request: putRequest(offer.id, { notesHr: "Updated" }),
    }));

    expect(response.status).toBe(200);
    expect((await getOffer(offer.id))!.notesHr).toBe("Updated");
  });

  it("returns 409 when updating a Finalized offer", async () => {
    const finalized = await finalizeOffer((await draftOffer()).id);

    const response = await PUT(apiContext({
      params: { id: String(finalized.id) },
      request: putRequest(finalized.id, { notesHr: "Corrected" }),
    }));

    expect(response.status).toBe(409);
    expect((await getOffer(finalized.id))!.notesHr).toBe("Original");
  });
});

describe("DELETE /api/offers/:id", () => {
  it("deletes a draft offer", async () => {
    const offer = await draftOffer();

    const response = await DELETE(apiContext({ params: { id: String(offer.id) } }));

    expect(response.status).toBe(204);
    expect(await getOffer(offer.id)).toBeNull();
  });

  it("returns 409 when deleting a Finalized offer", async () => {
    const finalized = await finalizeOffer((await draftOffer()).id);

    const response = await DELETE(apiContext({ params: { id: String(finalized.id) } }));

    expect(response.status).toBe(409);
    expect(await getOffer(finalized.id)).not.toBeNull();
  });
});
