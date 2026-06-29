import { FieldGroup } from "@/components/ui/field";
import { FormSection } from "@/components/forms/FormSection";
import { withFieldGroup } from "@/components/forms/app-form";
import {
  settingsFieldValidators,
  settingsFormDefaults,
} from "@/components/settings/settings-form-model";

export const SettingsEmailSection = withFieldGroup({
  defaultValues: settingsFormDefaults,
  render: function Render({ group }) {
    return (
      <FormSection title="Email" description="Postmark credentials used to deliver documents to clients.">
        <FieldGroup className="max-w-xl">
          <group.AppField name="postmarkApiKey" validators={settingsFieldValidators.postmarkApiKey}>
            {(field) => (
              <field.TextField
                label="Postmark API Key"
                type="password"
                placeholder="Not configured"
                description="Leave blank to disable email sending. Stored securely and never shown again."
              />
            )}
          </group.AppField>
        </FieldGroup>
      </FormSection>
    );
  },
});
