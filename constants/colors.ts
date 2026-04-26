/**
 * Design tokens for Any Khata
 * All colors, typography, and spacing defined here.
 */

export const Colors = {
  // Primary — deep blue-green, trustworthy, financial
  primary: '#0F4C75',
  primaryLight: '#1B6CA8',
  primaryPale: '#E8F4FD',

  // Accent — warm saffron (Indian identity)
  accent: '#F4A261',
  accentLight: '#FDEBD0',

  // Semantic
  success: '#2D6A4F',
  successLight: '#D8F3DC',
  danger: '#C62828',
  dangerLight: '#FFEBEE',
  warning: '#E65100',
  warningLight: '#FFF3E0',

  // Neutrals
  surface: '#FFFFFF',
  background: '#F5F7FA',
  border: '#E0E6EF',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7A99',
  textMuted: '#9AA5BE',
  white: '#FFFFFF',

  // Balance colors (used only for amounts)
  amountDue: '#C62828',   // red — money customer owes
  amountPaid: '#2D6A4F',  // green — money paid
  amountTotal: '#0F4C75', // blue — total billed
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,   // default body
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 38,  // big balance numbers
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
};
