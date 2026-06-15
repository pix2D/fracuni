// Single source of truth for the document discriminator and lifecycle states
// shared by Invoices and Credit Notes. Defined as `as const` objects so call
// sites reference symbols (DOCUMENT_TYPE.INVOICE) instead of raw string literals.
// This module is free of server-only imports so it is safe in React islands.

export const DOCUMENT_TYPE = {
  INVOICE: "invoice",
  CREDIT_NOTE: "credit_note",
} as const;

export type DocumentType = (typeof DOCUMENT_TYPE)[keyof typeof DOCUMENT_TYPE];

export const INVOICE_STATUS = {
  DRAFT: "draft",
  FINALIZED: "finalized",
  SENT: "sent",
  PAID: "paid",
} as const;

export type InvoiceStatus = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];
