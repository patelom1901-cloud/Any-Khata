/**
 * Database helpers
 * ALL Appwrite DB read/write operations go here.
 * Zero direct SDK calls in components.
 */
import { databases, account } from './appwrite';
import { Query, ID } from 'react-native-appwrite';
import { DB_ID, COL_USERS, COL_CUSTOMERS, COL_DAY_LOGS, COL_BUSINESSES, COL_ADS, COL_SUBSCRIPTIONS } from '../constants/appwrite';
import { getTodayString } from '../utils/dateUtils';
import { parseEntries, serializeEntries, calcDayTotal, createEntry } from '../utils/entryUtils';
import type { Customer, DayLog, Business, Ad, DayEntry } from '../types';
import { useAuthStore } from '../store/authStore';

// ─── Customers ───────────────────────────────────────────────

export const getCustomersByBusiness = async (businessId: string): Promise<Customer[]> => {
  const res = await databases.listDocuments(DB_ID, COL_CUSTOMERS, [
    Query.equal('business_id', businessId),
    Query.orderAsc('name'),
    Query.limit(100),
  ]);
  const activeDocs = res.documents.filter((doc: any) => doc.is_deleted !== true);
  return activeDocs.map((doc: any) => ({
    customerId: doc.$id,
    businessId: doc.business_id,
    name: doc.name,
    phone: doc.phone,
    linkedUserId: doc.linked_user_id,
    linkCode: doc.link_code,
    isLinked: doc.is_linked || false,
    totalDue: doc.total_due || 0,
    totalPaid: doc.total_paid || 0,
    balance: doc.balance || 0,
    createdAt: doc.created_at,
  })) as unknown as Customer[];
};

export const getCustomer = async (customerId: string): Promise<Customer | null> => {
  try {
    const doc = await databases.getDocument(DB_ID, COL_CUSTOMERS, customerId);
    return {
      customerId: (doc as any).$id,
      businessId: (doc as any).business_id,
      name: (doc as any).name,
      phone: (doc as any).phone,
      linkedUserId: (doc as any).linked_user_id,
      linkCode: (doc as any).link_code,
      isLinked: (doc as any).is_linked || false,
      totalDue: (doc as any).total_due || 0,
      totalPaid: (doc as any).total_paid || 0,
      balance: (doc as any).balance || 0,
      createdAt: (doc as any).created_at,
    } as unknown as Customer;
  } catch {
    return null;
  }
};

export const createCustomer = async (data: {
  business_id: string;
  owner_id: string;
  name: string;
  phone: string;
  link_code: string;
}): Promise<any> => {
  const doc = await databases.createDocument(DB_ID, COL_CUSTOMERS, ID.unique(), {
    business_id: data.business_id,
    owner_id: data.owner_id,
    name: data.name,
    phone: data.phone,
    link_code: data.link_code,
    linked_user_id: "",
    is_linked: false,
    balance: 0,
    created_at: new Date().toISOString(),
  });
  return doc;
};

export const updateCustomer = async (
  customerId: string,
  updates: Partial<Customer> | any
): Promise<Customer> => {
  const doc = await databases.updateDocument(DB_ID, COL_CUSTOMERS, customerId, updates as any);
  return doc as unknown as Customer;
};

export const deleteCustomer = async (customerId: string): Promise<void> => {
  // We do NOT delete day_logs — keep for records as per requirements.
  await databases.updateDocument(DB_ID, COL_CUSTOMERS, customerId, {
    is_deleted: true
  });
};


export const getMyLinkedKhatas = async (userId: string): Promise<any[]> => {
  try {
    const res = await databases.listDocuments(DB_ID, COL_CUSTOMERS, [
      Query.equal('linked_user_id', userId),
    ]);

    const activeDocs = res.documents.filter((doc: any) => doc.is_deleted !== true);
    const linked = activeDocs.map((doc: any) => ({
      id: doc.$id || doc.customerId,
      businessId: doc.business_id || doc.businessId,
      balance: doc.balance || doc.totalDue || 0,
    }));

    const businessPromises = linked.map(k => getBusiness(k.businessId));
    const businesses = await Promise.all(businessPromises);

    return linked.map((k, idx) => {
      const b = businesses[idx] as any;
      return {
        ...k,
        businessName: b?.business_name || b?.businessName || 'Unknown Business',
        storePhotoUrl: b?.storePhotoUrl || b?.store_photo_url || null,
      };
    });
  } catch (err) {
    return [];
  }
};

