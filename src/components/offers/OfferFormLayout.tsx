import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import { OFFER_STATUS, type OfferStatus } from "@/lib/documents";

export function OfferFormShell({
  title,
  status,
  documentNumber,
  error,
  children,
}: {
  title: string;
  status: OfferStatus;
  documentNumber?: string | null;
  error: string | null;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {documentNumber && (
            <p className="text-sm text-muted-foreground">
              Offer Number <span className="font-medium text-foreground">{documentNumber}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Badge variant={status === OFFER_STATUS.DRAFT ? "secondary" : "default"}>{status}</Badge>
          <Button asChild variant="outline">
            <a href="/offers">Back to Offers</a>
          </Button>
        </div>
      </div>

      <FormErrorBanner error={error} />
      {children}
    </div>
  );
}

export function OfferReadOnlyNotice({ status }: { status: OfferStatus }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
      This offer is {status} and is read-only.
    </div>
  );
}

export function OfferFormActions({
  readOnly,
  canFinalize,
  saveLabel,
  submitting,
  onSave,
  onFinalize,
}: {
  readOnly: boolean;
  canFinalize: boolean;
  saveLabel: string;
  submitting: "save" | "finalize" | null;
  onSave: () => void;
  onFinalize?: () => void;
}) {
  const busy = submitting !== null;

  if (readOnly) {
    return (
      <div className="flex justify-end border-t pt-6">
        <Button asChild type="button" variant="outline">
          <a href="/offers">Close</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-end gap-2 border-t pt-6">
      <Button asChild type="button" variant="outline">
        <a href="/offers">Cancel</a>
      </Button>
      <Button type="button" variant="secondary" onClick={onSave} disabled={busy}>
        {submitting === "save" ? "Saving..." : saveLabel}
      </Button>
      {canFinalize && (
        <Button type="button" onClick={onFinalize} disabled={busy}>
          {submitting === "finalize" ? "Finalizing..." : "Finalize"}
        </Button>
      )}
    </div>
  );
}
