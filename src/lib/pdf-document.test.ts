import { describe, it, expect } from "vitest";
import {
  buildPdfDocumentData,
  buildPdfPreviewDocumentData,
  type BuildPdfDataInput,
} from "@/lib/pdf-document";
import { DOCUMENT_TYPE, INVOICE_STATUS, OFFER_STATUS } from "@/lib/documents";
import type { Invoice } from "@/lib/invoices";
import type { Company, Location, PaymentMethod } from "@/lib/companies";
import type { Client } from "@/lib/clients";

const company: Company = {
  id: 1,
  name: "Firefly One d.o.o.",
  address: "Ulica 1\n10000 Zagreb",
  phone: "+385 1 234 5678",
  oib: "12345678901",
  iban: "HR1234567890",
  swift: "ZABAHR2X",
  emailFromAddress: "info@firefly.hr",
  emailFromName: "Firefly One",
  emailSubjectTemplate: null,
  emailBodyTemplate: null,
  defaultPaymentTermsDays: 15,
  issuerName: "Ana Anić",
  legalTextDomestic: "Domaći zakonski tekst.",
  legalTextForeignHr: "Prijenos porezne obveze (čl. 17. st. 1.).",
  legalTextForeignEn: "Reverse charge (Art. 196 VAT Directive).",
  logoPath: null,
  taglineHr: "Vatreni softver",
  taglineEn: "Software on fire",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

const location: Location = {
  id: 1,
  companyId: 1,
  number: 1,
  nameHr: "Zagreb",
  nameEn: "Zagreb (EN)",
  isDefault: true,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

const paymentMethod: PaymentMethod = {
  id: 1,
  companyId: 1,
  number: 1,
  nameHr: "Transakcijski račun",
  nameEn: "Bank transfer",
  isDefault: true,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

type InvoiceDocument = Extract<Invoice, { type: typeof DOCUMENT_TYPE.INVOICE | typeof DOCUMENT_TYPE.CREDIT_NOTE }>;
type OfferDocument = Extract<Invoice, { type: typeof DOCUMENT_TYPE.OFFER }>;
type SharedDocumentFields = Omit<InvoiceDocument, "type" | "status">;

function sharedDocumentFields(): SharedDocumentFields {
  return {
    id: 10,
    companyId: 1,
    clientId: 100,
    locationId: 1,
    paymentMethodId: 1,
    currency: "EUR",
    email: null,
    issueDate: "2026-06-15",
    deliveryDate: "2026-06-15",
    dueDate: "2026-06-30",
    notesHr: null,
    notesEn: null,
    documentNumber: "1/1/1",
    originalInvoiceNumber: null,
    exchangeRateText: null,
    exchangeRateDate: null,
    pdfPathHr: null,
    pdfHashHr: null,
    pdfPathEn: null,
    pdfHashEn: null,
    paymentDate: null,
    createdAt: "2026-06-15",
    updatedAt: "2026-06-15",
    lineItems: [
      {
        id: 1,
        invoiceId: 10,
        position: 1,
        descriptionHr: "Konzultacije",
        descriptionEn: "Consulting",
        quantity: 2,
        unitPrice: 100,
      },
    ],
  };
}

function makeInvoice(overrides: Partial<InvoiceDocument> = {}): InvoiceDocument {
  return {
    ...sharedDocumentFields(),
    type: DOCUMENT_TYPE.INVOICE,
    status: INVOICE_STATUS.FINALIZED,
    ...overrides,
  };
}

function makeOffer(overrides: Partial<OfferDocument> = {}): OfferDocument {
  return {
    ...sharedDocumentFields(),
    type: DOCUMENT_TYPE.OFFER,
    status: OFFER_STATUS.FINALIZED,
    ...overrides,
  };
}

function makeClient(overrides: Partial<Client> = {}): Client {
  const base: Client = {
    id: 100,
    name: "Domaći d.o.o.",
    clientType: "business",
    country: "HR",
    address: "Klijentska 5\n21000 Split",
    oib: "98765432109",
    vatNumber: null,
    defaultCurrency: null,
    defaultPaymentTermsDays: null,
    defaultOfferValidityDays: null,
    email: null,
    archivedAt: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    taxIds: [],
  };

  return { ...base, ...overrides, clientType: overrides.clientType ?? base.clientType };
}

function input(overrides: Partial<BuildPdfDataInput> = {}): BuildPdfDataInput {
  return {
    lang: "hr",
    invoice: makeInvoice(),
    company,
    client: makeClient(),
    location,
    paymentMethod,
    vatRate: 25,
    logoDataUri: null,
    ...overrides,
  };
}

describe("buildPdfDocumentData — domestic Croatian invoice", () => {
  it("shows the Croatian title, document number and DD.MM.YYYY. dates", () => {
    const data = buildPdfDocumentData(input());
    expect(data.title).toBe("Račun");
    expect(data.documentNumber).toBe("1/1/1");
    expect(data.dates.issue).toBe("15.06.2026.");
    expect(data.dates.due).toBe("30.06.2026.");
  });

  it("computes the PDV breakdown for a domestic client", () => {
    const data = buildPdfDocumentData(input());
    expect(data.totals.subtotal).toBe("200,00");
    expect(data.totals.vat).toEqual({ rate: "25", amount: "50,00" });
    expect(data.totals.total).toBe("250,00");
    expect(data.totals.currency).toBe("EUR");
    expect(data.totals.eurEquivalent).toBeNull();
  });

  it("formats line items with EU numbers and the Croatian description", () => {
    const data = buildPdfDocumentData(input());
    expect(data.lineItems).toEqual([
      {
        position: 1,
        description: "Konzultacije",
        quantity: "2,00",
        vatPercent: "25",
        unitPrice: "100,00",
        amount: "200,00",
      },
    ]);
  });

  it("uses the domestic legal text and the Croatian company tagline", () => {
    const data = buildPdfDocumentData(input());
    expect(data.legalText).toBe("Domaći zakonski tekst.");
    expect(data.company.tagline).toBe("Vatreni softver");
    expect(data.exchangeRateText).toBeNull();
  });

  it("renders the client OIB as the primary tax id", () => {
    const data = buildPdfDocumentData(input());
    expect(data.client.taxIds).toEqual([{ label: "OIB", value: "98765432109" }]);
  });
});

describe("buildPdfDocumentData — foreign reverse-charge invoice", () => {
  const foreign = makeClient({
    name: "Acme GmbH",
    country: "DE",
    oib: null,
    vatNumber: "DE123456789",
    taxIds: [{ id: 1, clientId: 100, label: "EORI", value: "DE999" }],
  });

  it("English copy: English title, labels, and YYYY-MM-DD dates", () => {
    const data = buildPdfDocumentData(input({ lang: "en", client: foreign }));
    expect(data.title).toBe("Invoice");
    expect(data.dates.issue).toBe("2026-06-15");
    expect(data.company.taxId).toEqual({ label: "VAT", value: "HR12345678901" });
    expect(data.company.tagline).toBe("Software on fire");
    expect(data.lineItems[0]!.description).toBe("Consulting");
  });

  it("charges no PDV and shows the foreign legal text", () => {
    const dataEn = buildPdfDocumentData(input({ lang: "en", client: foreign }));
    expect(dataEn.totals.vat).toBeNull();
    expect(dataEn.totals.subtotal).toBe("200,00");
    expect(dataEn.totals.total).toBe("200,00");
    expect(dataEn.legalText).toBe("Reverse charge (Art. 196 VAT Directive).");

    const dataHr = buildPdfDocumentData(input({ lang: "hr", client: foreign }));
    expect(dataHr.legalText).toBe("Prijenos porezne obveze (čl. 17. st. 1.).");
    // The Croatian table keeps the PDV % column, at 0 for reverse charge.
    expect(dataHr.lineItems[0]!.vatPercent).toBe("0");
  });

  it("renders the VAT number plus additional tax ids", () => {
    const data = buildPdfDocumentData(input({ lang: "en", client: foreign }));
    expect(data.client.taxIds).toEqual([
      { label: "VAT", value: "DE123456789" },
      { label: "EORI", value: "DE999" },
    ]);
  });
});

describe("buildPdfDocumentData — EU business client without VAT", () => {
  const euBusinessWithoutVat = makeClient({
    name: "No VAT GmbH",
    country: "DE",
    oib: null,
    vatNumber: null,
  });

  it("charges Croatian PDV and uses the Croatian PDV legal text", () => {
    const data = buildPdfDocumentData(input({ lang: "en", client: euBusinessWithoutVat }));

    expect(data.totals.subtotal).toBe("200,00");
    expect(data.totals.vat).toEqual({ rate: "25", amount: "50,00" });
    expect(data.totals.total).toBe("250,00");
    expect(data.legalText).toBe("Domaći zakonski tekst.");
    expect(data.lineItems[0]!.vatPercent).toBe("25");
  });
});

describe("buildPdfDocumentData — non-EU outside-scope client", () => {
  const nonEuPerson = makeClient({
    name: "Taylor Client",
    clientType: "person",
    country: "US",
    oib: null,
    vatNumber: null,
  });

  it("does not charge Croatian PDV or show reverse-charge legal text", () => {
    const data = buildPdfDocumentData(input({ lang: "en", client: nonEuPerson }));

    expect(data.totals.subtotal).toBe("200,00");
    expect(data.totals.vat).toBeNull();
    expect(data.totals.total).toBe("200,00");
    expect(data.legalText).toBeNull();
    expect(data.lineItems[0]!.vatPercent).toBe("0");
  });
});

describe("buildPdfDocumentData — non-EUR invoice", () => {
  it("shows the exchange-rate text and the EUR equivalent total", () => {
    const invoice = makeInvoice({
      currency: "USD",
      exchangeRateText: "1,0823",
      exchangeRateDate: "2026-06-13",
    });
    const data = buildPdfDocumentData(input({ invoice }));

    expect(data.totals.currency).toBe("USD");
    // 250 USD domestic total -> /1.0823 EUR
    expect(data.totals.eurEquivalent).toBe("230,99");
    expect(data.exchangeRateText).toBe(
      "Tečaj na dan 13.06.2026. (zadnji dostupni prije datuma izdavanja 15.06.2026.) iznosi 1 EUR = 1,0823 USD",
    );
  });

  it("requires stored HNB proof for finalized non-EUR documents", () => {
    const invoice = makeInvoice({ currency: "USD" });

    expect(() => buildPdfDocumentData(input({ invoice }))).toThrow(
      /Non-EUR exchange rate display requires/,
    );
  });
});

describe("buildPdfDocumentData — credit note", () => {
  it("titles the document Odobrenje / Credit Note", () => {
    const cn = makeInvoice({ type: "credit_note" });
    expect(buildPdfDocumentData(input({ invoice: cn, lang: "hr" })).title).toBe("Odobrenje");
    expect(buildPdfDocumentData(input({ invoice: cn, lang: "en" })).title).toBe("Credit Note");
  });

  it("renders negative line amounts and totals from negated unit prices", () => {
    const cn = makeInvoice({
      type: "credit_note",
      lineItems: [
        {
          id: 1,
          invoiceId: 10,
          position: 1,
          descriptionHr: "Povrat konzultacija",
          descriptionEn: "Consulting refund",
          quantity: 2,
          unitPrice: -100,
        },
      ],
    });
    const data = buildPdfDocumentData(input({ invoice: cn }));

    expect(data.lineItems[0]!.unitPrice).toBe("-100,00");
    expect(data.lineItems[0]!.amount).toBe("-200,00");
    expect(data.totals.subtotal).toBe("-200,00");
    expect(data.totals.vat).toEqual({ rate: "25", amount: "-50,00" });
    expect(data.totals.total).toBe("-250,00");
  });
});

describe("buildPdfDocumentData — offer", () => {
  // On an offer row, issue_date is the offer date and due_date is the valid-until.
  const offer = makeOffer({ documentNumber: "1" });

  it("titles the document Ponuda / Offer and prefixes the number with #", () => {
    const hr = buildPdfDocumentData(input({ invoice: offer, lang: "hr" }));
    expect(hr.title).toBe("Ponuda");
    expect(hr.isOffer).toBe(true);
    expect(hr.documentNumber).toBe("#1");

    const en = buildPdfDocumentData(input({ invoice: offer, lang: "en" }));
    expect(en.title).toBe("Offer");
    expect(en.documentNumber).toBe("#1");
  });

  it("carries the offer date and valid-until through the date fields", () => {
    const data = buildPdfDocumentData(input({ invoice: offer, lang: "hr" }));
    expect(data.dates.issue).toBe("15.06.2026.");
    expect(data.dates.due).toBe("30.06.2026.");
  });
});

describe("buildPdfPreviewDocumentData", () => {
  it("renders draft placeholders and derives English issuer VAT from OIB", () => {
    const draft = makeInvoice({
      status: INVOICE_STATUS.DRAFT,
      clientId: null,
      locationId: null,
      paymentMethodId: null,
      currency: null,
      issueDate: null,
      deliveryDate: null,
      dueDate: null,
      documentNumber: null,
      lineItems: [],
    });

    const data = buildPdfPreviewDocumentData({
      lang: "en",
      invoice: draft,
      company,
      client: null,
      location: null,
      paymentMethod: null,
      vatRate: 25,
      logoDataUri: null,
    });

    expect(data.documentNumber).toBe("-");
    expect(data.company.taxId).toEqual({ label: "VAT", value: "HR12345678901" });
    expect(data.client.name).toBe("-");
    expect(data.dates.issue).toBe("-");
    expect(data.location).toBe("-");
    expect(data.paymentMethod).toBe("-");
    expect(data.lineItems).toEqual([
      {
        position: 1,
        description: "-",
        quantity: "-",
        vatPercent: "-",
        unitPrice: "-",
        amount: "-",
      },
    ]);
    expect(data.totals.total).toBe("-");
  });

  it("uses a transient preview exchange rate for draft non-EUR documents", () => {
    const draft = makeInvoice({
      status: INVOICE_STATUS.DRAFT,
      currency: "USD",
      issueDate: null,
      exchangeRateDate: null,
    });

    const data = buildPdfPreviewDocumentData({
      lang: "en",
      invoice: draft,
      company,
      client: makeClient(),
      location,
      paymentMethod,
      vatRate: 25,
      logoDataUri: null,
      previewExchangeRate: {
        ok: true,
        rateText: "1,0823",
        currency: "USD",
        unit: 1,
        issueDate: "2026-06-30",
        effectiveDate: "2026-06-29",
      },
    });

    expect(data.totals.eurEquivalent).toBe("230,99");
    expect(data.exchangeRateText).toBe(
      "The exchange rate on 2026-06-29 (latest available before the issue date 2026-06-30) is 1 EUR = 1,0823 USD",
    );
  });
});
