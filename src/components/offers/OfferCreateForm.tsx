import { useRef, useState } from "react";
import { DocumentLineItemsSection } from "@/components/documents/DocumentLineItemsSection";
import { DocumentNotesTotalsSection } from "@/components/documents/DocumentNotesTotalsSection";
import { useAppForm } from "@/components/forms/app-form";
import { OfferDatesSection } from "@/components/offers/OfferDatesSection";
import { OfferFormActions, OfferFormShell } from "@/components/offers/OfferFormLayout";
import { OfferPartySection } from "@/components/offers/OfferPartySection";
import {
  isDomesticOffer,
  offerCurrencyCode,
  offerDateFields,
  offerDefaults,
  offerFormDefaults,
  offerFormFields,
  offerLineItemFields,
  offerNoteFields,
  offerPayloadFromValues,
  offerTotals,
  validateOfferForm,
  type OfferSubmitIntent,
} from "@/components/offers/offer-form-model";
import { responseEntityId, responseError } from "@/lib/api-response";
import { OFFER_STATUS } from "@/lib/documents";
import type { Client } from "@/lib/clients";
import type { CompanyWithRelations } from "@/lib/companies";
import type { CatalogEntry } from "@/lib/service-catalog";
import type { Settings } from "@/lib/settings";

interface Props {
  company: CompanyWithRelations;
  clients: Client[];
  catalog: CatalogEntry[];
  settings: Settings;
}

const DEFAULT_SUBMIT_INTENT: OfferSubmitIntent = "save";

export function OfferCreateForm({ company, clients, catalog, settings }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<OfferSubmitIntent | null>(null);
  const submitIntent = useRef<OfferSubmitIntent>(DEFAULT_SUBMIT_INTENT);

  const form = useAppForm({
    defaultValues: offerDefaults({ company, clients, settings }),
    onSubmitMeta: DEFAULT_SUBMIT_INTENT,
    canSubmitWhenInvalid: true,
    validators: {
      onSubmit: ({ value }) => validateOfferForm(value, submitIntent.current, { company, clients, settings }),
    },
    onSubmitInvalid: () => {
      setError("Review the highlighted fields and try again.");
      setSubmitting(null);
    },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const domestic = isDomesticOffer(value, clients);
        const response = await fetch("/api/offers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(offerPayloadFromValues(value, domestic)),
        });

        if (!response.ok) {
          setError(await responseError(response, "Failed to create offer"));
          return;
        }

        const offerId = await responseEntityId(response);
        if (!offerId) {
          setError("The draft was created, but the server did not return its ID.");
          return;
        }

        window.location.href = `/offers/${offerId}/edit`;
      } finally {
        setSubmitting(null);
      }
    },
  });

  function submitSave() {
    submitIntent.current = "save";
    setSubmitting("save");
    void form.handleSubmit("save").catch(() => setSubmitting(null));
  }

  return (
    <OfferFormShell title="New Offer" status={OFFER_STATUS.DRAFT} error={error}>
      <form
        noValidate
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          submitSave();
        }}
      >
        <OfferPartySection
          form={form}
          fields={offerFormFields}
          company={company}
          clients={clients}
          settings={settings}
          readOnly={false}
        />
        <OfferDatesSection form={form} fields={offerDateFields} readOnly={false} />

        <form.Subscribe selector={(state) => state.values}>
          {(values = offerFormDefaults) => {
            const domestic = isDomesticOffer(values, clients);
            const currencyCode = offerCurrencyCode(values);
            const totals = offerTotals(values, clients, settings);

            return (
              <>
                <DocumentLineItemsSection
                  form={form}
                  fields={offerLineItemFields}
                  domestic={domestic}
                  currencyCode={currencyCode}
                  catalog={catalog}
                  readOnly={false}
                />
                <DocumentNotesTotalsSection
                  form={form}
                  fields={offerNoteFields}
                  domestic={domestic}
                  totals={totals}
                  vatRate={settings.defaultVatRate}
                  readOnly={false}
                />
              </>
            );
          }}
        </form.Subscribe>

        <OfferFormActions
          readOnly={false}
          canFinalize={false}
          saveLabel="Save Draft"
          submitting={submitting}
          onSave={submitSave}
        />
      </form>
    </OfferFormShell>
  );
}
