// Single source of truth for the document discriminator and lifecycle states.
// All three document kinds (Invoice, Credit Note, Offer) live in the `invoices`
// table, discriminated by the `type` column. Defined as `as const` objects so
// call sites reference symbols (DOCUMENT_TYPE.INVOICE) instead of raw string
// literals. This module is free of server-only imports so it is safe in React
// islands.

export const DOCUMENT_TYPE = {
  INVOICE: "invoice",
  CREDIT_NOTE: "credit_note",
  OFFER: "offer",
} as const;

export type DocumentType = (typeof DOCUMENT_TYPE)[keyof typeof DOCUMENT_TYPE];

// Invoices and Credit Notes: Draft → Finalized → Sent → Paid.
export const INVOICE_STATUS = {
  DRAFT: "draft",
  FINALIZED: "finalized",
  SENT: "sent",
  PAID: "paid",
} as const;

export type InvoiceStatus = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

// Offers: Draft → Finalized → Accepted / Rejected. Sending is out-of-band (no
// Sent status). Rejected is NOT terminal — a Client can change their mind, so it
// can move back to Finalized.
export const OFFER_STATUS = {
  DRAFT: "draft",
  FINALIZED: "finalized",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
} as const;

export type OfferStatus = (typeof OFFER_STATUS)[keyof typeof OFFER_STATUS];

// Allowed manual status moves once an Offer is past Draft (finalization is its
// own gated operation). Accepted is terminal — convert it to an Invoice instead.
export const OFFER_TRANSITIONS: Record<OfferStatus, OfferStatus[]> = {
  [OFFER_STATUS.DRAFT]: [],
  [OFFER_STATUS.FINALIZED]: [OFFER_STATUS.ACCEPTED, OFFER_STATUS.REJECTED],
  [OFFER_STATUS.ACCEPTED]: [],
  [OFFER_STATUS.REJECTED]: [OFFER_STATUS.FINALIZED],
};
