import { DOCUMENT_TYPE } from "@/lib/documents";
import type { Money } from "@/lib/currency";
import type { Invoice } from "@/lib/invoices";

export type ListDocumentType =
  | typeof DOCUMENT_TYPE.INVOICE
  | typeof DOCUMENT_TYPE.CREDIT_NOTE
  | typeof DOCUMENT_TYPE.OFFER;

export type DocumentStatusFilter = "all" | string;
export type DocumentYearFilter = "all" | string;

export interface DocumentStatusOption {
  value: string;
  label: string;
}

export interface DocumentSummaryConfig<TDocument extends Invoice = Invoice> {
  label: string;
  include: (row: DocumentTableRow<TDocument>) => boolean;
}

export interface DocumentTableRow<TDocument extends Invoice = Invoice> {
  document: TDocument;
  number: string;
  numberValue: number;
  originalInvoiceNumber: string;
  client: string;
  issueDate: string;
  year: string;
  amount: Money | null;
  amountValue: number;
  currency: string;
  status: string;
  searchText: string;
}
