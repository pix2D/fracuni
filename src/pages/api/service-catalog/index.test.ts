import { describe, expect, it } from "vitest";
import { createCatalogEntry } from "@/lib/service-catalog";
import { GET, POST } from "@/pages/api/service-catalog/index";
import { apiContext } from "@/test/api";
import { useMigratedDb } from "@/test/db";

useMigratedDb();

describe("POST /api/service-catalog", () => {
  it("creates a catalog entry with valid input", async () => {
    const response = await POST(apiContext({
      request: new Request("http://test.local/api/service-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descriptionHr: "Konzultacije za {month}/{year}",
          descriptionEn: "Consulting for {month}/{year}",
        }),
      }),
    }));

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.descriptionHr).toBe("Konzultacije za {month}/{year}");
    expect(body.descriptionEn).toBe("Consulting for {month}/{year}");
    expect(body.id).toBeTypeOf("number");
  });

  it("creates an entry with only Croatian description", async () => {
    const response = await POST(apiContext({
      request: new Request("http://test.local/api/service-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptionHr: "Samo hrvatski" }),
      }),
    }));

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.descriptionEn).toBeNull();
  });

  it("trims descriptions and stores blank English description as null", async () => {
    const response = await POST(apiContext({
      request: new Request("http://test.local/api/service-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descriptionHr: "  Konzultacije  ",
          descriptionEn: "   ",
        }),
      }),
    }));

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.descriptionHr).toBe("Konzultacije");
    expect(body.descriptionEn).toBeNull();
  });

  it("returns 400 for missing descriptionHr", async () => {
    const response = await POST(apiContext({
      request: new Request("http://test.local/api/service-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptionEn: "Only English" }),
      }),
    }));

    expect(response.status).toBe(400);
  });

  it("returns 400 for blank descriptionHr", async () => {
    const response = await POST(apiContext({
      request: new Request("http://test.local/api/service-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptionHr: "   " }),
      }),
    }));

    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    const response = await POST(apiContext({
      request: new Request("http://test.local/api/service-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      }),
    }));

    expect(response.status).toBe(400);
  });
});

describe("GET /api/service-catalog", () => {
  it("returns all entries", async () => {
    await createCatalogEntry({ descriptionHr: "Dizajn", descriptionEn: "Design" });
    await createCatalogEntry({ descriptionHr: "Konzultacije", descriptionEn: "Consulting" });

    const response = await GET(apiContext({
      request: new Request("http://test.local/api/service-catalog"),
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(2);
  });

  it("filters by search param", async () => {
    await createCatalogEntry({ descriptionHr: "Dizajn", descriptionEn: "Design" });
    await createCatalogEntry({ descriptionHr: "Konzultacije", descriptionEn: "Consulting" });

    const response = await GET(apiContext({
      request: new Request("http://test.local/api/service-catalog?search=dizajn"),
    }));

    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0].descriptionHr).toBe("Dizajn");
  });
});
