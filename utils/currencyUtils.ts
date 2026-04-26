/**
 * Currency utilities for Any Khata
 * All amounts stored as float. Always format for display.
 */

/** Format number as Indian Rupee: 1234.5 → "₹ 1,234.50" */
export const formatCurrency = (amount: number): string => {
  return '₹ ' + amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/** Format compact: 1234 → "₹1.2K", 50 → "₹50" */
export const formatCurrencyCompact = (amount: number): string => {
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return `₹${amount.toFixed(0)}`;
};

/** Parse user input string to float safely */
export const parseAmount = (input: string): number => {
  const cleaned = input.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
};

/** Validate amount (must be > 0 and reasonable) */
export const isValidAmount = (amount: number): boolean => {
  return amount > 0 && amount < 1_000_000; // max ₹10 lakh per entry
};
