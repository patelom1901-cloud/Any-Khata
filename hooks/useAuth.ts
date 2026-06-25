import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { logout as authLogout, getOrCreateUserDoc, getAuthUser } from '../lib/auth';
import { useUIStore } from '../store/uiStore';
import { account } from '../lib/appwrite';
import { OAuthProvider } from 'react-native-appwrite';

import * as Linking from 'expo-linking';
import { useURL } from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

/**
 * Hook for auth operations
 * Wraps the store and lib functions, and handles post-login navigation.
 */
export const useAuth = () => {
  const { setUser, setLoading: setStoreLoading, logout: storeLogout } = useAuthStore();
  const { setError } = useUIStore();
  
  const [loading, setLoading] = useState(false);
  const handledUrl = useRef<string | null>(null);
  const url = useURL();

  // Handle the deep link callback AFTER browser closes
  useEffect(() => {
    if (__DEV__) {
      console.log('=== AUTH CALLBACK FIRED === url:', url);
    }
    if (!url) {
      console.log('[useAuth] useEffect: url is null/undefined, skipping');
      return;
    }
    if (handledUrl.current === url) {
      if (__DEV__) {
        console.log('[useAuth] useEffect: url already handled, skipping double-fire:', url);
      }
      return;
    }
    handledUrl.current = url;

    const parsed = Linking.parse(url);
    const secret = parsed.queryParams?.secret as string;
    const userId = parsed.queryParams?.userId as string;
    if (__DEV__) {
      console.log('[useAuth] Parsed URL params — userId:', userId, 'secret present:', !!secret);
    }

    if (secret && userId) {
      const finalizeLogin = async () => {
        try {
          if (__DEV__) {
            console.log('Step 1 - Creating session with userId:', userId);
          }
          setLoading(true);
          setStoreLoading(true);
          await account.createSession(userId, secret);
          console.log('Step 1 - createSession() succeeded');

          console.log('Step 2 - Getting auth user (account.get())...');
          const authUser = await getAuthUser();
          if (__DEV__) {
            console.log('Step 2 - Session/Account result:', JSON.stringify(authUser));
          }
          if (!authUser) {
            throw new Error('Could not retrieve authenticated user after login.');
          }

          if (__DEV__) {
            console.log('Step 3 - Fetching user document for ID:', authUser.$id);
          }
          // Delegate user doc creation to lib/auth.ts (single source of truth)
          const userDoc = await getOrCreateUserDoc(authUser);
          if (__DEV__) {
            console.log('Step 4 - User doc result:', JSON.stringify(userDoc));
          }
          setUser(userDoc);
          // setUser already sets hasBusiness in the store based on userDoc.has_business
          // Always go to home after login — no registration gate
          console.log('Step 5 - Navigating to: /(tabs)/home');
          router.replace('/(tabs)/home');
        } catch (err: any) {
          if (__DEV__) {
            console.log('=== CAUGHT ERROR (finalizeLogin) ===', JSON.stringify(err), 'message:', err?.message);
          }
          setError(err?.message || 'Login finalizing failed');
        } finally {
          setLoading(false);
          setStoreLoading(false);
        }
      };

      finalizeLogin();
    } else {
      console.log('[useAuth] useEffect: URL has no userId+secret — not an OAuth callback. Skipping.');
    }
  }, [url, setUser, setStoreLoading, setError]);

  const loginWithGoogle = async () => {
    console.log('[loginWithGoogle] Login button pressed. loading:', loading);
    if (loading) return; // prevent double tap
    setLoading(true);
    setStoreLoading(true);
    setError(null);
    try {
      // Clear any existing session first
      try {
        console.log('[loginWithGoogle] Attempting to delete existing session...');
        await account.deleteSession('current');
        console.log('[loginWithGoogle] Existing session deleted.');
      } catch (_) {
        // No existing session, that's fine
        console.log('[loginWithGoogle] No existing session to delete (expected for new users).');
      }

      const redirectUri = 'appwrite-callback-69d35dc3003206488082://com.anykhata.app';
      console.log('[loginWithGoogle] redirectUri:', redirectUri);
      // createOAuth2Token returns a URL — we must open it ourselves
      const oauthUrl = await account.createOAuth2Token(
        OAuthProvider.Google,
        redirectUri,
        redirectUri
      );
      if (__DEV__) {
        console.log('[loginWithGoogle] oauthUrl received:', oauthUrl?.toString());
      }

      if (!oauthUrl) {
        throw new Error('Failed to create OAuth token URL');
      }
      console.log('[loginWithGoogle] Opening WebBrowser...');
      const result = await WebBrowser.openAuthSessionAsync(
        oauthUrl.toString(),
        redirectUri
      );
      if (__DEV__) {
        console.log('[loginWithGoogle] WebBrowser result type:', result.type, 'full result:', JSON.stringify(result));
      }
      if (result.type !== 'success') {
        console.log('[loginWithGoogle] Browser closed without success — type was:', result.type);
        setLoading(false);
        setStoreLoading(false);
      }
      // If success → useEffect above handles session creation via useURL()

    } catch (e: any) {
      if (__DEV__) {
        console.log('=== CAUGHT ERROR (loginWithGoogle) ===', JSON.stringify(e), 'message:', e?.message);
      }
      setError(e?.message || 'OAuth error');
      setLoading(false);
      setStoreLoading(false);
    }
  };

  const login = useCallback(loginWithGoogle, [loading, setStoreLoading, setError]);

  const logout = useCallback(async () => {
    try {
      // Step 1: Delete server-side Appwrite session FIRST
      await authLogout();
      // Step 2: Clear Zustand store state
      storeLogout();
      // Step 3: Navigate to login screen using replace (not push)
      router.replace('/(auth)/login');
    } catch (err: any) {
      // Even if server deletion fails, ALWAYS clear local state and navigate
      storeLogout();
      router.replace('/(auth)/login');
      
      setError(err.message || 'Logout failed');
    }
  }, [storeLogout, setError]);

  return { login, logout };
};
