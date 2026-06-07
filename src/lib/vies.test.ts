import { describe, it, expect } from "vitest";
import { validateVat, checkViesHealth } from "@/lib/vies";

const VALID_RESPONSE = {
  valid: true,
  countryCode: "DE",
  vatNumber: "123456789",
  requestDate: "2026-06-07+02:00",
  name: "ACME GMBH",
  address: "MUSTERSTRASSE 1\n12345 BERLIN",
  requestIdentifier: "",
  traderName: "ACME GMBH",
  traderAddress: "MUSTERSTRASSE 1\n12345 BERLIN",
  traderCompanyType: "---",
  traderNameMatch: "NOT_PROCESSED",
  traderStreetMatch: "NOT_PROCESSED",
  traderPostcodeMatch: "NOT_PROCESSED",
  traderCityMatch: "NOT_PROCESSED",
};

function mockFetch(body: unknown, status = 200) {
  return async () => new Response(JSON.stringify(body), { status });
}

describe("validateVat", () => {
  it("returns structured result for valid VAT number", async () => {
    const result = await validateVat("DE", "123456789", mockFetch(VALID_RESPONSE));

    expect(result).toEqual({
      ok: true,
      valid: true,
      name: "ACME GMBH",
      address: "MUSTERSTRASSE 1\n12345 BERLIN",
      countryCode: "DE",
      vatNumber: "123456789",
      requestDate: "2026-06-07+02:00",
      rawResponse: VALID_RESPONSE,
    });
  });

  it("returns valid=false for invalid VAT number", async () => {
    const invalidResponse = {
      ...VALID_RESPONSE,
      valid: false,
      name: "---",
      address: "---",
    };
    const result = await validateVat("DE", "000000000", mockFetch(invalidResponse));

    expect(result).toEqual({
      ok: true,
      valid: false,
      name: "---",
      address: "---",
      countryCode: "DE",
      vatNumber: "123456789",
      requestDate: "2026-06-07+02:00",
      rawResponse: invalidResponse,
    });
  });

  it("returns structured error on network failure", async () => {
    const failFetch = async () => { throw new Error("ECONNREFUSED"); };
    const result = await validateVat("DE", "123456789", failFetch as typeof fetch);

    expect(result).toEqual({
      ok: false,
      error: "Network error: VIES service unreachable",
    });
  });

  it("returns structured error on HTTP error", async () => {
    const result = await validateVat("DE", "123456789", mockFetch({}, 500));

    expect(result).toEqual({
      ok: false,
      error: "VIES returned HTTP 500",
    });
  });
});

describe("checkViesHealth", () => {
  it("returns reachable when service responds", async () => {
    const result = await checkViesHealth(mockFetch(VALID_RESPONSE));
    expect(result).toEqual({ reachable: true });
  });

  it("returns unreachable on network failure", async () => {
    const failFetch = async () => { throw new Error("ECONNREFUSED"); };
    const result = await checkViesHealth(failFetch as typeof fetch);
    expect(result).toEqual({ reachable: false });
  });
});
