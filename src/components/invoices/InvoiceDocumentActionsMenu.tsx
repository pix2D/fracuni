import { DotsThreeIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { INVOICE_STATUS } from "@/lib/documents";
import type { Invoice } from "@/lib/invoices";

interface Props {
  invoice: Invoice;
  isCreditNote: boolean;
  onOpen: (invoice: Invoice) => void;
  onSend: (invoice: Invoice) => void;
  onMarkSent: (id: number) => void;
  onMarkPaid: (invoice: Invoice) => void;
  onDuplicate: (id: number) => void;
  onDelete: (id: number) => void;
  onCreateCreditNote: (id: number) => void;
}

export function InvoiceDocumentActionsMenu({
  invoice,
  isCreditNote,
  onOpen,
  onSend,
  onMarkSent,
  onMarkPaid,
  onDuplicate,
  onDelete,
  onCreateCreditNote,
}: Props) {
  const isDraft = invoice.status === INVOICE_STATUS.DRAFT;
  const isFinalized = invoice.status === INVOICE_STATUS.FINALIZED;
  const isSent = invoice.status === INVOICE_STATUS.SENT;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" title="Document actions">
          <DotsThreeIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onOpen(invoice)}>
          {isDraft ? "Edit" : "View"}
        </DropdownMenuItem>
        {isFinalized && (
          <>
            <DropdownMenuItem onClick={() => onSend(invoice)}>Send Email</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMarkSent(invoice.id)}>Mark Sent</DropdownMenuItem>
          </>
        )}
        {isSent && <DropdownMenuItem onClick={() => onMarkPaid(invoice)}>Mark as Paid</DropdownMenuItem>}
        <DropdownMenuItem onClick={() => onDuplicate(invoice.id)}>Duplicate</DropdownMenuItem>
        {isDraft && <DropdownMenuItem onClick={() => onDelete(invoice.id)}>Delete</DropdownMenuItem>}
        {!isCreditNote && !isDraft && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onCreateCreditNote(invoice.id)}>
              Credit Note
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
