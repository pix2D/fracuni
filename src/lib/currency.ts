import {
  dinero,
  add,
  subtract,
  multiply,
  toDecimal,
  toSnapshot,
  transformScale,
  halfUp,
  type Dinero,
} from "dinero.js";
import { EUR, USD, CZK, DKK, ISK, NOK, PLN, RON, SEK } from "dinero.js";
import type { DineroCurrency } from "dinero.js";
import type { DocumentLanguage } from "@/lib/language";

const HUF: DineroCurrency<number> = { code: "HUF", base: 10, exponent: 0 };

export type CurrencyCode =
  | "EUR"
  | "USD"
  | "CZK"
  | "DKK"
  | "HUF"
  | "ISK"
  | "NOK"
  | "PLN"
  | "RON"
  | "SEK";

export type Money = Dinero<number>;

const CURRENCIES: Record<CurrencyCode, DineroCurrency<number>> = {
  EUR,
  USD,
  CZK,
  DKK,
  HUF,
  ISK,
  NOK,
  PLN,
  RON,
  SEK,
};

// SSOT for the currencies the Currency Engine can handle. Settings' default
// supported-currency list is derived from this so the two never drift apart.
export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

export function getCurrency(code: CurrencyCode): DineroCurrency<number> {
  return CURRENCIES[code];
}

export function isCurrencyCode(code: string): code is CurrencyCode {
  return Object.prototype.hasOwnProperty.call(CURRENCIES, code);
}

function getExponent(code: CurrencyCode): number {
  const currency = CURRENCIES[code];
  return currency.exponent;
}

function decimalToSmallestUnit(amount: number, code: CurrencyCode): number {
  const exp = getExponent(code);
  return Math.round(amount * Math.pow(10, exp));
}

export function toSmallestUnit(amount: Money): number {
  const rounded = roundToScale(amount);
  const snapshot = toSnapshot(rounded);
  return snapshot.amount;
}

export function moneyFromSmallestUnit(
  amount: number,
  currency: CurrencyCode,
): Money {
  return dinero({ amount, currency: CURRENCIES[currency] });
}

export function lineItemAmount(
  quantity: number,
  unitPrice: number,
  currency: CurrencyCode,
): Money {
  const priceInSmallestUnit = decimalToSmallestUnit(unitPrice, currency);
  const cur = CURRENCIES[currency];
  const price = dinero({ amount: priceInSmallestUnit, currency: cur });

  const qtyScale = decimalScale(quantity);
  const qtyScaled = Math.round(quantity * Math.pow(10, qtyScale));

  return multiply(price, { amount: qtyScaled, scale: qtyScale });
}

function decimalScale(n: number): number {
  const s = n.toString();
  const dotIndex = s.indexOf(".");
  if (dotIndex === -1) return 0;
  return s.length - dotIndex - 1;
}

export function sumAmounts(amounts: Money[]): Money {
  return amounts.reduce((acc, item) => add(acc, item));
}

export function calculateVat(subtotal: Money, ratePercent: number): Money {
  return multiply(subtotal, { amount: ratePercent, scale: 2 });
}

export function total(subtotal: Money, vat: Money): Money {
  return add(subtotal, vat);
}

export function subtractMoney(a: Money, b: Money): Money {
  return subtract(a, b);
}

export function eurEquivalent(amount: Money, hnbRateText: string): Money {
  const rounded = roundToScale(amount);
  const snapshot = toSnapshot(rounded);
  const foreignMinorUnits = BigInt(snapshot.amount);
  const foreignScale = pow10(snapshot.currency.exponent);
  const rate = parseHnbRateText(hnbRateText);

  const numerator = foreignMinorUnits * rate.scale * 100n;
  const denominator = foreignScale * rate.amount;
  const eurSmallestUnit = roundHalfUpQuotient(numerator, denominator);
  const amountNumber = Number(eurSmallestUnit);

  if (!Number.isSafeInteger(amountNumber)) {
    throw new Error("EUR equivalent exceeds safe integer range");
  }

  return dinero({ amount: amountNumber, currency: EUR });
}

