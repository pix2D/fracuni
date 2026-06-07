import { describe, it, expect } from "vitest";
import { getExchangeRate, checkHnbHealth } from "@/lib/hnb";

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
