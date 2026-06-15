import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  finalizeInvoice,
  editFinalizedInvoice,
  describeInvoiceChanges,
} from "@/lib/document-engine";
import { type HtmlRenderer } from "@/lib/pdf-generator";
import { createInvoice, getInvoice, updateInvoice, type Invoice } from "@/lib/invoices";
import { listAuditEntries } from "@/lib/audit-log";
import { createCompany, createLocation, createPaymentMethod } from "@/lib/companies";
import { createClient } from "@/lib/clients";
import { getDb } from "@/lib/db";
import { useMigratedDb } from "@/test/db";

useMigratedDb();

let dataDir: string;
beforeEach(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "fireracuni-edit-"));
});
afterEach(async () => {
  await fs.rm(dataDir, { recursive: true, force: true });
});

// Encodes the HTML so distinct content yields distinct hashes — lets us assert a
// regenerated PDF really changed after an edit.
const fakeRenderer: HtmlRenderer = async (html) => Buffer.from(`PDF::${html.length}::${html}`);

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
  legalTextDomestic: "Domaći tekst.",
};

async function finalizedDomestic(): Promise<Invoice> {
  const company = await createCompany(COMPANY_INPUT);
  const location = await createLocation(company.id, { number: 1, nameHr: "Zagreb", isDefault: true });
  const paymentMethod = await createPaymentMethod(company.id, {
    number: 1,
    nameHr: "Transakcijski",
    isDefault: true,
  });
  const client = await createClient({ name: "Domaći d.o.o.", country: "HR", oib: "98765432109" });
  const draft = await createInvoice({
    companyId: company.id,
    clientId: client.id,
    locationId: location.id,
    paymentMethodId: paymentMethod.id,
    currency: "EUR",
    issueDate: "2026-06-15",
    notesHr: "Original",
    lineItems: [{ descriptionHr: "Usluga", quantity: 1, unitPrice: 100 }],
  });
  const finalized = await finalizeInvoice(draft.id);
  // Seed the PDF artifact so we can prove the edit regenerates it.
  return editSeed(finalized.id);
}

async function editSeed(id: number): Promise<Invoice> {
  const { generateInvoicePdfs } = await import("@/lib/pdf-generator");
  return generateInvoicePdfs(id, { renderer: fakeRenderer, dataDir });
}

describe("editFinalizedInvoice", () => {
  it("applies the edit, keeps the status and document number, and logs the change", async () => {
    const finalized = await finalizedDomestic();

    const edited = await editFinalizedInvoice(
      finalized.id,
      { notesHr: "Corrected note" },
      { renderer: fakeRenderer, dataDir },
    );

    expect(edited.status).toBe("finalized");
    expect(edited.documentNumber).toBe(finalized.documentNumber);
    expect(edited.notesHr).toBe("Corrected note");

    const entries = await listAuditEntries(finalized.id);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.description).toContain("Notes (HR)");
    expect(entries[0]!.description).toContain("Corrected note");
  });

  it("regenerates the PDF and updates the SHA-256 hash", async () => {
    const finalized = await finalizedDomestic();
    const hashBefore = finalized.pdfHashHr;
    expect(hashBefore).toMatch(/^[0-9a-f]{64}$/);

    const edited = await editFinalizedInvoice(
      finalized.id,
      { lineItems: [{ descriptionHr: "Usluga", quantity: 2, unitPrice: 100 }] },
      { renderer: fakeRenderer, dataDir },
    );

    expect(edited.pdfPathHr).toBe(finalized.pdfPathHr);
    expect(edited.pdfHashHr).not.toBe(hashBefore);

    const bytes = await fs.readFile(path.join(dataDir, edited.pdfPathHr!));
    const { createHash } = await import("node:crypto");
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(edited.pdfHashHr);
  });

  it("logs a fallback description when nothing observable changed", async () => {
    const finalized = await finalizedDomestic();

    await editFinalizedInvoice(finalized.id, {}, { renderer: fakeRenderer, dataDir });

    const entries = await listAuditEntries(finalized.id);
    expect(entries[0]!.description).toBe("Saved with no field changes");
  });

  it("refuses to edit a Sent invoice", async () => {
    const finalized = await finalizedDomestic();
    await getDb().updateTable("invoices").set({ status: "sent" }).where("id", "=", finalized.id).execute();

    await expect(
      editFinalizedInvoice(finalized.id, { notesHr: "x" }, { renderer: fakeRenderer, dataDir }),
    ).rejects.toThrow(/Only Finalized invoices can be edited/);

    expect(await listAuditEntries(finalized.id)).toEqual([]);
  });

  it("refuses to edit a Paid invoice", async () => {
    const finalized = await finalizedDomestic();
    await getDb().updateTable("invoices").set({ status: "paid" }).where("id", "=", finalized.id).execute();

    await expect(
      editFinalizedInvoice(finalized.id, { notesHr: "x" }, { renderer: fakeRenderer, dataDir }),
    ).rejects.toThrow(/Only Finalized invoices can be edited/);
  });

  it("throws for a non-existent invoice", async () => {
    await expect(
      editFinalizedInvoice(9999, { notesHr: "x" }, { renderer: fakeRenderer, dataDir }),
    ).rejects.toThrow(/not found/i);
  });
});

describe("updateInvoice — immutability guard", () => {
  it("rejects edits to a Sent invoice", async () => {
    const finalized = await finalizedDomestic();
    await getDb().updateTable("invoices").set({ status: "sent" }).where("id", "=", finalized.id).execute();

    await expect(updateInvoice(finalized.id, { notesHr: "x" })).rejects.toThrow(/immutable/);
    expect((await getInvoice(finalized.id))!.notesHr).toBe("Original");
  });
});

describe("describeInvoiceChanges", () => {
  const base = {
    id: 1,
    clientId: 5,
    currency: "EUR",
    email: null,
    issueDate: "2026-06-15",
    notesHr: "Original",
    notesEn: null,
    lineItems: [{ descriptionHr: "Usluga", descriptionEn: null, quantity: 1, unitPrice: 100 }],
  } as unknown as Invoice;

  it("summarises a scalar change as before → after", () => {
    expect(describeInvoiceChanges(base, { currency: "USD" })).toBe("Currency: EUR → USD");
  });

  it("treats empty string as unchanged from null", () => {
    expect(describeInvoiceChanges(base, { email: "" })).toBe("Saved with no field changes");
  });

  it("ignores fields not present in the edit", () => {
    expect(describeInvoiceChanges(base, { notesHr: "Original" })).toBe("Saved with no field changes");
  });

  it("detects line item changes", () => {
    expect(
      describeInvoiceChanges(base, {
        lineItems: [{ descriptionHr: "Usluga", quantity: 2, unitPrice: 100 }],
      }),
    ).toBe("Line items updated");
  });

  it("joins multiple changes with a semicolon", () => {
    const desc = describeInvoiceChanges(base, { currency: "USD", notesHr: "New" });
    expect(desc).toContain("Currency: EUR → USD");
    expect(desc).toContain("Notes (HR): Original → New");
    expect(desc).toContain("; ");
  });

  it("renders a cleared field as (none)", () => {
    expect(describeInvoiceChanges(base, { notesHr: null })).toBe("Notes (HR): Original → (none)");
  });
});
