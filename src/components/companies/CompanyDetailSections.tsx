import { FieldGroup } from "@/components/ui/field";
import { FormSection } from "@/components/forms/FormSection";
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
        <FormSection
          title="Company Identity"
          description="Core details printed in the header of every document this company issues."
        >
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <group.AppField name="name" validators={companyFieldValidators.name}>
              {(field) => <field.TextField label="Company Name" />}
            </group.AppField>
            <group.AppField name="oib" validators={companyFieldValidators.oib}>
              {(field) => <field.TextField label="OIB" maxLength={11} description="Croatian tax number — exactly 11 digits." />}
            </group.AppField>
            <group.AppField name="address" validators={companyFieldValidators.address}>
              {(field) => <field.TextareaField label="Address" rows={2} />}
            </group.AppField>
            <group.AppField name="phone" validators={companyFieldValidators.phone}>
              {(field) => <field.TextField label="Phone" />}
            </group.AppField>
            <group.AppField name="issuerName" validators={companyFieldValidators.issuerName}>
              {(field) => <field.TextField label="Issuer Name" description="Person responsible for issuing — shown as the signatory." />}
            </group.AppField>
            <group.AppField name="defaultPaymentTermsDays" validators={companyFieldValidators.defaultPaymentTermsDays}>
              {(field) => (
                <field.NumberField
                  label="Default Payment Terms (days)"
                  min={1}
                  description="Starting due-date window. Clients and individual invoices can override it."
                />
              )}
            </group.AppField>
          </FieldGroup>
        </FormSection>

        <FormSection
          title="Branding"
          description="Optional tagline shown beneath the logo, matched to each document's language."
        >
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <group.AppField name="taglineHr">{(field) => <field.TextField label="Tagline (HR)" />}</group.AppField>
            <group.AppField name="taglineEn">{(field) => <field.TextField label="Tagline (EN)" />}</group.AppField>
          </FieldGroup>
        </FormSection>

        <FormSection title="Bank Details" description="Printed on invoices so clients know where to send payment.">
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <group.AppField name="iban" validators={companyFieldValidators.iban}>
              {(field) => <field.TextField label="IBAN" />}
            </group.AppField>
            <group.AppField name="swift" validators={companyFieldValidators.swift}>
              {(field) => <field.TextField label="SWIFT/BIC" />}
            </group.AppField>
          </FieldGroup>
        </FormSection>

        <FormSection
          title="Legal Texts"
          description="Compliance notes printed on documents. Domestic is for Croatian clients; the foreign texts appear on reverse-charge invoices to EU businesses."
        >
          <FieldGroup className="grid gap-4">
            <group.AppField name="legalTextDomestic">
              {(field) => (
                <field.TextareaField label="Legal Text - Domestic (HR)" description="Shown on invoices to Croatian clients." />
              )}
            </group.AppField>
            <group.AppField name="legalTextForeignHr">
              {(field) => (
                <field.TextareaField
                  label="Legal Text - Foreign (HR)"
                  description="Croatian copy for reverse-charge invoices to foreign businesses."
                />
              )}
            </group.AppField>
            <group.AppField name="legalTextForeignEn">
              {(field) => (
                <field.TextareaField
                  label="Legal Text - Foreign (EN)"
                  description="English copy sent to foreign clients."
                />
              )}
            </group.AppField>
          </FieldGroup>
        </FormSection>

        <FormSection title="Email Settings" description="Sender identity and default templates used when emailing documents.">
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <group.AppField name="emailFromAddress" validators={companyFieldValidators.emailFromAddress}>
              {(field) => <field.TextField label="From Address" type="email" description="Outgoing documents are sent from this address." />}
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
                        <span key={token} className="bg-muted px-1.5 py-0.5 font-mono">
                          {token} <span className="text-muted-foreground/70">- {description}</span>
                        </span>
                      ))}
                    </span>
                  }
                />
              )}
            </group.AppField>
            <group.AppField name="emailBodyTemplate">
              {(field) => (
                <field.TextareaField label="Body Template" rows={5} description="Default message body. Editable for each individual send." />
              )}
            </group.AppField>
          </FieldGroup>
        </FormSection>
      </>
    );
  },
});
