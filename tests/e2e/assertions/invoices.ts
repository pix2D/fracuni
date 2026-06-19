import { expect, type Page } from "@playwright/test";
import type { happyPath } from "../fixtures/data";

type JourneyFixture = typeof happyPath;

export async function expectInvoiceFormValues(page: Page, fixture: JourneyFixture): Promise<void> {
  await expect(page.getByRole("combobox", { name: "Client" })).toContainText(fixture.client.name);
  await expect(page.getByRole("combobox", { name: "Location" })).toContainText(fixture.company.location.selectLabel);
  await expect(page.getByRole("combobox", { name: "Payment Method" })).toContainText(fixture.company.paymentMethod.selectLabel);
  await expect(page.getByRole("combobox", { name: "Currency" })).toContainText(fixture.client.defaultCurrency);
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(fixture.client.email);
  await expect(page.getByLabel("Payment Terms (days)", { exact: true })).toHaveValue(String(fixture.client.defaultPaymentTermsDays));
  await expect(page.getByLabel("Description (HR)", { exact: true })).toHaveValue(fixture.invoice.descriptionHr);
  await expect(page.getByLabel("Quantity", { exact: true })).toHaveValue(fixture.invoice.quantity);
  await expect(page.getByLabel("Unit Price", { exact: true })).toHaveValue(fixture.invoice.unitPrice);
  await expect(page.getByLabel("Notes (HR)", { exact: true })).toHaveValue(fixture.invoice.notesHr);
}

export async function expectInvoiceDates(page: Page, dates: { issueDate: string; deliveryDate: string; dueDate: string }): Promise<void> {
  await expect(page.getByRole("button", { name: "Issue Date" })).toHaveText(dates.issueDate);
  await expect(page.getByRole("button", { name: "Delivery Date" })).toHaveText(dates.deliveryDate);
  await expect(page.getByRole("button", { name: "Due Date" })).toHaveText(dates.dueDate);
}

export async function expectInvoiceTotals(page: Page, totals: { subtotal: string; pdv: string; total: string }): Promise<void> {
  const totalsPanel = page.locator("section").filter({ hasText: "Subtotal" }).last();
  await expect(totalsPanel).toContainText("Subtotal");
  await expect(totalsPanel).toContainText(totals.subtotal);
  await expect(totalsPanel).toContainText("PDV (25%)");
  await expect(totalsPanel).toContainText(totals.pdv);
  await expect(totalsPanel).toContainText("Total");
  await expect(totalsPanel).toContainText(totals.total);
}

export async function expectInvoiceListRow(page: Page, fixture: JourneyFixture): Promise<void> {
  await page.goto("/invoices");
  const row = page.getByRole("row").filter({ hasText: fixture.client.name });
  await expect(row).toContainText("draft");
  await expect(row).toContainText(fixture.expected.total);
}
