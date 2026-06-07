import { getDb } from "@/lib/db";
import { sql } from "kysely";

const DEFAULT_CURRENCIES = ["EUR", "USD", "CZK", "DKK", "HUF", "ISK", "NOK", "PLN", "RON", "SEK"];

export interface Settings {
  defaultVatRate: number;
  supportedCurrencies: string[];
  defaultPaymentTermsDays: number;
  defaultOfferValidityDays: number;
  postmarkApiKey: string | null;
}

const DEFAULTS: Settings = {
  defaultVatRate: 25.0,
  supportedCurrencies: DEFAULT_CURRENCIES,
  defaultPaymentTermsDays: 15,
  defaultOfferValidityDays: 30,
  postmarkApiKey: null,
};

export type SettingsInput = Partial<Omit<Settings, "supportedCurrencies"> & { supportedCurrencies: string[] }>;

export async function getSettings(): Promise<Settings> {
  const db = getDb();
  const row = await db
    .selectFrom("settings")
    .selectAll()
    .where("id", "=", 1)
    .executeTakeFirst();

  if (!row) return { ...DEFAULTS };

  return {
    defaultVatRate: row.defaultVatRate,
    supportedCurrencies: JSON.parse(row.supportedCurrencies),
    defaultPaymentTermsDays: row.defaultPaymentTermsDays,
    defaultOfferValidityDays: row.defaultOfferValidityDays,
    postmarkApiKey: row.postmarkApiKey,
  };
}

export async function updateSettings(input: SettingsInput): Promise<Settings> {
  const db = getDb();
  const values: Record<string, unknown> = { id: 1 };

  if (input.defaultVatRate !== undefined) values.defaultVatRate = input.defaultVatRate;
  if (input.supportedCurrencies !== undefined) values.supportedCurrencies = JSON.stringify(input.supportedCurrencies);
  if (input.defaultPaymentTermsDays !== undefined) values.defaultPaymentTermsDays = input.defaultPaymentTermsDays;
  if (input.defaultOfferValidityDays !== undefined) values.defaultOfferValidityDays = input.defaultOfferValidityDays;
  if (input.postmarkApiKey !== undefined) values.postmarkApiKey = input.postmarkApiKey;

  values.updatedAt = sql`datetime('now')`;

  await db
    .insertInto("settings")
    .values(values as never)
    .onConflict((oc) =>
      oc.column("id").doUpdateSet(values as never),
    )
    .execute();

  return getSettings();
}
