// Assembles the language-specific view model for a single document PDF from the
// already-loaded domain entities. Pure: no DB, no filesystem, no browser — so
// the layout decisions (tax breakdown, reverse-charge text, EU formatting, date
// formats) are unit-testable without a browser. The orchestrator
// (@/lib/pdf-generator) loads the entities and reads the logo; the template
// (@/lib/pdf-template) turns this view model into HTML.
import type { Invoice } from "@/lib/invoices";
import type { Company, Location, PaymentMethod } from "@/lib/companies";
import type { Client } from "@/lib/clients";
import type { DocumentType } from "@/lib/documents";
import { DOCUMENT_TYPE } from "@/lib/documents";
import { determineTaxTreatment, chargesCroatianPdv } from "@/lib/tax-engine";
import { computeInvoiceTotals } from "@/lib/invoice-totals";
import {
  eurEquivalent,
  exchangeRateText,
  formatEuDecimal,
  formatMoney,
  isCurrencyCode,
  lineItemAmount,
  type CurrencyCode,
} from "@/lib/currency";
import { invalidOperation } from "@/lib/app-errors";

export type PdfLang = "hr" | "en";

const BASE_CURRENCY = "EUR";

const TITLES: Record<DocumentType, Record<PdfLang, string>> = {
  [DOCUMENT_TYPE.INVOICE]: { hr: "Račun", en: "Invoice" },
  [DOCUMENT_TYPE.CREDIT_NOTE]: { hr: "Odobrenje", en: "Credit Note" },
  [DOCUMENT_TYPE.OFFER]: { hr: "Ponuda", en: "Offer" },
};

export interface PdfLineRow {
  position: number;
  description: string;
  quantity: string;
  /** Only meaningful on the Croatian table (which always shows a PDV % column). */
  vatPercent: string;
  unitPrice: string;
  amount: string;
}

export interface PdfTotals {
  subtotal: string;
  /** null for reverse-charge / outside-scope documents — no PDV line. */
  vat: { rate: string; amount: string } | null;
  total: string;
  currency: string;
  /** EUR equivalent of the total for non-EUR documents; null otherwise. */
  eurEquivalent: string | null;
}

export interface PdfDocumentData {
  lang: PdfLang;
  title: string;
  /** True for Offers: the template uses offer-date / valid-until date labels. */
  isOffer: boolean;
  documentNumber: string;
  company: {
    name: string;
    address: string;
    oib: string;
    iban: string;
    swift: string;
    phone: string;
    tagline: string | null;
    logoDataUri: string | null;
    issuerName: string;
  };
  client: {
    name: string;
    address: string | null;
    taxIds: { label: string; value: string }[];
  };
  dates: { issue: string; delivery: string | null; due: string | null };
  location: string;
  paymentMethod: string;
  lineItems: PdfLineRow[];
  totals: PdfTotals;
  exchangeRateText: string | null;
  legalText: string | null;
  notes: string | null;
}

export interface BuildPdfDataInput {
  lang: PdfLang;
  invoice: Invoice;
  company: Company;
  client: Client;
  location: Location;
  paymentMethod: PaymentMethod;
  vatRate: number;
  logoDataUri?: string | null;
}