export const linkKhataByCode = async (userId: string, linkCode: string): Promise<{ success: boolean; message: string; customerId?: string }> => {
  try {
    const res = await databases.listDocuments(DB_ID, COL_CUSTOMERS, [
      Query.equal('link_code', linkCode),
      Query.limit(10),
    ]);

    const activeDocs = res.documents.filter((doc: any) => doc.is_deleted !== true);

    if (activeDocs.length === 0) {
      return { success: false, message: 'Invalid code. Ask your shopkeeper for the correct code.' };
    }

    const doc = activeDocs[0];
    if (doc.linked_user_id && doc.linked_user_id.length > 0) {
      return { success: false, message: 'This code is already linked to an account.' };
    }

    await updateCustomer(doc.$id, {
      linked_user_id: userId,
      is_linked: true,
    });

    return { success: true, message: 'Khata linked successfully!', customerId: doc.$id };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to link Khata.' };
  }
};

/**
 * Unlink a customer from a shop.
 * This just clears the linked_user_id and is_linked flag.
 */
export const unlinkKhata = async (customerId: string): Promise<{ success: boolean; message: string }> => {
  try {
    await updateCustomer(customerId, {
      linked_user_id: "",
      is_linked: false,
      is_deleted: true,
    });
    return { success: true, message: 'Khata unlinked successfully!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to unlink Khata.' };
  }
};

// ─── Day Logs ────────────────────────────────────────────────

export const getDayLogsForCustomer = async (
  businessId: string,
  customerId: string
): Promise<DayLog[]> => {
  const res = await databases.listDocuments(DB_ID, COL_DAY_LOGS, [
    Query.equal('business_id', businessId),
    Query.equal('customer_id', customerId),
    Query.orderDesc('date'),
    Query.limit(365),
  ]);

  return res.documents.map((doc: any) => ({
    dayLogId: doc.$id,
    businessId: doc.business_id,
    customerId: doc.customer_id,
    date: doc.date,
    dayTotal: doc.day_total || doc.total,
    isLocked: doc.is_locked,
    createdAt: doc.created_at,
    entries: parseEntries(doc.entries),
  })) as unknown as DayLog[];
};

export const getOrCreateDayLog = async (
  businessId: string,
  customerId: string
): Promise<DayLog> => {
  const today = getTodayString();

  const existing = await databases.listDocuments(DB_ID, COL_DAY_LOGS, [
    Query.equal('business_id', businessId),
    Query.equal('customer_id', customerId),
    Query.equal('date', today),
    Query.limit(1),
  ]);

  if (existing.documents.length > 0) {
    const doc = existing.documents[0] as any;
    return {
      ...doc,
      dayLogId: doc.$id,
      businessId: doc.business_id,
      customerId: doc.customer_id,
      dayTotal: doc.day_total || doc.total,
      isLocked: doc.is_locked,
      createdAt: doc.created_at,
      entries: parseEntries(doc.entries),
    } as unknown as DayLog;
  }

  // Get customer to extract owner_id and linked_user_id for permissions
  const customer = await getCustomer(customerId);
  if (!customer) {
    throw new Error('Customer not found');
  }

  const newDoc = await databases.createDocument(DB_ID, COL_DAY_LOGS, ID.unique(), {
    business_id: businessId,
    customer_id: customerId,
    date: today,
    entries: serializeEntries([]),
    day_total: 0,
    is_locked: false,
  });

  return {
    dayLogId: newDoc.$id,
    businessId: businessId,
    customerId: customerId,
    date: today,
    entries: [],
    dayTotal: 0,
    isLocked: false,
    createdAt: newDoc.created_at,
  } as unknown as DayLog;
};

export const addEntryToDayLog = async (
  dayLog: DayLog,
  description: string,
  amount: number,
  type: 'gave' | 'got',
  quantity?: number
): Promise<DayLog> => {
  if (dayLog.isLocked) {
    throw new Error('Day is locked. Cannot edit past records.');
  }

  const newEntry = createEntry(description, amount, type, quantity);
  const updatedEntries = [...dayLog.entries, newEntry];

  // day_total = sum of all 'gave' entries only
  let newTotal = updatedEntries
    .filter((e) => e.type === 'gave')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  newTotal = Math.round(newTotal * 100) / 100;
  if (isNaN(newTotal)) newTotal = 0;

  await databases.updateDocument(DB_ID, COL_DAY_LOGS, dayLog.dayLogId, {
    entries: serializeEntries(updatedEntries),
    day_total: newTotal,
  });

  // Recalculate customer balance after every entry
  await recalcAndUpdateCustomerBalance(dayLog.customerId);

  return { ...dayLog, entries: updatedEntries, dayTotal: newTotal };
};

