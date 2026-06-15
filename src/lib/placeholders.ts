// Service Catalog descriptions may contain {day}/{month}/{year} placeholders that
// are expanded to the current date when an entry is copied into a Line Item.
export function expandPlaceholders(text: string, date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());

  return text
    .replace(/\{day\}/g, day)
    .replace(/\{month\}/g, month)
    .replace(/\{year\}/g, year);
}

// Variables a per-Company email subject/body template may reference. They are
// expanded when building the send-dialog defaults for a finalized document.
export interface EmailTemplateVars {
  documentNumber: string;
  clientName: string;
  companyName: string;
}

// Email subject/body templates use {documentNumber}/{clientName}/{companyName}.
// Unknown placeholders are left untouched so a typo is visible rather than silently dropped.
export function expandEmailTemplate(text: string, vars: EmailTemplateVars): string {
  return text
    .replace(/\{documentNumber\}/g, vars.documentNumber)
    .replace(/\{clientName\}/g, vars.clientName)
    .replace(/\{companyName\}/g, vars.companyName);
}
