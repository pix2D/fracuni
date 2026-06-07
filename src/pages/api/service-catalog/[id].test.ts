import { describe, expect, it } from "vitest";
import { createCatalogEntry } from "@/lib/service-catalog";
import { GET, PUT, DELETE } from "@/pages/api/service-catalog/[id]";
import { apiContext } from "@/test/api";
import { useMigratedDb } from "@/test/db";

useMigratedDb();

describe("GET /api/service-catalog/:id", () => {
  it("returns a catalog entry by id", async () => {
    const entry = await createCatalogEntry({
      descriptionHr: "Konzultacije",
      descriptionEn: "Consulting",
    });

    const response = await GET(apiContext({ params: { id: String(entry.id) } }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.descriptionHr).toBe("Konzultacije");
  });

  it("returns 404 for non-existent entry", async () => {
    const response = await GET(apiContext({ params: { id: "99999" } }));
    expect(response.status).toBe(404);
  });

  it("returns 400 for invalid id", async () => {
    const response = await GET(apiContext({ params: { id: "abc" } }));
    expect(response.status).toBe(400);
  });
});

describe("PUT /api/service-catalog/:id", () => {
  it("updates a catalog entry", async () => {
    const entry = await createCatalogEntry({
      descriptionHr: "Stari",
      descriptionEn: "Old",
    });

    const response = await PUT(apiContext({
      params: { id: String(entry.id) },
      request: new Request("http://test.local", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptionHr: "Novi" }),
      }),
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.descriptionHr).toBe("Novi");
    expect(body.descriptionEn).toBe("Old");
  });

  it("returns 404 for non-existent entry", async () => {
    const response = await PUT(apiContext({
      params: { id: "99999" },
      request: new Request("http://test.local", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptionHr: "test" }),
      }),
    }));

    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/service-catalog/:id", () => {
  it("deletes a catalog entry", async () => {
    const entry = await createCatalogEntry({ descriptionHr: "Za brisanje" });
    const response = await DELETE(apiContext({ params: { id: String(entry.id) } }));
    expect(response.status).toBe(204);
  });

  it("returns 404 for non-existent entry", async () => {
    const response = await DELETE(apiContext({ params: { id: "99999" } }));
    expect(response.status).toBe(404);
  });
});
