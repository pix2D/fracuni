import { describe, it, expect } from "vitest";
import { useMigratedDb } from "@/test/db";
import { getSettings, updateSettings } from "@/lib/settings";

describe("settings", () => {
  useMigratedDb();

  it("returns sensible defaults when no settings row exists", async () => {
    const settings = await getSettings();

    expect(settings.defaultVatRate).toBe(25.0);
    expect(settings.supportedCurrencies).toEqual([
      "EUR", "USD", "CZK", "DKK", "HUF", "ISK", "NOK", "PLN", "RON", "SEK",
    ]);
    expect(settings.defaultPaymentTermsDays).toBe(15);
    expect(settings.defaultOfferValidityDays).toBe(30);
    expect(settings.postmarkApiKey).toBeNull();
  });

  it("persists updated settings", async () => {
    await updateSettings({
      defaultVatRate: 20.0,
      defaultPaymentTermsDays: 30,
    });

    const settings = await getSettings();
    expect(settings.defaultVatRate).toBe(20.0);
    expect(settings.defaultPaymentTermsDays).toBe(30);
    expect(settings.supportedCurrencies).toEqual([
      "EUR", "USD", "CZK", "DKK", "HUF", "ISK", "NOK", "PLN", "RON", "SEK",
    ]);
    expect(settings.defaultOfferValidityDays).toBe(30);
    expect(settings.postmarkApiKey).toBeNull();
  });

  it("updates supported currencies list", async () => {
    await updateSettings({ supportedCurrencies: ["EUR", "USD"] });

    const settings = await getSettings();
    expect(settings.supportedCurrencies).toEqual(["EUR", "USD"]);
  });

  it("updates postmark API key", async () => {
    await updateSettings({ postmarkApiKey: "pm-test-key-123" });

    const settings = await getSettings();
    expect(settings.postmarkApiKey).toBe("pm-test-key-123");
  });

  it("successive updates merge correctly", async () => {
    await updateSettings({ defaultVatRate: 20.0 });
    await updateSettings({ defaultPaymentTermsDays: 45 });

    const settings = await getSettings();
    expect(settings.defaultVatRate).toBe(20.0);
    expect(settings.defaultPaymentTermsDays).toBe(45);
  });
});
