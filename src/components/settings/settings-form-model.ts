import {
  DEFAULT_OFFER_VALIDITY_DAYS,
  DEFAULT_PAYMENT_TERMS_DAYS,
  DEFAULT_VAT_RATE,
} from "@/lib/defaults";
import { CURRENCY_CODES, isCurrencyCode, type CurrencyCode } from "@/lib/currency";
import {
  SettingsFieldsSchema,
  type SettingsFieldsInput,
  type SettingsFieldsOutput,
} from "@/lib/settings.schema";
import type { Settings } from "@/lib/settings";

export type SettingsFormValues = SettingsFieldsInput;

export const settingsFormDefaults: SettingsFormValues = {
  defaultVatRate: DEFAULT_VAT_RATE,
  supportedCurrencies: [...CURRENCY_CODES],
  defaultPaymentTermsDays: DEFAULT_PAYMENT_TERMS_DAYS,
  defaultOfferValidityDays: DEFAULT_OFFER_VALIDITY_DAYS,
  postmarkApiKey: "",
};

export const settingsFormFields = {
  defaultVatRate: "defaultVatRate",
  supportedCurrencies: "supportedCurrencies",
  defaultPaymentTermsDays: "defaultPaymentTermsDays",
  defaultOfferValidityDays: "defaultOfferValidityDays",
  postmarkApiKey: "postmarkApiKey",
} satisfies { [K in keyof SettingsFormValues]-?: K };

export const settingsFieldValidators = {
  defaultVatRate: { onSubmit: SettingsFieldsSchema.shape.defaultVatRate },
  supportedCurrencies: { onSubmit: SettingsFieldsSchema.shape.supportedCurrencies },
  defaultPaymentTermsDays: { onSubmit: SettingsFieldsSchema.shape.defaultPaymentTermsDays },
  defaultOfferValidityDays: { onSubmit: SettingsFieldsSchema.shape.defaultOfferValidityDays },
  postmarkApiKey: { onSubmit: SettingsFieldsSchema.shape.postmarkApiKey },
};

export function settingsDefaults(settings: Settings): SettingsFormValues {
  return {
    defaultVatRate: settings.defaultVatRate,
    supportedCurrencies: [...settings.supportedCurrencies],
    defaultPaymentTermsDays: settings.defaultPaymentTermsDays,
    defaultOfferValidityDays: settings.defaultOfferValidityDays,
    postmarkApiKey: settings.postmarkApiKey ?? "",
  };
}

export function settingsPayloadFromValues(values: SettingsFormValues): SettingsFieldsOutput {
  return {
    defaultVatRate: values.defaultVatRate,
    supportedCurrencies: normalizeSupportedCurrencies(values.supportedCurrencies),
    defaultPaymentTermsDays: values.defaultPaymentTermsDays,
    defaultOfferValidityDays: values.defaultOfferValidityDays,
    postmarkApiKey: blankToNull(values.postmarkApiKey),
  };
}

export function normalizeCurrencyCode(value: string): string {
  return value.trim().toUpperCase();
}

export function currencyCandidateError(candidate: string, supportedCurrencies: string[]): string | null {
  const normalized = normalizeCurrencyCode(candidate);
  if (!normalized) return "Enter a currency code.";
  if (!isCurrencyCode(normalized)) return "Currency must be supported by the currency engine.";
  if (supportedCurrencies.includes(normalized)) return "Currency is already supported.";
  return null;
}

function normalizeSupportedCurrencies(currencies: string[]): CurrencyCode[] {
  return currencies.map((currency) => {
    const normalized = normalizeCurrencyCode(currency);
    if (!isCurrencyCode(normalized)) {
      throw new Error(`Unsupported currency: ${currency}`);
    }
    return normalized;
  });
}

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}
