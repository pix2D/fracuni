import type { APIRoute } from "astro";
import { createCreditNoteFromInvoice } from "@/lib/document-engine";
import { handleApiError, jsonResponse, parseIdParam } from "@/lib/api";

// Create a Draft Credit Note from a Finalized Invoice: pre-fills every field with
// negated amounts and references the source's Document Number. The new Credit
// Note is returned so the client can open it for review before finalization.
export const POST: APIRoute = async ({ params }) => {
  try {
    const id = parseIdParam(params.id, "invoice");
    const creditNote = await createCreditNoteFromInvoice(id);
    return jsonResponse(creditNote, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
};
