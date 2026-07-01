import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OFFER_STATUS } from "@/lib/documents";
import type { Offer } from "@/lib/offers";
import { useOfferDocumentActions } from "@/components/offers/useOfferDocumentActions";
import type { PdfLang } from "@/lib/pdf-document";

interface Props {
  offer: Offer;
  defaultLang: PdfLang;
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === OFFER_STATUS.DRAFT) return "secondary";
  if (status === OFFER_STATUS.REJECTED) return "destructive";
  if (status === OFFER_STATUS.ACCEPTED) return "default";
  return "outline";
}

function FieldRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-[11px] break-all" : "font-medium"}>{value || "-"}</dd>
    </div>
  );
}

function PdfStatus({ offer }: { offer: Offer }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>PDFs</CardTitle>
        <CardDescription>Stored generated artifacts for finalized offers.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2">
          <FieldRow label="Croatian" value={offer.pdfPathHr ? "Generated" : "Not generated"} />
          <FieldRow label="English" value={offer.pdfPathEn ? "Generated" : "Not generated"} />
          {offer.pdfHashHr && <FieldRow label="HR hash" value={offer.pdfHashHr} mono />}
          {offer.pdfHashEn && <FieldRow label="EN hash" value={offer.pdfHashEn} mono />}
        </dl>
      </CardContent>
    </Card>
  );
}

function LifecycleStatus({ offer }: { offer: Offer }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Lifecycle</CardTitle>
        <CardDescription>Current offer state and available next moves.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2">
          <FieldRow label="Status" value={offer.status} />
          {offer.status === OFFER_STATUS.DRAFT ? (
            <FieldRow label="Next" value="Finalize from the edit screen." />
          ) : offer.status === OFFER_STATUS.FINALIZED ? (
            <FieldRow label="Next" value="Accept or reject." />
          ) : offer.status === OFFER_STATUS.REJECTED ? (
            <FieldRow label="Next" value="Reopen if the client changes their mind." />
          ) : (
            <FieldRow label="Next" value="Convert to an invoice." />
          )}
        </dl>
      </CardContent>
    </Card>
  );
}

export function OfferView({ offer, defaultLang }: Props) {
  const [lang, setLang] = useState<PdfLang>(defaultLang);
  const isDraft = offer.status === OFFER_STATUS.DRAFT;
  const isFinalized = offer.status === OFFER_STATUS.FINALIZED;
  const isRejected = offer.status === OFFER_STATUS.REJECTED;
  const isAccepted = offer.status === OFFER_STATUS.ACCEPTED;
  const actions = useOfferDocumentActions({
    onChanged: () => window.location.reload(),
    onDeleted: () => {
      window.location.href = "/offers";
    },
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">View Offer</h1>
          <p className="text-sm text-muted-foreground">
            Offer Number{" "}
            <span className="font-medium text-foreground">
              {offer.documentNumber ? `#${offer.documentNumber}` : "Draft"}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge variant={statusVariant(offer.status)}>{offer.status}</Badge>
          {isDraft && (
            <Button asChild variant="secondary">
              <a href={`/offers/${offer.id}/edit`}>Edit Draft</a>
            </Button>
          )}
          {isFinalized && (
            <>
              <Button type="button" onClick={() => actions.handleStatus(offer, OFFER_STATUS.ACCEPTED)}>
                Accept
              </Button>
              <Button type="button" variant="secondary" onClick={() => actions.handleStatus(offer, OFFER_STATUS.REJECTED)}>
                Reject
              </Button>
            </>
          )}
          {isRejected && (
            <Button type="button" onClick={() => actions.handleStatus(offer, OFFER_STATUS.FINALIZED)}>
              Reopen
            </Button>
          )}
          {isAccepted && (
            <Button type="button" onClick={() => actions.handleConvert(offer)}>
              Convert to Invoice
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => actions.handleDuplicate(offer)}>
            Duplicate
          </Button>
          {isDraft && (
            <Button type="button" variant="destructive" onClick={() => actions.handleDelete(offer.id)}>
              Delete
            </Button>
          )}
          <Button asChild variant="outline">
            <a href="/offers">Back to Offers</a>
          </Button>
        </div>
      </div>

      {actions.error ? (
        <Alert variant="destructive">
          <AlertDescription>{actions.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-3">
          <Tabs value={lang} onValueChange={(value) => setLang(value as PdfLang)}>
            <TabsList aria-label="Preview language">
              <TabsTrigger value="hr">HR</TabsTrigger>
              <TabsTrigger value="en">EN</TabsTrigger>
            </TabsList>
          </Tabs>
          <iframe
            key={lang}
            title="Offer preview"
            src={`/api/offers/${offer.id}/preview?lang=${lang}`}
            className="h-[calc(100vh-13rem)] min-h-[760px] w-full border border-border bg-white"
          />
        </div>

        <aside className="space-y-4">
          <LifecycleStatus offer={offer} />
          <PdfStatus offer={offer} />
        </aside>
      </div>
    </div>
  );
}
