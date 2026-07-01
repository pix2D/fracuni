import { useState, useEffect, useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { SendEmailForm, type EmailDefaults } from "@/components/invoices/SendEmailForm";
import { PaperclipIcon } from "@phosphor-icons/react";
import type { Invoice } from "@/lib/invoices";

interface Props {
  invoice: Invoice | null;
  onClose: () => void;
  onSent: () => void;
  onFailedAttempt: () => void;
}

export function SendEmailDialog({ invoice, onClose, onSent, onFailedAttempt }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaults, setDefaults] = useState<EmailDefaults | null>(null);

  const load = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    setDefaults(null);
    try {
      const res = await fetch(`/api/invoices/${id}/email`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Failed to load email defaults");
        return;
      }
      setDefaults((await res.json()) as EmailDefaults);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (invoice) load(invoice.id);
  }, [invoice, load]);

  return (
    <Dialog open={invoice !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send invoice</DialogTitle>
          <DialogDescription>
            Email this document to the client. The recipient, subject and body are
            pre-filled and can be edited per send.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
            <Spinner />
            Loading...
          </div>
        ) : defaults && invoice ? (
          <>
            <div className="flex items-center gap-2 text-muted-foreground">
              <PaperclipIcon className="size-4" />
              <span>{defaults.attachmentFilename || "No PDF attached"}</span>
            </div>
            <SendEmailForm
              key={invoice.id}
              invoiceId={invoice.id}
              defaults={defaults}
              onCancel={onClose}
              onSent={onSent}
              onFailedAttempt={onFailedAttempt}
            />
          </>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No email defaults loaded</EmptyTitle>
              <EmptyDescription>Close the dialog and try again.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </DialogContent>
    </Dialog>
  );
}
