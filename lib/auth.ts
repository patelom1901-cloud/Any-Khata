/**
 * Authentication helpers
 * Google OAuth, session management, user doc sync
 */
import { account, databases } from './appwrite';
import { OAuthProvider, Permission, Role, Query } from 'react-native-appwrite';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DB_ID, COL_USERS } from '../constants/appwrite';
import type { AppUser } from '../types';
import { useAuthStore } from '../store/authStore';
import { useBusinessStore } from '../store/businessStore';
import { useEntryStore } from '../store/entryStore';
import { useUIStore } from '../store/uiStore';
import { router } from 'expo-router';

const USER_STORAGE_KEY = 'anykhata_user_doc';

// Warm up the browser for faster OAuth on Android
// Wrapped in try-catch to prevent crashing the app if this fails
try {
  WebBrowser.warmUpAsync();
} catch (_) {
  // Silently ignore — warmUp is an optimization, not critical
}

/**
 * Start Google OAuth flow.
 *
 * Uses WebBrowser.openAuthSessionAsync (the modern approach for expo-web-browser v15+
 * and expo-auth-session v5+, where AuthSession.startAsync and useProxy are removed).
 *
 * In Expo Go: Linking.createURL('/') → exp://192.168.x.x:8081/
 * Appwrite accepts this as the success/failure redirect URI.
 */
export const loginWithGoogle = async (): Promise<void> => {
  // Linking.createURL('/') gives exp://IP:PORT/ in Expo Go,
  // and anykhata:/// in a standalone build — both work with Appwrite.
  const redirectUri = Linking.createURL('/');
  let authUrl: URL | string | void;
  try {
    authUrl = await account.createOAuth2Token(
      OAuthProvider.Google,
      redirectUri,
      redirectUri
    );
  } catch (err: any) {
    throw new Error('Failed to create OAuth URL: ' + (err?.message ?? err));
  }

  if (!authUrl) {
    throw new Error('Appwrite returned an empty OAuth URL');
  }

  const authUrlStr = authUrl.toString();
  // openAuthSessionAsync opens a browser, waits for it to redirect
  // back to redirectUri, then returns the full callback URL.
  const result = await WebBrowser.openAuthSessionAsync(authUrlStr, redirectUri);
  if (result.type !== 'success') {
    throw new Error(`Login ${result.type}. Please try again.`);
  }

  // Appwrite appends ?userId=...&secret=... to the redirect URI
  const rawUrl: string = result.url ?? '';
  if (!rawUrl) {
    throw new Error('OAuth callback URL is missing from result.');
  }

  const parsed = new URL(rawUrl);
  const userId = parsed.searchParams.get('userId');
  const secret = parsed.searchParams.get('secret');
  if (!userId || !secret) {
    throw new Error('OAuth callback is missing userId or secret.');
  }
  await account.createSession(userId, secret);
};

/**
 * Get current Appwrite auth session
 */
export const getCurrentSession = async () => {
  try {
    return await account.getSession('current');
  } catch {
    return null;
  }
};

/**
 * Get current Appwrite authenticated user
 */
export const getAuthUser = async () => {
  try {
    return await account.get();
  } catch {
    return null;
  }
};

/**
 * Get or create user document in our database
 * Called after successful Google login
 */
export const getOrCreateUserDoc = async (authUser: any): Promise<AppUser> => {
  if (__DEV__) {
    console.log('[getOrCreateUserDoc] Called with authUser.$id:', authUser?.$id, 'email:', authUser?.email);
  }
  // Check if user doc exists
  const existing = await databases.listDocuments(DB_ID, COL_USERS, [
    Query.equal('userId', authUser.$id),
    Query.limit(1),
  ]);
  console.log('[getOrCreateUserDoc] Query result: total =', existing.total, ', docs count =', existing.documents.length);

  if (existing.documents.length > 0) {
    console.log('[getOrCreateUserDoc] Existing user doc found. Returning cached userDoc.');
    const doc = existing.documents[0] as any;
    const userDoc: AppUser = {
      $id: doc.$id,
      userId: doc.userId,
      name: authUser.name || authUser.email?.split('@')[0] || 'User',
      email: authUser.email || '',
      phone: authUser.phone || '',
      hasBusiness: !!doc.has_business,
      isSubscribed: !!doc.is_subscribed,
    };
    const cacheableUser = {
      $id: userDoc.$id,
      userId: userDoc.userId,
      name: userDoc.name,
      email: userDoc.email,
    };
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(cacheableUser));
    if (__DEV__) {
      console.log('[getOrCreateUserDoc] Returning EXISTING userDoc:', JSON.stringify(userDoc));
    }
    return userDoc;
  }

  // Create new user doc — only write fields that exist in the Appwrite schema
  if (__DEV__) {
    console.log('[getOrCreateUserDoc] No existing doc found. Creating NEW user doc for:', authUser.$id);
  }
  let newDoc: any;
  try {
    newDoc = await databases.createDocument(
      DB_ID,
      COL_USERS,
      authUser.$id,
      {
        userId: authUser.$id,
        name: authUser.name ?? authUser.email.split('@')[0],
        email: authUser.email ?? '',
        createdAt: new Date().toISOString(),
        has_business: false,
      },
      [
        Permission.read(Role.user(authUser.$id)),
        Permission.update(Role.user(authUser.$id))
      ]
    );
    if (__DEV__) {
      console.log('[getOrCreateUserDoc] createDocument succeeded. newDoc.$id:', newDoc.$id);
    }
  } catch (createErr: any) {
    if (__DEV__) {
      console.log('=== CAUGHT ERROR (getOrCreateUserDoc createDocument) ===', JSON.stringify(createErr), 'message:', createErr?.message);
    }
    throw createErr;
  }

  const userDoc: AppUser = {
    $id: newDoc.$id,
    userId: (newDoc as any).userId,
    name: authUser.name || authUser.email?.split('@')[0] || 'User',
    email: authUser.email || '',
    phone: authUser.phone || '',
    hasBusiness: !!(newDoc as any).has_business,
    isSubscribed: !!(newDoc as any).is_subscribed,
  };
  const cacheableUser = {
    $id: userDoc.$id,
    userId: userDoc.userId,
    name: userDoc.name,
    email: userDoc.email,
  };
  await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(cacheableUser));
  if (__DEV__) {
    console.log('[getOrCreateUserDoc] Returning NEW userDoc:', JSON.stringify(userDoc));
  }
  return userDoc;
};

