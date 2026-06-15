// Turns a PdfDocumentData view model into a self-contained HTML document for
// the headless browser (Playwright/Chromium) to print. All CSS is inline and
// the logo is embedded as a data URI,
// so the renderer needs no network access or asset resolution. Pure string
// building — unit-tested without a browser.
import type { PdfDocumentData, PdfLang } from "@/lib/pdf-document";

interface Labels {
  issuer: string;
  client: string;
  issueDate: string;
  deliveryDate: string;
  dueDate: string;
  offerDate: string;
  validUntil: string;
  colNo: string;
  colDesc: string;
  colQty: string;
  colVat: string;
  colPrice: string;
  colAmount: string;
  subtotal: string;
  total: string;
  eurEquiv: string;
  place: string;
  paymentMethod: string;
  issuedBy: string;
  notes: string;
}

const LABELS: Record<PdfLang, Labels> = {
  hr: {
    issuer: "Izdavatelj",
    client: "Kupac",
    issueDate: "Datum izdavanja",
    deliveryDate: "Datum isporuke",
    dueDate: "Dospijeće računa",
    offerDate: "Datum ponude",
    validUntil: "Vrijedi do",
    colNo: "R.br.",
    colDesc: "Naziv robe/usluge",
    colQty: "Kol.",
    colVat: "PDV %",
    colPrice: "Cijena",
    colAmount: "Iznos",
    subtotal: "Osnovica",
    total: "UKUPNO ZA PLATITI",
    eurEquiv: "Protuvrijednost u EUR",
    place: "Mjesto izdavanja",
    paymentMethod: "Način plaćanja",
    issuedBy: "Izdavatelj računa",
    notes: "Napomena",
  },
  en: {
    issuer: "Issuer",
    client: "Client",
    issueDate: "Issue date",
    deliveryDate: "Delivery date",
    dueDate: "Due date",
    offerDate: "Offer date",
    validUntil: "Valid until",
    colNo: "ID",
    colDesc: "Service Description",
    colQty: "Qty.",
    colVat: "",
    colPrice: "Price",
    colAmount: "Amount",
    subtotal: "Subtotal",
    total: "TOTAL",
    eurEquiv: "EUR equivalent",
    place: "Place of issue",
    paymentMethod: "Payment method",
    issuedBy: "Issued by",
    notes: "Notes",
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Escapes then preserves author line breaks (addresses, notes).
function multiline(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

const STYLES = `
  * { box-sizing: border-box; }
  body {
    font-family: "Helvetica Neue", Arial, sans-serif;
    color: #1a1a1a;
    font-size: 11px;
    margin: 0;
    padding: 32px 36px;
  }
  .header { display: flex; justify-content: space-between; align-items: flex-start; }
  .brand { display: flex; gap: 14px; align-items: center; }
  .brand img { max-height: 56px; max-width: 160px; }
  .company-name { font-size: 16px; font-weight: 700; }
  .tagline { color: #666; font-size: 11px; }
  .doc-meta { text-align: right; }
  .doc-title { font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
  .doc-number { font-size: 13px; color: #333; margin-top: 2px; }
  .bank-bar {
    margin: 12px 0 20px;
    padding: 7px 10px;
    background: #f3f4f6;
    border-radius: 4px;
    font-size: 10px;
    color: #444;
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }
  .parties { display: flex; gap: 28px; margin-bottom: 18px; }
  .party { flex: 1; }
  .party h3 { margin: 0 0 4px; font-size: 10px; text-transform: uppercase; color: #888; letter-spacing: 0.6px; }
  .party .name { font-weight: 700; }
  .party .line { white-space: pre-line; }
  .dates { display: flex; gap: 24px; margin-bottom: 16px; font-size: 10.5px; }
  .dates .label { color: #888; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  table.items th, table.items td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
  table.items thead th { background: #f3f4f6; text-align: left; font-size: 10px; text-transform: uppercase; color: #555; }
  table.items td.num, table.items th.num { text-align: right; }
  .totals { width: 50%; margin-left: auto; }
  .totals .row { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .grand { font-weight: 700; font-size: 13px; border-top: 2px solid #1a1a1a; padding-top: 6px; margin-top: 4px; }
  .totals .eur { color: #555; font-size: 10.5px; }
  .legal, .exchange, .notes { margin-top: 16px; font-size: 10.5px; color: #333; }
  .notes .body { white-space: pre-line; }
  .footer { margin-top: 28px; display: flex; justify-content: space-between; font-size: 10px; color: #555; border-top: 1px solid #e5e7eb; padding-top: 10px; }
`;

function dateRow(label: string, value: string | null): string {
  if (!value) return "";
  return `<div><span class="label">${escapeHtml(label)}:</span> ${escapeHtml(value)}</div>`;
}

function lineItemRows(data: PdfDocumentData, showVat: boolean): string {
  return data.lineItems
    .map((item) => {
      const vatCell = showVat ? `<td class="num">${escapeHtml(item.vatPercent)}</td>` : "";
      return `<tr>
        <td class="num">${escapeHtml(String(item.position))}</td>
        <td>${escapeHtml(item.description)}</td>
        <td class="num">${escapeHtml(item.quantity)}</td>
        ${vatCell}
        <td class="num">${escapeHtml(item.unitPrice)}</td>
        <td class="num">${escapeHtml(item.amount)}</td>
      </tr>`;
    })
    .join("\n");
}

export function renderDocumentHtml(data: PdfDocumentData): string {
  const labels = LABELS[data.lang];
  const showVat = data.lang === "hr";

  const logo = data.company.logoDataUri
    ? `<img src="${escapeHtml(data.company.logoDataUri)}" alt="">`
    : "";

  const tagline = data.company.tagline
    ? `<div class="tagline">${escapeHtml(data.company.tagline)}</div>`
    : "";

  const clientTaxIds = data.client.taxIds
    .map((t) => `<div class="line">${escapeHtml(t.label)}: ${escapeHtml(t.value)}</div>`)
    .join("\n");

  const headers = [
    `<th class="num">${escapeHtml(labels.colNo)}</th>`,
    `<th>${escapeHtml(labels.colDesc)}</th>`,
    `<th class="num">${escapeHtml(labels.colQty)}</th>`,
    showVat ? `<th class="num">${escapeHtml(labels.colVat)}</th>` : "",
    `<th class="num">${escapeHtml(labels.colPrice)}</th>`,
    `<th class="num">${escapeHtml(labels.colAmount)}</th>`,
  ].join("");

  const vatRow = data.totals.vat
    ? `<div class="row"><span>${labels.subtotal}</span><span>${escapeHtml(data.totals.subtotal)} ${escapeHtml(data.totals.currency)}</span></div>
       <div class="row"><span>PDV (${escapeHtml(data.totals.vat.rate)}%)</span><span>${escapeHtml(data.totals.vat.amount)} ${escapeHtml(data.totals.currency)}</span></div>`
    : "";

  const eurRow = data.totals.eurEquivalent
    ? `<div class="row eur"><span>${labels.eurEquiv}</span><span>${escapeHtml(data.totals.eurEquivalent)} EUR</span></div>`
    : "";

  const exchange = data.exchangeRateText
    ? `<div class="exchange">${escapeHtml(data.exchangeRateText)}</div>`
    : "";

  const legal = data.legalText ? `<div class="legal">${multiline(data.legalText)}</div>` : "";

  const notes = data.notes
    ? `<div class="notes"><strong>${labels.notes}</strong><div class="body">${multiline(data.notes)}</div></div>`
    : "";

  return `<!DOCTYPE html>
<html lang="${data.lang}">
<head>
  <meta charset="utf-8">
  <style>${STYLES}</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      ${logo}
      <div>
        <div class="company-name">${escapeHtml(data.company.name)}</div>
        ${tagline}
      </div>
    </div>
    <div class="doc-meta">
      <div class="doc-title">${escapeHtml(data.title)}</div>
      <div class="doc-number">${escapeHtml(data.documentNumber)}</div>
    </div>
  </div>

  <div class="bank-bar">
    <span>IBAN: ${escapeHtml(data.company.iban)}</span>
    <span>SWIFT: ${escapeHtml(data.company.swift)}</span>
    <span>OIB: ${escapeHtml(data.company.oib)}</span>
    <span>Tel: ${escapeHtml(data.company.phone)}</span>
  </div>

  <div class="parties">
    <div class="party">
      <h3>${escapeHtml(labels.issuer)}</h3>
      <div class="name">${escapeHtml(data.company.name)}</div>
      <div class="line">${multiline(data.company.address)}</div>
      <div class="line">OIB: ${escapeHtml(data.company.oib)}</div>
    </div>
    <div class="party">
      <h3>${escapeHtml(labels.client)}</h3>
      <div class="name">${escapeHtml(data.client.name)}</div>
      ${data.client.address ? `<div class="line">${multiline(data.client.address)}</div>` : ""}
      ${clientTaxIds}
    </div>
  </div>

  <div class="dates">
    ${dateRow(data.isOffer ? labels.offerDate : labels.issueDate, data.dates.issue)}
    ${dateRow(labels.deliveryDate, data.dates.delivery)}
    ${dateRow(data.isOffer ? labels.validUntil : labels.dueDate, data.dates.due)}
  </div>

  <table class="items">
    <thead><tr>${headers}</tr></thead>
    <tbody>
      ${lineItemRows(data, showVat)}
    </tbody>
  </table>

  <div class="totals">
    ${vatRow}
    <div class="row grand"><span>${labels.total}</span><span>${escapeHtml(data.totals.total)} ${escapeHtml(data.totals.currency)}</span></div>
    ${eurRow}
  </div>

  ${exchange}
  ${legal}
  ${notes}

  <div class="footer">
    <span>${escapeHtml(labels.place)}: ${escapeHtml(data.location)}</span>
    <span>${escapeHtml(labels.paymentMethod)}: ${escapeHtml(data.paymentMethod)}</span>
    <span>${escapeHtml(labels.issuedBy)}: ${escapeHtml(data.company.issuerName)}</span>
  </div>
</body>
</html>`;
}
