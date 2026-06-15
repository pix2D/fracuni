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
