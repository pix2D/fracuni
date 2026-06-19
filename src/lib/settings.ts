import { getDb } from "@/lib/db";
import type { Insertable, Updateable } from "kysely";
import type { DB } from "@/lib/db.generated";
import { CURRENCY_CODES } from "@/lib/currency";
import {
  DEFAULT_OFFER_VALIDITY_DAYS,
  DEFAULT_PAYMENT_TERMS_DAYS,
  DEFAULT_VAT_RATE,
} from "@/lib/defaults";
import type { UpdateSettingsInput } from "@/lib/settings.schema";

export interface Settings {
  defaultVatRate: number;
  supportedCurrencies: string[];
  defaultPaymentTermsDays: number;
  defaultOfferValidityDays: number;
  postmarkApiKey: string | null;
}

const DEFAULTS: Settings = {
  defaultVatRate: DEFAULT_VAT_RATE,
  supportedCurrencies: [...CURRENCY_CODES],
  defaultPaymentTermsDays: DEFAULT_PAYMENT_TERMS_DAYS,
  defaultOfferValidityDays: DEFAULT_OFFER_VALIDITY_DAYS,
  postmarkApiKey: null,
};

export type SettingsInput = UpdateSettingsInput;
type SettingsInsert = Insertable<DB["settings"]>;
type SettingsUpdate = Updateable<DB["settings"]>;

function currentTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

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
  const updatedAt = currentTimestamp();
  const values: SettingsInsert = { id: 1, updatedAt };
  const updates: SettingsUpdate = { updatedAt };

  if (input.defaultVatRate !== undefined) {
    values.defaultVatRate = input.defaultVatRate;
    updates.defaultVatRate = input.defaultVatRate;
  }
  if (input.supportedCurrencies !== undefined) {
    const supportedCurrencies = JSON.stringify(input.supportedCurrencies);
    values.supportedCurrencies = supportedCurrencies;
    updates.supportedCurrencies = supportedCurrencies;
  }
  if (input.defaultPaymentTermsDays !== undefined) {
    values.defaultPaymentTermsDays = input.defaultPaymentTermsDays;
    updates.defaultPaymentTermsDays = input.defaultPaymentTermsDays;
  }
  if (input.defaultOfferValidityDays !== undefined) {
    values.defaultOfferValidityDays = input.defaultOfferValidityDays;
    updates.defaultOfferValidityDays = input.defaultOfferValidityDays;
  }
  if (input.postmarkApiKey !== undefined) {
    values.postmarkApiKey = input.postmarkApiKey;
    updates.postmarkApiKey = input.postmarkApiKey;
  }

  await db
    .insertInto("settings")
    .values(values)
    .onConflict((oc) => oc.column("id").doUpdateSet(updates))
    .execute();

  return getSettings();
}
