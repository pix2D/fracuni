import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MarkPaidForm } from "@/components/invoices/MarkPaidForm";
import type { Invoice } from "@/lib/invoices";

interface Props {
  invoice: Invoice | null;
  onClose: () => void;
  onPaid: () => void;
}

export function MarkPaidDialog({ invoice, onClose, onPaid }: Props) {
  return (
    <Dialog open={invoice !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as paid</DialogTitle>
          <DialogDescription>Record the date this invoice was settled.</DialogDescription>
        </DialogHeader>

        {invoice && (
          <MarkPaidForm
            key={invoice.id}
            invoiceId={invoice.id}
            onCancel={onClose}
            onPaid={onPaid}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