export const removeEntryFromDayLog = async (
  dayLog: DayLog,
  entryId: string
): Promise<DayLog> => {
  if (dayLog.isLocked) {
    throw new Error('Day is locked. Cannot edit past records.');
  }

  const updatedEntries = dayLog.entries.filter(e => e.id !== entryId);
  const newTotal = calcDayTotal(updatedEntries);

  await databases.updateDocument(DB_ID, COL_DAY_LOGS, dayLog.dayLogId, {
    entries: serializeEntries(updatedEntries),
    day_total: newTotal,
  });

  return { ...dayLog, entries: updatedEntries, dayTotal: newTotal };
};

// ─── Businesses ──────────────────────────────────────────────

export const getBusinessByOwner = async (ownerId: string): Promise<Business | null> => {
  const res = await databases.listDocuments(DB_ID, COL_BUSINESSES, [
    Query.equal('owner_id', ownerId),
    Query.limit(1),
  ]);

  if (res.documents.length === 0) return null;

  const doc = res.documents[0] as any;
  return {
    businessId: doc.$id,
    ownerId: doc.owner_id,
    businessName: doc.business_name,
    ownerName: doc.owner_name,
    phone: doc.phone,
    businessType: doc.business_type || '',
    city: doc.city || '',
    state: doc.state || '',
    storePhotoUrl: doc.store_photo_url || null,
    isActive: doc.is_active !== false,
    subscriptionStatus: doc.subscription_status || 'pending',
    subscriptionExpiry: doc.subscription_expiry || '',
    createdAt: doc.created_at,
  } as unknown as Business;
};

export const getBusiness = async (businessId: string): Promise<Business | null> => {
  try {
    const doc = await databases.getDocument(DB_ID, COL_BUSINESSES, businessId);
    return {
      businessId: (doc as any).$id,
      ownerId: (doc as any).owner_id,
      businessName: (doc as any).business_name,
      ownerName: (doc as any).owner_name,
      phone: (doc as any).phone,
      businessType: (doc as any).business_type || '',
      city: (doc as any).city || '',
      state: (doc as any).state || '',
      storePhotoUrl: (doc as any).store_photo_url || null,
      isActive: (doc as any).is_active !== false,
      subscriptionStatus: (doc as any).subscription_status || 'pending',
      subscriptionExpiry: (doc as any).subscription_expiry || '',
      createdAt: (doc as any).created_at,
    } as unknown as Business;
  } catch {
    return null;
  }
};

export const getBusinessById = async (businessId: string): Promise<Business | null> => {
  try {
    const doc = await databases.getDocument(DB_ID, COL_BUSINESSES, businessId);
    return {
      businessId: (doc as any).$id,
      ownerId: (doc as any).owner_id,
      businessName: (doc as any).business_name,
      ownerName: (doc as any).owner_name,
      phone: (doc as any).phone,
      businessType: (doc as any).business_type || '',
      city: (doc as any).city || '',
      state: (doc as any).state || '',
      storePhotoUrl: (doc as any).store_photo_url || null,
      isActive: (doc as any).is_active !== false,
      subscriptionStatus: (doc as any).subscription_status || 'pending',
      subscriptionExpiry: (doc as any).subscription_expiry || '',
      createdAt: (doc as any).created_at,
    } as unknown as Business;
  } catch {
    return null;
  }
};

export const createBusiness = async (data: {
  ownerId: string;
  businessName: string;
  ownerName: string;
  phone: string;
  businessType: string;
  city: string;
  state: string;
}): Promise<Business> => {
  const doc = await databases.createDocument(
    DB_ID,
    COL_BUSINESSES,
    ID.unique(),
    {
      owner_id: data.ownerId,
      business_name: data.businessName,
      owner_name: data.ownerName,
      phone: data.phone,
      business_type: data.businessType,
      city: data.city,
      state: data.state,
      is_active: true,
      created_at: new Date().toISOString(),
    }
  );
  return doc as unknown as Business;
};


