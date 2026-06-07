import { describe, expect, it } from "vitest";
import { PUT as updatePaymentMethod } from "@/pages/api/payment-methods/[id]";
import { apiContext } from "@/test/api";
import { useMigratedDb } from "@/test/db";

useMigratedDb();

function jsonRequest(body: unknown): Request {
  return new Request("http://test.local/api/payment-methods/1", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/payment-methods/:id", () => {
  it("returns 400 for an invalid Payment Method ID", async () => {
    const response = await updatePaymentMethod(apiContext({
      params: { id: "not-a-number" },
      request: new Request("http://test.local/api/payment-methods/not-a-number", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nameHr: "Virman" }),
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid payment method ID",
    });
  });

  it("returns 400 for invalid JSON", async () => {
    const response = await updatePaymentMethod(apiContext({
      params: { id: "1" },
      request: new Request("http://test.local/api/payment-methods/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: "{not-json",
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid JSON",
    });
  });

  it("returns 404 when the Payment Method does not exist", async () => {
    const response = await updatePaymentMethod(apiContext({
      params: { id: "999" },
      request: jsonRequest({ nameHr: "Transakcijski" }),
    }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: "Payment method not found",
    });
  });
});
