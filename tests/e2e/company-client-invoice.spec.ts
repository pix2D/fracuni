import { test } from "@playwright/test";
import {
  expectDraftInvoiceViewActions,
  expectInvoiceDates,
  expectInvoiceFormValues,
  expectInvoiceListRow,
  expectInvoiceTotals,
} from "./assertions/invoices";
import { expectDraftOfferViewActions } from "./assertions/offers";
import { expectedInvoiceDates, happyPath } from "./fixtures/data";
import { createClientViaUi } from "./flows/clients";
import { saveCompanyProfileViaUi, uploadCompanyLogoViaUi } from "./flows/company";
import { createInvoiceViaUi } from "./flows/invoices";
import { createOfferViaUi } from "./flows/offers";

test("creates a company profile, client, invoice, and offer with correct controls", async ({ page }) => {
  const dates = expectedInvoiceDates();
  let invoiceId = 0;
  let offerId = 0;

  await test.step("save company profile through the UI", async () => {
    await saveCompanyProfileViaUi(page, happyPath.company);
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

  await test.step("create offer through the UI", async () => {
    offerId = await createOfferViaUi(page, happyPath);
  });

  await test.step("verify offer detail page exposes draft controls", async () => {
    await expectDraftOfferViewActions(page, offerId);
  });
});
