import { expect, type Page } from "@playwright/test";
import { waitForAstroHydration } from "../flows/controls";

export async function expectDraftOfferViewActions(page: Page, offerId: number): Promise<void> {
  await page.goto(`/offers/${offerId}`);
  await waitForAstroHydration(page);

  await expect(page.getByRole("heading", { name: "View Offer" })).toBeVisible();
  await expect(page.getByText("draft", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit Draft" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Duplicate" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Offers" })).toBeVisible();
  await expect(page.getByTitle("Offer preview")).toBeVisible();
  await expect(page.getByRole("button", { name: "Accept" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reject" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Convert to Invoice" })).toHaveCount(0);
}
