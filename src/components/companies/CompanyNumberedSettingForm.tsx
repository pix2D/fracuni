import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { normalizeErrors } from "@/components/forms/TanStackFields";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import { useAppForm } from "@/components/forms/app-form";
import { CompanyNumberedSettingSchema, type CompanyNumberedSettingInput } from "@/lib/companies.schema";

interface NumberedSettingValue {
  number: number;
  nameHr: string;
  nameEn: string | null;
  isDefault: boolean;
}

interface CompanyNumberedSettingFormProps {
  initial?: NumberedSettingValue;
  onSave: (data: CompanyNumberedSettingInput) => Promise<void> | void;
  onCancel: () => void;
}

const settingDefaults: CompanyNumberedSettingInput = {
  number: 1,
  nameHr: "",
  nameEn: "",
  isDefault: false,
};

const settingFieldValidators = {
  number: { onSubmit: CompanyNumberedSettingSchema.shape.number },
  nameHr: { onSubmit: CompanyNumberedSettingSchema.shape.nameHr },
  nameEn: { onSubmit: CompanyNumberedSettingSchema.shape.nameEn },
};

function defaultsFromInitial(initial?: NumberedSettingValue): CompanyNumberedSettingInput {
  if (!initial) return settingDefaults;

  return {
    number: initial.number,
    nameHr: initial.nameHr,
    nameEn: initial.nameEn ?? "",
    isDefault: initial.isDefault,
  };
}

function payloadFromValues(values: CompanyNumberedSettingInput): CompanyNumberedSettingInput {
  return {
    number: values.number,
    nameHr: values.nameHr,
    nameEn: blankToNull(values.nameEn),
    isDefault: values.isDefault === true,
  };
}

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export function CompanyNumberedSettingForm({
  initial,
  onSave,
  onCancel,
}: CompanyNumberedSettingFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const defaultLocked = initial?.isDefault === true;

  const form = useAppForm({
    defaultValues: defaultsFromInitial(initial),
    canSubmitWhenInvalid: true,
    validators: {
      onSubmit: CompanyNumberedSettingSchema,
    },
    onSubmitInvalid: () => {
      setError("Review the highlighted fields and try again.");
      setSaving(false);
    },
    onSubmit: async ({ value }) => {
      setError(null);

      try {
        await onSave(payloadFromValues(value));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to save");
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
    <Card>
      <CardContent className="space-y-3 py-3">
        <FormErrorBanner error={error} />
        <form
          noValidate
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <FieldGroup className="grid gap-3 sm:grid-cols-[5rem_1fr_1fr_auto]">
            <form.AppField name="number" validators={settingFieldValidators.number}>
              {(field) => <field.NumberField label="Number" min={1} />}
            </form.AppField>

            <form.AppField name="nameHr" validators={settingFieldValidators.nameHr}>
              {(field) => <field.TextField label="Name (HR)" />}
            </form.AppField>

            <form.AppField name="nameEn" validators={settingFieldValidators.nameEn}>
              {(field) => <field.TextField label="Name (EN)" />}
            </form.AppField>

            <form.AppField name="isDefault">
              {(field) => (
                <Field
                  orientation="horizontal"
                  className="items-end justify-start gap-2 pb-2 sm:justify-end"
                  data-invalid={!field.state.meta.isValid}
                >
                  <Switch
                    id={field.name}
                    checked={field.state.value === true}
                    onCheckedChange={field.handleChange}
                    disabled={defaultLocked}
                    aria-invalid={!field.state.meta.isValid}
                  />
                  <FieldLabel htmlFor={field.name}>Default</FieldLabel>
                  <FieldError errors={normalizeErrors(field.state.meta.errors)} />
                </Field>
              )}
            </form.AppField>
          </FieldGroup>

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