// "YYYY-MM-DD" -> "DD.MM.YYYY." (hr) or unchanged (en, already ISO).
function formatDate(iso: string | null, lang: PdfLang): string | null {
  if (!iso) return null;
  if (lang === "en") return iso;
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}.`;
}

function pick(lang: PdfLang, hr: string | null, en: string | null): string | null {
  return lang === "hr" ? hr : (en ?? hr);
}

function requireCurrency(currency: string | null): CurrencyCode {
  if (currency && isCurrencyCode(currency)) return currency;
  throw invalidOperation(`Unsupported or missing currency: ${currency ?? "none"}`);
}

function buildTaxIds(client: Client, lang: PdfLang): { label: string; value: string }[] {
  const ids: { label: string; value: string }[] = [];
  if (client.oib) {
    ids.push({ label: "OIB", value: client.oib });
  }
  if (client.vatNumber) {
    ids.push({ label: lang === "hr" ? "PDV ID" : "VAT No.", value: client.vatNumber });
  }
  for (const extra of client.taxIds) {
    ids.push({ label: extra.label, value: extra.value });
  }
  return ids;
}

export function buildPdfDocumentData(input: BuildPdfDataInput): PdfDocumentData {
  const { lang, invoice, company, client, location, paymentMethod, vatRate } = input;

  const currency = requireCurrency(invoice.currency);
  const treatment = determineTaxTreatment({
    clientType: client.clientType,
    clientCountry: client.country,
    clientVatNumber: client.vatNumber,
  });
  const chargeVat = chargesCroatianPdv(treatment);

  const items = invoice.lineItems.map((li) => ({
    quantity: li.quantity ?? 0,
    unitPrice: li.unitPrice ?? 0,
  }));
  const totals = computeInvoiceTotals(items, currency, { chargeVat, vatRate });

  const lineItems: PdfLineRow[] = invoice.lineItems.map((li) => {
    const quantity = li.quantity ?? 0;
    const unitPrice = li.unitPrice ?? 0;
    return {
      position: li.position,
      description: pick(lang, li.descriptionHr, li.descriptionEn) ?? "",
      quantity: formatEuDecimal(quantity, 2),
      vatPercent: chargeVat ? String(vatRate) : "0",
      unitPrice: formatMoney(lineItemAmount(1, unitPrice, currency)),
      amount: formatMoney(lineItemAmount(quantity, unitPrice, currency)),
    };
  });

  const isOffer = invoice.type === DOCUMENT_TYPE.OFFER;
  const isForeignCurrency = currency !== BASE_CURRENCY && invoice.exchangeRate != null;

  // Croatian PDV → domestic legal text; reverse charge → configured foreign
  // (reverse-charge) text; non-EU outside scope → no text until the product has
  // a dedicated outside-scope legal text field.
  let legalText: string | null;
  if (treatment === "croatian-pdv") {
    legalText = company.legalTextDomestic;
  } else if (treatment === "reverse-charge") {
    legalText = pick(lang, company.legalTextForeignHr, company.legalTextForeignEn);
  } else {
    legalText = null;
  }

  return {
    lang,
    title: TITLES[invoice.type as DocumentType][lang],
    isOffer,
    // Offers display as "Ponuda #1"; the stored number is the bare sequence.
    documentNumber: invoice.documentNumber
      ? isOffer
        ? `#${invoice.documentNumber}`
        : invoice.documentNumber
      : "",
    company: {
      name: company.name,
      address: company.address,
      oib: company.oib,
      iban: company.iban,
      swift: company.swift,
      phone: company.phone,
      tagline: pick(lang, company.taglineHr, company.taglineEn),
      logoDataUri: input.logoDataUri ?? null,
      issuerName: company.issuerName,
    },
    client: {
      name: client.name,
      address: client.address,
      taxIds: buildTaxIds(client, lang),
    },
    dates: {
      issue: formatDate(invoice.issueDate, lang) ?? "",
      delivery: formatDate(invoice.deliveryDate, lang),
      due: formatDate(invoice.dueDate, lang),
    },
    location: pick(lang, location.nameHr, location.nameEn) ?? location.nameHr,
    paymentMethod: pick(lang, paymentMethod.nameHr, paymentMethod.nameEn) ?? paymentMethod.nameHr,
    lineItems,
    totals: {
      subtotal: formatMoney(totals.subtotal),
      vat:
        totals.pdv != null ? { rate: String(vatRate), amount: formatMoney(totals.pdv) } : null,
      total: formatMoney(totals.total),
      currency,
      eurEquivalent: isForeignCurrency
        ? formatMoney(eurEquivalent(totals.total, invoice.exchangeRate!))
        : null,
    },
    exchangeRateText: isForeignCurrency
      ? exchangeRateText(invoice.exchangeRate!, currency, lang)
      : null,
    legalText: legalText ?? null,
    notes: pick(lang, invoice.notesHr, invoice.notesEn),
  };
}
