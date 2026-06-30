type Fetcher = typeof fetch;

const HNB_BASE_URL = "https://api.hnb.hr/tecajn-eur/v3";
const FALLBACK_DAYS = 10;

export type HnbSuccess = {
  ok: true;
  rateText: string;
  effectiveDate: string;
  currency: string;
  unit: number;
};

export type HnbPreview = HnbSuccess & {
  issueDate: string;
};

export type HnbError = {
  ok: false;
  error: string;
};

export type HnbResult = HnbSuccess | HnbError;

export type HealthStatus = { reachable: boolean };

interface HnbRateEntry {
  datum_primjene: string;
  valuta: string;
  jedinica?: number;
  srednji_tecaj: string;
}

function subtractDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getExchangeRate(
  currency: string,
  date: string,
  fetcher: Fetcher = fetch,
): Promise<HnbResult> {
  const from = subtractDays(date, FALLBACK_DAYS);
  // HNB documents date range and currency filters as separate request forms.
  // Combining them currently returns the latest currency row, ignoring the
  // requested range, so fetch the range and filter the currency locally.
  const params = new URLSearchParams({
    "datum-primjene-od": from,
    "datum-primjene-do": date,
  });

  let response: Response;
  try {
    response = await fetcher(`${HNB_BASE_URL}?${params}`);
  } catch {
    return { ok: false, error: "Network error: HNB service unreachable" };
  }

  if (!response.ok) {
    return { ok: false, error: `HNB returned HTTP ${response.status}` };
  }

  const entries: HnbRateEntry[] = await response.json();

  const matchingEntries = entries.filter((entry) => entry.valuta === currency);

  if (matchingEntries.length === 0) {
    return { ok: false, error: `No exchange rate found for ${currency} on or before ${date}` };
  }

  const latest = matchingEntries.reduce((a, b) =>
    a.datum_primjene > b.datum_primjene ? a : b,
  );

  return {
    ok: true,
    rateText: latest.srednji_tecaj,
    effectiveDate: latest.datum_primjene,
    currency: latest.valuta,
    unit: latest.jedinica ?? 1,
  };
}

export async function getExchangeRatePreview(
  currency: string | null | undefined,
  issueDate: string | null | undefined,
  fetcher: Fetcher = fetch,
): Promise<HnbPreview | null> {
  if (!currency || currency === "EUR") return null;

  const date = issueDate ?? todayIso();
  const result = await getExchangeRate(currency, date, fetcher);
  if (!result.ok) return null;
  return { ...result, issueDate: date };
}

export async function checkHnbHealth(fetcher: Fetcher = fetch): Promise<HealthStatus> {
  try {
    const response = await fetcher(`${HNB_BASE_URL}?valuta=USD`);
    return { reachable: response.ok };
  } catch {
    return { reachable: false };
  }
}
