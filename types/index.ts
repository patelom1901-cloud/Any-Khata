/**
 * All TypeScript interfaces for Any Khata
 * Source of truth for all types — no inline type definitions allowed.
 */

export interface AppUser {
  $id?: string; // Document ID for updates
  userId: string;
  /** Populated from Appwrite auth account, NOT stored in users collection */
  name?: string;
  /** Populated from Appwrite auth account, NOT stored in users collection */
  email?: string;
  phone?: string;
  photo?: string;
  hasBusiness: boolean;
  isSubscribed: boolean;
}

export interface Business {
  businessId: string;
  ownerId: string;
  businessName: string;
  ownerName: string;
  phone: string;
  businessType: string;
  city: string;
  state: string;
  isActive: boolean;
  subscriptionStatus: 'active' | 'expired' | 'pending';
  subscriptionExpiry: string; // "YYYY-MM-DD"
  createdAt: string;
  storePhotoUrl?: string | null;
  // Appwrite database fields
  business_name?: string;
  owner_name?: string;
  store_photo_url?: string | null;
}

export interface Customer {
  customerId: string;
  businessId: string;
  name: string;
  phone: string;
  linkedUserId?: string;
  linkCode?: string;
  isLinked: boolean;
  totalDue: number;
  totalPaid: number;
  balance: number;
  createdAt: string;
}

export interface DayEntry {
  id: string;
  description: string;
  amount: number;
  type: 'gave' | 'got' | 'debit' | 'credit'; // supports legacy and new entry types
  time: string; // "HH:MM"
  note?: string; // optional note for 'got' entries
  quantity?: number; // optional quantity for 'gave' entries
  timestamp?: string; // full ISO timestamp
  is_deleted?: boolean;
}

export interface DayLog {
  dayLogId: string;
  businessId: string;
  customerId: string;
  date: string; // "YYYY-MM-DD"
  entries: DayEntry[]; // parsed from JSON string
  dayTotal: number;
  isLocked: boolean;
  createdAt: string;
  is_deleted?: boolean;
}

// Payment interface removed — all entries now in day_logs

export interface Ad {
  adId: string;
  user_id?: string;
  business_name: string;
  owner_name: string;
  phone: string;
  image_file_id: string;
  image_url: string;
  subscription_status: 'active' | 'expired';
  subscription_expiry: string;
  created_at: string;
  gstin?: string;
  website_url?: string;
  maps_url?: string;
}

export interface Subscription {
  subscriptionId: string;
  userId: string;
  type: 'business' | 'ad';
  referenceId: string;
  amount: number;
  cashfreeOrderId: string;
  status: 'paid' | 'pending' | 'failed';
  paidAt: string;
  validUntil: string;
}

// Form types
export interface AddCustomerForm {
  name: string;
  phone: string;
}

export interface AddEntryForm {
  description: string;
  amount: string;
}

export interface AddPaymentForm {
  amount: string;
  note?: string;
}

