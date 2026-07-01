import { useState, useEffect, useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { DocumentDataTable } from "@/components/documents/DocumentDataTable";
import { OfferDocumentActionsMenu } from "@/components/offers/OfferDocumentActionsMenu";
import { useOfferDocumentActions } from "@/components/offers/useOfferDocumentActions";
import { OFFER_STATUS } from "@/lib/documents";
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

  const fetchOffers = useCallback(async () => {
    if (!company) return;
    const res = await fetch("/api/offers");
    if (res.ok) setOffers(await res.json());
  }, [company]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const actions = useOfferDocumentActions({
    onChanged: fetchOffers,
    onDeleted: fetchOffers,
  });

  if (!company) {
    return (
      <Empty className="border border-border">
        <EmptyHeader>
          <EmptyTitle>Company profile missing</EmptyTitle>
          <EmptyDescription>Set up the company profile first to start making offers.</EmptyDescription>
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

      {actions.error ? (
        <Alert variant="destructive">
          <AlertDescription>{actions.error}</AlertDescription>
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
            onView={actions.openView}
            onEdit={actions.openEdit}
            onStatus={actions.handleStatus}
            onConvert={actions.handleConvert}
            onDuplicate={actions.handleDuplicate}
            onDelete={actions.handleDelete}
          />
        )}
      />
    </div>
  );
}
