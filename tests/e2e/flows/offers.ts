import { expect, type Page } from "@playwright/test";
import type { happyPath } from "../fixtures/data";
import { selectCombobox, waitForAstroHydration } from "./controls";

type JourneyFixture = typeof happyPath;

export async function createOfferViaUi(page: Page, fixture: JourneyFixture): Promise<number> {
  await page.goto("/offers/new");
  await waitForAstroHydration(page);
  await expect(page.getByRole("heading", { name: "New Offer" })).toBeVisible();

  await selectCombobox(page, "Client", fixture.client.name);
  await expect(page.getByRole("combobox", { name: "Location" })).toContainText(fixture.company.location.selectLabel);
  await expect(page.getByRole("combobox", { name: "Payment Method" })).toContainText(fixture.company.paymentMethod.selectLabel);
  await expect(page.getByRole("combobox", { name: "Currency" })).toContainText(fixture.client.defaultCurrency);
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(fixture.client.email);

  await page.getByLabel("Description (HR)", { exact: true }).fill(fixture.offer.descriptionHr);
  await page.getByLabel("Quantity", { exact: true }).fill(fixture.offer.quantity);
  await page.getByLabel("Unit Price", { exact: true }).fill(fixture.offer.unitPrice);
  await page.getByLabel("Notes (HR)", { exact: true }).fill(fixture.offer.notesHr);

  await page.getByRole("button", { name: "Save Draft" }).click();
  await expect(page).toHaveURL(/\/offers\/\d+\/edit$/);
  await expect(page.getByRole("heading", { name: "Edit Offer" })).toBeVisible();

  const match = page.url().match(/\/offers\/(\d+)\/edit$/);
  if (!match) throw new Error(`Expected offer edit URL, got ${page.url()}`);
  return Number(match[1]!);
}
