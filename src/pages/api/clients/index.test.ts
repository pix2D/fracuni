import { describe, expect, it } from "vitest";
import { createClient, archiveClient } from "@/lib/clients";
import type { ClientInput } from "@/lib/clients";
import { GET, POST } from "@/pages/api/clients/index";
import { apiContext } from "@/test/api";
import { useMigratedDb } from "@/test/db";

useMigratedDb();

const CLIENT_INPUT: ClientInput = {
  name: "Acme GmbH",
  country: "Germany",
  address: "Berliner Str. 1",
  vatNumber: "DE123456789",
  email: "billing@acme.de",
  taxIds: [{ label: "Tax ID", value: "123" }],
};

describe("GET /api/clients", () => {
  it("returns active clients by default", async () => {
    await createClient(CLIENT_INPUT);
    const archived = await createClient({ name: "Old Co", country: "Austria", vatNumber: "AT999" });
    await archiveClient(archived.id);

    const response = await GET(apiContext({
      request: new Request("http://test.local/api/clients"),
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Acme GmbH");
    expect(body[0].taxIds).toHaveLength(1);
  });

  it("returns all clients when archived=true", async () => {
    await createClient(CLIENT_INPUT);
    const archived = await createClient({ name: "Old Co", country: "Austria", vatNumber: "AT999" });
    await archiveClient(archived.id);

    const response = await GET(apiContext({
      request: new Request("http://test.local/api/clients?archived=true"),
    }));

    const body = await response.json();
    expect(body).toHaveLength(2);
  });

  it("filters by search param", async () => {
    await createClient(CLIENT_INPUT);
    await createClient({ name: "Zebra Inc", country: "USA" });

    const response = await GET(apiContext({
      request: new Request("http://test.local/api/clients?search=acme"),
    }));

    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Acme GmbH");
  });
});

describe("POST /api/clients", () => {
  it("creates a client with valid input", async () => {
    const response = await POST(apiContext({
      request: new Request("http://test.local/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Client",
          country: "Croatia",
          oib: "12345678901",
          taxIds: [{ label: "OIB", value: "12345678901" }],
        }),
      }),
    }));

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.name).toBe("New Client");
    expect(body.country).toBe("Croatia");
    expect(body.taxIds).toHaveLength(1);
  });

  it("returns 400 for missing required fields", async () => {
    const response = await POST(apiContext({
      request: new Request("http://test.local/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" }),
      }),
    }));

    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    const response = await POST(apiContext({
      request: new Request("http://test.local/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      }),
    }));

    expect(response.status).toBe(400);
  });
});