export const updateBusiness = async (
  businessId: string,
  updates: Partial<Business>
): Promise<Business> => {
  const doc = await databases.updateDocument(DB_ID, COL_BUSINESSES, businessId, updates as any);
  return doc as unknown as Business;
};

/**
 * Delete all data associated with a user: business, customers, and user doc.
 * Used for "Delete Account" functionality.
 */
export const deleteAllUserData = async (userId: string): Promise<void> => {
  // 1. Delete associated business
  const businessRes = await databases.listDocuments(DB_ID, COL_BUSINESSES, [
    Query.equal('owner_id', userId),
    Query.limit(1),
  ]);

  if (businessRes.documents.length > 0) {
    const businessDoc = businessRes.documents[0];
    const businessId = businessDoc.$id;

    // 2. Delete all customers under that business
    const customersRes = await databases.listDocuments(DB_ID, COL_CUSTOMERS, [
      Query.equal('business_id', businessId),
      Query.limit(100),
    ]);

    for (const customer of customersRes.documents) {
      await deleteCustomer(customer.$id);
    }

    // 3. Delete the business document
    await databases.deleteDocument(DB_ID, COL_BUSINESSES, businessId);
  }

  // 4. Delete user document from COL_USERS
  const userRes = await databases.listDocuments(DB_ID, COL_USERS, [
    Query.equal('userId', userId),
    Query.limit(1),
  ]);

  if (userRes.documents.length > 0) {
    await databases.deleteDocument(DB_ID, COL_USERS, userRes.documents[0].$id);
  }
};


// ─── Payments ────────────────────────────────────────────────

// ─── Payments ─── (REMOVED: Now using day_logs specialized entries)

// ─── Ads ─────────────────────────────────────────────────────

export const getActiveAds = async (): Promise<Ad[]> => {
  try {
    const res = await databases.listDocuments(DB_ID, COL_ADS, [
      Query.equal('subscription_status', 'active'),
      Query.orderDesc('$createdAt'),
      Query.limit(50),
    ]);
    return res.documents.map((doc: any) => ({
      adId: doc.$id,
      business_name: doc.business_name || '',
      owner_name: doc.owner_name || '',
      phone: doc.phone || '',
      image_file_id: doc.image_file_id || '',
      image_url: doc.image_url || '',
      subscription_status: doc.subscription_status || 'active',
      subscription_expiry: doc.subscription_expiry || '',
      created_at: doc.created_at || doc.$createdAt || '',
      gstin: doc.gstin || '',
      website_url: doc.website_url || '',
      maps_url: doc.maps_url || '',
    })) as unknown as Ad[];
  } catch (error: any) {
    return []; // return empty list so the screen shows empty state instead of crashing
  }
};

export const getActiveBusinessesWithAds = async (): Promise<Business[]> => {
  const res = await databases.listDocuments(DB_ID, COL_BUSINESSES, [
    Query.equal('is_active', true),
    Query.orderDesc('created_at'),
    Query.limit(20),
  ]);
  return res.documents.map((doc: any) => ({
    businessId: doc.$id,
    ownerId: doc.owner_id,
    businessName: doc.business_name,
    ownerName: doc.owner_name,
    phone: doc.phone,
    businessType: doc.business_type || '',
    city: doc.city || '',
    state: doc.state || '',
    isActive: doc.is_active !== false,
    subscriptionStatus: doc.subscription_status || 'pending',
    subscriptionExpiry: doc.subscription_expiry || '',
    createdAt: doc.created_at,
  })) as unknown as Business[];
};

export const getAd = async (adId: string): Promise<Ad | null> => {
  try {
    const doc = await databases.getDocument(DB_ID, COL_ADS, adId);
    return {
      adId: doc.$id,
      business_name: (doc as any).business_name,
      owner_name: (doc as any).owner_name,
      phone: (doc as any).phone,
      image_file_id: (doc as any).image_file_id,
      image_url: (doc as any).image_url,
      subscription_status: (doc as any).subscription_status,
      subscription_expiry: (doc as any).subscription_expiry,
      created_at: (doc as any).created_at || (doc as any).$createdAt,
      gstin: (doc as any).gstin || '',
      website_url: (doc as any).website_url || '',
      maps_url: (doc as any).maps_url || '',
    } as unknown as Ad;
  } catch {
    return null;
  }
};

