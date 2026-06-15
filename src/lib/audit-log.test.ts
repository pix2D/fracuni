import { describe, it, expect } from "vitest";
import { listAuditEntries } from "@/lib/audit-log";
import { updateInvoice, createInvoice } from "@/lib/invoices";
import { createCompany } from "@/lib/companies";
import { useMigratedDb } from "@/test/db";

useMigratedDb();

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
};

describe("audit log", () => {
  it("returns an empty trail for an invoice with no edits", async () => {
    const company = await createCompany(COMPANY_INPUT);
    const invoice = await createInvoice({ companyId: company.id });

    expect(await listAuditEntries(invoice.id)).toEqual([]);
  });

  it("records an entry when updateInvoice is given an audit description", async () => {
    const company = await createCompany(COMPANY_INPUT);
    const invoice = await createInvoice({ companyId: company.id });

    await updateInvoice(invoice.id, { notesHr: "Fixed" }, { auditDescription: "Notes (HR) changed" });

    const entries = await listAuditEntries(invoice.id);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.description).toBe("Notes (HR) changed");
    expect(entries[0]!.invoiceId).toBe(invoice.id);
    expect(entries[0]!.createdAt).toBeTypeOf("string");
  });

  it("does not record an entry for a plain edit without a description", async () => {
    const company = await createCompany(COMPANY_INPUT);
    const invoice = await createInvoice({ companyId: company.id });

    await updateInvoice(invoice.id, { notesHr: "Fixed" });

    expect(await listAuditEntries(invoice.id)).toEqual([]);
  });

  it("lists entries newest first", async () => {
    const company = await createCompany(COMPANY_INPUT);
    const invoice = await createInvoice({ companyId: company.id });

    await updateInvoice(invoice.id, { notesHr: "one" }, { auditDescription: "first" });
    await updateInvoice(invoice.id, { notesHr: "two" }, { auditDescription: "second" });

    const entries = await listAuditEntries(invoice.id);
    expect(entries.map((e) => e.description)).toEqual(["second", "first"]);
  });
});
