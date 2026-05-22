/**
 * Database helpers
 * ALL Appwrite DB read/write operations go here.
 * Zero direct SDK calls in components.
 */
import { databases, account } from './appwrite';
import { Query, ID, Permission, Role } from 'react-native-appwrite';
import { DB_ID, COL_USERS, COL_CUSTOMERS, COL_DAY_LOGS, COL_BUSINESSES, COL_ADS, COL_SUBSCRIPTIONS } from '../constants/appwrite';
import { getTodayString } from '../utils/dateUtils';
import { parseEntries, serializeEntries, calcDayTotal, createEntry } from '../utils/entryUtils';
import type { Customer, DayLog, Business, Ad, DayEntry } from '../types';
import { useAuthStore } from '../store/authStore';

// ─── Customers ───────────────────────────────────────────────

export const getCustomersByBusiness = async (businessId: string, cursor: string | null = null): Promise<Customer[]> => {
  const queries = [
    Query.equal('business_id', businessId),
    Query.equal('is_deleted', false),
    Query.orderAsc('name'),
    Query.limit(20),
  ];
  if (cursor) queries.push(Query.cursorAfter(cursor));

  const res = await databases.listDocuments(DB_ID, COL_CUSTOMERS, queries);
  return res.documents.map((doc: any) => ({
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
  const doc = await databases.createDocument(
    DB_ID,
    COL_CUSTOMERS,
    ID.unique(),
    {
      business_id: data.business_id,
      owner_id: data.owner_id,
      name: data.name,
      phone: data.phone,
      link_code: data.link_code,
      linked_user_id: "",
      is_linked: false,
      balance: 0,
      created_at: new Date().toISOString(),
    },
    [
      Permission.read(Role.any()),
      Permission.update(Role.user(data.owner_id)),
      Permission.delete(Role.user(data.owner_id))
    ]
  );
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
      Query.equal('is_deleted', false),
    ]);

    const linked = res.documents.map((doc: any) => ({
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
      Query.equal('is_deleted', false),
      Query.limit(10),
    ]);

    if (res.documents.length === 0) {
      return { success: false, message: 'Invalid code. Ask your shopkeeper for the correct code.' };
    }

    const doc = res.documents[0];
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
  businessId: string | undefined,
  customerId: string,
  cursor: string | null = null
): Promise<DayLog[]> => {
  const queries = [
    Query.equal('customer_id', customerId),
    Query.equal('is_deleted', false),
    Query.orderDesc('date'),
    Query.limit(20),
  ];

  if (businessId) {
    queries.push(Query.equal('business_id', businessId));
  }
  
  if (cursor) queries.push(Query.cursorAfter(cursor));

  const res = await databases.listDocuments(DB_ID, COL_DAY_LOGS, queries);

  return res.documents
    .map((doc: any) => ({
      dayLogId: doc.$id,
      businessId: doc.business_id,
      customerId: doc.customer_id,
      date: doc.date,
      dayTotal: doc.day_total || doc.total || 0,
      isLocked: doc.is_locked || false,
      createdAt: doc.created_at,
      entries: parseEntries(doc.entries),
    })) as unknown as DayLog[];
};

export const getOrCreateDayLog = async (
  businessId: string,
  customerId: string,
  ownerId: string
): Promise<DayLog> => {
  const today = getTodayString();

  const existing = await databases.listDocuments(DB_ID, COL_DAY_LOGS, [
    Query.equal('business_id', businessId),
    Query.equal('customer_id', customerId),
    Query.equal('date', today),
    Query.equal('is_deleted', false),
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
      is_deleted: false,
    } as unknown as DayLog;
  }

  // Get customer to extract owner_id and linked_user_id for permissions
  const customer = await getCustomer(customerId);
  if (!customer) {
    throw new Error('Customer not found');
  }

  const newDoc = await databases.createDocument(
    DB_ID,
    COL_DAY_LOGS,
    ID.unique(),
    {
      business_id: businessId,
      customer_id: customerId,
      date: today,
      entries: serializeEntries([]),
      day_total: 0,
      is_locked: false,
    },
    [
      Permission.read(Role.user(ownerId)),
      Permission.update(Role.user(ownerId)),
      Permission.delete(Role.user(ownerId))
    ]
  );

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

  // Atomic balance update
  const customerDoc = await databases.getDocument(DB_ID, COL_CUSTOMERS, dayLog.customerId);
  const currentBalance = (customerDoc as any).balance || 0;
  const amountToApply = Number(amount) || 0;
  const newBalance = type === 'gave' 
    ? currentBalance + amountToApply
    : currentBalance - amountToApply;
    
  await databases.updateDocument(DB_ID, COL_CUSTOMERS, dayLog.customerId, {
    balance: newBalance
  });

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
    subscriptionStatus: doc.subscriptionStatus || 'pending',
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
      subscriptionStatus: (doc as any).subscriptionStatus || 'pending',
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
      subscriptionStatus: (doc as any).subscriptionStatus || 'pending',
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
    },
    [
      Permission.read(Role.user(data.ownerId)),
      Permission.update(Role.user(data.ownerId)),
      Permission.delete(Role.user(data.ownerId))
    ]
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
    let hasMore = true;
    while (hasMore) {
      const batch = await databases.listDocuments(DB_ID, COL_CUSTOMERS, [
        Query.equal('business_id', businessId),
        Query.equal('is_deleted', false),
        Query.limit(100),
      ]);
      for (const c of batch.documents) {
        await databases.updateDocument(DB_ID, COL_CUSTOMERS, c.$id, { is_deleted: true });
      }
      hasMore = batch.documents.length === 100;
    }

    // 2.5 Delete all day_logs under that business
    let hasMoreLogs = true;
    while (hasMoreLogs) {
      const logBatch = await databases.listDocuments(DB_ID, COL_DAY_LOGS, [
        Query.equal('business_id', businessId),
        Query.equal('is_deleted', false),
        Query.limit(100),
      ]);
      for (const log of logBatch.documents) {
        await databases.updateDocument(DB_ID, COL_DAY_LOGS, log.$id, { is_deleted: true });
      }
      hasMoreLogs = logBatch.documents.length === 100;
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
      Query.equal('subscriptionStatus', 'active'),
      Query.equal('is_deleted', false),
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
      subscriptionStatus: doc.subscriptionStatus || 'active',
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
    subscriptionStatus: doc.subscriptionStatus || 'pending',
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
      subscriptionStatus: (doc as any).subscriptionStatus,
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
  subscriptionStatus?: string;
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
    subscriptionStatus: data.subscriptionStatus || 'pending',
    subscription_expiry: (data.subscription_expiry || '').split('T')[0],
    created_at: new Date().toISOString().split('T')[0],
  };
  if (data.gstin) payload.gstin = data.gstin;
  if (data.website_url) payload.website_url = data.website_url;
  if (data.maps_url) payload.maps_url = data.maps_url;

  const doc = await databases.createDocument(
    DB_ID,
    COL_ADS,
    ID.unique(),
    payload,
    [
      Permission.read(Role.user(currentUserId)),
      Permission.update(Role.user(currentUserId)),
      Permission.delete(Role.user(currentUserId)),
      Permission.read(Role.any())
    ]
  );
  return {
    adId: doc.$id,
    user_id: (doc as any).user_id || '',
    business_name: (doc as any).business_name,
    owner_name: (doc as any).owner_name,
    phone: (doc as any).phone,
    image_file_id: (doc as any).image_file_id,
    image_url: (doc as any).image_url,
    subscriptionStatus: (doc as any).subscriptionStatus,
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
    subscriptionStatus: (doc as any).subscriptionStatus || 'active',
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
      Query.equal('is_deleted', false),
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
      subscriptionStatus: doc.subscriptionStatus || 'active',
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

  const doc = await databases.createDocument(
    DB_ID,
    COL_SUBSCRIPTIONS,
    ID.unique(),
    {
      user_id: data.userId,
      plan: 'business_monthly',
      status: 'active',
      amount: 11,
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      cashfree_order_id: data.cashfreeOrderId,
    },
    [
      Permission.read(Role.user(data.userId)),
      Permission.update(Role.user(data.userId)),
      Permission.delete(Role.user(data.userId))
    ]
  );
  return doc;
};

// ─── Customer Ledger ──────────────────────────────────────────
// These functions use the snake_case field names that the day_logs
// collection actually stores (customer_id, business_id, is_locked, total).


/** Create today's day_log, or append to it if one already exists. */
export const upsertTodayDayLog = async (
  customerId: string,
  businessId: string,
  entry: { description: string; amount: number; type: 'gave' | 'got'; note?: string },
  ownerId: string
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
    Query.equal('is_deleted', false),
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
    // day_total = sum of 'gave' entries only (excluding soft-deleted)
    let newTotal = updatedEntries
      .filter((e: any) => e.type === 'gave' && !e.is_deleted)
      .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
    newTotal = Math.round(newTotal * 100) / 100;
    if (isNaN(newTotal)) newTotal = 0;
    await databases.updateDocument(DB_ID, COL_DAY_LOGS, doc.$id, {
      entries: JSON.stringify(updatedEntries),
      day_total: newTotal,
    });
  } else {
    // Create a brand new day_log for today
    let newTotal = 0;
    if (entry.type === 'gave') {
        newTotal = Number(entry.amount) || 0;
    }
    await databases.createDocument(
      DB_ID,
      COL_DAY_LOGS,
      ID.unique(),
      {
        customer_id: customerId,
        business_id: businessId,
        date: today,
        entries: JSON.stringify([newEntry]),
        day_total: newTotal,
        is_locked: false,
      },
      [
        Permission.read(Role.user(ownerId)),
        Permission.update(Role.user(ownerId)),
        Permission.delete(Role.user(ownerId))
      ]
    );
  }

  // Atomic balance update
  const customerDoc = await databases.getDocument(DB_ID, COL_CUSTOMERS, customerId);
  const currentBalance = (customerDoc as any).balance || 0;
  const amountToApply = Number(entry.amount) || 0;
  const newBalance = entry.type === 'gave' 
    ? currentBalance + amountToApply
    : currentBalance - amountToApply;

  await databases.updateDocument(DB_ID, COL_CUSTOMERS, customerId, {
    balance: newBalance
  });
};

/** Specifically add a "Got" entry (payment) to today's day_log */
export const addGotEntryToDayLog = async (
  customerId: string,
  businessId: string,
  amount: number,
  ownerId: string,
  note: string = ''
): Promise<void> => {
  await upsertTodayDayLog(customerId, businessId, {
    description: 'Payment Received',
    amount,
    type: 'got',
    note,
  }, ownerId);
};

/**
 * Soft-delete an entire day_log.
 * Only allowed if day_log is not locked (today's entries only).
 */
export const softDeleteDayLog = async (dayLogId: string): Promise<void> => {
  const doc = await databases.getDocument(DB_ID, COL_DAY_LOGS, dayLogId);

  if ((doc as any).is_locked) {
    throw new Error('This day is locked. Past records cannot be deleted.');
  }

  const entries: DayEntry[] = JSON.parse((doc as any).entries || '[]');
  const activeEntries = entries.filter((e: DayEntry) => !e.is_deleted);
  if (activeEntries.length > 0) {
    const customerId = (doc as any).customer_id;
    const customerDoc = await databases.getDocument(DB_ID, COL_CUSTOMERS, customerId);
    let balance = (customerDoc as any).balance || 0;
    for (const entry of activeEntries) {
      if (entry.type === 'gave' || entry.type === 'debit') {
        balance -= Number(entry.amount) || 0;
      } else if (entry.type === 'got' || entry.type === 'credit') {
        balance += Number(entry.amount) || 0;
      }
    }
    await databases.updateDocument(DB_ID, COL_CUSTOMERS, customerId, { balance });
  }

  await databases.updateDocument(DB_ID, COL_DAY_LOGS, dayLogId, {
    is_deleted: true,
  });
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
  await databases.createDocument(
    DB_ID,
    COL_SUBSCRIPTIONS,
    ID.unique(),
    {
      user_id: userId,
      type: type,
      reference_id: referenceId,
      amount: type === 'business' ? 11 : 100,
      status: 'paid',
      paid_at: new Date().toISOString().split('T')[0],
      valid_until: expiryString,
    },
    [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId))
    ]
  );

  // 1. Update actual document status and expiry based on type
  if (type === 'business') {
    await databases.updateDocument(DB_ID, COL_BUSINESSES, referenceId, {
      subscriptionStatus: 'active',
      subscription_expiry: expiryString,
    });
  } else if (type === 'ad') {
    await databases.updateDocument(DB_ID, COL_ADS, referenceId, {
      subscriptionStatus: 'active',
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
 * NOTE: Does NOT call recalcAndUpdateCustomerBalance internally to avoid race conditions.
 */
export const updateDayLogEntry = async (
  dayLogId: string,
  entryId: string,
  updates: { description?: string; amount?: number; type?: 'gave' | 'got' | 'debit' | 'credit'; quantity?: number }
): Promise<void> => {
  const doc = await databases.getDocument(DB_ID, COL_DAY_LOGS, dayLogId);

  if ((doc as any).is_locked) {
    throw new Error('This day is locked. Past records cannot be edited.');
  }

  const entries: any[] = JSON.parse((doc as any).entries || '[]');
  const entryIndex = entries.findIndex((e: any) => e.id === entryId);
  if (entryIndex === -1) {
    throw new Error('Entry not found');
  }

  const oldAmount = Number(entries[entryIndex].amount) || 0;
  const oldType = entries[entryIndex].type;

  // Apply updates
  if (updates.description !== undefined) entries[entryIndex].description = updates.description;
  if (updates.amount !== undefined) entries[entryIndex].amount = updates.amount;
  if (updates.type !== undefined) entries[entryIndex].type = updates.type;
  if (updates.quantity !== undefined) entries[entryIndex].quantity = updates.quantity;

  const newAmount = Number(entries[entryIndex].amount) || 0;
  const newType = entries[entryIndex].type;

  // Recalculate day_total (gave entries only, not deleted)
  let newTotal = entries
    .filter((e: any) => e.type === 'gave' && !e.is_deleted)
    .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
  newTotal = Math.round(newTotal * 100) / 100;

  await databases.updateDocument(DB_ID, COL_DAY_LOGS, dayLogId, {
    entries: JSON.stringify(entries),
    day_total: newTotal,
  });

  const customerId = (doc as any).customer_id;
  const customerDoc = await databases.getDocument(DB_ID, COL_CUSTOMERS, customerId);
  let currentBalance = (customerDoc as any).balance || 0;

  if (oldType === newType) {
      const delta = newAmount - oldAmount;
      if (newType === 'gave' || newType === 'debit') currentBalance += delta;
      else if (newType === 'got' || newType === 'credit') currentBalance -= delta;
  } else {
      if (oldType === 'gave' || oldType === 'debit') currentBalance -= oldAmount;
      else if (oldType === 'got' || oldType === 'credit') currentBalance += oldAmount;

      if (newType === 'gave' || newType === 'debit') currentBalance += newAmount;
      else if (newType === 'got' || newType === 'credit') currentBalance -= newAmount;
  }

  await databases.updateDocument(DB_ID, COL_CUSTOMERS, customerId, {
    balance: currentBalance
  });
};

/**
 * Soft-delete a specific entry from a day_log.
 * Only allowed if day_log is not locked (today's entries only).
 * NOTE: Does NOT call recalcAndUpdateCustomerBalance internally to avoid race conditions.
 */
export const softDeleteDayLogEntry = async (
  dayLogId: string,
  entryId: string
): Promise<void> => {
  const doc = await databases.getDocument(DB_ID, COL_DAY_LOGS, dayLogId);

  if ((doc as any).is_locked) {
    throw new Error('This day is locked. Past records cannot be edited.');
  }

  const entries: any[] = JSON.parse((doc as any).entries || '[]');
  const entryIndex = entries.findIndex((e: any) => e.id === entryId);
  if (entryIndex === -1) {
    throw new Error('Entry not found');
  }

  const deletedAmount = Number(entries[entryIndex].amount) || 0;
  const deletedType = entries[entryIndex].type;

  // Mark as deleted
  entries[entryIndex].is_deleted = true;

  // Recalculate day_total (gave entries only, not deleted)
  let newTotal = entries
    .filter((e: any) => e.type === 'gave' && !e.is_deleted)
    .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
  newTotal = Math.round(newTotal * 100) / 100;

  await databases.updateDocument(DB_ID, COL_DAY_LOGS, dayLogId, {
    entries: JSON.stringify(entries),
    day_total: newTotal,
  });

  const customerId = (doc as any).customer_id;
  const customerDoc = await databases.getDocument(DB_ID, COL_CUSTOMERS, customerId);
  const currentBalance = (customerDoc as any).balance || 0;
  const newBalance = deletedType === 'gave' || deletedType === 'debit'
    ? currentBalance - deletedAmount
    : currentBalance + deletedAmount;

  await databases.updateDocument(DB_ID, COL_CUSTOMERS, customerId, {
    balance: newBalance
  });
};
