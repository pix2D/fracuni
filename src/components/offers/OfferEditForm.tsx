import { useRef, useState } from "react";
import { DocumentLineItemsSection } from "@/components/documents/DocumentLineItemsSection";
import { DocumentNotesTotalsSection } from "@/components/documents/DocumentNotesTotalsSection";
import { useAppForm } from "@/components/forms/app-form";
import { OfferDatesSection } from "@/components/offers/OfferDatesSection";
import {
  OfferFormActions,
  OfferFormShell,
  OfferReadOnlyNotice,
} from "@/components/offers/OfferFormLayout";
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
import { responseError } from "@/lib/api-response";
import { OFFER_STATUS } from "@/lib/documents";
import type { Client } from "@/lib/clients";
import type { CompanyWithRelations } from "@/lib/companies";
import type { Offer } from "@/lib/offers";
import type { CatalogEntry } from "@/lib/service-catalog";
import type { Settings } from "@/lib/settings";

interface Props {
  company: CompanyWithRelations;
  clients: Client[];
  catalog: CatalogEntry[];
  settings: Settings;
  offer: Offer;
}

const DEFAULT_SUBMIT_INTENT: OfferSubmitIntent = "save";

export function OfferEditForm({ company, clients, catalog, settings, offer }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<OfferSubmitIntent | null>(null);
  const submitIntent = useRef<OfferSubmitIntent>(DEFAULT_SUBMIT_INTENT);
  const readOnly = offer.status !== OFFER_STATUS.DRAFT;
  const title = readOnly ? "View Offer" : "Edit Offer";

  const form = useAppForm({
    defaultValues: offerDefaults({ company, clients, settings, offer }),
    onSubmitMeta: DEFAULT_SUBMIT_INTENT,
    canSubmitWhenInvalid: true,
    validators: {
      onSubmit: ({ value }) => validateOfferForm(value, submitIntent.current, { company, clients, settings }),
    },
    onSubmitInvalid: () => {
      setError("Review the highlighted fields and try again.");
      setSubmitting(null);
    },
    onSubmit: async ({ value, meta }) => {
      setError(null);
      try {
        const domestic = isDomesticOffer(value, clients);
        const saveResponse = await fetch(`/api/offers/${offer.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(offerPayloadFromValues(value, domestic)),
        });

        if (!saveResponse.ok) {
          setError(await responseError(saveResponse, "Failed to save offer"));
          return;
        }

        if (meta === "save") {
          window.location.href = "/offers";
          return;
        }

        const finalizeResponse = await fetch(`/api/offers/${offer.id}/finalize`, { method: "POST" });
        if (!finalizeResponse.ok) {
          setError(await responseError(finalizeResponse, "Failed to finalize offer"));
          return;
        }

        window.location.href = "/offers";
      } finally {
        setSubmitting(null);
      }
    },
  });

  function submit(intent: OfferSubmitIntent) {
    submitIntent.current = intent;
    setSubmitting(intent);
    void form.handleSubmit(intent).catch(() => setSubmitting(null));
  }

  return (
    <OfferFormShell title={title} status={offer.status} documentNumber={offer.documentNumber} error={error}>
      <form
        noValidate
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          submit("save");
        }}
      >
        {readOnly && <OfferReadOnlyNotice status={offer.status} />}

        <OfferPartySection
          form={form}
          fields={offerFormFields}
          company={company}
          clients={clients}
          settings={settings}
          readOnly={readOnly}
        />
        <OfferDatesSection form={form} fields={offerDateFields} readOnly={readOnly} />

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
                  readOnly={readOnly}
                />
                <DocumentNotesTotalsSection
                  form={form}
                  fields={offerNoteFields}
                  domestic={domestic}
                  totals={totals}
                  vatRate={settings.defaultVatRate}
                  readOnly={readOnly}
                />
              </>
            );
          }}
        </form.Subscribe>

        <OfferFormActions
          readOnly={readOnly}
          canFinalize={!readOnly}
          saveLabel="Save Draft"
          submitting={submitting}
          onSave={() => submit("save")}
          onFinalize={() => submit("finalize")}
        />
      </form>
    </OfferFormShell>
  );
}
