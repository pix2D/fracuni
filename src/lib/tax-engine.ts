import { validateVat, type ViesSuccess } from "@/lib/vies";
import { CLIENT_TYPE, type ClientType } from "@/lib/client-types";
import { isDomestic, isEuCountry } from "@/lib/countries";
import type { DocumentLanguage } from "@/lib/language";

export type SupplyKind = "service";

export type ServiceVatScenario =
  | "service-domestic"
  | "service-eu-b2c"
  | "service-eu-b2b-reverse-charge"
  | "service-eu-b2b-without-vat-id"
  | "service-non-eu-b2c"
  | "service-non-eu-b2b";

export type ServiceLegalTextKey =
  | "serviceDomestic"
  | "serviceEuB2c"
  | "serviceEuB2bReverseCharge"
  | "serviceEuB2bWithoutVatId"
  | "serviceNonEuB2c"
  | "serviceNonEuB2b";

export type ServiceVatDecisionReason =
  | "domestic-service"
  | "eu-b2c-service"
  | "eu-b2b-service-with-vat-id"
  | "eu-b2b-service-without-vat-id"
  | "non-eu-b2c-service"
  | "non-eu-b2b-service";

export type ServiceVatDecision = {
  supplyKind: SupplyKind;
  scenario: ServiceVatScenario;
  chargesVat: boolean;
  requiresVies: boolean;
  legalTextKey: ServiceLegalTextKey;
  reason: ServiceVatDecisionReason;
};

export type ServiceVatInput = {
  clientType: ClientType;
  clientCountry: string;
  clientVatNumber: string | null;
};

export type ServiceLegalTexts = {
  legalTextServiceDomesticHr: string | null;
  legalTextServiceEuB2cHr: string | null;
  legalTextServiceEuB2cEn: string | null;
  legalTextServiceEuB2bReverseChargeHr: string | null;
  legalTextServiceEuB2bReverseChargeEn: string | null;
  legalTextServiceEuB2bWithoutVatIdHr: string | null;
  legalTextServiceEuB2bWithoutVatIdEn: string | null;
  legalTextServiceNonEuB2cHr: string | null;
  legalTextServiceNonEuB2cEn: string | null;
  legalTextServiceNonEuB2bHr: string | null;
  legalTextServiceNonEuB2bEn: string | null;
};

export type ServiceLegalTextPair = {
  hr: string | null;
  en: string | null;
};

function hasVatNumber(value: string | null): boolean {
  return !!value?.trim();
}

export function decideServiceVat(input: ServiceVatInput): ServiceVatDecision {
  if (isDomestic(input.clientCountry)) {
    return {
      supplyKind: "service",
      scenario: "service-domestic",
      chargesVat: true,
      requiresVies: false,
      legalTextKey: "serviceDomestic",
      reason: "domestic-service",
    };
  }

  const b2b = input.clientType === CLIENT_TYPE.BUSINESS;

  if (isEuCountry(input.clientCountry)) {
    if (!b2b) {
      return {
        supplyKind: "service",
        scenario: "service-eu-b2c",
        chargesVat: true,
        requiresVies: false,
        legalTextKey: "serviceEuB2c",
        reason: "eu-b2c-service",
      };
    }

    if (hasVatNumber(input.clientVatNumber)) {
      return {
        supplyKind: "service",
        scenario: "service-eu-b2b-reverse-charge",
        chargesVat: false,
        requiresVies: true,
        legalTextKey: "serviceEuB2bReverseCharge",
        reason: "eu-b2b-service-with-vat-id",
      };
    }

    return {
      supplyKind: "service",
      scenario: "service-eu-b2b-without-vat-id",
      chargesVat: true,
      requiresVies: false,
      legalTextKey: "serviceEuB2bWithoutVatId",
      reason: "eu-b2b-service-without-vat-id",
    };
  }

  if (b2b) {
    return {
      supplyKind: "service",
      scenario: "service-non-eu-b2b",
      chargesVat: false,
      requiresVies: false,
      legalTextKey: "serviceNonEuB2b",
      reason: "non-eu-b2b-service",
    };
  }

  return {
    supplyKind: "service",
    scenario: "service-non-eu-b2c",
    chargesVat: false,
    requiresVies: false,
    legalTextKey: "serviceNonEuB2c",
    reason: "non-eu-b2c-service",
  };
}

export function serviceLegalTextPair(
  texts: ServiceLegalTexts,
  key: ServiceLegalTextKey,
): ServiceLegalTextPair {
  switch (key) {
    case "serviceDomestic":
      return { hr: texts.legalTextServiceDomesticHr, en: null };
    case "serviceEuB2c":
      return { hr: texts.legalTextServiceEuB2cHr, en: texts.legalTextServiceEuB2cEn };
    case "serviceEuB2bReverseCharge":
      return {
        hr: texts.legalTextServiceEuB2bReverseChargeHr,
        en: texts.legalTextServiceEuB2bReverseChargeEn,
      };
    case "serviceEuB2bWithoutVatId":
      return {
        hr: texts.legalTextServiceEuB2bWithoutVatIdHr,
        en: texts.legalTextServiceEuB2bWithoutVatIdEn,
      };
    case "serviceNonEuB2c":
      return { hr: texts.legalTextServiceNonEuB2cHr, en: texts.legalTextServiceNonEuB2cEn };
    case "serviceNonEuB2b":
      return { hr: texts.legalTextServiceNonEuB2bHr, en: texts.legalTextServiceNonEuB2bEn };
  }
}

export function serviceLegalTextForLang(
  texts: ServiceLegalTexts,
  decision: ServiceVatDecision,
  lang: DocumentLanguage,
): string | null {
  const pair = serviceLegalTextPair(texts, decision.legalTextKey);
  return lang === "hr" ? pair.hr : (pair.en ?? pair.hr);
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

export type TaxInput = ServiceVatInput & {
  vatRate: number;
  baseAmount: number;
  companyLegalTexts: ServiceLegalTexts;
};

type ServiceVatSuccessResult = {
  ok: true;
  decision: ServiceVatDecision;
  breakdown: TaxBreakdown;
  legalTexts: ServiceLegalTextPair;
  viesResult: ViesSuccess | null;
};

type TaxError = {
  ok: false;
  error: string;
  code: "vies_invalid" | "vies_error";
};

export type TaxResult = ServiceVatSuccessResult | TaxError;

export async function verifyAndDetermine(
  input: TaxInput,
  fetcher?: typeof fetch,
): Promise<TaxResult> {
  const decision = decideServiceVat(input);

  if (!decision.requiresVies) {
    return {
      ok: true,
      decision,
      breakdown: calculateTaxBreakdown(input.baseAmount, decision.chargesVat ? input.vatRate : 0),
      legalTexts: serviceLegalTextPair(input.companyLegalTexts, decision.legalTextKey),
      viesResult: null,
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
    decision,
    breakdown: calculateTaxBreakdown(input.baseAmount, 0),
    legalTexts: serviceLegalTextPair(input.companyLegalTexts, decision.legalTextKey),
    viesResult,
  };
}
