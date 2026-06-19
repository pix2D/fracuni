import { describe, it, expect } from "vitest";
import {
  createClient,
  getClient,
  listClients,
  updateClient,
  archiveClient,
  unarchiveClient,
  deleteClient,
} from "@/lib/clients";
import type { ClientInput } from "@/lib/clients";
import { useMigratedDb } from "@/test/db";

useMigratedDb();

const CLIENT_INPUT: ClientInput = {
  name: "Acme GmbH",
  clientType: "business",
  country: "DE",
  address: "Berliner Str. 1, 10115 Berlin",
  vatNumber: "DE123456789",
  defaultCurrency: "EUR",
  defaultPaymentTermsDays: 30,
  email: "billing@acme.de",
  taxIds: [
    { label: "Tax ID", value: "8722223585" },
    { label: "EIN", value: "12-3456789" },
  ],
};

describe("clients", () => {
  it("creates a client with tax IDs and retrieves it by id", async () => {
    const created = await createClient(CLIENT_INPUT);

    expect(created.id).toBeTypeOf("number");
    expect(created.name).toBe("Acme GmbH");
    expect(created.country).toBe("DE");
    expect(created.vatNumber).toBe("DE123456789");
    expect(created.archivedAt).toBeNull();
    expect(created.taxIds).toHaveLength(2);
    expect(created.taxIds[0]).toMatchObject({ label: "Tax ID", value: "8722223585" });

    const fetched = await getClient(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe("Acme GmbH");
    expect(fetched!.taxIds).toHaveLength(2);
  });

  it("lists active clients by default, archived with flag", async () => {
    await createClient({ ...CLIENT_INPUT, name: "Active Co" });
    const c2 = await createClient({ ...CLIENT_INPUT, name: "Archived Co", oib: null, vatNumber: "DE999" });
    await archiveClient(c2.id);

    const active = await listClients();
    expect(active).toHaveLength(1);
    expect(active[0]!.name).toBe("Active Co");

    const all = await listClients({ archived: true });
    expect(all).toHaveLength(2);
  });

  it("searches clients by name", async () => {
    await createClient({ ...CLIENT_INPUT, name: "Firefly One d.o.o." });
    await createClient({ ...CLIENT_INPUT, name: "Acme Corp", oib: null, vatNumber: "DE999" });

    const results = await listClients({ search: "fire" });
    expect(results).toHaveLength(1);
    expect(results[0]!.name).toBe("Firefly One d.o.o.");
  });

  it("updates a client and replaces tax IDs", async () => {
    const created = await createClient(CLIENT_INPUT);

    const updated = await updateClient(created.id, {
      name: "Acme AG",
      taxIds: [{ label: "USt-IdNr", value: "DE999999999" }],
    });

    expect(updated.name).toBe("Acme AG");
    expect(updated.country).toBe("DE");
    expect(updated.taxIds).toHaveLength(1);
    expect(updated.taxIds[0]).toMatchObject({ label: "USt-IdNr", value: "DE999999999" });
  });

  it("archives and unarchives a client", async () => {
    const created = await createClient(CLIENT_INPUT);

    const archived = await archiveClient(created.id);
    expect(archived.archivedAt).not.toBeNull();

    const unarchived = await unarchiveClient(created.id);
    expect(unarchived.archivedAt).toBeNull();
  });

  it("throws conflict for duplicate OIB", async () => {
    await createClient({ name: "A", clientType: "business", country: "HR", oib: "12345678901" });

    await expect(
      createClient({ name: "B", clientType: "business", country: "HR", oib: "12345678901" }),
    ).rejects.toMatchObject({
      code: "conflict",
      status: 409,
    });
  });

  it("deletes a client with no documents", async () => {
    const created = await createClient(CLIENT_INPUT);
    await deleteClient(created.id);

    const fetched = await getClient(created.id);
    expect(fetched).toBeNull();
  });

  it("throws not found when deleting non-existent client", async () => {
    await expect(deleteClient(99999)).rejects.toMatchObject({
      code: "not_found",
    });
  });
});