export const createAd = async (data: {
  business_name: string;
  owner_name: string;
  phone: string;
  image_file_id?: string;
  image_url: string;
  subscription_status?: string;
  subscription_expiry?: string;
  gstin?: string;
  website_url?: string;
  maps_url?: string;
}): Promise<Ad> => {
  // Stamp the logged-in user's ID so profile ownership queries work correctly
  const currentUser = await account.get();
  const currentUserId = currentUser.$id;

  const payload: Record<string, any> = {
    user_id: currentUserId,
    business_name: data.business_name,
    owner_name: data.owner_name,
    phone: data.phone,
    image_file_id: data.image_file_id || '',
    image_url: data.image_url,
    subscription_status: data.subscription_status || 'pending',
    subscription_expiry: (data.subscription_expiry || '').split('T')[0],
    created_at: new Date().toISOString().split('T')[0],
  };
  if (data.gstin) payload.gstin = data.gstin;
  if (data.website_url) payload.website_url = data.website_url;
  if (data.maps_url) payload.maps_url = data.maps_url;

  const doc = await databases.createDocument(DB_ID, COL_ADS, ID.unique(), payload);
  return {
    adId: doc.$id,
    user_id: (doc as any).user_id || '',
    business_name: (doc as any).business_name,
    owner_name: (doc as any).owner_name,
    phone: (doc as any).phone,
    image_file_id: (doc as any).image_file_id,
    image_url: (doc as any).image_url,
    subscription_status: (doc as any).subscription_status,
    subscription_expiry: (doc as any).subscription_expiry,
    created_at: (doc as any).created_at,
    gstin: (doc as any).gstin || '',
    website_url: (doc as any).website_url || '',
    maps_url: (doc as any).maps_url || '',
  } as unknown as Ad;
};

export const updateAd = async (adId: string, payload: Partial<Ad>): Promise<Ad> => {
  const doc = await databases.updateDocument(DB_ID, COL_ADS, adId, payload as any);
  return {
    adId: doc.$id,
    business_name: (doc as any).business_name || '',
    owner_name: (doc as any).owner_name || '',
    phone: (doc as any).phone || '',
    image_file_id: (doc as any).image_file_id || '',
    image_url: (doc as any).image_url || '',
    subscription_status: (doc as any).subscription_status || 'active',
    subscription_expiry: (doc as any).subscription_expiry || '',
    created_at: (doc as any).created_at || (doc as any).$createdAt || '',
    gstin: (doc as any).gstin || '',
    website_url: (doc as any).website_url || '',
    maps_url: (doc as any).maps_url || '',
  } as unknown as Ad;
};

export const getAdsByUserId = async (userId: string): Promise<Ad[]> => {
  try {
    const results = await databases.listDocuments(DB_ID, COL_ADS, [
      Query.equal('user_id', userId),
      Query.orderDesc('$createdAt'),
    ]);
    return results.documents.map((doc: any) => ({
      adId: doc.$id,
      user_id: doc.user_id || '',
      business_name: doc.business_name || '',
      owner_name: doc.owner_name || '',
      phone: doc.phone || '',
      image_file_id: doc.image_file_id || '',
      image_url: doc.image_url || '',
      subscription_status: doc.subscription_status || 'active',
      subscription_expiry: doc.subscription_expiry || '',
      created_at: doc.created_at || doc.$createdAt || '',
      gstin: doc.gstin || '',
      website_url: doc.website_url || '',
      maps_url: doc.maps_url || '',
    })) as unknown as Ad[];
  } catch {
    return [];
  }
};

// ─── Subscriptions ───────────────────────────────────────────

export const checkBusinessSubscriptionStatus = async (userId: string): Promise<boolean> => {
  try {
    const res = await databases.listDocuments(DB_ID, COL_SUBSCRIPTIONS, [
      Query.equal('user_id', userId),
      Query.equal('status', 'active'),
      Query.limit(1),
    ]);
    return res.documents.length > 0;
  } catch (err) {
    return false;
  }
};

export const getActiveSubscription = async (userId: string): Promise<any | null> => {
  try {
    const res = await databases.listDocuments(DB_ID, COL_SUBSCRIPTIONS, [
      Query.equal('user_id', userId),
      Query.equal('status', 'active'),
      Query.limit(1),
    ]);
    return res.documents.length > 0 ? res.documents[0] : null;
  } catch (err) {
    return null;
  }
};

