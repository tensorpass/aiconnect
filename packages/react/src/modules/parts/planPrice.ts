// A plan's monthly price in the page's language, read from the currency's smallest unit as TensorPass
// sends it, such as 2000 cents for US$20.

import type { PlanPrice } from '@tensorpass/aiconnect';

export function priceText(price: PlanPrice, locale: string): string {
  const format = new Intl.NumberFormat(locale, { style: 'currency', currency: price.currency });
  const digits = format.resolvedOptions().maximumFractionDigits ?? 2;
  return format.format(price.amount / 10 ** digits);
}
