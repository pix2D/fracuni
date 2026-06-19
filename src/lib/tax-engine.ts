import { validateVat, type ViesSuccess } from "@/lib/vies";
import { CLIENT_TYPE, type ClientType } from "@/lib/client-types";
import { isDomestic, isEuCountry } from "@/lib/countries";

export type TaxTreatment = "croatian-pdv" | "reverse-charge" | "outside-scope";

export function determineTaxTreatment(input: {
  clientType: ClientType;
  clientCountry: string;
  clientVatNumber: string | null;
}): TaxTreatment {
  if (!isEuCountry(input.clientCountry)) return "outside-scope";
  if (input.clientType === CLIENT_TYPE.PERSON) return "croatian-pdv";
  if (isDomestic(input.clientCountry)) return "croatian-pdv";
  if (input.clientVatNumber) return "reverse-charge";
  return "croatian-pdv";
}

export function chargesCroatianPdv(treatment: TaxTreatment): boolean {
  return treatment === "croatian-pdv";
}

export type TaxBreakdown = {
  base: number;
  pdv: number;
  total: number;
};

export function calculateTaxBreakdown(baseAmount: number, vatRate: number): TaxBreakdown {
  const pdv = baseAmount * (vatRate / 100);
  return { base: baseAmount, pdv, total: baseAmount + pdv };
}

export type TaxInput = {
  clientType: ClientType;
  clientCountry: string;
  clientVatNumber: string | null;
  vatRate: number;
  baseAmount: number;
  companyLegalTexts: {
    domestic: string | null;
    foreignHr: string | null;
    foreignEn: string | null;
  };
};

type CroatianPdvResult = {
  ok: true;
  type: "croatian-pdv";
  breakdown: TaxBreakdown;
  legalTexts: { domestic: string | null };
};

type ReverseChargeResult = {
  ok: true;
  type: "reverse-charge";
  breakdown: TaxBreakdown;
  legalTexts: { foreignHr: string | null; foreignEn: string | null };
  viesResult: ViesSuccess;
};

type OutsideScopeResult = {
  ok: true;
  type: "outside-scope";
  breakdown: TaxBreakdown;
  legalTexts: Record<string, never>;
};

type TaxError = {
  ok: false;
  error: string;
  code: "vies_invalid" | "vies_error";
};

export type TaxResult = CroatianPdvResult | ReverseChargeResult | OutsideScopeResult | TaxError;

export async function verifyAndDetermine(
  input: TaxInput,
  fetcher?: typeof fetch,
): Promise<TaxResult> {
  const treatment = determineTaxTreatment(input);

  if (treatment === "croatian-pdv") {
    return {
      ok: true,
      type: "croatian-pdv",
      breakdown: calculateTaxBreakdown(input.baseAmount, input.vatRate),
      legalTexts: { domestic: input.companyLegalTexts.domestic },
    };
  }

  if (treatment === "outside-scope") {
    return {
      ok: true,
      type: "outside-scope",
      breakdown: calculateTaxBreakdown(input.baseAmount, 0),
      legalTexts: {},
    };
  }

  const viesResult = await validateVat(
    input.clientCountry,
    input.clientVatNumber!,
    fetcher,
  );

  if (!viesResult.ok) {
    return { ok: false, error: viesResult.error, code: "vies_error" };
  }

  if (!viesResult.valid) {
    return {
      ok: false,
      error: `VAT number ${input.clientVatNumber} is not valid according to VIES`,
      code: "vies_invalid",
    };
  }

  return {
    ok: true,
    type: "reverse-charge",
    breakdown: calculateTaxBreakdown(input.baseAmount, 0),
    legalTexts: {
      foreignHr: input.companyLegalTexts.foreignHr,
      foreignEn: input.companyLegalTexts.foreignEn,
    },
    viesResult,
  };
}
