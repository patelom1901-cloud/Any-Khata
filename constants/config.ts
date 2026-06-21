/**
 * Feature flags for Any Khata
 * Set to true to enable, false to disable.
 * Add new features HERE FIRST before building them.
 */
export const FEATURES = {
  // v1 — all enabled
  ADS_PAGE: true,
  PUSH_NOTIFICATIONS: true,
  CUSTOMER_PHONE_LINK: true,
  ENABLE_PAYMENTS: true,

  // v2 — future (disabled)
  MULTI_BUSINESS: false,      // one owner, multiple businesses
  EXPORT_PDF: false,           // export month as PDF
  UPI_QR_CODE: false,          // show UPI QR on payment screen
  CUSTOMER_CHAT: false,        // owner ↔ customer messaging
  ANALYTICS_CHARTS: false,     // revenue graphs for owner
  INVENTORY: false,            // item/product catalog
  EMPLOYEE_MANAGEMENT: false,  // worker tracking
};

export const CONFIG = {
  PAYMENTS_ENABLED: false,
  ADMOB_ENABLED: true,
  ADMOB_BANNER_ID: "ca-app-pub-6023840028537006/1494979875",
  ADMOB_INTERSTITIAL_ID: "ca-app-pub-6023840028537006/2844710248",
  ADMOB_IOS_BANNER_ID: "ca-app-pub-6023840028537006/4036384284",
  ADMOB_IOS_INTERSTITIAL_ID: "ca-app-pub-6023840028537006/7077522155",
};
