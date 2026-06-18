// Offers are stored in the `invoices` table discriminated by type='offer', so
// this module is a thin façade over @/lib/invoices that pins the type and reads
// the offer-specific column meanings:
//
//   issue_date         → offer date ("Datum ponude")
//   due_date           → valid-until ("Vrijedi do")
//
// getOffer / updateOffer / deleteOffer are the (type-agnostic, id-keyed) invoice
// functions re-exported under offer names so callers read clearly.
import {
  createInvoice,
  listInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  type Invoice,
  type InvoiceInput,
} from "@/lib/invoices";
import { DOCUMENT_TYPE } from "@/lib/documents";

export type Offer = Invoice;
export type OfferInput = Omit<InvoiceInput, "type">;

export async function createOffer(input: OfferInput): Promise<Offer> {
  return createInvoice({ ...input, type: DOCUMENT_TYPE.OFFER });
}

export async function listOffers(companyId?: number): Promise<Offer[]> {
  return listInvoices({ companyId, type: DOCUMENT_TYPE.OFFER });
}

export const getOffer = getInvoice;
export const updateOffer = updateInvoice;
export const deleteOffer = deleteInvoice;
