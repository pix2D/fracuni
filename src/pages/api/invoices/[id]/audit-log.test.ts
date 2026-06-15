import { describe, expect, it } from "vitest";
import { GET } from "@/pages/api/invoices/[id]/audit-log";
import { createInvoice, updateInvoice } from "@/lib/invoices";
import { createCompany } from "@/lib/companies";
import { apiContext } from "@/test/api";
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

describe("GET /api/invoices/:id/audit-log", () => {
  it("returns the audit trail newest first", async () => {
    const company = await createCompany(COMPANY_INPUT);
    const invoice = await createInvoice({ companyId: company.id });
    await updateInvoice(invoice.id, { notesHr: "a" }, { auditDescription: "first" });
    await updateInvoice(invoice.id, { notesHr: "b" }, { auditDescription: "second" });

    const response = await GET(apiContext({ params: { id: String(invoice.id) } }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.map((e: { description: string }) => e.description)).toEqual(["second", "first"]);
  });

  it("returns an empty array when there are no entries", async () => {
    const company = await createCompany(COMPANY_INPUT);
    const invoice = await createInvoice({ companyId: company.id });

    const response = await GET(apiContext({ params: { id: String(invoice.id) } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("returns 404 for a missing invoice", async () => {
    const response = await GET(apiContext({ params: { id: "9999" } }));
    expect(response.status).toBe(404);
  });

  it("returns 400 for an invalid id", async () => {
    const response = await GET(apiContext({ params: { id: "abc" } }));
    expect(response.status).toBe(400);
  });
});