function parseHnbRateText(value: string): { amount: bigint; scale: bigint } {
  const normalized = value.trim().replace(",", ".");
  const match = normalized.match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) throw new Error(`Invalid HNB exchange rate: ${value}`);

  const whole = match[1]!;
  const fractional = match[2] ?? "";
  const amount = BigInt(`${whole}${fractional}`);
  if (amount <= 0n) throw new Error(`Invalid HNB exchange rate: ${value}`);

  return {
    amount,
    scale: pow10(fractional.length),
  };
}

function pow10(exponent: number): bigint {
  return 10n ** BigInt(exponent);
}

function roundHalfUpQuotient(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new Error("Cannot divide by a non-positive denominator");

  const quotient = numerator / denominator;
  const remainder = absBigInt(numerator % denominator);
  const twiceRemainder = remainder * 2n;

  if (numerator >= 0n) {
    return twiceRemainder >= denominator ? quotient + 1n : quotient;
  }

  return twiceRemainder > denominator ? quotient - 1n : quotient;
}

function absBigInt(value: bigint): bigint {
  return value < 0n ? -value : value;
}

export function exchangeRateText(
  rateText: string,
  currency: CurrencyCode,
  lang: DocumentLanguage,
  issueDate: string,
  effectiveDate: string,
): string {
  if (lang === "hr") {
    if (issueDate === effectiveDate) {
      return `Tečaj na dan izdavanja računa (${formatExchangeDate(effectiveDate, lang)}) iznosi 1 EUR = ${rateText} ${currency}`;
    }
    return `Tečaj na dan ${formatExchangeDate(effectiveDate, lang)} (zadnji dostupni prije datuma izdavanja ${formatExchangeDate(issueDate, lang)}) iznosi 1 EUR = ${rateText} ${currency}`;
  }
  if (issueDate === effectiveDate) {
    return `The exchange rate on the issue date (${formatExchangeDate(effectiveDate, lang)}) is 1 EUR = ${rateText} ${currency}`;
  }
  return `The exchange rate on ${formatExchangeDate(effectiveDate, lang)} (latest available before the issue date ${formatExchangeDate(issueDate, lang)}) is 1 EUR = ${rateText} ${currency}`;
}

function formatExchangeDate(date: string, lang: DocumentLanguage): string {
  if (lang === "en") return date;
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${day}.${month}.${year}.`;
}

function roundToScale(amount: Money): Money {
  const snapshot = toSnapshot(amount);
  const targetScale = snapshot.currency.exponent;
  if (snapshot.scale === targetScale) return amount;
  return transformScale(amount, targetScale, halfUp);
}

export function formatMoney(amount: Money): string {
  const rounded = roundToScale(amount);
  const snapshot = toSnapshot(rounded);
  const exp = snapshot.currency.exponent;
  const decimal = toDecimal(rounded);
  return formatEuNumber(decimal, exp);
}

export function formatMoneyWithCurrency(amount: Money): string {
  const snapshot = toSnapshot(amount);
  const code = snapshot.currency.code;
  return `${formatMoney(amount)} ${code}`;
}

// EU-formats a plain number to a fixed number of decimals (comma decimal,
// period thousands). Used for non-Money quantities on the PDF (e.g. "1,00").
export function formatEuDecimal(value: number, decimals: number): string {
  return formatEuNumber(value.toFixed(decimals), decimals);
}

function formatEuNumber(decimalStr: string, decimals: number): string {
  const isNegative = decimalStr.startsWith("-");
  const abs = decimalStr.replace("-", "");
  const parts = abs.split(".");
  const intPart = parts[0] ?? "0";
  const fracPart = parts[1] ?? "";

  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  let formatted: string;
  if (decimals === 0) {
    formatted = withThousands;
  } else {
    const padded = fracPart.padEnd(decimals, "0").slice(0, decimals);
    formatted = `${withThousands},${padded}`;
  }

  return isNegative ? `-${formatted}` : formatted;
}
