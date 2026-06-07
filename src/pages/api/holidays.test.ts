import { describe, it, expect, vi } from "vitest";
import { useMigratedDb } from "@/test/db";
import { apiContext } from "@/test/api";
import { getDb } from "@/lib/db";

vi.mock("@/lib/nager", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/nager")>();
  return {
    ...actual,
    refreshHolidays: vi.fn(),
  };
});

import { GET, POST } from "@/pages/api/holidays";
import { refreshHolidays } from "@/lib/nager";

const mockedRefreshHolidays = vi.mocked(refreshHolidays);

describe("GET /api/holidays", () => {
  useMigratedDb();

  it("returns 400 when year parameter is missing", async () => {
    const response = await GET(apiContext({
      request: new Request("http://test.local/api/holidays"),
    }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("year");
  });

  it("returns 400 when year parameter is invalid", async () => {
    const response = await GET(apiContext({
      request: new Request("http://test.local/api/holidays?year=abc"),
    }));

    expect(response.status).toBe(400);
  });

  it("returns cached holidays for a valid year", async () => {
    const db = getDb();
    await db.insertInto("holidaysCache").values([
      { year: 2026, date: "2026-01-01", name: "Nova godina" },
      { year: 2026, date: "2026-01-06", name: "Bogojavljenje" },
    ]).execute();

    const response = await GET(apiContext({
      request: new Request("http://test.local/api/holidays?year=2026"),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ holidays: ["2026-01-01", "2026-01-06"] });
  });
});

describe("POST /api/holidays", () => {
  useMigratedDb();

  it("refreshes holidays and returns the new data", async () => {
    mockedRefreshHolidays.mockResolvedValue({
      ok: true,
      holidays: ["2026-01-01", "2026-01-06", "2026-05-01"],
    });

    const response = await POST(apiContext({
      request: new Request("http://test.local/api/holidays?year=2026", { method: "POST" }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ holidays: ["2026-01-01", "2026-01-06", "2026-05-01"] });
    expect(mockedRefreshHolidays).toHaveBeenCalledWith(2026);
  });

  it("returns 400 when year is missing", async () => {
    const response = await POST(apiContext({
      request: new Request("http://test.local/api/holidays", { method: "POST" }),
    }));

    expect(response.status).toBe(400);
  });

  it("returns 502 when refresh fails", async () => {
    mockedRefreshHolidays.mockResolvedValue({
      ok: false,
      error: "Network error: Nager.Date service unreachable",
    });

    const response = await POST(apiContext({
      request: new Request("http://test.local/api/holidays?year=2026", { method: "POST" }),
    }));

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).toContain("Nager");
  });
});
