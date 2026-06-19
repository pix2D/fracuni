import { FieldGroup } from "@/components/ui/field";
import { withFieldGroup } from "@/components/forms/app-form";
import {
  settingsFieldValidators,
  settingsFormDefaults,
} from "@/components/settings/settings-form-model";

export const SettingsEmailSection = withFieldGroup({
  defaultValues: settingsFormDefaults,
  render: function Render({ group }) {
    return (
      <section className="space-y-4 border-t pt-6">
        <h2 className="text-base font-semibold">Email</h2>
        <FieldGroup className="max-w-xl">
          <group.AppField name="postmarkApiKey" validators={settingsFieldValidators.postmarkApiKey}>
            {(field) => (
              <field.TextField
                label="Postmark API Key"
                type="password"
                placeholder="Not configured"
              />
            )}
          </group.AppField>
        </FieldGroup>
      </section>
    );
  },
});
