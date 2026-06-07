import { describe, expect, it } from "vitest";
import { PUT as updateLocation } from "@/pages/api/locations/[id]";
import { apiContext } from "@/test/api";
import { useMigratedDb } from "@/test/db";

useMigratedDb();

function jsonRequest(body: unknown): Request {
  return new Request("http://test.local/api/locations/not-a-number", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/locations/:id", () => {
  it("returns 400 for an invalid Location ID", async () => {
    const response = await updateLocation(apiContext({
      params: { id: "not-a-number" },
      request: jsonRequest({ nameHr: "Zagreb" }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid location ID",
    });
  });

  it("returns 400 for invalid JSON", async () => {
    const response = await updateLocation(apiContext({
      params: { id: "1" },
      request: new Request("http://test.local/api/locations/1", {
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

  it("returns 404 when the Location does not exist", async () => {
    const response = await updateLocation(apiContext({
      params: { id: "999" },
      request: jsonRequest({ nameHr: "Novi Zagreb" }),
    }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: "Location not found",
    });
  });
});
