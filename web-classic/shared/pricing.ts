// Pricing utility functions

/**
 * Calculate customer price from Airalo price with margin percentage
 * @param airaloPrice - Original price from Airalo
 * @param marginPercentage - Margin percentage (e.g., 50 for 50%)
 * @returns Customer-facing price
 */
export function calculateCustomerPrice(airaloPrice: number | string, marginPercentage: number): string {
  const basePrice = typeof airaloPrice === 'string' ? parseFloat(airaloPrice) : airaloPrice;
  const margin = marginPercentage / 100;
  const customerPrice = basePrice * (1 + margin);
  return customerPrice.toFixed(2);
}

/**
 * Get margin percentage from settings or default
 * @param settings - Settings object from API
 * @returns Margin percentage
 */
export function getMarginPercentage(settings?: Record<string, string>): number {
  if (!settings || !settings.pricing_margin) {
    return 0; // Default to 0% margin if not set
  }
  return parseFloat(settings.pricing_margin) || 0;
}
