import type { CurrencyRate } from "@shared/schema";

// Convert price from one currency to another
export function convertPrice(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  currencies: CurrencyRate[]
): number {
  if (fromCurrency === toCurrency) return amount;
  
  const fromRate = currencies.find(c => c.code === fromCurrency)?.conversionRate;
  const toRate = currencies.find(c => c.code === toCurrency)?.conversionRate;
  
  if (!fromRate || !toRate) return amount;
  
  // Convert to USD first, then to target currency
  const usdAmount = amount / parseFloat(fromRate);
  const convertedAmount = usdAmount * parseFloat(toRate);
  
  return convertedAmount;
}

// Format price with currency symbol
export function formatPrice(
  amount: number | string,
  currencyCode: string,
  currencies: CurrencyRate[]
): string {
  const currency = currencies.find(c => c.code === currencyCode);
  const symbol = currency?.symbol || "$";
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  
  return `${symbol}${numAmount.toFixed(2)}`;
}

// Get currency symbol
export function getCurrencySymbol(currencyCode: string, currencies: CurrencyRate[]): string {
  return currencies.find(c => c.code === currencyCode)?.symbol || "$";
}

// Get default currency
export function getDefaultCurrency(currencies: CurrencyRate[]): CurrencyRate | undefined {
  return currencies.find(c => c.isDefault) || currencies.find(c => c.code === "USD");
}
