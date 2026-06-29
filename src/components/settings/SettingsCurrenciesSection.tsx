import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormSection } from "@/components/forms/FormSection";
import { normalizeErrors } from "@/components/forms/TanStackFields";
import { withFieldGroup } from "@/components/forms/app-form";
import {
  currencyCandidateError,
  normalizeCurrencyCode,
  settingsFieldValidators,
  settingsFormDefaults,
} from "@/components/settings/settings-form-model";

export const SettingsCurrenciesSection = withFieldGroup({
  defaultValues: settingsFormDefaults,
  render: function Render({ group }) {
    const [newCurrency, setNewCurrency] = useState("");
    const [currencyError, setCurrencyError] = useState<string | null>(null);

    return (
      <FormSection
        title="Supported Currencies"
        description="Currencies you can choose when creating documents. Add 3-letter ISO codes; keep at least one."
      >
        <FieldGroup>
          <group.AppField name="supportedCurrencies" validators={settingsFieldValidators.supportedCurrencies}>
            {(field) => {
              const currencies = field.state.value ?? [];
              const errors = [
                ...normalizeErrors(field.state.meta.errors),
                ...(currencyError ? [{ message: currencyError }] : []),
              ];

              function addCurrency() {
                const error = currencyCandidateError(newCurrency, currencies);
                if (error) {
                  setCurrencyError(error);
                  return;
                }

                field.handleChange([...currencies, normalizeCurrencyCode(newCurrency)]);
                setNewCurrency("");
                setCurrencyError(null);
              }

              function removeCurrency(code: string) {
                if (currencies.length <= 1) {
                  setCurrencyError("Keep at least one supported currency.");
                  return;
                }

                field.handleChange(currencies.filter((currency) => currency !== code));
                setCurrencyError(null);
              }

              return (
                <Field data-invalid={!field.state.meta.isValid || !!currencyError}>
                  <FieldLabel>Supported Currencies</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {currencies.map((code) => (
                      <Badge key={code} variant="secondary" className="gap-1 pr-1">
                        {code}
                        <button
                          type="button"
                          className="ml-1 rounded-full px-1 hover:bg-muted"
                          aria-label={`Remove ${code}`}
                          onClick={() => removeCurrency(code)}
                        >
                          x
                        </button>
                      </Badge>
                    ))}
                  </div>

                  <div className="flex max-w-sm gap-2">
                    <Input
                      placeholder="e.g. GBP"
                      value={newCurrency}
                      maxLength={3}
                      onChange={(event) => {
                        setNewCurrency(event.target.value.toUpperCase());
                        setCurrencyError(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addCurrency();
                        }
                      }}
                      aria-invalid={!field.state.meta.isValid || !!currencyError}
                    />
                    <Button type="button" variant="outline" onClick={addCurrency}>
                      Add
                    </Button>
                  </div>
                  <FieldError errors={errors} />
                </Field>
              );
            }}
          </group.AppField>
        </FieldGroup>
      </FormSection>
    );
  },
});
