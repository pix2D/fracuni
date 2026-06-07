type Fetcher = typeof fetch;

const HNB_BASE_URL = "https://api.hnb.hr/tecajn-eur/v3";
const FALLBACK_DAYS = 10;

export type HnbSuccess = {
  ok: true;
  rate: number;
  effectiveDate: string;
  currency: string;
  unit: number;
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
  jedinica: number;
  srednji_tecaj: string;
}

function parseRate(value: string): number {
  return parseFloat(value.replace(",", "."));
}

function subtractDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function getExchangeRate(
  currency: string,
  date: string,
  fetcher: Fetcher = fetch,
): Promise<HnbResult> {
  const from = subtractDays(date, FALLBACK_DAYS);
  const params = new URLSearchParams({
    valuta: currency,
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

  if (entries.length === 0) {
    return { ok: false, error: `No exchange rate found for ${currency} on or before ${date}` };
  }

  const latest = entries.reduce((a, b) =>
    a.datum_primjene > b.datum_primjene ? a : b,
  );

  return {
    ok: true,
    rate: parseRate(latest.srednji_tecaj),
    effectiveDate: latest.datum_primjene,
    currency: latest.valuta,
    unit: latest.jedinica,
  };
}

export async function checkHnbHealth(fetcher: Fetcher = fetch): Promise<HealthStatus> {
  try {
    const response = await fetcher(`${HNB_BASE_URL}?valuta=USD`);
    return { reachable: response.ok };
  } catch {
    return { reachable: false };
  }
}
