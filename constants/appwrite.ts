/**
 * Appwrite configuration
 * All collection IDs and constants sourced from environment variables.
 */

export const APPWRITE_ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!;
export const APPWRITE_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!;

export const DB_ID = process.env.EXPO_PUBLIC_APPWRITE_DB_ID!;

// Collection IDs
export const COL_USERS = process.env.EXPO_PUBLIC_COL_USERS!;
export const COL_BUSINESSES = process.env.EXPO_PUBLIC_COL_BUSINESSES!;
export const COL_CUSTOMERS = process.env.EXPO_PUBLIC_COL_CUSTOMERS!;
export const COL_DAY_LOGS = process.env.EXPO_PUBLIC_COL_DAY_LOGS!;
export const COL_ADS = process.env.EXPO_PUBLIC_COL_ADS!;
export const COL_SUBSCRIPTIONS = process.env.EXPO_PUBLIC_COL_SUBSCRIPTIONS!;
export const COL_PAYMENT_ORDERS = process.env.EXPO_PUBLIC_COL_PAYMENT_ORDERS!;

// Storage
export const BUCKET_ADS = process.env.EXPO_PUBLIC_APPWRITE_AD_BUCKET_ID!;

