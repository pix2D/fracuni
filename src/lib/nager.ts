import { getDb } from "@/lib/db";
import { CROATIA } from "@/lib/countries";

type Fetcher = typeof fetch;

const NAGER_BASE_URL = "https://date.nager.at/api/v3/publicholidays";

export type NagerSuccess = {
  ok: true;
  holidays: string[];
};

export type NagerError = {
  ok: false;
  error: string;
};

export type NagerResult = NagerSuccess | NagerError;

export type HealthStatus = { reachable: boolean };

interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
}

async function fetchAndCache(year: number, fetcher: Fetcher): Promise<NagerResult> {
  let response: Response;
  try {
    response = await fetcher(`${NAGER_BASE_URL}/${year}/${CROATIA}`);
  } catch {
    return { ok: false, error: "Network error: Nager.Date service unreachable" };
  }

  if (!response.ok) {
    return { ok: false, error: `Nager.Date returned HTTP ${response.status}` };
  }

  const entries: NagerHoliday[] = await response.json();
  const db = getDb();

  await db.deleteFrom("holidaysCache").where("year", "=", year).execute();

  for (const entry of entries) {
    await db
      .insertInto("holidaysCache")
      .values({ year, date: entry.date, name: entry.localName })
      .execute();
  }

  return {
    ok: true,
    holidays: entries.map((e) => e.date).sort(),
  };
}

export async function getHolidays(
  year: number,
  fetcher: Fetcher = fetch,
): Promise<NagerResult> {
  const db = getDb();
  const cached = await db
    .selectFrom("holidaysCache")
    .select("date")
    .where("year", "=", year)
    .orderBy("date")
    .execute();

  if (cached.length > 0) {
    return { ok: true, holidays: cached.map((r) => r.date) };
  }

  return fetchAndCache(year, fetcher);
}

export async function refreshHolidays(
  year: number,
  fetcher: Fetcher = fetch,
): Promise<NagerResult> {
  return fetchAndCache(year, fetcher);
}

export async function checkNagerHealth(fetcher: Fetcher = fetch): Promise<HealthStatus> {
  try {
    const response = await fetcher(`${NAGER_BASE_URL}/2026/${CROATIA}`);
    return { reachable: response.ok };
  } catch {
    return { reachable: false };
  }
}
