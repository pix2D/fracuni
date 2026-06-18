import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OfferForm } from "@/components/OfferForm";
import { DocumentDataTable } from "@/components/documents/DocumentDataTable";
import { OfferDocumentActionsMenu } from "@/components/offers/OfferDocumentActionsMenu";
import { OFFER_STATUS, type OfferStatus } from "@/lib/documents";
import type { Client } from "@/lib/clients";
import type { CompanyWithRelations } from "@/lib/companies";
import type { CatalogEntry } from "@/lib/service-catalog";
import type { Settings } from "@/lib/settings";
import type { Offer, OfferInput } from "@/lib/offers";

interface Props {
  company: CompanyWithRelations | null;
  clients: Client[];
  catalog: CatalogEntry[];
  settings: Settings;
}

export function OffersPage({ company, clients, catalog, settings }: Props) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [view, setView] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<Offer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOffers = useCallback(async () => {
    if (!company) return;
    const res = await fetch(`/api/offers?companyId=${company.id}`);
    if (res.ok) setOffers(await res.json());
  }, [company]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  async function handleSave(data: OfferInput) {
    const url = editing ? `/api/offers/${editing.id}` : "/api/offers";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Failed to save offer");
      return;
    }
    setError(null);
    setView("list");
    setEditing(null);
    await fetchOffers();
  }

  async function handleFinalize(data: OfferInput) {
    if (!editing) return;
    const saveRes = await fetch(`/api/offers/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!saveRes.ok) {
      const err = await saveRes.json().catch(() => ({}));
      setError(err.error || "Failed to save offer");
      return;
    }

    const res = await fetch(`/api/offers/${editing.id}/finalize`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Failed to finalize offer");
      return;
    }
    setError(null);
    setView("list");
    setEditing(null);
    await fetchOffers();
  }

  async function handleStatus(offer: Offer, status: OfferStatus) {
    const res = await fetch(`/api/offers/${offer.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Failed to update offer status");
      return;
    }
    setError(null);
    await fetchOffers();
  }

  async function handleConvert(offer: Offer) {
    const res = await fetch(`/api/offers/${offer.id}/convert`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Failed to convert offer");
      return;
    }
    // The new Draft Invoice lives on the Invoices page.
    window.location.href = "/invoices";
  }

  async function handleDuplicate(offer: Offer) {
    const res = await fetch(`/api/offers/${offer.id}/duplicate`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Failed to duplicate offer");
      return;
    }
    setError(null);
    await fetchOffers();
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/offers/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Failed to delete offer");
      return;
    }
    await fetchOffers();
  }

  function openCreate() {
    setEditing(null);
    setError(null);
    setView("form");
  }

  function openEdit(offer: Offer) {
    setEditing(offer);
    setError(null);
    setView("form");
  }

  if (!company) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Select or create a Company first to start making offers.
        </CardContent>
      </Card>
    );
  }

  if (view === "form") {
    return (
      <div className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <OfferForm
          company={company}
          clients={clients}
          catalog={catalog}
          settings={settings}
          offer={editing ?? undefined}
          onSave={handleSave}
          onFinalize={editing ? handleFinalize : undefined}
          onCancel={() => {
            setView("list");
            setEditing(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Offers</h1>
        <Button onClick={openCreate}>New Offer</Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

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
