import { describe, it, expect, vi } from "vitest";
import { useMigratedDb } from "@/test/db";
import { getHolidays, refreshHolidays, checkNagerHealth } from "@/lib/nager";

useMigratedDb();

const HOLIDAYS_2026 = [
  { date: "2026-01-01", localName: "Nova godina", name: "New Year's Day", countryCode: "HR", fixed: true, global: true, counties: null, launchYear: null, types: ["Public"] },
  { date: "2026-01-06", localName: "Bogojavljenje", name: "Epiphany", countryCode: "HR", fixed: true, global: true, counties: null, launchYear: null, types: ["Public"] },
  { date: "2026-05-01", localName: "Praznik rada", name: "Labour Day", countryCode: "HR", fixed: true, global: true, counties: null, launchYear: null, types: ["Public"] },
];

function mockFetch(body: unknown, status = 200) {
  return async () => new Response(JSON.stringify(body), { status });
}

describe("getHolidays", () => {
  it("fetches holidays and caches them in the database", async () => {
    const fetcher = vi.fn(mockFetch(HOLIDAYS_2026));
    const result = await getHolidays(2026, fetcher);

    expect(result).toEqual({
      ok: true,
      holidays: ["2026-01-01", "2026-01-06", "2026-05-01"],
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("serves from cache on second call without fetching again", async () => {
    const fetcher = vi.fn(mockFetch(HOLIDAYS_2026));

    await getHolidays(2026, fetcher);
    const result = await getHolidays(2026, fetcher);

    expect(result).toEqual({
      ok: true,
      holidays: ["2026-01-01", "2026-01-06", "2026-05-01"],
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("returns empty array for year with no holidays", async () => {
    const result = await getHolidays(2099, mockFetch([]));

    expect(result).toEqual({ ok: true, holidays: [] });
  });

  it("returns structured error on network failure", async () => {
    const failFetch = async () => { throw new Error("ECONNREFUSED"); };
    const result = await getHolidays(2026, failFetch as typeof fetch);

    expect(result).toEqual({
      ok: false,
      error: "Network error: Nager.Date service unreachable",
    });
  });

  it("returns structured error on HTTP error", async () => {
    const result = await getHolidays(2026, mockFetch({}, 500));

    expect(result).toEqual({
      ok: false,
      error: "Nager.Date returned HTTP 500",
    });
  });
});

describe("refreshHolidays", () => {
  it("re-fetches and updates cached holidays", async () => {
    const initialFetcher = vi.fn(mockFetch(HOLIDAYS_2026));
    await getHolidays(2026, initialFetcher);

    const updatedHolidays = [
      ...HOLIDAYS_2026,
      { date: "2026-12-25", localName: "Božić", name: "Christmas Day", countryCode: "HR", fixed: true, global: true, counties: null, launchYear: null, types: ["Public"] },
    ];
    const refreshFetcher = vi.fn(mockFetch(updatedHolidays));
    const result = await refreshHolidays(2026, refreshFetcher);

    expect(result).toEqual({
      ok: true,
      holidays: ["2026-01-01", "2026-01-06", "2026-05-01", "2026-12-25"],
    });
    expect(refreshFetcher).toHaveBeenCalledTimes(1);
  });
});

describe("checkNagerHealth", () => {
  it("returns reachable when service responds", async () => {
    const result = await checkNagerHealth(mockFetch(HOLIDAYS_2026));
    expect(result).toEqual({ reachable: true });
  });

  it("returns unreachable on network failure", async () => {
    const failFetch = async () => { throw new Error("ECONNREFUSED"); };
    const result = await checkNagerHealth(failFetch as typeof fetch);
    expect(result).toEqual({ reachable: false });
  });
});
