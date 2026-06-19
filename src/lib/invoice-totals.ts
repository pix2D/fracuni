import {
  lineItemAmount,
  sumAmounts,
  calculateVat,
  total as addTotal,
  moneyFromSmallestUnit,
  type CurrencyCode,
  type Money,
} from "@/lib/currency";

export interface TotalsLineItem {
  quantity: number;
  unitPrice: number;
}

export interface InvoiceTotals {
  subtotal: Money;
  // null when Croatian PDV does not apply (reverse charge / outside scope).
  pdv: Money | null;
  total: Money;
}

export interface TotalsOptions {
  chargeVat: boolean;
  vatRate: number;
}

// Computes Draft totals through the Currency Engine (dinero.js). Pure and side-effect
// free so it can be shared between the form's live preview and any server-side use.
export function computeInvoiceTotals(
  items: TotalsLineItem[],
  currency: CurrencyCode,
  opts: TotalsOptions,
): InvoiceTotals {
  const amounts = items.map((item) =>
    lineItemAmount(item.quantity, item.unitPrice, currency),
  );

  const subtotal = amounts.length > 0 ? sumAmounts(amounts) : moneyFromSmallestUnit(0, currency);

  if (!opts.chargeVat) {
    return { subtotal, pdv: null, total: subtotal };
  }

  const pdv = calculateVat(subtotal, opts.vatRate);
  return { subtotal, pdv, total: addTotal(subtotal, pdv) };
}
