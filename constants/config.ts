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
