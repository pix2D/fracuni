import { useState } from "react";
import { responseEntityId, responseError } from "@/lib/api-response";
import type { Offer } from "@/lib/offers";
import type { OfferStatus } from "@/lib/documents";

type ActionCallback = () => Promise<void> | void;

interface UseOfferDocumentActionsOptions {
  onChanged?: ActionCallback;
  onDeleted?: ActionCallback;
}

async function run(callback: ActionCallback | undefined): Promise<void> {
  await callback?.();
}

export function useOfferDocumentActions({
  onChanged,
  onDeleted,
}: UseOfferDocumentActionsOptions = {}) {
  const [error, setError] = useState<string | null>(null);

  function clearError(): void {
    setError(null);
  }

  function openView(offer: Offer): void {
    clearError();
    window.location.href = `/offers/${offer.id}`;
  }

  function openEdit(offer: Offer): void {
    clearError();
    window.location.href = `/offers/${offer.id}/edit`;
  }

  async function handleStatus(offer: Offer, status: OfferStatus): Promise<void> {
    clearError();
    const response = await fetch(`/api/offers/${offer.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      setError(await responseError(response, "Failed to update offer status"));
      return;
    }

    await run(onChanged);
  }

  async function handleConvert(offer: Offer): Promise<void> {
    clearError();
    const response = await fetch(`/api/offers/${offer.id}/convert`, { method: "POST" });
    if (!response.ok) {
      setError(await responseError(response, "Failed to convert offer"));
      return;
    }

    const invoiceId = await responseEntityId(response);
    window.location.href = invoiceId ? `/invoices/${invoiceId}/edit` : "/invoices";
  }

  async function handleDuplicate(offer: Offer): Promise<void> {
    clearError();
    const response = await fetch(`/api/offers/${offer.id}/duplicate`, { method: "POST" });
    if (!response.ok) {
      setError(await responseError(response, "Failed to duplicate offer"));
      return;
    }

    const offerId = await responseEntityId(response);
    window.location.href = offerId ? `/offers/${offerId}/edit` : "/offers";
  }

  async function handleDelete(id: number): Promise<void> {
    clearError();
    const response = await fetch(`/api/offers/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError(await responseError(response, "Failed to delete offer"));
      return;
    }

    await run(onDeleted ?? onChanged);
  }

  return {
    error,
    openView,
    openEdit,
    handleStatus,
    handleConvert,
    handleDuplicate,
    handleDelete,
  };
}

export type OfferDocumentActions = ReturnType<typeof useOfferDocumentActions>;
