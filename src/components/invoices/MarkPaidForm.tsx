import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { DatePicker } from "@/components/DatePicker";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import { normalizeErrors } from "@/components/forms/TanStackFields";
import { useAppForm } from "@/components/forms/app-form";
import { responseError } from "@/lib/api-response";
import { MarkPaidSchema } from "@/lib/mark-paid.schema";

interface MarkPaidFormProps {
  invoiceId: number;
  onCancel: () => void;
  onPaid: () => Promise<void> | void;
}

interface MarkPaidFormValues {
  paymentDate: Date | undefined;
}

const markPaidDefaults: MarkPaidFormValues = {
  paymentDate: new Date(),
};

function validateMarkPaidForm(values: MarkPaidFormValues) {
  if (values.paymentDate) return undefined;

  return {
    form: "Review the highlighted fields and try again.",
    fields: {
      paymentDate: "Payment date is required.",
    },
  };
}

function payloadFromValues(values: MarkPaidFormValues) {
  return MarkPaidSchema.parse({
    paymentDate: values.paymentDate ? format(values.paymentDate, "yyyy-MM-dd") : "",
  });
}

export function MarkPaidForm({ invoiceId, onCancel, onPaid }: MarkPaidFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useAppForm({
    defaultValues: markPaidDefaults,
    canSubmitWhenInvalid: true,
    validators: {
      onSubmit: ({ value }) => validateMarkPaidForm(value),
    },
    onSubmitInvalid: () => {
      setError("Review the highlighted fields and try again.");
      setSaving(false);
    },
    onSubmit: async ({ value }) => {
      setError(null);

      try {
        const response = await fetch(`/api/invoices/${invoiceId}/mark-paid`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadFromValues(value)),
        });

        if (!response.ok) {
          setError(await responseError(response, "Failed to mark invoice as paid"));
          return;
        }

        await onPaid();
      } finally {
        setSaving(false);
      }
    },
  });

  function submit() {
    setSaving(true);
    void form.handleSubmit().catch(() => setSaving(false));
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <FormErrorBanner error={error} />

      <form.AppField name="paymentDate">
        {(field) => (
          <Field data-invalid={!field.state.meta.isValid}>
            <FieldLabel>Payment date</FieldLabel>
            <DatePicker value={field.state.value} onChange={field.handleChange} />
            <FieldError errors={normalizeErrors(field.state.meta.errors)} />
          </Field>
        )}
      </form.AppField>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Mark as paid"}
        </Button>
      </DialogFooter>
    </form>
  );
}
