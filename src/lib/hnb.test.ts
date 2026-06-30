import { afterEach, describe, expect, it, vi } from "vitest";
import { getExchangeRate, getExchangeRatePreview, checkHnbHealth } from "@/lib/hnb";

const USD_RATE_RESPONSE = [
  {
    broj_tecajnice: "123",
    datum_primjene: "2026-06-06",
    drzava: "SAD",
    drzava_iso: "US",
    sifra_valute: "840",
    valuta: "USD",
    jedinica: 1,
    kupovni_tecaj: "0,920000",
    srednji_tecaj: "0,925000",
    prodajni_tecaj: "0,930000",
  },
];

const MULTI_RATE_RESPONSE = [
  {
    broj_tecajnice: "122",
    datum_primjene: "2026-06-04",
    drzava: "SAD",
    drzava_iso: "US",
    sifra_valute: "840",
    valuta: "USD",
    jedinica: 1,
    kupovni_tecaj: "0,910000",
    srednji_tecaj: "0,915000",
    prodajni_tecaj: "0,920000",
  },
  {
    broj_tecajnice: "123",
    datum_primjene: "2026-06-06",
    drzava: "SAD",
    drzava_iso: "US",
    sifra_valute: "840",
    valuta: "USD",
    jedinica: 1,
    kupovni_tecaj: "0,920000",
    srednji_tecaj: "0,925000",
    prodajni_tecaj: "0,930000",
  },
];

function mockFetch(body: unknown, status = 200) {
  return async () => new Response(JSON.stringify(body), { status });
}

describe("getExchangeRate", () => {
  it("returns rate for exact date", async () => {
    const result = await getExchangeRate("USD", "2026-06-06", mockFetch(USD_RATE_RESPONSE));

    expect(result).toEqual({
      ok: true,
      rate: 0.925,
      rateText: "0,925000",
      effectiveDate: "2026-06-06",
      currency: "USD",
      unit: 1,
    });
  });

  it("falls back to most recent business day when exact date has no rate", async () => {
    const result = await getExchangeRate("USD", "2026-06-07", mockFetch(MULTI_RATE_RESPONSE));

    expect(result).toEqual({
      ok: true,
      rate: 0.925,
      rateText: "0,925000",
      effectiveDate: "2026-06-06",
      currency: "USD",
      unit: 1,
    });
  });

  it("returns error when no rates found", async () => {
    const result = await getExchangeRate("USD", "2026-06-07", mockFetch([]));

    expect(result).toEqual({
      ok: false,
      error: "No exchange rate found for USD on or before 2026-06-07",
    });
  });

  it("returns structured error on network failure", async () => {
    const failFetch = async () => { throw new Error("ECONNREFUSED"); };
    const result = await getExchangeRate("USD", "2026-06-07", failFetch as typeof fetch);

    expect(result).toEqual({
      ok: false,
      error: "Network error: HNB service unreachable",
    });
  });

  it("returns structured error on HTTP error", async () => {
    const result = await getExchangeRate("USD", "2026-06-07", mockFetch({}, 500));

    expect(result).toEqual({
      ok: false,
      error: "HNB returned HTTP 500",
    });
  });

  it("uses the documented date range request and filters currency locally", async () => {
    let requestedUrl = "";
    const fetcher: typeof fetch = async (url) => {
      requestedUrl = String(url);
      return new Response(JSON.stringify(MULTI_RATE_RESPONSE), { status: 200 });
    };

    await getExchangeRate("USD", "2026-06-07", fetcher);

    const url = new URL(requestedUrl);
    expect(url.searchParams.get("datum-primjene-od")).toBe("2026-05-28");
    expect(url.searchParams.get("datum-primjene-do")).toBe("2026-06-07");
    expect(url.searchParams.has("valuta")).toBe(false);
  });
});

describe("getExchangeRatePreview", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null for EUR", async () => {
    await expect(getExchangeRatePreview("EUR", "2026-06-07", mockFetch(USD_RATE_RESPONSE))).resolves.toBeNull();
  });

  it("uses the provided issue date", async () => {
    const result = await getExchangeRatePreview("USD", "2026-06-07", mockFetch(MULTI_RATE_RESPONSE));
    expect(result).toMatchObject({
      ok: true,
      rate: 0.925,
      rateText: "0,925000",
      issueDate: "2026-06-07",
      effectiveDate: "2026-06-06",
    });
  });

  it("uses today when the draft has no issue date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T12:00:00Z"));

    const result = await getExchangeRatePreview("USD", null, mockFetch(MULTI_RATE_RESPONSE));
    expect(result).toMatchObject({
      ok: true,
      rateText: "0,925000",
      issueDate: "2026-06-30",
      effectiveDate: "2026-06-06",
    });
  });
});

describe("checkHnbHealth", () => {
  it("returns reachable when service responds", async () => {
    const result = await checkHnbHealth(mockFetch(USD_RATE_RESPONSE));
    expect(result).toEqual({ reachable: true });
  });

  it("returns unreachable on network failure", async () => {
    const failFetch = async () => { throw new Error("ECONNREFUSED"); };
    const result = await checkHnbHealth(failFetch as typeof fetch);
    expect(result).toEqual({ reachable: false });
  });
});
