import { describe, expect, it } from "vitest";
import { createClient } from "@/lib/clients";
import type { ClientInput } from "@/lib/clients";
import { GET, PUT, DELETE } from "@/pages/api/clients/[id]";
import { POST as archive } from "@/pages/api/clients/[id]/archive";
import { POST as unarchive } from "@/pages/api/clients/[id]/unarchive";
import { apiContext } from "@/test/api";
import { useMigratedDb } from "@/test/db";

useMigratedDb();

const CLIENT_INPUT: ClientInput = {
  name: "Acme GmbH",
  clientType: "business",
  country: "DE",
  vatNumber: "DE123456789",
  email: "billing@acme.de",
  taxIds: [{ label: "Tax ID", value: "123" }],
};

describe("GET /api/clients/:id", () => {
  it("returns a client by id", async () => {
    const client = await createClient(CLIENT_INPUT);
    const response = await GET(apiContext({ params: { id: String(client.id) } }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.name).toBe("Acme GmbH");
    expect(body.taxIds).toHaveLength(1);
  });

  it("returns 404 for non-existent client", async () => {
    const response = await GET(apiContext({ params: { id: "99999" } }));
    expect(response.status).toBe(404);
  });

  it("returns 400 for invalid id", async () => {
    const response = await GET(apiContext({ params: { id: "abc" } }));
    expect(response.status).toBe(400);
  });
});

describe("PUT /api/clients/:id", () => {
  it("updates client fields and tax IDs", async () => {
    const client = await createClient(CLIENT_INPUT);

    const response = await PUT(apiContext({
      params: { id: String(client.id) },
      request: new Request("http://test.local", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Acme AG",
          taxIds: [{ label: "USt", value: "999" }],
        }),
      }),
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.name).toBe("Acme AG");
    expect(body.taxIds).toHaveLength(1);
    expect(body.taxIds[0].label).toBe("USt");
  });

  it("rejects an update that would make a Croatian business client missing OIB", async () => {
    const client = await createClient({ name: "Ana", clientType: "person", country: "HR" });

    const response = await PUT(apiContext({
      params: { id: String(client.id) },
      request: new Request("http://test.local", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientType: "business" }),
      }),
    }));

    expect(response.status).toBe(400);
  });

  it("normalizes tax identifiers against the merged client type and country", async () => {
    const client = await createClient(CLIENT_INPUT);

    const response = await PUT(apiContext({
      params: { id: String(client.id) },
      request: new Request("http://test.local", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientType: "person" }),
      }),
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.clientType).toBe("person");
    expect(body.vatNumber).toBeNull();
  });
});

describe("DELETE /api/clients/:id", () => {
  it("deletes a client", async () => {
    const client = await createClient(CLIENT_INPUT);
    const response = await DELETE(apiContext({ params: { id: String(client.id) } }));
    expect(response.status).toBe(204);
  });

  it("returns 404 for non-existent client", async () => {
    const response = await DELETE(apiContext({ params: { id: "99999" } }));
    expect(response.status).toBe(404);
  });
});

describe("POST /api/clients/:id/archive", () => {
  it("archives a client", async () => {
    const client = await createClient(CLIENT_INPUT);
    const response = await archive(apiContext({ params: { id: String(client.id) } }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.archivedAt).not.toBeNull();
  });
});

describe("POST /api/clients/:id/unarchive", () => {
  it("unarchives a client", async () => {
    const client = await createClient(CLIENT_INPUT);
    await archive(apiContext({ params: { id: String(client.id) } }));

    const response = await unarchive(apiContext({ params: { id: String(client.id) } }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.archivedAt).toBeNull();
  });
});
