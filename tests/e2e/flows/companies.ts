import { expect, type Page } from "@playwright/test";
import type { happyPath } from "../fixtures/data";
import { waitForAstroHydration } from "./controls";

type CompanyFixture = typeof happyPath.company;

function section(page: Page, heading: string) {
  return page.locator("section").filter({ has: page.getByRole("heading", { name: heading }) });
}

export async function createCompanyViaUi(page: Page, company: CompanyFixture): Promise<void> {
  await page.goto("/companies/new");
  await waitForAstroHydration(page);
  await expect(page.getByRole("heading", { name: "New Company" })).toBeVisible();

  await page.getByLabel("Company Name", { exact: true }).fill(company.name);
  await page.getByLabel("OIB", { exact: true }).fill(company.oib);
  await page.getByLabel("Address", { exact: true }).fill(company.address);
  await page.getByLabel("Phone", { exact: true }).fill(company.phone);
  await page.getByLabel("Issuer Name", { exact: true }).fill(company.issuerName);
  await page.getByLabel("Default Payment Terms (days)", { exact: true }).fill(String(company.defaultPaymentTermsDays));

  await page.getByLabel("Tagline (HR)", { exact: true }).fill(company.taglineHr);
  await page.getByLabel("Tagline (EN)", { exact: true }).fill(company.taglineEn);
  await page.getByLabel("IBAN", { exact: true }).fill(company.iban);
  await page.getByLabel("SWIFT/BIC", { exact: true }).fill(company.swift);
  await page.getByLabel("Legal Text - Domestic (HR)", { exact: true }).fill(company.legalTextDomestic);
  await page.getByLabel("Legal Text - Foreign (HR)", { exact: true }).fill(company.legalTextForeignHr);
  await page.getByLabel("Legal Text - Foreign (EN)", { exact: true }).fill(company.legalTextForeignEn);
  await page.getByLabel("From Address", { exact: true }).fill(company.emailFromAddress);
  await page.getByLabel("From Name", { exact: true }).fill(company.emailFromName);
  await page.getByLabel("Subject Template", { exact: true }).fill(company.emailSubjectTemplate);
  await page.getByLabel("Body Template", { exact: true }).fill(company.emailBodyTemplate);

  await page.getByRole("button", { name: "Create Company" }).click();
  await expect(page).toHaveURL(/\/companies\/\d+$/);
  await waitForAstroHydration(page);
  await expect(page.getByRole("heading", { name: company.name })).toBeVisible();

  await page.getByRole("button", { name: "Add Location" }).click();
  const locationDialog = page.getByRole("dialog", { name: "Add Location" });
  await expect(locationDialog).toBeVisible();
  await locationDialog.getByLabel("Number", { exact: true }).fill(String(company.location.number));
  await locationDialog.getByLabel("Name (HR)", { exact: true }).fill(company.location.nameHr);
  await locationDialog.getByLabel("Name (EN)", { exact: true }).fill(company.location.nameEn);
  await locationDialog.getByRole("button", { name: "Save" }).click();

  const locations = section(page, "Locations");
  await expect(
    locations.getByRole("row", { name: new RegExp(`${company.location.number}.*${company.location.nameHr}`) }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Add Payment Method" }).click();
  const paymentMethodDialog = page.getByRole("dialog", { name: "Add Payment Method" });
  await expect(paymentMethodDialog).toBeVisible();
  await paymentMethodDialog.getByLabel("Number", { exact: true }).fill(String(company.paymentMethod.number));
  await paymentMethodDialog.getByLabel("Name (HR)", { exact: true }).fill(company.paymentMethod.nameHr);
  await paymentMethodDialog.getByLabel("Name (EN)", { exact: true }).fill(company.paymentMethod.nameEn);
  await paymentMethodDialog.getByRole("button", { name: "Save" }).click();

  const paymentMethods = section(page, "Payment Methods");
  await expect(
    paymentMethods.getByRole("row", {
      name: new RegExp(`${company.paymentMethod.number}.*${company.paymentMethod.nameHr}`),
    }),
  ).toBeVisible();
}
