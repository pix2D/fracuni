import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormErrorBanner, FormSuccessBanner } from "@/components/forms/FormErrorBanner";
import { useAppForm } from "@/components/forms/app-form";
import { SettingsCurrenciesSection } from "@/components/settings/SettingsCurrenciesSection";
import { SettingsDefaultsSection } from "@/components/settings/SettingsDefaultsSection";
import { SettingsEmailSection } from "@/components/settings/SettingsEmailSection";
import {
  settingsDefaults,
  settingsFormFields,
  settingsPayloadFromValues,
} from "@/components/settings/settings-form-model";
import { responseError } from "@/lib/api-response";
import { SettingsFieldsSchema } from "@/lib/settings.schema";
import type { Settings } from "@/lib/settings";

interface SettingsFormProps {
  settings: Settings;
  onSaved: (settings: Settings) => void;
}

export function SettingsForm({ settings, onSaved }: SettingsFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useAppForm({
    defaultValues: settingsDefaults(settings),
    canSubmitWhenInvalid: true,
    validators: {
      onSubmit: SettingsFieldsSchema,
    },
    onSubmitInvalid: () => {
      setError("Review the highlighted fields and try again.");
      setSuccess(false);
      setSaving(false);
    },
    onSubmit: async ({ value }) => {
      setError(null);
      setSuccess(false);

      try {
        const response = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settingsPayloadFromValues(value)),
        });

        if (!response.ok) {
          setError(await responseError(response, "Failed to save settings"));
          return;
        }

        onSaved((await response.json()) as Settings);
        setSuccess(true);
      } finally {
        setSaving(false);
      }
    },
  });

  function submitSettings() {
    setSaving(true);
    void form.handleSubmit().catch(() => setSaving(false));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <Button type="button" onClick={submitSettings} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <FormErrorBanner error={error} />
      <FormSuccessBanner message={success ? "Settings saved." : null} />

      <form
        noValidate
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          submitSettings();
        }}
      >
        <SettingsDefaultsSection form={form} fields={settingsFormFields} />
        <SettingsCurrenciesSection form={form} fields={settingsFormFields} />
        <SettingsEmailSection form={form} fields={settingsFormFields} />
      </form>
    </div>
  );
}
