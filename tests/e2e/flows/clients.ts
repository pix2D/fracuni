import { expect, type Page } from "@playwright/test";
import type { happyPath } from "../fixtures/data";
import { selectCombobox, waitForAstroHydration } from "./controls";

type ClientFixture = typeof happyPath.client;

export async function createClientViaUi(page: Page, client: ClientFixture): Promise<void> {
  await page.goto("/clients/new");
  await waitForAstroHydration(page);
  await expect(page.getByRole("heading", { name: "New Client" })).toBeVisible();

  await page.getByLabel("Client Name", { exact: true }).fill(client.name);
  await page.getByRole("radio", { name: client.type }).click();
  await selectCombobox(page, "Country", client.country);
  await page.getByLabel("Address", { exact: true }).fill(client.address);
  await page.getByLabel("Email", { exact: true }).fill(client.email);
  await page.getByLabel("OIB", { exact: true }).fill(client.oib);
  await selectCombobox(page, "Default Currency", client.defaultCurrency);
  await page.getByLabel("Payment Terms (days)", { exact: true }).fill(String(client.defaultPaymentTermsDays));
  await page.getByLabel("Offer Validity (days)", { exact: true }).fill(String(client.defaultOfferValidityDays));

  await page.getByRole("button", { name: "Create Client" }).click();
  await expect(page).toHaveURL(/\/clients$/);
  await expect(page.getByRole("cell", { name: client.name })).toBeVisible();
}
