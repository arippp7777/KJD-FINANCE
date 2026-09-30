/**
 * Currency utilities for KJD Finance
 * All monetary values are raw numbers in IDR (Indonesian Rupiah).
 */

/** Format a raw number as IDR display string. e.g. 1500000 → "Rp 1.500.000" */
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format as compact IDR for dashboard cards.
 * e.g. 1500000 → "Rp 1,5 jt" | 1000000000 → "Rp 1 M"
 */
export function formatIDRCompact(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  }
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  }
  if (amount >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(0)} rb`;
  }
  return formatIDR(amount);
}

/**
 * Parse a user-typed IDR string to a plain number.
 * Handles "1.500.000", "1500000", "Rp 1.500.000" → 1500000.
 * Returns 0 if the input cannot be parsed.
 */
export function parseIDRInput(value: string): number {
  // Remove "Rp", spaces, dots (thousands separator), keep only digits and comma (decimal)
  const cleaned = value
    .replace(/Rp\s*/i, "")
    .replace(/\./g, "")   // remove thousands dots
    .replace(",", ".")    // normalize decimal separator
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/** Sum an array of numbers (safe for empty arrays → 0) */
export function sumAmounts(amounts: number[]): number {
  return amounts.reduce((acc, n) => acc + n, 0);
}
