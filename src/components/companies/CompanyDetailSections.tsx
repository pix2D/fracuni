import { FieldGroup } from "@/components/ui/field";
import { withFieldGroup } from "@/components/forms/app-form";
import { companyDetailDefaults, companyFieldValidators } from "@/components/companies/company-form-model";

const PLACEHOLDER_TOKENS = [
  { token: "{broj}", description: "Document number" },
  { token: "{kupac}", description: "Client name" },
  { token: "{datum}", description: "Document date" },
];

export const CompanyDetailSections = withFieldGroup({
  defaultValues: companyDetailDefaults,
  render: function Render({ group }) {
    return (
      <>
        <section className="space-y-4">
          <h2 className="text-base font-semibold">Company Identity</h2>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <group.AppField name="name" validators={companyFieldValidators.name}>
              {(field) => <field.TextField label="Company Name" />}
            </group.AppField>
            <group.AppField name="oib" validators={companyFieldValidators.oib}>
              {(field) => <field.TextField label="OIB" maxLength={11} />}
            </group.AppField>
            <group.AppField name="address" validators={companyFieldValidators.address}>
              {(field) => <field.TextareaField label="Address" rows={2} />}
            </group.AppField>
            <group.AppField name="phone" validators={companyFieldValidators.phone}>
              {(field) => <field.TextField label="Phone" />}
            </group.AppField>
            <group.AppField name="issuerName" validators={companyFieldValidators.issuerName}>
              {(field) => <field.TextField label="Issuer Name" />}
            </group.AppField>
            <group.AppField name="defaultPaymentTermsDays" validators={companyFieldValidators.defaultPaymentTermsDays}>
              {(field) => <field.NumberField label="Default Payment Terms (days)" min={1} />}
            </group.AppField>
          </FieldGroup>
        </section>

        <section className="space-y-4 border-t pt-6">
          <h2 className="text-base font-semibold">Branding</h2>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <group.AppField name="taglineHr">{(field) => <field.TextField label="Tagline (HR)" />}</group.AppField>
            <group.AppField name="taglineEn">{(field) => <field.TextField label="Tagline (EN)" />}</group.AppField>
          </FieldGroup>
        </section>

        <section className="space-y-4 border-t pt-6">
          <h2 className="text-base font-semibold">Bank Details</h2>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <group.AppField name="iban" validators={companyFieldValidators.iban}>
              {(field) => <field.TextField label="IBAN" />}
            </group.AppField>
            <group.AppField name="swift" validators={companyFieldValidators.swift}>
              {(field) => <field.TextField label="SWIFT/BIC" />}
            </group.AppField>
          </FieldGroup>
        </section>

        <section className="space-y-4 border-t pt-6">
          <h2 className="text-base font-semibold">Legal Texts</h2>
          <FieldGroup className="grid gap-4">
            <group.AppField name="legalTextDomestic">
              {(field) => <field.TextareaField label="Legal Text - Domestic (HR)" />}
            </group.AppField>
            <group.AppField name="legalTextForeignHr">
              {(field) => <field.TextareaField label="Legal Text - Foreign (HR)" />}
            </group.AppField>
            <group.AppField name="legalTextForeignEn">
              {(field) => <field.TextareaField label="Legal Text - Foreign (EN)" />}
            </group.AppField>
          </FieldGroup>
        </section>

        <section className="space-y-4 border-t pt-6">
          <h2 className="text-base font-semibold">Email Settings</h2>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <group.AppField name="emailFromAddress" validators={companyFieldValidators.emailFromAddress}>
              {(field) => <field.TextField label="From Address" type="email" />}
            </group.AppField>
            <group.AppField name="emailFromName" validators={companyFieldValidators.emailFromName}>
              {(field) => <field.TextField label="From Name" />}
            </group.AppField>
            <group.AppField name="emailSubjectTemplate">
              {(field) => (
                <field.TextField
                  label="Subject Template"
                  description={
                    <span className="flex flex-wrap gap-2">
                      {PLACEHOLDER_TOKENS.map(({ token, description }) => (
                        <span key={token} className="rounded bg-muted px-1.5 py-0.5 font-mono">
                          {token} <span className="text-muted-foreground/70">- {description}</span>
                        </span>
                      ))}
                    </span>
                  }
                />
              )}
            </group.AppField>
            <group.AppField name="emailBodyTemplate">
              {(field) => <field.TextareaField label="Body Template" rows={5} />}
            </group.AppField>
          </FieldGroup>
        </section>
      </>
    );
  },
});
