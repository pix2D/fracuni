import { describe, it, expect } from "vitest";
import { useMigratedDb } from "@/test/db";
import { apiContext } from "@/test/api";
import { GET, PUT } from "@/pages/api/settings";

describe("GET /api/settings", () => {
  useMigratedDb();

  it("returns default settings", async () => {
    const response = await GET(apiContext());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.defaultVatRate).toBe(25.0);
    expect(body.supportedCurrencies).toEqual([
      "EUR", "USD", "CZK", "DKK", "HUF", "ISK", "NOK", "PLN", "RON", "SEK",
    ]);
    expect(body.defaultPaymentTermsDays).toBe(15);
    expect(body.defaultOfferValidityDays).toBe(30);
    expect(body.postmarkApiKey).toBeNull();
  });
});

describe("PUT /api/settings", () => {
  useMigratedDb();

  it("updates settings and returns the result", async () => {
    const response = await PUT(apiContext({
      request: new Request("http://test.local", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultVatRate: 20.0, defaultPaymentTermsDays: 30 }),
      }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.defaultVatRate).toBe(20.0);
    expect(body.defaultPaymentTermsDays).toBe(30);
    expect(body.supportedCurrencies).toEqual([
      "EUR", "USD", "CZK", "DKK", "HUF", "ISK", "NOK", "PLN", "RON", "SEK",
    ]);
  });

  it("rejects invalid VAT rate", async () => {
    const response = await PUT(apiContext({
      request: new Request("http://test.local", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultVatRate: -5 }),
      }),
    }));

    expect(response.status).toBe(400);
  });

  it("rejects invalid JSON", async () => {
    const response = await PUT(apiContext({
      request: new Request("http://test.local", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      }),
    }));

    expect(response.status).toBe(400);
  });

  it("rejects empty currencies array", async () => {
    const response = await PUT(apiContext({
      request: new Request("http://test.local", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supportedCurrencies: [] }),
      }),
    }));

    expect(response.status).toBe(400);
  });
});
