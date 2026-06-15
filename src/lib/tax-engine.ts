import { validateVat, type ViesSuccess } from "@/lib/vies";
import { isDomestic } from "@/lib/countries";

export type TaxTreatment = "domestic" | "reverse-charge" | "international";

export function determineTaxTreatment(input: {
  clientCountry: string;
  clientVatNumber: string | null;
}): TaxTreatment {
  if (isDomestic(input.clientCountry)) return "domestic";
  if (input.clientVatNumber) return "reverse-charge";
  return "international";
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

type DomesticResult = {
  ok: true;
  type: "domestic";
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

type InternationalResult = {
  ok: true;
  type: "international";
  breakdown: TaxBreakdown;
  legalTexts: Record<string, never>;
};

type TaxError = {
  ok: false;
  error: string;
  code: "vies_invalid" | "vies_error";
};

export type TaxResult = DomesticResult | ReverseChargeResult | InternationalResult | TaxError;

export async function verifyAndDetermine(
  input: TaxInput,
  fetcher?: typeof fetch,
): Promise<TaxResult> {
  const treatment = determineTaxTreatment(input);

  if (treatment === "domestic") {
    return {
      ok: true,
      type: "domestic",
      breakdown: calculateTaxBreakdown(input.baseAmount, input.vatRate),
      legalTexts: { domestic: input.companyLegalTexts.domestic },
    };
  }

  if (treatment === "international") {
    return {
      ok: true,
      type: "international",
      breakdown: calculateTaxBreakdown(input.baseAmount, 0),
      legalTexts: {} as Record<string, never>,
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
