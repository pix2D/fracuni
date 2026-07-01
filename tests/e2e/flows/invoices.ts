import { expect, type Page } from "@playwright/test";
import type { happyPath } from "../fixtures/data";
import { selectCombobox, waitForAstroHydration } from "./controls";

type JourneyFixture = typeof happyPath;

export async function createInvoiceViaUi(page: Page, fixture: JourneyFixture): Promise<number> {
  await page.goto("/invoices/new");
  await waitForAstroHydration(page);
  await expect(page.getByRole("heading", { name: "New Invoice" })).toBeVisible();

  await selectCombobox(page, "Client", fixture.client.name);
  await expect(page.getByRole("combobox", { name: "Location" })).toContainText(fixture.company.location.selectLabel);
  await expect(page.getByRole("combobox", { name: "Payment Method" })).toContainText(fixture.company.paymentMethod.selectLabel);
  await expect(page.getByRole("combobox", { name: "Currency" })).toContainText(fixture.client.defaultCurrency);
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(fixture.client.email);
  await expect(page.getByLabel("Payment Terms (days)", { exact: true })).toHaveValue(String(fixture.client.defaultPaymentTermsDays));

  await page.getByLabel("Description (HR)", { exact: true }).fill(fixture.invoice.descriptionHr);
  await page.getByLabel("Quantity", { exact: true }).fill(fixture.invoice.quantity);
  await page.getByLabel("Unit Price", { exact: true }).fill(fixture.invoice.unitPrice);
  await page.getByLabel("Notes (HR)", { exact: true }).fill(fixture.invoice.notesHr);

  await page.getByRole("button", { name: "Save Draft" }).click();
  await expect(page).toHaveURL(/\/invoices\/\d+\/edit$/);
  await expect(page.getByRole("heading", { name: "Edit Invoice" })).toBeVisible();

  const match = page.url().match(/\/invoices\/(\d+)\/edit$/);
  if (!match) throw new Error(`Expected invoice edit URL, got ${page.url()}`);
  return Number(match[1]!);
}
