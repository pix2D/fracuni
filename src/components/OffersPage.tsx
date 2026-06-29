import { useState, useEffect, useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { DocumentDataTable } from "@/components/documents/DocumentDataTable";
import { OfferDocumentActionsMenu } from "@/components/offers/OfferDocumentActionsMenu";
import { responseEntityId, responseError } from "@/lib/api-response";
import { OFFER_STATUS, type OfferStatus } from "@/lib/documents";
import type { Client } from "@/lib/clients";
import type { CompanyWithRelations } from "@/lib/companies";
import type { Settings } from "@/lib/settings";
import type { Offer } from "@/lib/offers";

interface Props {
  company: CompanyWithRelations | null;
  clients: Client[];
  settings: Settings;
}

export function OffersPage({ company, clients, settings }: Props) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchOffers = useCallback(async () => {
    if (!company) return;
    const res = await fetch(`/api/offers?companyId=${company.id}`);
    if (res.ok) setOffers(await res.json());
  }, [company]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  async function handleStatus(offer: Offer, status: OfferStatus) {
    const res = await fetch(`/api/offers/${offer.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setError(await responseError(res, "Failed to update offer status"));
      return;
    }
    setError(null);
    await fetchOffers();
  }

  async function handleConvert(offer: Offer) {
    const res = await fetch(`/api/offers/${offer.id}/convert`, { method: "POST" });
    if (!res.ok) {
      setError(await responseError(res, "Failed to convert offer"));
      return;
    }
    const invoiceId = await responseEntityId(res);
    window.location.href = invoiceId ? `/invoices/${invoiceId}/edit` : "/invoices";
  }

  async function handleDuplicate(offer: Offer) {
    const res = await fetch(`/api/offers/${offer.id}/duplicate`, { method: "POST" });
    if (!res.ok) {
      setError(await responseError(res, "Failed to duplicate offer"));
      return;
    }
    setError(null);
    const offerId = await responseEntityId(res);
    window.location.href = offerId ? `/offers/${offerId}/edit` : "/offers";
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/offers/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(await responseError(res, "Failed to delete offer"));
      return;
    }
    await fetchOffers();
  }

  function openEdit(offer: Offer) {
    window.location.href = `/offers/${offer.id}/edit`;
  }

  if (!company) {
    return (
      <Empty className="border border-border">
        <EmptyHeader>
          <EmptyTitle>No company selected</EmptyTitle>
          <EmptyDescription>Select or create a company first to start making offers.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Offers</h1>
        <Button asChild>
          <a href="/offers/new">New Offer</a>
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <DocumentDataTable
        documents={offers}
        clients={clients}
        settings={settings}
        empty="No offers match. Create your first Draft to get started."
        documentLabel={{ singular: "offer", plural: "offers" }}
        dateLabel="Datum ponude"
        statusOptions={[
          { value: OFFER_STATUS.DRAFT, label: "Draft" },
          { value: OFFER_STATUS.FINALIZED, label: "Finalized" },
          { value: OFFER_STATUS.ACCEPTED, label: "Accepted" },
          { value: OFFER_STATUS.REJECTED, label: "Rejected" },
        ]}
        summary={[{ label: "Total", include: () => true }]}
        numberFormatter={(offer) => (offer.documentNumber ? `#${offer.documentNumber}` : "-")}
        renderActions={(offer) => (
          <OfferDocumentActionsMenu
            offer={offer}
            onOpen={openEdit}
            onStatus={handleStatus}
            onConvert={handleConvert}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        )}
      />
    </div>
  );
}
