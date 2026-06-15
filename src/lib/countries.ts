// Single source of truth for the countries a Client can belong to.
//
// Country is stored canonically as an ISO 3166-1 alpha-2 code (e.g. "HR"); the
// display name is derived from this list. The Tax Engine and the Nager.Date
// holiday client key off the same codes, so domestic detection stays consistent
// across the form, the data layer, and the tax logic.
export const CROATIA = "HR";

export interface Country {
  code: string;
  name: string;
}

export const COUNTRIES: Country[] = [
  { code: "HR", name: "Croatia" },
  { code: "DE", name: "Germany" },
  { code: "AT", name: "Austria" },
  { code: "SI", name: "Slovenia" },
  { code: "IT", name: "Italy" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "NL", name: "Netherlands" },
  { code: "FR", name: "France" },
  { code: "CH", name: "Switzerland" },
];

const NAME_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c.name]));

export function countryName(code: string | null | undefined): string {
  if (!code) return "";
  return NAME_BY_CODE.get(code) ?? code;
}

export function isDomestic(countryCode: string | null | undefined): boolean {
  return countryCode === CROATIA;
}