export const createBusinessSubscription = async (data: {
  userId: string;
  cashfreeOrderId: string;
}): Promise<any> => {
  const now = new Date();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const doc = await databases.createDocument(DB_ID, COL_SUBSCRIPTIONS, ID.unique(), {
    user_id: data.userId,
    plan: 'business_monthly',
    status: 'active',
    amount: 11,
    started_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    cashfree_order_id: data.cashfreeOrderId,
  });
  return doc;
};

// ─── Customer Ledger ──────────────────────────────────────────
// These functions use the snake_case field names that the day_logs
// collection actually stores (customer_id, business_id, is_locked, total).

/** Fetch all day_logs for a single customer, sorted newest first. */
export const getCustomerDayLogs = async (customerId: string): Promise<any[]> => {
  const res = await databases.listDocuments(DB_ID, COL_DAY_LOGS, [
    Query.equal('customer_id', customerId),
    Query.orderDesc('date'),
    Query.limit(365),
  ]);
  return res.documents;
};

/** Create today's day_log, or append to it if one already exists. */
export const upsertTodayDayLog = async (
  customerId: string,
  businessId: string,
  entry: { description: string; amount: number; type: 'gave' | 'got'; note?: string }
): Promise<void> => {
  const today = getTodayString();
  const d = new Date();
  const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const newEntry = {
    id: ID.unique(),
    description: entry.description,
    amount: entry.amount,
    type: entry.type,
    time: timeStr,
    note: entry.note,
    timestamp: new Date().toISOString(),
  };

  // Check for existing day_log for today
  const existing = await databases.listDocuments(DB_ID, COL_DAY_LOGS, [
    Query.equal('customer_id', customerId),
    Query.equal('date', today),
    Query.limit(1),
  ]);

  if (existing.documents.length > 0) {
    // Append to existing day_log
    const doc = existing.documents[0] as any;

    if (doc.is_locked === true) {
      throw new Error("Cannot modify a locked day log.");
    }

    const existingEntries: any[] = JSON.parse(doc.entries || '[]');
    const updatedEntries = [...existingEntries, newEntry];
    // day_total = sum of 'gave' entries only
    let newTotal = updatedEntries
      .filter((e: any) => e.type === 'gave')
      .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
    newTotal = Math.round(newTotal * 100) / 100;
    if (isNaN(newTotal)) newTotal = 0;
    await databases.updateDocument(DB_ID, COL_DAY_LOGS, doc.$id, {
      entries: JSON.stringify(updatedEntries),
      day_total: newTotal,
    });
  } else {
    // Get customer to extract owner_id and linked_user_id for permissions
    const customer = await getCustomer(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // day_total for brand-new log: amount only if type === 'gave'
    const initialTotal = entry.type === 'gave' ? (Number(entry.amount) || 0) : 0;

    // Create a brand new day_log for today
    await databases.createDocument(DB_ID, COL_DAY_LOGS, ID.unique(), {
      customer_id: customerId,
      business_id: businessId,
      date: today,
      entries: JSON.stringify([newEntry]),
      day_total: isNaN(initialTotal) ? 0 : initialTotal,
      is_locked: false,
    });
  }
};

/**
 * Recalculate customer balance from ALL day_log entries.
 * balance = Σ(gave entries) − Σ(got entries)
 */
export const recalcAndUpdateCustomerBalance = async (customerId: string): Promise<void> => {
  const res = await databases.listDocuments(DB_ID, COL_DAY_LOGS, [
    Query.equal('customer_id', customerId),
    Query.limit(1000),
  ]);

  let totalGave = 0;
  let totalGot = 0;

  for (const doc of res.documents) {
    let entries: any[] = [];
    try {
      const raw = (doc as any).entries;
      entries = Array.isArray(raw) ? raw : JSON.parse(raw || '[]');
    } catch {
      entries = [];
    }
    for (const e of entries) {
      const amt = Number(e.amount) || 0;
      if (e.type === 'gave' || e.type === 'debit') totalGave += amt;
      else if (e.type === 'got' || e.type === 'credit') totalGot += amt;
    }
  }

  const balance = totalGave - totalGot;
  await databases.updateDocument(DB_ID, COL_CUSTOMERS, customerId, { balance });
};

/** Specifically add a "Got" entry (payment) to today's day_log */
export const addGotEntryToDayLog = async (
  customerId: string,
  businessId: string,
  amount: number,
  note: string = ''
): Promise<void> => {
  await upsertTodayDayLog(customerId, businessId, {
    description: 'Payment Received',
    amount,
    type: 'got',
    note,
  });

  // Recalculate balance after adding got entry
  await recalcAndUpdateCustomerBalance(customerId);
};

/**
 * Verifies a payment with Cashfree (or assumes success if callback reached)
 * and activates the business/ad subscription in the DB and authStore.
 */
export const verifyAndActivateSubscription = async (
  type: string,
  referenceId: string
): Promise<void> => {
  const userId = useAuthStore.getState().user?.userId;

  if (!userId) {
    throw new Error('User not authenticated');
  }

  // Calculate expiry (YYYY-MM-DD format as required)
  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + 30);
  const expiryString = newExpiry.toISOString().split('T')[0]; // "YYYY-MM-DD"

  // Create record in COL_SUBSCRIPTIONS
  await databases.createDocument(DB_ID, COL_SUBSCRIPTIONS, ID.unique(), {
    user_id: userId,
    type: type,
    reference_id: referenceId,
    amount: type === 'business' ? 11 : 100,
    status: 'paid',
    paid_at: new Date().toISOString().split('T')[0],
    valid_until: expiryString,
  });

  // 1. Update actual document status and expiry based on type
  if (type === 'business') {
    await databases.updateDocument(DB_ID, COL_BUSINESSES, referenceId, {
      subscription_status: 'active',
      subscription_expiry: expiryString,
    });
  } else if (type === 'ad') {
    await databases.updateDocument(DB_ID, COL_ADS, referenceId, {
      subscription_status: 'active',
      subscription_expiry: expiryString,
    });
  }

  // 2. Update authStore
  useAuthStore.getState().setIsSubscribed(true);
};

