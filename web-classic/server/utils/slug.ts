/**
 * Generate a URL-friendly slug from a string
 * @param text - The text to convert to a slug
 * @returns A lowercase, hyphenated slug
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a package slug from package details
 * @param destination - Destination name or slug
 * @param dataAmount - Data amount (e.g., "1GB")
 * @param validity - Validity in days
 * @param operator - Operator name (optional, for uniqueness)
 * @returns A SEO-friendly package slug
 */
export function generatePackageSlug(
  destination: string,
  dataAmount: string,
  validity: number,
  operator?: string
): string {
  const destSlug = generateSlug(destination);
  const dataSlug = generateSlug(dataAmount);
  const validitySlug = `${validity}days`;
  
  if (operator) {
    const operatorSlug = generateSlug(operator);
    return `${destSlug}-${dataSlug}-${validitySlug}-${operatorSlug}`;
  }
  
  return `${destSlug}-${dataSlug}-${validitySlug}`;
}
