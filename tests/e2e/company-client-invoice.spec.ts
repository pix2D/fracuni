import { test } from "@playwright/test";
import {
  expectDraftInvoiceViewActions,
  expectInvoiceDates,
  expectInvoiceFormValues,
  expectInvoiceListRow,
  expectInvoiceTotals,
} from "./assertions/invoices";
import { expectedInvoiceDates, happyPath } from "./fixtures/data";
import { createClientViaUi } from "./flows/clients";
import { createCompanyViaUi, uploadCompanyLogoViaUi } from "./flows/companies";
import { createInvoiceViaUi } from "./flows/invoices";

test("creates a company, client, and invoice with correct totals", async ({ page }) => {
  const dates = expectedInvoiceDates();
  let invoiceId = 0;

  await test.step("create company through the UI", async () => {
    await createCompanyViaUi(page, happyPath.company);
  });

  await test.step("upload company logo through the UI", async () => {
    await uploadCompanyLogoViaUi(page);
  });

  await test.step("create client through the UI", async () => {
    await createClientViaUi(page, happyPath.client);
  });

  await test.step("create invoice through the UI", async () => {
    invoiceId = await createInvoiceViaUi(page, happyPath);
  });

  await test.step("verify invoice values, dates, and totals on the saved draft", async () => {
    await expectInvoiceFormValues(page, happyPath);
    await expectInvoiceDates(page, dates);
    await expectInvoiceTotals(page, happyPath.expected);
  });

  await test.step("verify the saved invoice survives reload and appears in the list", async () => {
    await page.reload();
    await expectInvoiceFormValues(page, happyPath);
    await expectInvoiceDates(page, dates);
    await expectInvoiceTotals(page, happyPath.expected);
    await expectInvoiceListRow(page, happyPath);
  });

  await test.step("verify invoice detail page exposes draft controls", async () => {
    await expectDraftInvoiceViewActions(page, invoiceId);
  });
});