/**
 * Get cached user doc from AsyncStorage
 */
export const getCachedUser = async (): Promise<AppUser | null> => {
  try {
    const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppUser;
  } catch {
    return null;
  }
};

/**
 * Clear cached user doc
 */
export const clearCachedUser = async (): Promise<void> => {
  await AsyncStorage.removeItem(USER_STORAGE_KEY);
};

/**
 * Logout — delete session and clear cache
 * ALWAYS deletes server-side session first, then clears local cache
 */
export const logout = async (): Promise<void> => {
  try {
    // CRITICAL: Delete server-side Appwrite session FIRST
    await account.deleteSession('current');
  } catch (error: any) {
    // Session may already be expired or invalid, log but continue
  }
  
  // ALWAYS clear local cache regardless of server deletion result
  await clearCachedUser();

  // Clear ALL Zustand stores
  useAuthStore.getState().logout();
  useBusinessStore.getState().clearBusiness();
  useEntryStore.getState().clearEditingEntry();
  useUIStore.getState().clearUI();

  // Clear specific AsyncStorage keys dynamically to catch any potential leaks
  try {
    const keys = await AsyncStorage.getAllKeys();
    const keysToRemove = keys.filter(key => 
      (key.toLowerCase().includes('business') ||
      key.toLowerCase().includes('owner') ||
      key.toLowerCase().includes('user') ||
      key.toLowerCase().includes('subscription') ||
      key.toLowerCase().includes('customer')) &&
      !key.toLowerCase().includes('language') &&
      key !== 'auth-storage' &&
      key !== '@anykhata_notifications'
    );
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
    }
  } catch (error) {
    console.log('Failed to clear AsyncStorage keys during logout', error);
  }

  // Navigate to login screen
  router.replace('/(auth)/login');
};

/**
 * @deprecated  account.delete() is not available on the React Native client SDK.
 * Use `deleteUserAccount(userId)` from `lib/functions.ts` instead.
 * That calls the `delete-user-account` Appwrite Cloud Function which uses
 * the server-side SDK + API key to invoke users.delete(userId).
 */
export const deleteAppwriteAccount = async (): Promise<void> => {
  throw new Error(
    '[deleteAppwriteAccount] account.delete() is not permitted on the client SDK. ' +
    'Call `deleteUserAccount(userId)` from lib/functions.ts instead.'
  );
};


/**
 * Session hydration — check for active session on app startup
 * Returns the user document if session exists, null otherwise
 * CRITICAL: If account.get() fails, clears all local cached state
 */
export const hydrateSession = async (): Promise<AppUser | null> => {
  console.log('[hydrateSession] Starting...');
  try {
    // Check if there's an active Appwrite session
    console.log('[hydrateSession] Calling account.get()...');
    const authUser = await account.get();
    if (__DEV__) {
      console.log('[hydrateSession] account.get() result:', JSON.stringify(authUser));
    }
    if (!authUser) {
      // No session — clear any stale cached data
      console.log('[hydrateSession] No authUser returned. Clearing cache.');
      await clearCachedUser();
      return null;
    }

    // Fetch the user document from the database
    if (__DEV__) {
      console.log('[hydrateSession] Fetching user doc for userId:', authUser.$id);
    }
    const existing = await databases.listDocuments(DB_ID, COL_USERS, [
      Query.equal('userId', authUser.$id),
      Query.limit(1),
    ]);
    console.log('[hydrateSession] User doc query result: total =', existing.total, ', docs count =', existing.documents.length);

    if (existing.documents.length === 0) {
      // Session exists but no user doc — create one
      console.log('[hydrateSession] No user doc found. Creating via getOrCreateUserDoc...');
      return await getOrCreateUserDoc(authUser);
    }

    const doc = existing.documents[0] as any;
    const userDoc: AppUser = {
      $id: doc.$id,
      userId: doc.userId,
      name: authUser.name || authUser.email?.split('@')[0] || 'User',
      email: authUser.email || '',
      phone: authUser.phone || '',
      hasBusiness: !!doc.has_business,
      isSubscribed: !!doc.is_subscribed,
    };
    
    // Cache the user doc (only non-sensitive fields)
    const cacheableUser = {
      $id: userDoc.$id,
      userId: userDoc.userId,
      name: userDoc.name,
      email: userDoc.email,
    };
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(cacheableUser));
    if (__DEV__) {
      console.log('[hydrateSession] Returning existing userDoc:', JSON.stringify(userDoc));
    }
    return userDoc;
  } catch (error) {
    // CRITICAL: Clear any stale cached data when session validation fails
    if (__DEV__) {
      console.log('=== CAUGHT ERROR (hydrateSession) ===', JSON.stringify(error));
    }
    await clearCachedUser();
    return null;
  }
};
