import { FieldGroup } from "@/components/ui/field";
import { FormSection } from "@/components/forms/FormSection";
import { withFieldGroup } from "@/components/forms/app-form";
import { companyDetailDefaults, companyFieldValidators } from "@/components/companies/company-form-model";
import { EmailTemplatePlaceholderHelp } from "@/components/EmailTemplatePlaceholderHelp";

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
          description="Compliance notes printed on service documents. Each pair is selected by the centralized service VAT decision."
        >
          <FieldGroup className="grid gap-5">
            <group.AppField name="legalTextServiceDomesticHr">
              {(field) => (
                <field.TextareaField label="Service - Domestic (HR)" description="Shown on service documents to Croatian clients." />
              )}
            </group.AppField>

            <div className="grid gap-4 md:grid-cols-2">
              <group.AppField name="legalTextServiceEuB2cHr">
                {(field) => <field.TextareaField label="Service - EU B2C (HR)" />}
              </group.AppField>
              <group.AppField name="legalTextServiceEuB2cEn">
                {(field) => <field.TextareaField label="Service - EU B2C (EN)" />}
              </group.AppField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <group.AppField name="legalTextServiceEuB2bReverseChargeHr">
                {(field) => <field.TextareaField label="Service - EU B2B Reverse Charge (HR)" />}
              </group.AppField>
              <group.AppField name="legalTextServiceEuB2bReverseChargeEn">
                {(field) => <field.TextareaField label="Service - EU B2B Reverse Charge (EN)" />}
              </group.AppField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <group.AppField name="legalTextServiceEuB2bWithoutVatIdHr">
                {(field) => <field.TextareaField label="Service - EU B2B Without VAT ID (HR)" />}
              </group.AppField>
              <group.AppField name="legalTextServiceEuB2bWithoutVatIdEn">
                {(field) => <field.TextareaField label="Service - EU B2B Without VAT ID (EN)" />}
              </group.AppField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <group.AppField name="legalTextServiceNonEuB2cHr">
                {(field) => <field.TextareaField label="Service - Non-EU B2C (HR)" />}
              </group.AppField>
              <group.AppField name="legalTextServiceNonEuB2cEn">
                {(field) => <field.TextareaField label="Service - Non-EU B2C (EN)" />}
              </group.AppField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <group.AppField name="legalTextServiceNonEuB2bHr">
                {(field) => <field.TextareaField label="Service - Non-EU B2B (HR)" />}
              </group.AppField>
              <group.AppField name="legalTextServiceNonEuB2bEn">
                {(field) => <field.TextareaField label="Service - Non-EU B2B (EN)" />}
              </group.AppField>
            </div>
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
                  description={<EmailTemplatePlaceholderHelp />}
                />
              )}
            </group.AppField>
            <group.AppField name="emailBodyTemplate">
              {(field) => (
                <field.TextareaField
                  label="Body Template"
                  rows={5}
                  description={<EmailTemplatePlaceholderHelp />}
                />
              )}
            </group.AppField>
          </FieldGroup>
        </FormSection>
      </>
    );
  },
});
