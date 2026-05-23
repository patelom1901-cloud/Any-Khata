/**
 * Appwrite configuration
 * All collection IDs and constants sourced from environment variables.
 * Defensive: falls back to sensible defaults so the app never crashes
 * on startup if an env var is missing after a cache/restart issue.
 */

function envOrDefault(key: string, fallback: string): string {
  const value = process.env[key];
  if (!value) {
    console.warn(
      `[appwrite config] Missing env var "${key}", using fallback "${fallback}". ` +
      `Check your .env file.`
    );
    return fallback;
  }
  return value;
}

export const APPWRITE_ENDPOINT = envOrDefault('EXPO_PUBLIC_APPWRITE_ENDPOINT', 'https://sgp.cloud.appwrite.io/v1');
export const APPWRITE_PROJECT_ID = envOrDefault('EXPO_PUBLIC_APPWRITE_PROJECT_ID', '');

export const DB_ID = envOrDefault('EXPO_PUBLIC_APPWRITE_DB_ID', 'any_khata_db');

// Collection IDs
export const COL_USERS = envOrDefault('EXPO_PUBLIC_COL_USERS', 'users');
export const COL_BUSINESSES = envOrDefault('EXPO_PUBLIC_COL_BUSINESSES', 'businesses');
export const COL_CUSTOMERS = envOrDefault('EXPO_PUBLIC_COL_CUSTOMERS', 'customers');
export const COL_DAY_LOGS = envOrDefault('EXPO_PUBLIC_COL_DAY_LOGS', 'day_logs');
export const COL_ADS = envOrDefault('EXPO_PUBLIC_COL_ADS', 'ads');
export const COL_SUBSCRIPTIONS = envOrDefault('EXPO_PUBLIC_COL_SUBSCRIPTIONS', 'subscriptions');
export const COL_PAYMENT_ORDERS = envOrDefault('EXPO_PUBLIC_COL_PAYMENT_ORDERS', 'payments');

// Storage
export const BUCKET_ADS = envOrDefault('EXPO_PUBLIC_APPWRITE_AD_BUCKET_ID', 'ad_images');


