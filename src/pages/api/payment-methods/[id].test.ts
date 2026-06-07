import { describe, expect, it } from "vitest";
import { PUT as updatePaymentMethod } from "@/pages/api/payment-methods/[id]";

describe("PUT /api/payment-methods/:id", () => {
  it("returns 400 for an invalid Payment Method ID", async () => {
    const response = await updatePaymentMethod({
      params: { id: "not-a-number" },
      request: new Request("http://test.local/api/payment-methods/not-a-number", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nameHr: "Virman" }),
      }),
    } as unknown as Parameters<typeof updatePaymentMethod>[0]);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid payment method ID",
    });
  });
});
