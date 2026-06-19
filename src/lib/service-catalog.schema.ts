import { z } from "zod/v4";

const requiredText = (label: string) => z.string().trim().min(1, `${label} is required`);
const optionalText = z.string().trim().transform((value) => value || null).nullish();

export const CatalogEntryFieldsSchema = z.object({
  descriptionHr: requiredText("Description (Croatian)"),
  descriptionEn: optionalText,
});

export const CreateCatalogEntrySchema = CatalogEntryFieldsSchema;
export const UpdateCatalogEntrySchema = CatalogEntryFieldsSchema.partial();

export type CatalogEntryFieldsInput = z.input<typeof CatalogEntryFieldsSchema>;
export type CatalogEntryFieldsOutput = z.output<typeof CatalogEntryFieldsSchema>;
export type CreateCatalogEntryInput = z.output<typeof CreateCatalogEntrySchema>;
export type UpdateCatalogEntryInput = z.output<typeof UpdateCatalogEntrySchema>;
