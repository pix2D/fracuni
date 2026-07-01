const DAY_IN_MS = 24 * 60 * 60 * 1000;

function startOfToday(): Date {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_IN_MS);
}

function formatDateButton(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}.`;
}

export const happyPath = {
  company: {
    name: "Pixelduo E2E d.o.o.",
    oib: "12345678903",
    address: "Ilica 1\n10000 Zagreb\nCroatia",
    phone: "+385 1 555 0100",
    issuerName: "Maja Testic",
    defaultPaymentTermsDays: 30,
    taglineHr: "Digitalni proizvodi",
    taglineEn: "Digital products",
    iban: "HR1210010051863000160",
    swift: "ZABAHR2X",
    legalTextServiceDomesticHr: "PDV je obracunat prema vazecim propisima.",
    legalTextServiceEuB2cHr: "PDV je obracunat za EU B2C uslugu.",
    legalTextServiceEuB2cEn: "VAT is charged for an EU B2C service.",
    legalTextServiceEuB2bReverseChargeHr: "Prijenos porezne obveze.",
    legalTextServiceEuB2bReverseChargeEn: "Reverse charge applies where required.",
    legalTextServiceEuB2bWithoutVatIdHr: "PDV je obracunat jer kupac nema PDV ID.",
    legalTextServiceEuB2bWithoutVatIdEn: "VAT is charged because the client has no VAT ID.",
    legalTextServiceNonEuB2cHr: "Isporuka izvan podrucja PDV-a.",
    legalTextServiceNonEuB2cEn: "Supply outside the scope of VAT.",
    legalTextServiceNonEuB2bHr: "Usluga poslovnom kupcu izvan EU nije predmet PDV-a.",
    legalTextServiceNonEuB2bEn: "Service to a non-EU B2B client is outside the scope of VAT.",
    emailFromAddress: "invoices@pixelduo.test",
    emailFromName: "Pixelduo Finance",
    emailSubjectTemplate: "Racun {broj} - {kupac}",
    emailBodyTemplate: "Postovani,\n\nu privitku saljemo racun {broj}.",
    location: {
      number: 1,
      nameHr: "Zagreb",
      nameEn: "Zagreb",
      selectLabel: "1 - Zagreb",
    },
    paymentMethod: {
      number: 1,
      nameHr: "Transakcijski racun",
      nameEn: "Bank transfer",
      selectLabel: "1 - Transakcijski racun",
    },
  },
  client: {
    name: "Acme Croatia d.o.o.",
    type: "B2B",
    country: "Croatia",
    address: "Radnicka cesta 10\n10000 Zagreb",
    oib: "98765432109",
    email: "accounts@acme-croatia.test",
    defaultCurrency: "EUR",
    defaultPaymentTermsDays: 14,
    defaultOfferValidityDays: 30,
  },
  invoice: {
    descriptionHr: "Razvoj MVP aplikacije",
    quantity: "2",
    unitPrice: "100",
    notesHr: "Hvala na suradnji.",
  },
  offer: {
    descriptionHr: "Dizajn prototipa",
    quantity: "1",
    unitPrice: "150",
    notesHr: "Ponuda vrijedi prema navedenom roku.",
  },
  expected: {
    subtotal: "200,00 EUR",
    pdv: "50,00 EUR",
    total: "250,00 EUR",
  },
} as const;

export function expectedInvoiceDates() {
  const issueDate = startOfToday();
  return {
    issueDate: formatDateButton(issueDate),
    deliveryDate: formatDateButton(issueDate),
    dueDate: formatDateButton(addDays(issueDate, happyPath.client.defaultPaymentTermsDays)),
  };
}
