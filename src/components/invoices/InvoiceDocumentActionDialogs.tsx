import { MarkPaidDialog } from "@/components/MarkPaidDialog";
import { SendEmailDialog } from "@/components/SendEmailDialog";
import type { InvoiceDocumentActions } from "@/components/invoices/useInvoiceDocumentActions";

export function InvoiceDocumentActionDialogs({ actions }: { actions: InvoiceDocumentActions }) {
  return (
    <>
      <SendEmailDialog invoice={actions.sending} onClose={actions.closeSend} onSent={actions.handleSent} />
      <MarkPaidDialog invoice={actions.paying} onClose={actions.closePay} onPaid={actions.handlePaid} />
    </>
  );
}
