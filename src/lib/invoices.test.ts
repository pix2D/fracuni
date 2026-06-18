import { describe, it, expect } from "vitest";
import {
  createInvoice,
  getInvoice,
  listInvoices,
  updateInvoice,
  deleteInvoice,
} from "@/lib/invoices";
import { createCompany, createLocation, createPaymentMethod } from "@/lib/companies";
import { createClient } from "@/lib/clients";
import { getDb } from "@/lib/db";
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

async function setupCompany() {
  const company = await createCompany(COMPANY_INPUT);
  const location = await createLocation(company.id, { number: 1, nameHr: "Zagreb", isDefault: true });
  const paymentMethod = await createPaymentMethod(company.id, {
    number: 1,
    nameHr: "Transakcijski račun",
    isDefault: true,
  });
  return { company, location, paymentMethod };
}

async function setupClient() {
  return createClient({ name: "Acme GmbH", country: "Germany", vatNumber: "DE123456789" });
}

describe("invoices data layer", () => {
  it("creates a draft invoice with line items", async () => {
    const { company, location, paymentMethod } = await setupCompany();
    const client = await setupClient();

    const invoice = await createInvoice({
      companyId: company.id,
      clientId: client.id,
      locationId: location.id,
      paymentMethodId: paymentMethod.id,
      currency: "EUR",
      email: "billing@acme.de",
      issueDate: "2026-06-15",
      dueDate: "2026-06-30",
      notesHr: "Hvala",
      lineItems: [
        { descriptionHr: "Usluga A", quantity: 2, unitPrice: 100 },
        { descriptionHr: "Usluga B", quantity: 1, unitPrice: 50.5 },
      ],
    });

    expect(invoice.id).toBeTypeOf("number");
    expect(invoice.type).toBe("invoice");
    expect(invoice.status).toBe("draft");
    expect(invoice.documentNumber).toBeNull();
    expect(invoice.lineItems).toHaveLength(2);
    expect(invoice.lineItems[0]).toMatchObject({ position: 1, descriptionHr: "Usluga A", quantity: 2 });
    expect(invoice.lineItems[1]!.position).toBe(2);
  });

  it("saves a draft with missing fields (no validation)", async () => {
    const { company } = await setupCompany();

    const invoice = await createInvoice({ companyId: company.id });

    expect(invoice.clientId).toBeNull();
    expect(invoice.currency).toBeNull();
    expect(invoice.lineItems).toHaveLength(0);
  });

  it("rejects an invoice for a non-existent company", async () => {
    await expect(createInvoice({ companyId: 9999 })).rejects.toThrow();
  });

  it("retrieves an invoice by id with ordered line items", async () => {
    const { company } = await setupCompany();
    const created = await createInvoice({
      companyId: company.id,
      lineItems: [
        { descriptionHr: "First", quantity: 1, unitPrice: 10 },
        { descriptionHr: "Second", quantity: 1, unitPrice: 20 },
      ],
    });

    const fetched = await getInvoice(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.lineItems.map((li) => li.descriptionHr)).toEqual(["First", "Second"]);
  });

  it("lists only invoices for the given company, newest first", async () => {
    const { company } = await setupCompany();
    const other = await createCompany({ ...COMPANY_INPUT, oib: "99999999999" });

    const a = await createInvoice({ companyId: company.id });
    const b = await createInvoice({ companyId: company.id });
    await createInvoice({ companyId: other.id });

    const list = await listInvoices({ companyId: company.id });
    expect(list).toHaveLength(2);
    expect(list.map((i) => i.id)).toEqual([b.id, a.id]);
  });

  it("excludes credit notes from the default invoice list", async () => {
    const { company } = await setupCompany();
    await createInvoice({ companyId: company.id });
    await createInvoice({ companyId: company.id, type: "credit_note" });

    const invoices = await listInvoices({ companyId: company.id });
    expect(invoices).toHaveLength(1);
    expect(invoices[0]!.type).toBe("invoice");
  });

  it("normalizes Credit Note line items on create", async () => {
    const { company } = await setupCompany();

    const creditNote = await createInvoice({
      companyId: company.id,
      type: "credit_note",
      lineItems: [
        { descriptionHr: "Refund A", quantity: -2, unitPrice: 150 },
        { descriptionHr: "Refund B", quantity: 1, unitPrice: -25 },
      ],
    });

    expect(creditNote.lineItems[0]).toMatchObject({
      descriptionHr: "Refund A",
      quantity: 2,
      unitPrice: -150,
    });
    expect(creditNote.lineItems[1]).toMatchObject({
      descriptionHr: "Refund B",
      quantity: 1,
      unitPrice: -25,
    });
  });

  it("replaces line items on update, recalculating positions", async () => {
    const { company } = await setupCompany();
    const invoice = await createInvoice({
      companyId: company.id,
      lineItems: [
        { descriptionHr: "One", quantity: 1, unitPrice: 10 },
        { descriptionHr: "Two", quantity: 1, unitPrice: 20 },
      ],
    });

    const updated = await updateInvoice(invoice.id, {
      currency: "USD",
      lineItems: [{ descriptionHr: "Only", quantity: 3, unitPrice: 5 }],
    });

    expect(updated.currency).toBe("USD");
    expect(updated.lineItems).toHaveLength(1);
    expect(updated.lineItems[0]).toMatchObject({ position: 1, descriptionHr: "Only" });
  });

  it("normalizes Credit Note line items on update", async () => {
    const { company } = await setupCompany();
    const creditNote = await createInvoice({
      companyId: company.id,
      type: "credit_note",
      lineItems: [{ descriptionHr: "Old", quantity: 1, unitPrice: 10 }],
    });

    const updated = await updateInvoice(creditNote.id, {
      lineItems: [{ descriptionHr: "Replacement", quantity: -3, unitPrice: 40 }],
    });

    expect(updated.lineItems).toHaveLength(1);
    expect(updated.lineItems[0]).toMatchObject({
      descriptionHr: "Replacement",
      quantity: 3,
      unitPrice: -40,
    });
  });

  it("keeps existing line items when update omits them", async () => {
    const { company } = await setupCompany();
    const invoice = await createInvoice({
      companyId: company.id,
      lineItems: [{ descriptionHr: "Keep", quantity: 1, unitPrice: 10 }],
    });

    const updated = await updateInvoice(invoice.id, { notesHr: "Updated" });
    expect(updated.notesHr).toBe("Updated");
    expect(updated.lineItems).toHaveLength(1);
  });

  it("throws when updating a missing invoice", async () => {
    await expect(updateInvoice(9999, { notesHr: "x" })).rejects.toThrow("Invoice not found");
  });

  it("refuses to update a finalized invoice", async () => {
    const { company } = await setupCompany();
    const invoice = await createInvoice({ companyId: company.id, notesHr: "Original" });
    await getDb().updateTable("invoices").set({ status: "finalized" }).where("id", "=", invoice.id).execute();

    await expect(updateInvoice(invoice.id, { notesHr: "Corrected" })).rejects.toThrow(
      /immutable/,
    );
    expect((await getInvoice(invoice.id))!.notesHr).toBe("Original");
  });

  it("deletes a draft and cascades line items", async () => {
    const { company } = await setupCompany();
    const invoice = await createInvoice({
      companyId: company.id,
      lineItems: [{ descriptionHr: "Gone", quantity: 1, unitPrice: 1 }],
    });

    await deleteInvoice(invoice.id);

    expect(await getInvoice(invoice.id)).toBeNull();
    const remaining = await getDb()
      .selectFrom("lineItems")
      .selectAll()
      .where("invoiceId", "=", invoice.id)
      .execute();
    expect(remaining).toHaveLength(0);
  });

  it("refuses to delete a non-draft invoice", async () => {
    const { company } = await setupCompany();
    const invoice = await createInvoice({ companyId: company.id });
    await getDb().updateTable("invoices").set({ status: "finalized" }).where("id", "=", invoice.id).execute();

    await expect(deleteInvoice(invoice.id)).rejects.toThrow("Only Draft invoices can be deleted");
  });
});
