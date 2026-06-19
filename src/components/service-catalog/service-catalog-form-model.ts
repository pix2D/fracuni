import {
  CatalogEntryFieldsSchema,
  type CatalogEntryFieldsInput,
  type CatalogEntryFieldsOutput,
} from "@/lib/service-catalog.schema";
import type { CatalogEntry } from "@/lib/service-catalog";

export type ServiceCatalogFormValues = CatalogEntryFieldsInput;

export const serviceCatalogFormDefaults: ServiceCatalogFormValues = {
  descriptionHr: "",
  descriptionEn: "",
};

export const serviceCatalogFormFields = {
  descriptionHr: "descriptionHr",
  descriptionEn: "descriptionEn",
} satisfies { [K in keyof ServiceCatalogFormValues]-?: K };

export const serviceCatalogFieldValidators = {
  descriptionHr: { onSubmit: CatalogEntryFieldsSchema.shape.descriptionHr },
  descriptionEn: { onSubmit: CatalogEntryFieldsSchema.shape.descriptionEn },
};

export function serviceCatalogDefaults(entry: CatalogEntry | null): ServiceCatalogFormValues {
  if (!entry) return serviceCatalogFormDefaults;

  return {
    descriptionHr: entry.descriptionHr,
    descriptionEn: entry.descriptionEn ?? "",
  };
}

export function serviceCatalogPayloadFromValues(values: ServiceCatalogFormValues): CatalogEntryFieldsOutput {
  return {
    descriptionHr: values.descriptionHr,
    descriptionEn: blankToNull(values.descriptionEn),
  };
}

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}
