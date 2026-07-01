// Offers are stored in the `invoices` table discriminated by type='offer'. This
// module pins that type and keeps offer lifecycle rules out of generic invoice
// callers:
//
//   issue_date         → offer date ("Datum ponude")
//   due_date           → valid-until ("Vrijedi do")
import {
  createInvoice,
  listInvoices,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  type Invoice,
  type InvoiceInput,
} from "@/lib/invoices";
import { invalidOperation, notFound } from "@/lib/app-errors";
import { DOCUMENT_TYPE, OFFER_STATUS } from "@/lib/documents";

export type Offer = Extract<Invoice, { type: typeof DOCUMENT_TYPE.OFFER }>;
export type OfferInput = Omit<InvoiceInput, "type">;

function isOffer(invoice: Invoice): invoice is Offer {
  return invoice.type === DOCUMENT_TYPE.OFFER;
}

function requireOffer(invoice: Invoice | null): Offer {
  if (!invoice || !isOffer(invoice)) throw notFound("Offer not found");
  return invoice;
}

export async function createOffer(input: OfferInput): Promise<Offer> {
  return requireOffer(await createInvoice({ ...input, type: DOCUMENT_TYPE.OFFER }));
}

export async function listOffers(): Promise<Offer[]> {
  return (await listInvoices({ type: DOCUMENT_TYPE.OFFER })).filter(isOffer);
}

export async function getOffer(id: number): Promise<Offer | null> {
  const invoice = await getInvoice(id);
  return invoice && isOffer(invoice) ? invoice : null;
}

export async function updateOffer(id: number, input: Partial<OfferInput>): Promise<Offer> {
  const current = requireOffer(await getInvoice(id));
  if (current.status !== OFFER_STATUS.DRAFT) {
    throw invalidOperation(`A ${current.status} offer is immutable and cannot be edited`);
  }

  return requireOffer(await updateInvoice(id, input));
}

export async function deleteOffer(id: number): Promise<void> {
  const current = requireOffer(await getInvoice(id));
  if (current.status !== OFFER_STATUS.DRAFT) {
    throw invalidOperation("Only Draft offers can be deleted");
  }

  await deleteInvoice(id);
}