// ─── Entry Management (Edit/Delete) ──────────────────────────

/**
 * Update a specific entry in a day_log.
 * Only allowed if day_log is not locked (today's entries only).
 */
export const updateDayLogEntry = async (
  dayLogId: string,
  entryId: string,
  updates: { description?: string; amount?: number; type?: 'gave' | 'got' }
): Promise<void> => {
  // Fetch the day_log
  const doc = await databases.getDocument(DB_ID, COL_DAY_LOGS, dayLogId);

  if ((doc as any).is_locked) {
    throw new Error('This day is locked. Past records cannot be edited.');
  }

  // Parse entries
  const entries: any[] = JSON.parse((doc as any).entries || '[]');

  // Find and update the entry
  const entryIndex = entries.findIndex((e: any) => e.id === entryId);
  if (entryIndex === -1) {
    throw new Error('Entry not found');
  }

  // Apply updates
  if (updates.description !== undefined) {
    entries[entryIndex].description = updates.description;
  }
  if (updates.amount !== undefined) {
    entries[entryIndex].amount = updates.amount;
  }
  if (updates.type !== undefined) {
    entries[entryIndex].type = updates.type;
  }

  // Recalculate total
  const newTotal = entries.reduce((sum: number, e: any) => sum + e.amount, 0);

  // Update document
  await databases.updateDocument(DB_ID, COL_DAY_LOGS, dayLogId, {
    entries: JSON.stringify(entries),
    day_total: newTotal,
  });
};

/**
 * Delete a specific entry from a day_log.
 * Only allowed if day_log is not locked (today's entries only).
 */
export const deleteDayLogEntry = async (
  dayLogId: string,
  entryId: string
): Promise<void> => {
  // Fetch the day_log
  const doc = await databases.getDocument(DB_ID, COL_DAY_LOGS, dayLogId);

  if ((doc as any).is_locked) {
    throw new Error('This day is locked. Past records cannot be edited.');
  }

  // Parse entries
  const entries: any[] = JSON.parse((doc as any).entries || '[]');

  // Filter out the entry to delete
  const updatedEntries = entries.filter((e: any) => e.id !== entryId);

  if (updatedEntries.length === entries.length) {
    throw new Error('Entry not found');
  }

  // Recalculate total
  const newTotal = updatedEntries.reduce((sum: number, e: any) => sum + e.amount, 0);

  // Update document
  await databases.updateDocument(DB_ID, COL_DAY_LOGS, dayLogId, {
    entries: JSON.stringify(updatedEntries),
    day_total: newTotal,
  });
};
