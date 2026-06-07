type Fetcher = typeof fetch;

const VIES_URL = "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number";

export type ViesSuccess = {
  ok: true;
  valid: boolean;
  name: string | null;
  address: string | null;
  countryCode: string;
  vatNumber: string;
  requestDate: string;
  rawResponse: Record<string, unknown>;
};

export type ViesError = {
  ok: false;
  error: string;
};

export type ViesResult = ViesSuccess | ViesError;

export type HealthStatus = { reachable: boolean };

export async function validateVat(
  countryCode: string,
  vatNumber: string,
  fetcher: Fetcher = fetch,
): Promise<ViesResult> {
  let response: Response;
  try {
    response = await fetcher(VIES_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ countryCode, vatNumber }),
    });
  } catch {
    return { ok: false, error: "Network error: VIES service unreachable" };
  }

  if (!response.ok) {
    return { ok: false, error: `VIES returned HTTP ${response.status}` };
  }

  const data = await response.json();

  return {
    ok: true,
    valid: data.valid,
    name: data.name ?? null,
    address: data.address ?? null,
    countryCode: data.countryCode,
    vatNumber: data.vatNumber,
    requestDate: data.requestDate,
    rawResponse: data,
  };
}

export async function checkViesHealth(fetcher: Fetcher = fetch): Promise<HealthStatus> {
  try {
    const response = await fetcher(VIES_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ countryCode: "DE", vatNumber: "test" }),
    });
    return { reachable: response.ok };
  } catch {
    return { reachable: false };
  }
}
