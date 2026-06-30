import { DotsThreeIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { INVOICE_STATUS } from "@/lib/documents";
import type { Invoice } from "@/lib/invoices";

interface Props {
  invoice: Invoice;
  isCreditNote: boolean;
  onView: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
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
  onView,
  onEdit,
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
      <TooltipProvider>
        <Tooltip>
          <DropdownMenuTrigger asChild>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Document actions">
                <DotsThreeIcon className="size-4" />
              </Button>
            </TooltipTrigger>
          </DropdownMenuTrigger>
          <TooltipContent>Document actions</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onView(invoice)}>View</DropdownMenuItem>
        {isDraft && <DropdownMenuItem onSelect={() => onEdit(invoice)}>Edit</DropdownMenuItem>}
        {isFinalized && (
          <>
            <DropdownMenuItem onSelect={() => onSend(invoice)}>Send Email</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onMarkSent(invoice.id)}>Mark Sent</DropdownMenuItem>
          </>
        )}
        {isSent && <DropdownMenuItem onSelect={() => onMarkPaid(invoice)}>Mark as Paid</DropdownMenuItem>}
        <DropdownMenuItem onSelect={() => onDuplicate(invoice.id)}>Duplicate</DropdownMenuItem>
        {isDraft && <DropdownMenuItem onSelect={() => onDelete(invoice.id)}>Delete</DropdownMenuItem>}
        {!isCreditNote && !isDraft && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onCreateCreditNote(invoice.id)}>
              Credit Note
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
