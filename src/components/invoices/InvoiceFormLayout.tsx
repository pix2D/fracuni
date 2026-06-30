import type { ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DOCUMENT_TYPE, INVOICE_STATUS, type InvoiceStatus } from "@/lib/documents";
import type { InvoiceDocumentType } from "@/components/invoices/invoice-form-model";

export function invoiceRouteBase(documentType: InvoiceDocumentType): "/invoices" | "/credit-notes" {
  return documentType === DOCUMENT_TYPE.CREDIT_NOTE ? "/credit-notes" : "/invoices";
}

export function invoiceNoun(documentType: InvoiceDocumentType): "Invoice" | "Credit Note" {
  return documentType === DOCUMENT_TYPE.CREDIT_NOTE ? "Credit Note" : "Invoice";
}

export function InvoiceFormShell({
  title,
  documentType,
  status,
  documentNumber,
  originalInvoiceNumber,
  error,
  children,
  aside,
}: {
  title: string;
  documentType: InvoiceDocumentType;
  status: InvoiceStatus;
  documentNumber?: string | null;
  originalInvoiceNumber?: string | null;
  error: string | null;
  children: ReactNode;
  aside?: ReactNode;
}) {
  const base = invoiceRouteBase(documentType);
  const noun = invoiceNoun(documentType);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {documentNumber && (
            <p className="text-sm text-muted-foreground">
              Document Number <span className="font-medium text-foreground">{documentNumber}</span>
            </p>
          )}
          {originalInvoiceNumber && (
            <p className="text-sm text-muted-foreground">
              Credit Note for Invoice <span className="font-medium text-foreground">{originalInvoiceNumber}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {aside}
          <Badge variant={status === INVOICE_STATUS.DRAFT ? "secondary" : "default"}>{status}</Badge>
          <Button asChild variant="outline">
            <a href={base}>Back to {noun}s</a>
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {children}
    </div>
  );
}

export function InvoiceReadOnlyNotice({ documentType, status }: { documentType: InvoiceDocumentType; status: InvoiceStatus }) {
  return (
    <Alert>
      <AlertDescription>
        This {invoiceNoun(documentType).toLowerCase()} is {status} and is read-only.
      </AlertDescription>
    </Alert>
  );
}

export function InvoiceFormActions({
  documentType,
  readOnly,
  canFinalize,
  saveLabel,
  finalizeLabel = "Finalize",
  submitting,
  onSave,
  onFinalize,
}: {
  documentType: InvoiceDocumentType;
  readOnly: boolean;
  canFinalize: boolean;
  saveLabel: string;
  finalizeLabel?: string;
  submitting: "save" | "finalize" | null;
  onSave: () => void;
  onFinalize?: () => void;
}) {
  const base = invoiceRouteBase(documentType);
  const busy = submitting !== null;

  if (readOnly) {
    return (
      <div className="flex justify-end border-t pt-6">
        <Button asChild type="button" variant="outline">
          <a href={base}>Close</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-end gap-2 border-t pt-6">
      <Button asChild type="button" variant="outline">
        <a href={base}>Cancel</a>
      </Button>
      <Button type="button" variant="secondary" onClick={onSave} disabled={busy}>
        {submitting === "save" ? "Saving..." : saveLabel}
      </Button>
      {canFinalize && (
        <Button type="button" onClick={onFinalize} disabled={busy}>
          {submitting === "finalize" ? "Finalizing..." : finalizeLabel}
        </Button>
      )}
    </div>
  );
}
