/**
 * Authentication helpers
 * Google OAuth, session management, user doc sync
 */
import { account, databases } from './appwrite';
import { OAuthProvider } from 'react-native-appwrite';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DB_ID, COL_USERS } from '../constants/appwrite';
import type { AppUser } from '../types';

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
  // Check if user doc exists
  const existing = await databases.listDocuments(DB_ID, COL_USERS, [
    (await import('react-native-appwrite')).Query.equal('userId', authUser.$id),
    (await import('react-native-appwrite')).Query.limit(1),
  ]);

  if (existing.documents.length > 0) {
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
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userDoc));
    return userDoc;
  }

  // Create new user doc — only write fields that exist in the Appwrite schema
  const newDoc = await databases.createDocument(DB_ID, COL_USERS, authUser.$id, {
    userId: authUser.$id,
    has_business: false,
    is_subscribed: false,
  });

  const userDoc: AppUser = {
    $id: newDoc.$id,
    userId: (newDoc as any).userId,
    name: authUser.name || authUser.email?.split('@')[0] || 'User',
    email: authUser.email || '',
    phone: authUser.phone || '',
    hasBusiness: !!(newDoc as any).has_business,
    isSubscribed: !!(newDoc as any).is_subscribed,
  };
  await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userDoc));
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
  try {
    // Check if there's an active Appwrite session
    const authUser = await account.get();
    if (!authUser) {
      // No session — clear any stale cached data
      await clearCachedUser();
      return null;
    }

    // Fetch the user document from the database
    const { Query } = await import('react-native-appwrite');
    const existing = await databases.listDocuments(DB_ID, COL_USERS, [
      Query.equal('userId', authUser.$id),
      Query.limit(1),
    ]);

    if (existing.documents.length === 0) {
      // Session exists but no user doc — create one
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
    
    // Cache the user doc
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userDoc));
    return userDoc;
  } catch (error) {
    // CRITICAL: Clear any stale cached data when session validation fails
    await clearCachedUser();
    return null;
  }
};
