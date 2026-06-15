// Single source of truth for system-wide default business values. The Settings
// table is seeded from these and they back the "no value set yet" fallbacks in
// the UI. Migration column defaults intentionally hardcode the same numbers (a
// migration is a frozen historical record) — see the comments there.
//
// The supported-currency list lives in `@/lib/currency` (CURRENCY_CODES), which
// is the SSOT for which currencies the Currency Engine can actually handle.

export const DEFAULT_VAT_RATE = 25;
export const DEFAULT_PAYMENT_TERMS_DAYS = 15;
export const DEFAULT_OFFER_VALIDITY_DAYS = 30;
